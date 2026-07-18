require('dotenv').config();
const sequelize = require('../config/database');
const { Aircraft } = require('../models');

/**
 * Additive, NON-destructive import for the new combi + airship aircraft.
 *
 * Unlike seedHistoricalAircraft.js (which TRUNCATEs the aircraft table CASCADE
 * and would wipe every player/AI fleet), this script only upserts the handful of
 * new records below — safe to run against the live Railway DB. Idempotent: keyed
 * by manufacturer + model + variant, so re-running just updates them.
 *
 *   node src/scripts/addAirshipsAndCombis.js
 */

const NEW_AIRCRAFT = [
  // ── Combi (airframe type + isCombi flag) ──
  {
    manufacturer: 'Douglas', model: 'DC-4', variant: 'Combi', icaoCode: 'DC4', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 2200, cruiseSpeed: 227,
    passengerCapacity: 52, cargoCapacityKg: 6500, fuelCapacityLiters: 24000,
    purchasePrice: 12000000, usedPrice: 5500000, maintenanceCostPerHour: 950,
    maintenanceCostPerMonth: 76000, fuelBurnPerHour: 1450,
    firstIntroduced: 1946, availableFrom: 1950, availableUntil: 1975,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true, isCombi: true,
    description: 'Popular post-war piston-engined combi aircraft for passengers and freight.'
  },
  {
    manufacturer: 'Douglas', model: 'DC-6', variant: 'CF', icaoCode: 'DC6', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 4200, cruiseSpeed: 275,
    passengerCapacity: 68, cargoCapacityKg: 9000, fuelCapacityLiters: 28500,
    purchasePrice: 18000000, usedPrice: 9000000, maintenanceCostPerHour: 1250,
    maintenanceCostPerMonth: 98000, fuelBurnPerHour: 1900,
    firstIntroduced: 1952, availableFrom: 1952, availableUntil: 1985,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true, isCombi: true,
    description: 'Long-range piston combi aircraft widely used by cargo and passenger airlines.'
  },
  {
    manufacturer: 'Lockheed', model: 'L-1049', variant: 'Super Constellation Combi', icaoCode: 'CONI', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 4300, cruiseSpeed: 300,
    passengerCapacity: 72, cargoCapacityKg: 8500, fuelCapacityLiters: 22700,
    purchasePrice: 19000000, usedPrice: 9500000, maintenanceCostPerHour: 1300,
    maintenanceCostPerMonth: 102000, fuelBurnPerHour: 2000,
    firstIntroduced: 1951, availableFrom: 1951, availableUntil: 1970,
    requiredPilots: 2, requiredCabinCrew: 3, isActive: true, isCombi: true,
    description: 'Luxury triple-tail aircraft configured for mixed passenger and cargo services.'
  },
  {
    manufacturer: 'Boeing', model: '707-320C', variant: null, icaoCode: 'B703', type: 'Narrowbody',
    rangeCategory: 'Long Haul', rangeNm: 5000, cruiseSpeed: 525,
    passengerCapacity: 141, cargoCapacityKg: 18000, fuelCapacityLiters: 90700,
    purchasePrice: 42000000, usedPrice: 22000000, maintenanceCostPerHour: 2800,
    maintenanceCostPerMonth: 224000, fuelBurnPerHour: 5200,
    firstIntroduced: 1963, availableFrom: 1963, availableUntil: 1995,
    requiredPilots: 3, requiredCabinCrew: 5, isActive: true, isCombi: true,
    description: 'Convertible jet capable of carrying both passengers and main deck freight.'
  },
  {
    manufacturer: 'Boeing', model: '727-100', variant: 'QC', icaoCode: 'B721', type: 'Narrowbody',
    rangeCategory: 'Short Haul', rangeNm: 2100, cruiseSpeed: 490,
    passengerCapacity: 94, cargoCapacityKg: 12000, fuelCapacityLiters: 30000,
    purchasePrice: 28000000, usedPrice: 14000000, maintenanceCostPerHour: 2100,
    maintenanceCostPerMonth: 168000, fuelBurnPerHour: 3500,
    firstIntroduced: 1964, availableFrom: 1964, availableUntil: 2003,
    requiredPilots: 3, requiredCabinCrew: 3, isActive: true, isCombi: true,
    description: 'Quick Change variant allowing rapid conversion between passenger and cargo layouts.'
  },
  {
    manufacturer: 'Boeing', model: '747-200', variant: 'Combi', icaoCode: 'B742', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6700, cruiseSpeed: 493,
    passengerCapacity: 266, cargoCapacityKg: 45000, fuelCapacityLiters: 199000,
    purchasePrice: 125000000, usedPrice: 65000000, maintenanceCostPerHour: 6200,
    maintenanceCostPerMonth: 496000, fuelBurnPerHour: 10800,
    firstIntroduced: 1971, availableFrom: 1971, availableUntil: 2012,
    requiredPilots: 3, requiredCabinCrew: 10, isActive: true, isCombi: true,
    description: 'Classic jumbo jet with rear main deck cargo compartment.'
  },
  {
    manufacturer: 'Boeing', model: '747-400', variant: 'M', icaoCode: 'B744', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 7260, cruiseSpeed: 493,
    passengerCapacity: 313, cargoCapacityKg: 50000, fuelCapacityLiters: 216800,
    purchasePrice: 220000000, usedPrice: 110000000, maintenanceCostPerHour: 7200,
    maintenanceCostPerMonth: 576000, fuelBurnPerHour: 10100,
    firstIntroduced: 1989, availableFrom: 1989, availableUntil: 2020,
    requiredPilots: 2, requiredCabinCrew: 11, isActive: true, isCombi: true,
    description: 'Modernised 747 Combi used extensively by KLM and other international carriers.'
  },
  {
    manufacturer: 'McDonnell Douglas', model: 'MD-11', variant: 'Combi', icaoCode: 'MD11', type: 'Widebody',
    rangeCategory: 'Long Haul', rangeNm: 6700, cruiseSpeed: 510,
    passengerCapacity: 285, cargoCapacityKg: 38000, fuelCapacityLiters: 147000,
    purchasePrice: 170000000, usedPrice: 85000000, maintenanceCostPerHour: 6500,
    maintenanceCostPerMonth: 520000, fuelBurnPerHour: 8800,
    firstIntroduced: 1990, availableFrom: 1990, availableUntil: 2014,
    requiredPilots: 2, requiredCabinCrew: 9, isActive: true, isCombi: true,
    description: 'Long-haul trijet combining passenger service with substantial main deck freight.'
  },
  {
    manufacturer: 'ATR', model: '42-500', variant: 'Combi', icaoCode: 'AT45', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 800, cruiseSpeed: 300,
    passengerCapacity: 34, cargoCapacityKg: 4200, fuelCapacityLiters: 5700,
    purchasePrice: 18000000, usedPrice: 9000000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 56000, fuelBurnPerHour: 650,
    firstIntroduced: 1995, availableFrom: 1995, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true, isCombi: true,
    description: 'Regional turboprop configured for mixed passenger and freight operations.'
  },
  {
    manufacturer: 'ATR', model: '72-600', variant: 'Combi', icaoCode: 'AT76', type: 'Regional',
    rangeCategory: 'Short Haul', rangeNm: 900, cruiseSpeed: 320,
    passengerCapacity: 52, cargoCapacityKg: 6500, fuelCapacityLiters: 7000,
    purchasePrice: 29000000, usedPrice: 18000000, maintenanceCostPerHour: 900,
    maintenanceCostPerMonth: 72000, fuelBurnPerHour: 850,
    firstIntroduced: 2011, availableFrom: 2011, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true, isCombi: true,
    description: 'Modern regional combi aircraft serving remote communities and cargo routes.'
  },
  {
    manufacturer: 'Boeing', model: '737-700', variant: 'C', icaoCode: 'B737', type: 'Narrowbody',
    rangeCategory: 'Medium Haul', rangeNm: 3200, cruiseSpeed: 455,
    passengerCapacity: 126, cargoCapacityKg: 18000, fuelCapacityLiters: 26000,
    purchasePrice: 62000000, usedPrice: 42000000, maintenanceCostPerHour: 1700,
    maintenanceCostPerMonth: 136000, fuelBurnPerHour: 2400,
    firstIntroduced: 2006, availableFrom: 2006, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true, isCombi: true,
    description: 'Convertible Next Generation 737 designed for passenger and cargo operations.'
  },

  // ── Airships ──
  {
    manufacturer: 'Goodyear', model: 'GZ-20A', variant: null, icaoCode: 'SHIP', type: 'Airship',
    rangeCategory: 'Short Haul', rangeNm: 500, cruiseSpeed: 45,
    passengerCapacity: 12, cargoCapacityKg: 1000, fuelCapacityLiters: 1800,
    purchasePrice: 3500000, usedPrice: 1800000, maintenanceCostPerHour: 250,
    maintenanceCostPerMonth: 12000, fuelBurnPerHour: 110,
    firstIntroduced: 1969, availableFrom: 1969, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Advertising and sightseeing airship.'
  },
  {
    manufacturer: 'Zeppelin', model: 'NT', variant: '07', icaoCode: 'SHIP', type: 'Airship',
    rangeCategory: 'Medium Haul', rangeNm: 550, cruiseSpeed: 70,
    passengerCapacity: 14, cargoCapacityKg: 1900, fuelCapacityLiters: 2500,
    purchasePrice: 8500000, usedPrice: 5000000, maintenanceCostPerHour: 420,
    maintenanceCostPerMonth: 18000, fuelBurnPerHour: 180,
    firstIntroduced: 1997, availableFrom: 1997, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 1, isActive: true,
    description: 'Modern semi-rigid airship used for tourism, research and surveillance.'
  },
  {
    manufacturer: 'Hybrid Air Vehicles', model: 'Airlander', variant: '10', icaoCode: 'A10', type: 'Airship',
    rangeCategory: 'Medium Haul', rangeNm: 2200, cruiseSpeed: 80,
    passengerCapacity: 100, cargoCapacityKg: 10000, fuelCapacityLiters: 9000,
    purchasePrice: 42000000, usedPrice: 30000000, maintenanceCostPerHour: 700,
    maintenanceCostPerMonth: 35000, fuelBurnPerHour: 320,
    firstIntroduced: 2016, availableFrom: 2016, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 4, isActive: true,
    description: 'Hybrid airship designed for passenger transport and heavy lift operations.'
  },
  {
    manufacturer: 'LTA Research', model: 'Pathfinder 1', variant: null, icaoCode: 'SHIP', type: 'Airship',
    rangeCategory: 'Medium Haul', rangeNm: 1200, cruiseSpeed: 65,
    passengerCapacity: 24, cargoCapacityKg: 5000, fuelCapacityLiters: 6000,
    purchasePrice: 30000000, usedPrice: 25000000, maintenanceCostPerHour: 600,
    maintenanceCostPerMonth: 30000, fuelBurnPerHour: 250,
    firstIntroduced: 2023, availableFrom: 2023, availableUntil: null,
    requiredPilots: 2, requiredCabinCrew: 2, isActive: true,
    description: 'Modern experimental rigid airship focused on sustainable cargo transport.'
  }
];

async function run() {
  try {
    console.log('=== ADD COMBI + AIRSHIP AIRCRAFT (additive, non-destructive) ===\n');
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
    for (const data of NEW_AIRCRAFT) {
      const fullName = data.variant ? `${data.manufacturer} ${data.model}-${data.variant}` : `${data.manufacturer} ${data.model}`;
      const existing = await Aircraft.findOne({
        where: { manufacturer: data.manufacturer, model: data.model, variant: data.variant }
      });
      if (existing) {
        await existing.update(data);
        console.log(`↻ Updated: ${fullName}`);
        updated++;
      } else {
        await Aircraft.create(data);
        console.log(`✓ Added:   ${fullName}`);
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
