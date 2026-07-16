/**
 * Generate static demand data file.
 *
 * Runs the gravity model and writes results to src/data/demandData.json.
 * Keyed by ICAO pairs ("EGLL_KJFK"), values are [d1950, d1960, ..., d2020].
 *
 * One-time generation — the output file is loaded at boot instead of computing.
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const gravityModelService = require('../services/gravityModelService');
const zoneAssignmentService = require('../services/zoneAssignmentService');
const metroZones = require('../data/metroZones');
const countryEconomics = require('../data/countryEconomics');
const calibration = require('../data/gravityCalibration');
const sequelize = require('../config/database');
const { Airport } = require('../models');

let airportGrowthService;
try { airportGrowthService = require('../services/airportGrowthService'); } catch(e) {}

// High-traffic countries get top 20 airports per zone, others top 10
const TOP20_COUNTRIES = new Set([
  'US', 'GB', 'DE', 'FR', 'CN', 'JP', 'AU', 'CA', 'IN', 'BR',
  'RU', 'AE', 'TR', 'ES', 'IT', 'TH', 'MX', 'ID', 'KR', 'NL',
  'SG', 'MY', 'SA', 'ZA', 'EG', 'QA', 'IE', 'PT', 'GR', 'PH'
]);

async function generate() {
  const startTime = Date.now();
  await sequelize.authenticate();
  const airports = await Airport.findAll({
    where: { isActive: true },
    attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type',
                 'latitude', 'longitude', 'trafficDemand'],
    raw: true
  });
  console.log('Airports loaded:', airports.length);

  const airportById = {};
  for (const a of airports) airportById[a.id] = a;

  // Identify curated vs auto-generated zones
  const ORIGINAL_ZONE_COUNT = metroZones.findIndex(z => z.zoneId === 'ALE');
  const curatedZoneIds = new Set(metroZones.slice(0, ORIGINAL_ZONE_COUNT).map(z => z.zoneId));

  // Assign airports to zones — but remap non-curated zones to nearest curated zone.
  // This ensures airports in auto-generated zones still get gravity model demand
  // by being folded into a nearby curated zone's demand shares.
  const icaoToZone = zoneAssignmentService.buildIcaoToZoneMap(metroZones);
  const zoneAirports = {};
  for (const zone of metroZones) zoneAirports[zone.zoneId] = [];

  // Build a lookup of curated zones for remapping
  const curatedZones = metroZones.slice(0, ORIGINAL_ZONE_COUNT);

  const DEMAND_ELIGIBLE_TYPES = new Set(['International Hub', 'Major']);
  let remapped = 0;

  for (const airport of airports) {
    let zoneId = icaoToZone[airport.icaoCode];

    if (!zoneId) {
      if (!DEMAND_ELIGIBLE_TYPES.has(airport.type)) continue;
      const cc = zoneAssignmentService.countryNameToCode(airport.country);
      if (cc) {
        const nearest = zoneAssignmentService.findNearestZone(airport, metroZones, cc);
        if (nearest) zoneId = nearest.zoneId;
      }
    }

    if (!zoneId) continue;

    // If assigned to an auto-generated zone, remap to nearest curated zone
    if (!curatedZoneIds.has(zoneId)) {
      const autoZone = metroZones.find(z => z.zoneId === zoneId);
      let bestDist = Infinity, bestZone = null;
      for (const cz of curatedZones) {
        const dist = gravityModelService.calculateDistance(
          autoZone.latitude, autoZone.longitude, cz.latitude, cz.longitude
        );
        if (dist < bestDist) { bestDist = dist; bestZone = cz; }
      }
      if (bestZone) {
        zoneId = bestZone.zoneId;
        remapped++;
      }
    }

    if (zoneAirports[zoneId]) zoneAirports[zoneId].push(airport);
  }
  console.log('Airports remapped from auto-generated to curated zones:', remapped);

  // Demand shares — cap per zone
  const historicalPaxData = airportGrowthService?.HISTORICAL_PASSENGER_DATA || {};
  const zoneSharesCache = {};
  let totalMapped = 0;
  const typeRank = { 'International Hub': 4, 'Major': 3, 'Regional': 2, 'Small Regional': 1 };

  for (const zone of curatedZones) {
    let inZone = zoneAirports[zone.zoneId] || [];
    if (inZone.length === 0) continue;

    const cap = TOP20_COUNTRIES.has(zone.countryCode) ? 15 : 10;
    if (inZone.length > cap) {
      inZone.sort((a, b) => (typeRank[b.type] || 0) - (typeRank[a.type] || 0));
      inZone = inZone.slice(0, cap);
    }

    totalMapped += inZone.length;
    const shares = zoneAssignmentService.computeDemandShares(inZone, historicalPaxData, 2000);
    shares.sort((a, b) => b.demandShare - a.demandShare); // desc for early exit
    zoneSharesCache[zone.zoneId] = shares;
  }
  console.log('Airports in demand model:', totalMapped);

  // Gravity nodes: curated zones only
  const gravityZones = curatedZones.filter(z => zoneSharesCache[z.zoneId]);
  console.log('Gravity model zones:', gravityZones.length, '(curated) of', metroZones.length, 'total');

  // Distance matrix only for gravity zones
  const distanceMatrix = gravityModelService.computeDistanceMatrix(gravityZones);
  console.log('Distance matrix computed');

  // Pre-compute GDP per zone per decade
  const zoneGdp = {};
  for (const decade of calibration.decades) {
    zoneGdp[decade] = {};
    for (const zone of gravityZones) {
      zoneGdp[decade][zone.zoneId] = gravityModelService.getGdpForZone(zone, countryEconomics, decade);
    }
  }

  // Pre-filter valid zone pairs
  const validZonePairs = [];
  for (let i = 0; i < gravityZones.length; i++) {
    for (let j = 0; j < gravityZones.length; j++) {
      if (i === j) continue;
      const dist = distanceMatrix[gravityZones[i].zoneId + '_' + gravityZones[j].zoneId];
      if (!dist || dist < calibration.minDistanceNm || dist > calibration.maxDistanceNm) continue;
      validZonePairs.push([i, j]);
    }
  }
  console.log('Valid zone pairs:', validZonePairs.length);

  // Minimum demand score to include (higher = fewer pairs, smaller file)
  const MIN_DEMAND = 7;

  // Build numeric index for airports (faster than string key hashing)
  const allAirportIds = new Set();
  for (const zoneId in zoneSharesCache) {
    for (const s of zoneSharesCache[zoneId]) allAirportIds.add(s.airportId);
  }
  const airportIdList = [...allAirportIds];
  const airportIdToIdx = new Map();
  for (let i = 0; i < airportIdList.length; i++) airportIdToIdx.set(airportIdList[i], i);
  console.log('Airport indices built:', airportIdList.length);

  // Pre-map shares to numeric indices
  for (const zoneId in zoneSharesCache) {
    for (const s of zoneSharesCache[zoneId]) {
      s._idx = airportIdToIdx.get(s.airportId);
    }
  }

  // Use a Map with numeric keys for O(1) lookups
  // Key: fromIdx * airportCount + toIdx
  const airportCount = airportIdList.length;
  const demandMap = new Map(); // numericKey → Uint8Array(8)
  const decades = calibration.decades;
  const NORM_POWER = 0.25;

  for (let d = 0; d < decades.length; d++) {
    const decade = decades[d];
    const Kt = gravityModelService.calibrateKt(gravityZones, countryEconomics, distanceMatrix, decade);

    // Pass 1: compute zone demands and find max pair demand
    let maxRawPairDemand = 0;
    const zoneDemands = new Float64Array(validZonePairs.length);

    for (let p = 0; p < validZonePairs.length; p++) {
      const [i, j] = validZonePairs[p];
      const zoneA = gravityZones[i], zoneB = gravityZones[j];
      const dist = distanceMatrix[zoneA.zoneId + '_' + zoneB.zoneId];
      const rawZoneDemand = gravityModelService.computeRawZoneDemand(
        zoneA, zoneB, zoneGdp[decade][zoneA.zoneId], zoneGdp[decade][zoneB.zoneId], dist, decade
      ) * Kt;

      if (rawZoneDemand <= 0) continue;
      zoneDemands[p] = rawZoneDemand;

      const fromShares = zoneSharesCache[zoneA.zoneId];
      const toShares = zoneSharesCache[zoneB.zoneId];
      maxRawPairDemand = Math.max(
        maxRawPairDemand,
        rawZoneDemand * fromShares[0].demandShare * toShares[0].demandShare
      );
    }

    // Pass 2: allocate to airport pairs, normalize, filter
    const minRawThreshold = maxRawPairDemand * Math.pow(MIN_DEMAND / 100, 1 / NORM_POWER);
    let pairsThisDecade = 0;

    for (let p = 0; p < validZonePairs.length; p++) {
      const rawZoneDemand = zoneDemands[p];
      if (rawZoneDemand <= 0) continue;

      const [i, j] = validZonePairs[p];
      const fromShares = zoneSharesCache[gravityZones[i].zoneId];
      const toShares = zoneSharesCache[gravityZones[j].zoneId];

      for (const from of fromShares) {
        if (rawZoneDemand * from.demandShare * toShares[0].demandShare < minRawThreshold) break;

        for (const to of toShares) {
          if (from._idx === to._idx) continue;
          const rawPairDemand = rawZoneDemand * from.demandShare * to.demandShare;
          if (rawPairDemand < minRawThreshold) break;

          const norm = Math.round(100 * Math.pow(rawPairDemand / maxRawPairDemand, NORM_POWER));
          if (norm < MIN_DEMAND) continue;

          const numKey = from._idx * airportCount + to._idx;
          let arr = demandMap.get(numKey);
          if (!arr) {
            arr = new Uint8Array(8);
            demandMap.set(numKey, arr);
          }
          if (norm > arr[d]) arr[d] = norm;
          pairsThisDecade++;
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);
    console.log('Decade ' + decade + ': ' + pairsThisDecade + ' pairs, ' + demandMap.size + ' unique (' + elapsed + 's elapsed)');
  }

  console.log('\nTotal unique pairs:', demandMap.size);

  // Stream write — avoid building a giant JSON object in memory
  const outputPath = path.join(__dirname, '../data/demandData.json');
  const ws = fs.createWriteStream(outputPath);
  ws.write('{');
  let first = true;
  let written = 0;

  for (const [numKey, scores] of demandMap) {
    const fromIdx = Math.floor(numKey / airportCount);
    const toIdx = numKey % airportCount;
    const fromIcao = airportById[airportIdList[fromIdx]]?.icaoCode;
    const toIcao = airportById[airportIdList[toIdx]]?.icaoCode;
    if (!fromIcao || !toIcao) continue;

    const line = (first ? '' : ',') +
      '"' + fromIcao + '_' + toIcao + '":[' +
      scores[0] + ',' + scores[1] + ',' + scores[2] + ',' + scores[3] + ',' +
      scores[4] + ',' + scores[5] + ',' + scores[6] + ',' + scores[7] + ']';
    ws.write(line);
    first = false;
    written++;

    if (written % 1000000 === 0) console.log('  Written ' + written + '/' + demandMap.size + '...');
  }

  ws.write('}');
  await new Promise(resolve => ws.end(resolve));

  const size = fs.statSync(outputPath).size;
  console.log('Written to ' + outputPath + ': ' + (size / 1024 / 1024).toFixed(1) + ' MB (' + written + ' pairs)');
  console.log('Done in ' + ((Date.now() - startTime) / 1000).toFixed(0) + 's');

  process.exit(0);
}

generate().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
