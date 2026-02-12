require('dotenv').config();
const sequelize = require('../config/database');
const { Airport, AirportRouteDemand, MetroZone, AirportZoneMapping } = require('../models');
const gravityModelService = require('../services/gravityModelService');
const zoneAssignmentService = require('../services/zoneAssignmentService');
const metroZones = require('../data/metroZones');
const countryEconomics = require('../data/countryEconomics');
const calibration = require('../data/gravityCalibration');

/**
 * Seed gravity-based demand model
 *
 * Flow:
 * 1. Seed metro_zones table
 * 2. Assign airports to zones + compute demand shares
 * 3. For each decade: compute zone-to-zone demand via gravity model
 * 4. Allocate to airport pairs
 * 5. Normalize to 0-100 scale
 * 6. UPSERT into airport_route_demands
 */

let airportGrowthService;
try {
  airportGrowthService = require('../services/airportGrowthService');
} catch (e) {
  console.log('Warning: airportGrowthService not available, using trafficDemand only for shares');
  airportGrowthService = null;
}

async function seedGravityDemands() {
  try {
    console.log('=== Zone-Based Gravity Demand Seeding ===\n');

    // Step 1: Seed metro_zones table
    console.log('Step 1: Seeding metro_zones table...');
    await MetroZone.destroy({ where: {}, truncate: true, cascade: true });

    const zoneRecords = metroZones.map(z => ({
      id: z.zoneId,
      name: z.name,
      countryCode: z.countryCode,
      latitude: z.latitude,
      longitude: z.longitude
    }));

    await MetroZone.bulkCreate(zoneRecords, { ignoreDuplicates: true });
    console.log(`  Seeded ${zoneRecords.length} metro zones.\n`);

    // Step 2: Load airports and assign to zones
    console.log('Step 2: Assigning airports to zones...');
    const airports = await Airport.findAll({
      where: { isActive: true },
      attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type',
                   'latitude', 'longitude', 'trafficDemand']
    });
    console.log(`  Found ${airports.length} active airports.`);

    const icaoToZone = zoneAssignmentService.buildIcaoToZoneMap(metroZones);
    const zoneAirports = {}; // zoneId -> [airport, ...]

    // Initialize zone airport lists
    for (const zone of metroZones) {
      zoneAirports[zone.zoneId] = [];
    }

    let mapped = 0;
    let unmapped = 0;
    let proximityMapped = 0;

    for (const airport of airports) {
      let zoneId = icaoToZone[airport.icaoCode];

      if (!zoneId) {
        // Try proximity mapping
        const countryCode = zoneAssignmentService.countryNameToCode(airport.country);
        if (countryCode) {
          const nearestZone = zoneAssignmentService.findNearestZone(airport, metroZones, countryCode);
          if (nearestZone) {
            zoneId = nearestZone.zoneId;
            proximityMapped++;
          }
        }
      }

      if (zoneId && zoneAirports[zoneId]) {
        zoneAirports[zoneId].push(airport);
        mapped++;
      } else {
        unmapped++;
      }
    }

    console.log(`  Explicitly mapped: ${mapped - proximityMapped}`);
    console.log(`  Proximity mapped: ${proximityMapped}`);
    console.log(`  Unmapped (no zone): ${unmapped}`);

    // Step 3: Compute demand shares and seed airport_zone_mappings
    console.log('\nStep 3: Computing demand shares...');
    await AirportZoneMapping.destroy({ where: {}, truncate: true, cascade: true });

    const historicalPaxData = airportGrowthService?.HISTORICAL_PASSENGER_DATA || {};
    const allMappingRecords = [];
    const zoneSharesCache = {}; // zoneId -> [{airportId, icaoCode, demandShare}, ...]

    for (const zone of metroZones) {
      const airportsInZone = zoneAirports[zone.zoneId] || [];
      if (airportsInZone.length === 0) continue;

      // Use year 2000 for share calculation (mid-range)
      const shares = zoneAssignmentService.computeDemandShares(
        airportsInZone, historicalPaxData, 2000
      );

      zoneSharesCache[zone.zoneId] = shares;

      for (const share of shares) {
        allMappingRecords.push({
          airportId: share.airportId,
          zoneId: zone.zoneId,
          demandShare: share.demandShare
        });
      }
    }

    // Batch insert mappings
    for (let i = 0; i < allMappingRecords.length; i += 500) {
      const batch = allMappingRecords.slice(i, i + 500);
      await AirportZoneMapping.bulkCreate(batch, { ignoreDuplicates: true });
    }
    console.log(`  Created ${allMappingRecords.length} airport-zone mappings.`);

    // Step 4: Compute zone distances
    console.log('\nStep 4: Computing zone distance matrix...');
    const distanceMatrix = gravityModelService.computeDistanceMatrix(metroZones);
    const distEntries = Object.keys(distanceMatrix).length / 2;
    console.log(`  Computed ${distEntries} zone-pair distances.`);

    // Step 5: For each decade, compute zone-to-zone demand
    console.log('\nStep 5: Computing gravity demand per decade...');

    const decades = calibration.decades;
    // Store: key "fromAirportId_toAirportId" -> { demand1950, demand1960, ..., fromZoneId, toZoneId, routeType }
    const airportDemandMap = {};

    // Build airport lookup
    const airportById = {};
    for (const a of airports) {
      airportById[a.id] = a;
    }

    for (const decade of decades) {
      console.log(`\n  Computing decade ${decade}...`);

      // Calibrate K_t
      const Kt = gravityModelService.calibrateKt(metroZones, countryEconomics, distanceMatrix, decade);
      console.log(`    K_t = ${Kt.toExponential(4)}`);

      // Phase 1: Compute raw airport-pair demands (normalize AFTER allocation)
      // We normalize at the airport-pair level so 0-100 represents final demand.
      // Use ratio^0.3 compression (not sqrt) to spread values across the full range,
      // otherwise ultra-short domestic mega-routes (Tokyo-Nagoya) crush everything.
      const rawPairDemands = {}; // pairKey -> { rawDemand, fromAirportId, toAirportId, fromZoneId, toZoneId }
      let maxRawPairDemand = 0;
      let zonePairsProcessed = 0;

      for (let i = 0; i < metroZones.length; i++) {
        const zoneA = metroZones[i];
        const gdpA = gravityModelService.getGdpForZone(zoneA, countryEconomics, decade);
        const fromShares = zoneSharesCache[zoneA.zoneId] || [];
        if (fromShares.length === 0) continue;

        for (let j = 0; j < metroZones.length; j++) {
          if (i === j) continue;
          const zoneB = metroZones[j];

          const key = `${zoneA.zoneId}_${zoneB.zoneId}`;
          const distance = distanceMatrix[key];
          if (!distance) continue;

          const toShares = zoneSharesCache[zoneB.zoneId] || [];
          if (toShares.length === 0) continue;

          const gdpB = gravityModelService.getGdpForZone(zoneB, countryEconomics, decade);
          const rawZoneDemand = gravityModelService.computeRawZoneDemand(
            zoneA, zoneB, gdpA, gdpB, distance, decade
          ) * Kt;

          if (rawZoneDemand <= 0) continue;
          zonePairsProcessed++;

          // Allocate raw zone demand to airport pairs (unnormalized)
          for (const from of fromShares) {
            for (const to of toShares) {
              if (from.airportId === to.airportId) continue;
              const rawPairDemand = rawZoneDemand * from.demandShare * to.demandShare;
              if (rawPairDemand <= 0) continue;

              const pairKey = `${from.airportId}_${to.airportId}`;
              // Take max if multiple zone paths lead to same airport pair
              if (!rawPairDemands[pairKey] || rawPairDemands[pairKey].rawDemand < rawPairDemand) {
                rawPairDemands[pairKey] = {
                  rawDemand: rawPairDemand,
                  fromAirportId: from.airportId,
                  toAirportId: to.airportId,
                  fromZoneId: zoneA.zoneId,
                  toZoneId: zoneB.zoneId
                };
              }
              maxRawPairDemand = Math.max(maxRawPairDemand, rawPairDemand);
            }
          }
        }
      }

      console.log(`    Zone pairs with demand: ${zonePairsProcessed}`);
      console.log(`    Airport pairs computed: ${Object.keys(rawPairDemands).length}`);
      console.log(`    Max raw pair demand: ${maxRawPairDemand.toExponential(4)}`);

      // Phase 2: Normalize all airport-pair demands to 0-100 scale
      // Use power=0.25 for aggressive compression so long-haul & secondary airports aren't crushed
      const fieldName = `demand${decade}`;
      let airportPairsCreated = 0;
      const NORM_POWER = 0.25;

      for (const [pairKey, pairData] of Object.entries(rawPairDemands)) {
        const normalizedDemand = maxRawPairDemand > 0
          ? Math.round(100 * Math.pow(pairData.rawDemand / maxRawPairDemand, NORM_POWER))
          : 0;

        if (normalizedDemand < calibration.minDemandThreshold) continue;

        if (!airportDemandMap[pairKey]) {
          const fromAirport = airportById[pairData.fromAirportId];
          const toAirport = airportById[pairData.toAirportId];
          const distance = distanceMatrix[`${pairData.fromZoneId}_${pairData.toZoneId}`] || 0;

          airportDemandMap[pairKey] = {
            fromAirportId: pairData.fromAirportId,
            toAirportId: pairData.toAirportId,
            fromZoneId: pairData.fromZoneId,
            toZoneId: pairData.toZoneId,
            routeType: gravityModelService.determineRouteType(
              fromAirport?.type, toAirport?.type, distance,
              fromAirport?.country, toAirport?.country
            ),
            demand1950: 0, demand1960: 0, demand1970: 0, demand1980: 0,
            demand1990: 0, demand2000: 0, demand2010: 0, demand2020: 0
          };
          airportPairsCreated++;
        }

        // Set this decade's demand (take max if updating from multiple zone paths)
        airportDemandMap[pairKey][fieldName] = Math.max(
          airportDemandMap[pairKey][fieldName],
          normalizedDemand
        );
      }

      console.log(`    Airport pairs stored: ${airportPairsCreated} new`);
    }

    // Step 6: Write to database
    const totalPairs = Object.keys(airportDemandMap).length;
    console.log(`\nStep 6: Writing ${totalPairs} demand records to database...`);

    // Clear existing demands
    await AirportRouteDemand.destroy({ where: {}, truncate: true, cascade: true });

    const batchSize = 1000;
    const allPairs = Object.values(airportDemandMap);
    let written = 0;

    for (let i = 0; i < allPairs.length; i += batchSize) {
      const batch = allPairs.slice(i, i + batchSize).map(pair => ({
        fromAirportId: pair.fromAirportId,
        toAirportId: pair.toAirportId,
        baseDemand: pair.demand2000, // Legacy compat
        demandCategory: gravityModelService.getDemandCategory(
          Math.max(pair.demand2000, pair.demand2010, pair.demand2020)
        ),
        routeType: pair.routeType,
        demand1950: pair.demand1950,
        demand1960: pair.demand1960,
        demand1970: pair.demand1970,
        demand1980: pair.demand1980,
        demand1990: pair.demand1990,
        demand2000: pair.demand2000,
        demand2010: pair.demand2010,
        demand2020: pair.demand2020,
        fromZoneId: pair.fromZoneId,
        toZoneId: pair.toZoneId
      }));

      await AirportRouteDemand.bulkCreate(batch, { ignoreDuplicates: true });
      written += batch.length;

      if (written % 10000 === 0 || i + batchSize >= allPairs.length) {
        console.log(`  Written ${written}/${totalPairs} records...`);
      }
    }

    // Step 7: Print statistics
    console.log('\n=== Seeding Complete ===\n');
    console.log(`Total metro zones: ${metroZones.length}`);
    console.log(`Total airport-zone mappings: ${allMappingRecords.length}`);
    console.log(`Total demand records: ${totalPairs}`);

    // Sample some key routes for verification
    console.log('\n--- Sample Route Demands (0-100 scale) ---');
    const sampleRoutes = [
      ['EGLL', 'KJFK', 'London-JFK'],
      ['OMDB', 'EGLL', 'Dubai-London'],
      ['VIDP', 'EGLL', 'Delhi-London'],
      ['KLAX', 'RJTT', 'LA-Tokyo'],
      ['LFPG', 'KJFK', 'Paris-JFK'],
      ['EGLL', 'YSSY', 'London-Sydney'],
      ['EGLL', 'LEMD', 'London-Madrid']
    ];

    for (const [fromIcao, toIcao, label] of sampleRoutes) {
      const fromAirport = airports.find(a => a.icaoCode === fromIcao);
      const toAirport = airports.find(a => a.icaoCode === toIcao);
      if (!fromAirport || !toAirport) {
        console.log(`  ${label}: Airport not found`);
        continue;
      }

      const pairKey = `${fromAirport.id}_${toAirport.id}`;
      const demand = airportDemandMap[pairKey];
      if (demand) {
        console.log(`  ${label}: 1950=${demand.demand1950} 1970=${demand.demand1970} 1990=${demand.demand1990} 2000=${demand.demand2000} 2020=${demand.demand2020}`);
      } else {
        console.log(`  ${label}: No demand record`);
      }
    }

    // Category distribution
    console.log('\n--- Demand Category Distribution (Modern Era) ---');
    const categories = { very_high: 0, high: 0, medium: 0, low: 0, very_low: 0 };
    for (const pair of allPairs) {
      const cat = gravityModelService.getDemandCategory(
        Math.max(pair.demand2000, pair.demand2010, pair.demand2020)
      );
      categories[cat]++;
    }
    for (const [cat, count] of Object.entries(categories)) {
      console.log(`  ${cat.padEnd(12)}: ${count.toLocaleString()} routes`);
    }

  } catch (error) {
    console.error('Error seeding gravity demands:', error);
    throw error;
  }
}

seedGravityDemands()
  .then(() => {
    console.log('\nGravity demand seeding completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\nGravity demand seeding failed:', error);
    process.exit(1);
  });
