require('dotenv').config();
const sequelize = require('../config/database');
const { Aircraft } = require('../models');

/**
 * Additive, NON-destructive import for the two real post-war Goodyear blimps
 * that were actually flying around 1950 (giving 1950-era worlds an airship).
 *
 * Unlike seedHistoricalAircraft.js (which TRUNCATEs the aircraft table CASCADE
 * and would wipe every player/AI fleet), this only upserts the records below —
 * safe to run against the live Railway DB. Idempotent: keyed by
 * manufacturer + model + variant, so re-running just updates them.
 *
 *   node src/scripts/addPostwarAirships.js
 *
 * Note: specs are the real craft tuned lightly for gameplay; airships have no
 * real ICAO type code, so GZL / GZK are unique placeholders.
 */

const NEW_AIRSHIPS = [
  {
    manufacturer: 'Goodyear', model: 'L-class', variant: null, icaoCode: 'GZL', type: 'Airship',
    rangeCategory: 'Short Haul', rangeNm: 250, cruiseSpeed: 43,
    passengerCapacity: 6, cargoCapacityKg: 500, fuelCapacityLiters: 1200,
    purchasePrice: 1500000, usedPrice: 700000, maintenanceCostPerHour: 160,
    maintenanceCostPerMonth: 8000, fuelBurnPerHour: 80,
    firstIntroduced: 1938, availableFrom: 1950, availableUntil: 1969,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Small non-rigid blimp — wartime trainer flown postwar for advertising and sightseeing passenger flights.'
  },
  {
    manufacturer: 'Goodyear', model: 'K-class', variant: null, icaoCode: 'GZK', type: 'Airship',
    rangeCategory: 'Medium Haul', rangeNm: 1200, cruiseSpeed: 55,
    passengerCapacity: 10, cargoCapacityKg: 1500, fuelCapacityLiters: 3500,
    purchasePrice: 4500000, usedPrice: 2200000, maintenanceCostPerHour: 380,
    maintenanceCostPerMonth: 16000, fuelBurnPerHour: 160,
    firstIntroduced: 1938, availableFrom: 1950, availableUntil: 1960,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Large wartime patrol blimp — long-endurance non-rigid adapted for coastal passenger and light-cargo work.'
  }
];

async function run() {
  try {
    console.log('=== ADD POST-WAR AIRSHIPS (additive, non-destructive) ===\n');
    await sequelize.authenticate();
    console.log('✓ Database connected');

    // Make sure the aircraft type enum allows 'Airship' before inserting.
    try {
      await sequelize.query(`ALTER TYPE enum_aircraft_type ADD VALUE IF NOT EXISTS 'Airship'`);
      console.log("✓ 'Airship' aircraft type ensured\n");
    } catch (e) {
      console.warn(`⚠ Could not ALTER enum (may already have the value): ${e.message}\n`);
    }

    let added = 0, updated = 0;
    for (const data of NEW_AIRSHIPS) {
      const fullName = data.variant ? `${data.manufacturer} ${data.model}-${data.variant}` : `${data.manufacturer} ${data.model}`;
      const existing = await Aircraft.findOne({
        where: { manufacturer: data.manufacturer, model: data.model, variant: data.variant }
      });
      if (existing) {
        await existing.update(data);
        console.log(`↻ Updated: ${fullName} (available ${data.availableFrom}-${data.availableUntil})`);
        updated++;
      } else {
        await Aircraft.create(data);
        console.log(`✓ Added:   ${fullName} (available ${data.availableFrom}-${data.availableUntil})`);
        added++;
      }
    }

    console.log(`\nDone — ${added} added, ${updated} updated (no fleets touched).`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Failed:', error.message);
    if (error.original) console.error('DB error:', error.original.message);
    process.exit(1);
  }
}

run();
