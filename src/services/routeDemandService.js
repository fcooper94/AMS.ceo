const demandCacheService = require('./demandCacheService');

/**
 * Route Demand Service
 * Manages zone-based gravity demand with era-specific interpolation.
 *
 * All demand data is now served from the in-memory demandCacheService
 * (deterministic gravity model computed at boot). Zero DB queries.
 */

// Decade column mapping for interpolation
const DECADE_MAP = [
  { year: 1950, field: 'demand1950' },
  { year: 1960, field: 'demand1960' },
  { year: 1970, field: 'demand1970' },
  { year: 1980, field: 'demand1980' },
  { year: 1990, field: 'demand1990' },
  { year: 2000, field: 'demand2000' },
  { year: 2010, field: 'demand2010' },
  { year: 2020, field: 'demand2020' }
];

class RouteDemandService {

  /**
   * Interpolate demand from a record's decade fields for a specific year.
   */
  getDemandForYear(record, year) {
    const hasEraData = DECADE_MAP.some(entry => (record[entry.field] || 0) > 0);

    if (!hasEraData) {
      const base = record.baseDemand || 0;
      return Math.min(100, Math.round(base * this._legacyEraMultiplier(year)));
    }

    if (year < 1950) {
      return Math.max(0, Math.round((record.demand1950 || 0) * 0.3));
    }
    if (year >= 2020) {
      return record.demand2020 || 0;
    }

    let lowerIdx = 0;
    for (let i = DECADE_MAP.length - 1; i >= 0; i--) {
      if (year >= DECADE_MAP[i].year) {
        lowerIdx = i;
        break;
      }
    }

    const upperIdx = Math.min(lowerIdx + 1, DECADE_MAP.length - 1);
    if (lowerIdx === upperIdx) return record[DECADE_MAP[lowerIdx].field] || 0;

    const lowerYear = DECADE_MAP[lowerIdx].year;
    const upperYear = DECADE_MAP[upperIdx].year;
    const lowerDemand = record[DECADE_MAP[lowerIdx].field] || 0;
    const upperDemand = record[DECADE_MAP[upperIdx].field] || 0;
    const fraction = (year - lowerYear) / (upperYear - lowerYear);

    return Math.round(lowerDemand + fraction * (upperDemand - lowerDemand));
  }

  _legacyEraMultiplier(year) {
    if (year < 1960) return 0.40;
    if (year < 1980) return 0.65;
    if (year < 2000) return 0.85;
    return 1.00;
  }

  getCategoryFromDemand(demand) {
    if (demand >= 80) return 'very_high';
    if (demand >= 60) return 'high';
    if (demand >= 40) return 'medium';
    if (demand >= 20) return 'low';
    return 'very_low';
  }

  /**
   * Get route demand between two airports
   */
  async getRouteDemand(fromAirportId, toAirportId, year) {
    const record = demandCacheService.getRecord(fromAirportId, toAirportId);

    if (!record) {
      return {
        demand: 0,
        demandCategory: 'very_low',
        routeType: 'unknown',
        confidence: 'no_data',
        baseDemand: 0
      };
    }

    const adjustedDemand = this.getDemandForYear(record, year);
    const category = this.getCategoryFromDemand(adjustedDemand);

    return {
      demand: Math.min(100, adjustedDemand),
      demandCategory: category,
      routeType: record.routeType,
      confidence: 'seeded',
      baseDemand: record.baseDemand,
      isFloor: record.isFloor === true,
      // A record carries an isFloor flag (true/false) iff it's an anchored UK/US
      // domestic route — those use the gentler DOMESTIC_ERA curve. Mirrors the
      // flags getTopDestinations exposes; cargoDemandService.demandToPax needs
      // isDomestic to pick the right era curve.
      isDomestic: record.isFloor !== undefined
    };
  }

  /**
   * Get top destinations from an airport
   */
  async getTopDestinations(fromAirportId, year, limit = 10) {
    const destinations = demandCacheService.getDestinations(fromAirportId);

    // Sort by interpolated demand for the requested year
    const scored = destinations.map(d => ({
      record: d,
      adjustedDemand: this.getDemandForYear(d, year)
    }));
    scored.sort((a, b) => b.adjustedDemand - a.adjustedDemand);

    return scored.slice(0, limit).map(({ record, adjustedDemand }) => {
      const airport = demandCacheService.getAirport(record.toAirportId);
      return {
        airport: airport || null,
        demand: Math.min(100, adjustedDemand),
        demandCategory: this.getCategoryFromDemand(adjustedDemand),
        routeType: record.routeType,
        baseDemand: record.baseDemand,
        isFloor: record.isFloor === true,
        // A record carries an isFloor flag (true or false) iff it's an anchored
        // UK/US domestic route — those use the gentler DOMESTIC_ERA display curve.
        isDomestic: record.isFloor !== undefined
      };
    });
  }

  /**
   * Get demand for multiple routes at once (batch)
   */
  async getBatchRouteDemand(routes, year) {
    return routes.map(route => {
      const record = demandCacheService.getRecord(route.from, route.to);
      if (!record) {
        return {
          fromAirportId: route.from,
          toAirportId: route.to,
          demand: 0,
          demandCategory: 'very_low',
          routeType: 'unknown',
          confidence: 'no_data',
          baseDemand: 0
        };
      }
      const adjustedDemand = this.getDemandForYear(record, year);
      return {
        fromAirportId: route.from,
        toAirportId: route.to,
        demand: Math.min(100, adjustedDemand),
        demandCategory: this.getCategoryFromDemand(adjustedDemand),
        routeType: record.routeType,
        confidence: 'seeded',
        baseDemand: record.baseDemand
      };
    });
  }

  /**
   * Search for high-demand routes from an airport
   */
  async getHighDemandRoutes(fromAirportId, minCategory, year, limit = 20) {
    const categoryMinDemand = {
      very_low: 0,
      low: 20,
      medium: 40,
      high: 60,
      very_high: 80
    };
    const minDemandValue = categoryMinDemand[minCategory] || 0;

    const destinations = demandCacheService.getDestinations(fromAirportId);

    const scored = destinations
      .map(d => ({
        record: d,
        adjustedDemand: this.getDemandForYear(d, year)
      }))
      .filter(({ adjustedDemand }) => adjustedDemand >= minDemandValue)
      .sort((a, b) => b.adjustedDemand - a.adjustedDemand)
      .slice(0, limit);

    return scored.map(({ record, adjustedDemand }) => {
      const airport = demandCacheService.getAirport(record.toAirportId);
      return {
        airport: airport || null,
        demand: Math.min(100, adjustedDemand),
        demandCategory: this.getCategoryFromDemand(adjustedDemand),
        routeType: record.routeType,
        baseDemand: record.baseDemand
      };
    });
  }

  /**
   * Get demand statistics for an airport
   */
  async getAirportDemandStats(fromAirportId) {
    const destinations = demandCacheService.getDestinations(fromAirportId);

    const stats = {
      totalRoutes: destinations.length,
      categoryBreakdown: { very_high: 0, high: 0, medium: 0, low: 0, very_low: 0 },
      routeTypeBreakdown: { business: 0, leisure: 0, mixed: 0, cargo: 0, regional: 0 },
      averageDemand: 0
    };

    let totalDemand = 0;

    for (const d of destinations) {
      stats.categoryBreakdown[d.demandCategory]++;
      if (d.routeType && stats.routeTypeBreakdown[d.routeType] !== undefined) {
        stats.routeTypeBreakdown[d.routeType]++;
      }
      totalDemand += d.baseDemand;
    }

    stats.averageDemand = destinations.length > 0
      ? Math.round(totalDemand / destinations.length)
      : 0;

    return stats;
  }

  getEraDemandMultiplier(year) {
    return 1.0;
  }

  getDemandCategoryLabel(category) {
    return category.replace('_', ' ').toUpperCase();
  }

  getDemandCategoryColor(category) {
    const colors = {
      very_high: 'var(--success-color)',
      high: 'var(--info-color)',
      medium: 'var(--warning-color)',
      low: 'var(--text-muted)',
      very_low: 'var(--text-secondary)'
    };
    return colors[category] || 'var(--text-secondary)';
  }
}

const routeDemandService = new RouteDemandService();
module.exports = routeDemandService;
