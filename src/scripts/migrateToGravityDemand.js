require('dotenv').config();
const sequelize = require('../config/database');

/**
 * Migration: Add gravity demand model tables and columns
 *
 * Creates metro_zones and airport_zone_mappings tables,
 * and adds era-specific demand columns to airport_route_demands.
 */
async function migrate() {
  try {
    console.log('Starting gravity demand model migration...\n');

    // 1. Create metro_zones table
    console.log('Creating metro_zones table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS metro_zones (
        id VARCHAR(10) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        country_code VARCHAR(2) NOT NULL,
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('  metro_zones table created.');

    // 2. Create airport_zone_mappings table
    console.log('Creating airport_zone_mappings table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS airport_zone_mappings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        airport_id UUID NOT NULL REFERENCES airports(id) ON DELETE CASCADE,
        zone_id VARCHAR(10) NOT NULL REFERENCES metro_zones(id) ON DELETE CASCADE,
        demand_share DECIMAL(5, 4) NOT NULL DEFAULT 1.0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_airport_zone UNIQUE(airport_id, zone_id)
      )
    `);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_azm_airport ON airport_zone_mappings(airport_id)`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_azm_zone ON airport_zone_mappings(zone_id)`);
    console.log('  airport_zone_mappings table created.');

    // 3. Add era-specific demand columns to airport_route_demands
    console.log('Adding era columns to airport_route_demands...');

    const columns = [
      { name: 'demand_1950', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_1960', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_1970', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_1980', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_1990', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_2000', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_2010', type: 'INTEGER DEFAULT 0' },
      { name: 'demand_2020', type: 'INTEGER DEFAULT 0' },
      { name: 'from_zone_id', type: 'VARCHAR(10)' },
      { name: 'to_zone_id', type: 'VARCHAR(10)' }
    ];

    for (const col of columns) {
      try {
        await sequelize.query(`ALTER TABLE airport_route_demands ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
        console.log(`  Added column: ${col.name}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  Column ${col.name} already exists, skipping.`);
        } else {
          throw err;
        }
      }
    }

    // 4. Create index for era-specific demand lookups
    console.log('Creating era demand indexes...');
    try {
      await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_route_demands_from_d2000 ON airport_route_demands(from_airport_id, demand_2000)`);
      console.log('  Index idx_route_demands_from_d2000 created.');
    } catch (err) {
      console.log('  Index may already exist, skipping.');
    }

    // 5. Copy existing base_demand to demand_2000 for backward compat
    console.log('Populating demand_2000 from existing base_demand...');
    const [, meta] = await sequelize.query(`
      UPDATE airport_route_demands
      SET demand_2000 = base_demand
      WHERE demand_2000 = 0 AND base_demand > 0
    `);
    console.log(`  Updated ${meta?.rowCount || 0} rows.`);

    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  }
}

migrate()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
