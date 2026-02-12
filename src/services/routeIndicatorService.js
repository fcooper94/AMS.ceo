/**
 * Route Indicator Service
 *
 * Computes three actionable indicators for route creation:
 * - Yield (0-100): Revenue quality based on GDP, distance sweet spot, business propensity
 * - Competition (0-100): Market pressure from competitors, hub presence, congestion
 * - Access (0-100 difficulty): How easy/hard it is to operate into this airport
 *
 * Spare capacity is computed dynamically from slot usage, not from the static Airport field.
 */

const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');
const gravityModelService = require('./gravityModelService');
const zoneAssignmentService = require('./zoneAssignmentService');
const airportGrowthService = require('./airportGrowthService');
const cabinClassService = require('./cabinClassService');
const countryEconomics = require('../data/countryEconomics');
const calibration = require('../data/gravityCalibration');

class RouteIndicatorService {

  /**
   * Compute all three indicators for a batch of destinations
   */
  async computeIndicators(baseAirport, destinations, worldYear, worldId, playerMembershipId) {
    if (!destinations || destinations.length === 0) return {};

    const destAirports = destinations.map(d => d.airport).filter(Boolean);
    if (destAirports.length === 0) return {};

    const destIds = destAirports.map(a => a.id);

    // Resolve origin country GDP
    const originCountryCode = zoneAssignmentService.countryNameToCode(baseAirport.country);
    const originGdp = this._getGdp(originCountryCode, worldYear);

    // Batch queries (competition data + slot usage for dynamic spare capacity)
    let competitorCounts = {};
    let hubPresence = {};
    let slotsUsedMap = {};
    try {
      [competitorCounts, hubPresence, slotsUsedMap] = await Promise.all([
        this._queryCompetitorCounts(baseAirport.id, worldId, playerMembershipId, destIds),
        this._queryHubPresence(worldId, destIds),
        this._querySlotsUsed(worldId, destIds)
      ]);
    } catch (sqlErr) {
      console.warn('Indicator queries failed, using defaults:', sqlErr.message);
    }

    // Compute dynamic spare capacity for each destination
    const spareCapacityMap = {};
    for (const destAirport of destAirports) {
      const metrics = airportGrowthService.getAirportMetricsExtended(destAirport, worldYear);
      const totalSlots = metrics.totalSlots || 1;
      const usedSlots = slotsUsedMap[destAirport.id] || 0;
      const available = Math.max(0, totalSlots - usedSlots);
      spareCapacityMap[destAirport.id] = Math.round((available / totalSlots) * 100);
    }

    // Compute raw yields with breakdowns for normalization
    const rawYields = [];
    const destDataMap = {};

    for (const destAirport of destAirports) {
      const destCountryCode = zoneAssignmentService.countryNameToCode(destAirport.country);
      const destGdp = this._getGdp(destCountryCode, worldYear);

      const distNm = gravityModelService.calculateDistance(
        baseAirport.latitude, baseAirport.longitude,
        destAirport.latitude, destAirport.longitude
      );
      const distKm = distNm * 1.852;

      const yieldResult = this._computeRawYield(originGdp, destGdp, distKm, destAirport.type, worldYear);

      rawYields.push(yieldResult.raw);
      destDataMap[destAirport.id] = { yieldResult, distKm, destGdp, destCountryCode, destAirport };
    }

    // Min-max normalize yields to 0-100
    const minYield = Math.min(...rawYields);
    const maxYield = Math.max(...rawYields);
    const yieldRange = maxYield - minYield;

    const results = {};

    for (const destAirport of destAirports) {
      const data = destDataMap[destAirport.id];
      if (!data) continue;

      const spareCapacity = spareCapacityMap[destAirport.id] ?? 100;

      const yieldScore = yieldRange > 0
        ? Math.round(100 * (data.yieldResult.raw - minYield) / yieldRange)
        : 50;

      const competitionResult = this._computeCompetition(
        destAirport.id, competitorCounts, hubPresence, spareCapacity
      );

      const accessResult = this._computeAccess(
        destAirport.type, spareCapacity
      );

      const classMix = cabinClassService.computeClassMix(
        originGdp, data.destGdp, data.distKm,
        baseAirport.type, destAirport.type, worldYear
      );

      results[destAirport.id] = {
        yieldScore,
        yieldBreakdown: {
          incomeFactor: data.yieldResult.incomeFactor,
          distanceFactor: data.yieldResult.distanceFactor,
          hubPremium: data.yieldResult.businessFactor,
          distKm: Math.round(data.distKm),
          originCountry: originCountryCode || '??',
          originGdp: Math.round(originGdp),
          destCountry: data.destCountryCode || '??',
          destGdp: Math.round(data.destGdp)
        },
        classMix,
        competitionScore: competitionResult.score,
        competitorCount: competitionResult.competitorCount,
        competitionBreakdown: {
          competitors: competitionResult.competitorCount,
          hasHub: competitionResult.hasHub,
          congestion: competitionResult.congestion
        },
        accessScore: accessResult.score,
        accessBreakdown: {
          airportType: destAirport.type,
          typeRisk: accessResult.typeRisk,
          congestionRisk: accessResult.congestionRisk,
          spareCapacity
        }
      };
    }

    return results;
  }

  /**
   * Era-aware reference GDP per capita for income factor normalization.
   * Uses the median GDP of major airline markets for each decade so that
   * yield spreads meaningfully in every era, not just the modern era.
   */
  _getEraReferenceGdp(year) {
    const eraRef = {
      1950: 8000, 1960: 12000, 1970: 16000, 1980: 22000,
      1990: 28000, 2000: 35000, 2010: 42000, 2020: 45000
    };
    return gravityModelService.interpolateDecadeValue(eraRef, year);
  }

  /**
   * Compute raw yield value (before normalization)
   * Returns raw value plus individual factors for breakdown
   */
  _computeRawYield(originGdp, destGdp, distKm, destType, year) {
    const geoMeanGdp = Math.sqrt(originGdp * destGdp);
    // Era-aware: compare to median airline-market GDP of the era, not fixed modern value
    const eraReference = this._getEraReferenceGdp(year);
    const incomeFactor = Math.max(0.5, Math.min(2.0, geoMeanGdp / eraReference));

    // Gaussian bell curve centered at 2500 km with sigma=2000 km
    // Gives smooth falloff: 200km→0.96, 1000km→1.08, 2500km→1.20, 5000km→0.93, 8000km→0.71
    const distanceFactor = Math.max(0.7, 0.7 + 0.5 * Math.exp(-0.5 * Math.pow((distKm - 2500) / 2000, 2)));

    const typeAdj = {
      'International Hub': 0.15,
      'Regional Hub': 0.05,
      'Major': 0.05,
      'Regional': -0.10,
      'Domestic': -0.15,
      'Small': -0.20,
      'Closed': -0.30
    };
    const businessFactor = 1 + (typeAdj[destType] || 0);

    return {
      raw: incomeFactor * distanceFactor * businessFactor,
      incomeFactor: Math.round(incomeFactor * 100) / 100,
      distanceFactor: Math.round(distanceFactor * 100) / 100,
      businessFactor: Math.round(businessFactor * 100) / 100
    };
  }

  /**
   * Compute competition score (0-100, higher = more competitive)
   */
  _computeCompetition(destAirportId, competitorCounts, hubPresence, spareCapacity) {
    const nCompetitors = competitorCounts[destAirportId] || 0;
    const hasHub = hubPresence[destAirportId] || false;

    const compCountFactor = 1 - Math.exp(-0.6 * nCompetitors);
    const hubPenalty = hasHub ? 0.25 : 0;

    const utilization = 1 - (spareCapacity / 100);
    const congestion = Math.max(0, Math.min(0.25, utilization - 0.8));

    const raw = 0.55 * compCountFactor + hubPenalty + congestion;
    return {
      score: Math.round(100 * Math.max(0, Math.min(1, raw))),
      competitorCount: nCompetitors,
      hasHub,
      congestion: Math.round(congestion * 100)
    };
  }

  /**
   * Compute access score (0-100 difficulty, higher = harder)
   */
  _computeAccess(destType, spareCapacity) {
    const runwayRisk = {
      'Small': 0.35,
      'Domestic': 0.25,
      'Regional': 0.15,
      'Regional Hub': 0.10,
      'Major': 0.05,
      'International Hub': 0
    };
    const typeRisk = runwayRisk[destType] || 0.20;

    const utilization = 1 - (spareCapacity / 100);
    const congestionRisk = Math.max(0, Math.min(0.5, (utilization - 0.75) / 0.25));

    const raw = typeRisk + congestionRisk;
    return {
      score: Math.round(100 * Math.max(0, Math.min(1, raw))),
      typeRisk: Math.round(typeRisk * 100),
      congestionRisk: Math.round(congestionRisk * 100)
    };
  }

  /**
   * Get GDP per capita for a country code at a given year
   */
  _getGdp(countryCode, year) {
    if (!countryCode || !countryEconomics[countryCode] || !countryEconomics[countryCode].gdpPerCapita) {
      return 5000;
    }
    return gravityModelService.interpolateDecadeValue(countryEconomics[countryCode].gdpPerCapita, year);
  }

  /**
   * Batch query: count distinct competitors on each route from baseAirport to destinations
   */
  async _queryCompetitorCounts(baseAirportId, worldId, playerMembershipId, destIds) {
    if (destIds.length === 0) return {};

    const excludeClause = playerMembershipId
      ? 'AND r.world_membership_id != :playerMembershipId'
      : '';

    const rows = await sequelize.query(`
      SELECT
        CASE WHEN r.departure_airport_id = :baseId
             THEN r.arrival_airport_id
             ELSE r.departure_airport_id
        END as "destId",
        COUNT(DISTINCT r.world_membership_id) as "count"
      FROM routes r
      JOIN world_memberships wm ON r.world_membership_id = wm.id
      WHERE wm.world_id = :worldId
        AND r.is_active = true
        ${excludeClause}
        AND (
          (r.departure_airport_id = :baseId AND r.arrival_airport_id IN (:destIds))
          OR
          (r.arrival_airport_id = :baseId AND r.departure_airport_id IN (:destIds))
        )
      GROUP BY "destId"
    `, {
      replacements: { baseId: baseAirportId, worldId, playerMembershipId, destIds },
      type: QueryTypes.SELECT
    });

    const result = {};
    for (const row of rows) {
      result[row.destId] = parseInt(row.count) || 0;
    }
    return result;
  }

  /**
   * Batch query: check which destination airports have an airline based there
   */
  async _queryHubPresence(worldId, destIds) {
    if (destIds.length === 0) return {};

    const rows = await sequelize.query(`
      SELECT base_airport_id as "airportId"
      FROM world_memberships
      WHERE world_id = :worldId
        AND is_active = true
        AND base_airport_id IN (:destIds)
      GROUP BY base_airport_id
    `, {
      replacements: { worldId, destIds },
      type: QueryTypes.SELECT
    });

    const result = {};
    for (const row of rows) {
      result[row.airportId] = true;
    }
    return result;
  }

  /**
   * Batch query: count slots used at each destination airport in this world
   * Each route uses 2 slots (departure + arrival) at each airport it touches
   */
  async _querySlotsUsed(worldId, destIds) {
    if (destIds.length === 0) return {};

    const rows = await sequelize.query(`
      SELECT airport_id as "airportId", SUM(slot_count)::int as "slotsUsed"
      FROM (
        SELECT r.departure_airport_id as airport_id, COUNT(*) * 2 as slot_count
        FROM routes r
        JOIN world_memberships wm ON r.world_membership_id = wm.id
        WHERE wm.world_id = :worldId AND r.is_active = true
          AND r.departure_airport_id IN (:destIds)
        GROUP BY r.departure_airport_id
        UNION ALL
        SELECT r.arrival_airport_id as airport_id, COUNT(*) * 2 as slot_count
        FROM routes r
        JOIN world_memberships wm ON r.world_membership_id = wm.id
        WHERE wm.world_id = :worldId AND r.is_active = true
          AND r.arrival_airport_id IN (:destIds)
        GROUP BY r.arrival_airport_id
      ) combined
      GROUP BY airport_id
    `, {
      replacements: { worldId, destIds },
      type: QueryTypes.SELECT
    });

    const result = {};
    for (const row of rows) {
      result[row.airportId] = parseInt(row.slotsUsed) || 0;
    }
    return result;
  }
}

const routeIndicatorService = new RouteIndicatorService();
module.exports = routeIndicatorService;
