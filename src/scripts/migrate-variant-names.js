#!/usr/bin/env node
/**
 * One-off migration: rename freighter/combi variants + add 747-400 Freighter.
 * Safe to run against Railway (non-destructive, idempotent).
 *
 *   node src/scripts/migrate-variant-names.js
 */
require('dotenv').config();
const sequelize = require('../config/database');
const { Aircraft } = require('../models');

const RENAMES = [
  // Freighters: short suffix → full word
  { manufacturer: 'Boeing',             model: '777',  from: 'F',    to: 'Freighter' },
  { manufacturer: 'Boeing',             model: '747',  from: '8F',   to: '8 Freighter' },
  { manufacturer: 'Airbus',             model: 'A330', from: '200F', to: '200 Freighter' },
  { manufacturer: 'Boeing',             model: '767',  from: '300F', to: '300 Freighter' },
  { manufacturer: 'McDonnell Douglas',  model: 'MD-11',from: 'F',    to: 'Freighter' },
  // Combis: code → readable name
  { manufacturer: 'Boeing',             model: '747-400', from: 'M',  to: 'Combi' },
  { manufacturer: 'Douglas',            model: 'DC-6',    from: 'CF', to: 'Combi' },
];

const NEW_747F = {
  manufacturer: 'Boeing', model: '747-400', variant: 'Freighter', icaoCode: 'B744', type: 'Cargo',
  rangeCategory: 'Long Haul', rangeNm: 4445, cruiseSpeed: 493,
  passengerCapacity: 0, cargoCapacityKg: 113000, mainDeckCapacityKg: 73000, cargoHoldCapacityKg: 40000,
  fuelCapacityLiters: 216840,
  purchasePrice: 280000000, usedPrice: 140000000, maintenanceCostPerHour: 4200,
  maintenanceCostPerMonth: 378000, fuelBurnPerHour: 11200,
  firstIntroduced: 1993, availableFrom: 1993, availableUntil: 2018,
  requiredPilots: 2, requiredCabinCrew: 0, isActive: true,
  description: 'Dedicated freighter with nose door and full main deck cargo. Upper deck reserved for crew rest.'
};

async function run() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database\n');

    // 1. Rename variants
    for (const r of RENAMES) {
      const [count] = await sequelize.query(
        `UPDATE aircraft SET variant = :to WHERE manufacturer = :manufacturer AND model = :model AND variant = :from`,
        { replacements: r, type: sequelize.QueryTypes.UPDATE }
      );
      const label = `${r.manufacturer} ${r.model} "${r.from}" → "${r.to}"`;
      if (count > 0) {
        console.log(`✓ Renamed: ${label}`);
      } else {
        // Check if already renamed
        const [rows] = await sequelize.query(
          `SELECT id FROM aircraft WHERE manufacturer = :manufacturer AND model = :model AND variant = :to LIMIT 1`,
          { replacements: r }
        );
        console.log(rows.length ? `· Already renamed: ${label}` : `⚠ Not found: ${label}`);
      }
    }

    // 2. Insert 747-400 Freighter (skip if exists)
    const existing = await Aircraft.findOne({
      where: { manufacturer: NEW_747F.manufacturer, model: NEW_747F.model, variant: NEW_747F.variant }
    });
    if (existing) {
      console.log(`\n· 747-400 Freighter already exists (id ${existing.id})`);
    } else {
      const created = await Aircraft.create(NEW_747F);
      console.log(`\n✓ Added 747-400 Freighter (id ${created.id})`);
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Failed:', error.message);
    if (error.original) console.error('DB error:', error.original.message);
    process.exit(1);
  }
}

run();
