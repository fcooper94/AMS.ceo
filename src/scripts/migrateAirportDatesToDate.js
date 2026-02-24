require('dotenv').config();
const sequelize = require('../config/database');

/**
 * Migrate operational_from and operational_until from INTEGER (year) to DATE
 * Converts existing year values like 1948 → '1948-01-01'
 */
async function migrateAirportDates() {
  try {
    console.log('=== Migrating Airport Dates: INTEGER → DATE ===\n');

    await sequelize.authenticate();
    console.log('Connected to database\n');

    // Check current column type
    const [colInfo] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'airports'
        AND column_name IN ('operational_from', 'operational_until')
      ORDER BY column_name
    `);

    console.log('Current column types:');
    colInfo.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    const isAlreadyDate = colInfo.some(c => c.data_type === 'date');
    if (isAlreadyDate) {
      console.log('\nColumns are already DATE type. Nothing to migrate.');
      process.exit(0);
    }

    console.log('\nMigrating columns...\n');

    // Step 1: Add temporary date columns
    await sequelize.query(`
      ALTER TABLE airports
      ADD COLUMN IF NOT EXISTS operational_from_date DATE,
      ADD COLUMN IF NOT EXISTS operational_until_date DATE
    `);
    console.log('Added temporary date columns');

    // Step 2: Convert integer years to dates (year → YYYY-01-01)
    await sequelize.query(`
      UPDATE airports
      SET
        operational_from_date = CASE
          WHEN operational_from IS NOT NULL THEN make_date(operational_from, 1, 1)
          ELSE NULL
        END,
        operational_until_date = CASE
          WHEN operational_until IS NOT NULL THEN make_date(operational_until, 12, 31)
          ELSE NULL
        END
    `);
    console.log('Converted integer years to dates');

    // Step 3: Drop old integer columns
    await sequelize.query(`
      ALTER TABLE airports
      DROP COLUMN IF EXISTS operational_from,
      DROP COLUMN IF EXISTS operational_until
    `);
    console.log('Dropped old integer columns');

    // Step 4: Rename temporary columns to final names
    await sequelize.query(`
      ALTER TABLE airports
      RENAME COLUMN operational_from_date TO operational_from
    `);
    await sequelize.query(`
      ALTER TABLE airports
      RENAME COLUMN operational_until_date TO operational_until
    `);
    console.log('Renamed temporary columns to final names');

    // Step 5: Re-create indexes
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS airports_operational_from ON airports (operational_from)
    `);
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS airports_operational_until ON airports (operational_until)
    `);
    console.log('Re-created indexes');

    // Verify
    const [newColInfo] = await sequelize.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'airports'
        AND column_name IN ('operational_from', 'operational_until')
      ORDER BY column_name
    `);

    console.log('\nNew column types:');
    newColInfo.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    // Show sample data
    const [samples] = await sequelize.query(`
      SELECT icao_code, name, operational_from, operational_until
      FROM airports
      WHERE operational_from IS NOT NULL
      ORDER BY operational_from ASC
      LIMIT 10
    `);

    console.log('\nSample converted data:');
    samples.forEach(s => {
      console.log(`  ${s.icao_code} - ${s.name}: ${s.operational_from} → ${s.operational_until || 'active'}`);
    });

    console.log('\nMigration complete!');
    process.exit(0);
  } catch (error) {
    console.error('\nMigration failed:', error);
    process.exit(1);
  }
}

migrateAirportDates();
