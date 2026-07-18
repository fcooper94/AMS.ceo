require('dotenv').config();
const sequelize = require('../config/database');
const { SightseeingTour } = require('../models');

/**
 * Non-destructive: creates the `sightseeing_tours` table if it doesn't exist.
 * Uses Model.sync() (CREATE TABLE IF NOT EXISTS) — it does NOT alter or drop
 * anything, so it's safe to run against the live Railway DB. Idempotent.
 *
 *   node src/scripts/createSightseeingToursTable.js
 */
async function run() {
  try {
    console.log('=== CREATE sightseeing_tours TABLE (non-destructive) ===\n');
    await sequelize.authenticate();
    console.log('✓ Database connected');

    await SightseeingTour.sync(); // CREATE TABLE IF NOT EXISTS
    console.log('✓ sightseeing_tours table ensured');

    process.exit(0);
  } catch (error) {
    console.error('\n✗ Failed:', error.message);
    if (error.original) console.error('DB error:', error.original.message);
    process.exit(1);
  }
}

run();
