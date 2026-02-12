const { AirportRouteDemand, Airport } = require('../models');
const { Sequelize, Op } = require('sequelize');
const sequelize = require('../config/database');

/**
 * Route Demand Service
 * Manages zone-based gravity demand with era-specific interpolation.
 * Consumer interface is unchanged from the legacy service.
 */

// Decade column mapping for ordering and interpolation
const DECADE_MAP = [
  { year: 1950, field: 'demand1950', dbField: 'demand_1950' },
  { year: 1960, field: 'demand1960', dbField: 'demand_1960' },
  { year: 1970, field: 'demand1970', dbField: 'demand_1970' },
  { year: 1980, field: 'demand1980', dbField: 'demand_1980' },
  { year: 1990, field: 'demand1990', dbField: 'demand_1990' },
  { year: 2000, field: 'demand2000', dbField: 'demand_2000' },
  { year: 2010, field: 'demand2010', dbField: 'demand_2010' },
  { year: 2020, field: 'demand2020', dbField: 'demand_2020' }
];

class RouteDemandService {

  /**
   * Get the best decade column(s) to use for ordering, given a year
   * Returns the db field name for the nearest decade
   */
  getDecadeOrderField(year) {
    if (year < 1955) return 'demand_1950';
    if (year >= 2015) return 'demand_2020';

    // Find nearest decade
    let nearest = DECADE_MAP[0];
    let minDiff = Math.abs(year - nearest.year);
    for (const entry of DECADE_MAP) {
      const diff = Math.abs(year - entry.year);
      if (diff < minDiff) {
        minDiff = diff;
        nearest = entry;
      }
    }
    return nearest.dbField;
  }

  /**
   * Interpolate demand from a record's decade columns for a specific year.
   * Falls back to baseDemand with era multiplier if era columns haven't been populated yet.
   */
  getDemandForYear(record, year) {
    // Check if era columns have been populated (at least one non-zero)
    const hasEraData = DECADE_MAP.some(entry => (record[entry.field] || 0) > 0);

    if (!hasEraData) {
      // Fallback: use legacy baseDemand with uniform era multiplier
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

  /**
   * Legacy era multiplier for backward compat when era columns aren't populated
   */
  _legacyEraMultiplier(year) {
    if (year < 1960) return 0.40;
    if (year < 1980) return 0.65;
    if (year < 2000) return 0.85;
    return 1.00;
  }

  /**
   * Get demand category from a demand value
   */
  getCategoryFromDemand(demand) {
    if (demand >= 80) return 'very_high';
    if (demand >= 60) return 'high';
    if (demand >= 40) return 'medium';
    if (demand >= 20) return 'low';
    return 'very_low';
  }

  /**
   * Check if era-specific demand columns have been populated
   * Caches result to avoid repeated DB queries
   */
  async _hasEraData() {
    if (this._eraDataChecked !== undefined) return this._eraDataChecked;

    try {
      const sample = await AirportRouteDemand.findOne({
        where: { demand2000: { [Op.gt]: 0 } },
        attributes: ['id']
      });
      this._eraDataChecked = !!sample;
    } catch (err) {
      // Column might not exist yet
      this._eraDataChecked = false;
    }

    return this._eraDataChecked;
  }

  /**
   * Get route demand between two airports
   * Returns demand (0-100), category, route type
   *
   * @param {string} fromAirportId - Origin airport UUID
   * @param {string} toAirportId - Destination airport UUID
   * @param {number} year - Current year for era-specific demand
   * @returns {Promise<Object>} - Demand data
   */
  async getRouteDemand(fromAirportId, toAirportId, year) {
    const demand = await AirportRouteDemand.findOne({
      where: {
        fromAirportId,
        toAirportId
      }
    });

    if (!demand) {
      return {
        demand: 0,
        demandCategory: 'very_low',
        routeType: 'unknown',
        confidence: 'no_data',
        baseDemand: 0
      };
    }

    const adjustedDemand = this.getDemandForYear(demand, year);
    const category = this.getCategoryFromDemand(adjustedDemand);

    return {
      demand: Math.min(100, adjustedDemand),
      demandCategory: category,
      routeType: demand.routeType,
      confidence: 'seeded',
      baseDemand: demand.baseDemand
    };
  }

  /**
   * Get top destinations from an airport
   * Used for displaying popular routes and AI route selection
   *
   * @param {string} fromAirportId - Origin airport UUID
   * @param {number} year - Current year for era-specific demand
   * @param {number} limit - Number of destinations to return (default 10)
   * @returns {Promise<Array>} - Array of destination objects with demand
   */
  async getTopDestinations(fromAirportId, year, limit = 10) {
    const orderField = this.getDecadeOrderField(year);

    // Try era-specific ordering first, fall back to baseDemand if era columns empty
    const useEraColumns = await this._hasEraData();

    const demands = await AirportRouteDemand.findAll({
      where: { fromAirportId },
      include: [{
        model: Airport,
        as: 'toAirport',
        attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type', 'latitude', 'longitude', 'spareCapacity']
      }],
      order: useEraColumns
        ? [[Sequelize.literal(orderField), 'DESC']]
        : [['baseDemand', 'DESC']],
      limit
    });

    return demands.map(d => {
      const adjustedDemand = this.getDemandForYear(d, year);
      return {
        airport: d.toAirport,
        demand: Math.min(100, adjustedDemand),
        demandCategory: this.getCategoryFromDemand(adjustedDemand),
        routeType: d.routeType,
        baseDemand: d.baseDemand
      };
    });
  }

  /**
   * Get demand for multiple routes at once (batch)
   *
   * @param {Array<{from: string, to: string}>} routes - Array of route pairs
   * @param {number} year - Current year for era-specific demand
   * @returns {Promise<Array>} - Array of demand objects
   */
  async getBatchRouteDemand(routes, year) {
    const results = [];

    for (const route of routes) {
      const demand = await this.getRouteDemand(route.from, route.to, year);
      results.push({
        fromAirportId: route.from,
        toAirportId: route.to,
        ...demand
      });
    }

    return results;
  }

  /**
   * Search for high-demand routes from an airport
   * Filters by minimum demand category
   *
   * @param {string} fromAirportId - Origin airport UUID
   * @param {string} minCategory - Minimum demand category
   * @param {number} year - Current year for era-specific demand
   * @param {number} limit - Number of routes to return
   * @returns {Promise<Array>} - Array of high-demand routes
   */
  async getHighDemandRoutes(fromAirportId, minCategory, year, limit = 20) {
    const orderField = this.getDecadeOrderField(year);
    const useEraColumns = await this._hasEraData();

    // Map category to minimum demand value for filtering
    const categoryMinDemand = {
      very_low: 0,
      low: 20,
      medium: 40,
      high: 60,
      very_high: 80
    };

    const minDemandValue = categoryMinDemand[minCategory] || 0;

    let whereClause;
    let orderClause;

    if (useEraColumns) {
      whereClause = sequelize.and(
        { fromAirportId },
        sequelize.where(sequelize.col(orderField), { [Op.gte]: minDemandValue })
      );
      orderClause = [[Sequelize.literal(orderField), 'DESC']];
    } else {
      // Fallback: use baseDemand with era multiplier applied after query
      whereClause = { fromAirportId };
      orderClause = [['baseDemand', 'DESC']];
    }

    const demands = await AirportRouteDemand.findAll({
      where: whereClause,
      include: [{
        model: Airport,
        as: 'toAirport',
        attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type', 'latitude', 'longitude', 'spareCapacity']
      }],
      order: orderClause,
      limit
    });

    return demands.map(d => {
      const adjustedDemand = this.getDemandForYear(d, year);
      return {
        airport: d.toAirport,
        demand: Math.min(100, adjustedDemand),
        demandCategory: this.getCategoryFromDemand(adjustedDemand),
        routeType: d.routeType,
        baseDemand: d.baseDemand
      };
    });
  }

  /**
   * Get demand statistics for an airport
   * Shows distribution of demand across categories
   *
   * @param {string} fromAirportId - Origin airport UUID
   * @returns {Promise<Object>} - Demand statistics
   */
  async getAirportDemandStats(fromAirportId) {
    const allDemands = await AirportRouteDemand.findAll({
      where: { fromAirportId },
      attributes: ['demandCategory', 'baseDemand', 'routeType']
    });

    const stats = {
      totalRoutes: allDemands.length,
      categoryBreakdown: {
        very_high: 0,
        high: 0,
        medium: 0,
        low: 0,
        very_low: 0
      },
      routeTypeBreakdown: {
        business: 0,
        leisure: 0,
        mixed: 0,
        cargo: 0,
        regional: 0
      },
      averageDemand: 0
    };

    let totalDemand = 0;

    allDemands.forEach(d => {
      stats.categoryBreakdown[d.demandCategory]++;
      if (d.routeType) {
        stats.routeTypeBreakdown[d.routeType]++;
      }
      totalDemand += d.baseDemand;
    });

    stats.averageDemand = allDemands.length > 0
      ? Math.round(totalDemand / allDemands.length)
      : 0;

    return stats;
  }

  /**
   * Era-based demand multiplier (legacy - kept for backward compatibility)
   * With the gravity model, demand is already era-specific in the decade columns.
   * This returns 1.0 since adjustment is handled by getDemandForYear().
   *
   * @param {number} year - Year to calculate multiplier for
   * @returns {number} - Always 1.0
   */
  getEraDemandMultiplier(year) {
    return 1.0;
  }

  /**
   * Get demand category label (formatted)
   */
  getDemandCategoryLabel(category) {
    return category.replace('_', ' ').toUpperCase();
  }

  /**
   * Get demand category color for UI
   */
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

// Singleton instance
const routeDemandService = new RouteDemandService();

module.exports = routeDemandService;
