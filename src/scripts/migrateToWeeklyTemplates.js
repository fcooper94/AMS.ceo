/**
 * Migration: Convert dated ScheduledFlight records to weekly templates
 *
 * This script:
 * 1. Adds new columns (day_of_week, arrival_day_offset, total_duration_minutes, is_active)
 * 2. Adds last_revenue_game_day to routes table
 * 3. Migrates data from old columns to new
 * 4. Deduplicates (same aircraft + day_of_week + departure_time → keep one)
 * 5. Drops old columns (scheduled_date, arrival_date, status)
 * 6. Creates new indexes
 *
 * Run: node src/scripts/migrateToWeeklyTemplates.js
 */
require('dotenv').config();
const sequelize = require('../config/database');

async function migrate() {
  const t = await sequelize.transaction();

  try {
    console.log('Starting weekly templates migration...\n');

    // Step 1: Add new columns (if they don't exist)
    console.log('Step 1: Adding new columns...');

    const addColumnIfNotExists = async (table, column, definition) => {
      try {
        await sequelize.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${column} ${definition}`,
          { transaction: t }
        );
        console.log(`  + ${table}.${column}`);
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log(`  ~ ${table}.${column} (already exists)`);
        } else {
          throw err;
        }
      }
    };

    await addColumnIfNotExists('scheduled_flights', 'day_of_week', 'INTEGER');
    await addColumnIfNotExists('scheduled_flights', 'arrival_day_offset', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists('scheduled_flights', 'total_duration_minutes', 'INTEGER');
    await addColumnIfNotExists('scheduled_flights', 'is_active', 'BOOLEAN DEFAULT true');
    await addColumnIfNotExists('routes', 'last_revenue_game_day', 'VARCHAR(255)');

    // Step 2: Migrate data from old columns to new
    console.log('\nStep 2: Migrating data...');

    // Check if old columns exist
    const [columns] = await sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'scheduled_flights' AND column_name = 'scheduled_date'`,
      { transaction: t }
    );

    if (columns.length > 0) {
      // Populate day_of_week from scheduled_date
      const [updateResult] = await sequelize.query(
        `UPDATE scheduled_flights
         SET day_of_week = EXTRACT(DOW FROM scheduled_date::date)::integer
         WHERE day_of_week IS NULL AND scheduled_date IS NOT NULL`,
        { transaction: t }
      );
      console.log(`  Updated day_of_week for rows from scheduled_date`);

      // Populate arrival_day_offset from date difference
      await sequelize.query(
        `UPDATE scheduled_flights
         SET arrival_day_offset = COALESCE(
           (arrival_date::date - scheduled_date::date)::integer,
           0
         )
         WHERE arrival_day_offset IS NULL OR arrival_day_offset = 0`,
        { transaction: t }
      );
      console.log(`  Updated arrival_day_offset from date difference`);

      // Populate total_duration_minutes from departure/arrival times
      await sequelize.query(
        `UPDATE scheduled_flights
         SET total_duration_minutes = (
           COALESCE(arrival_day_offset, 0) * 1440 +
           EXTRACT(HOUR FROM arrival_time::time) * 60 +
           EXTRACT(MINUTE FROM arrival_time::time) -
           EXTRACT(HOUR FROM departure_time::time) * 60 -
           EXTRACT(MINUTE FROM departure_time::time)
         )
         WHERE total_duration_minutes IS NULL
           AND arrival_time IS NOT NULL
           AND departure_time IS NOT NULL`,
        { transaction: t }
      );
      console.log(`  Computed total_duration_minutes`);

      // Set is_active based on status
      const [statusCol] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns
         WHERE table_name = 'scheduled_flights' AND column_name = 'status'`,
        { transaction: t }
      );

      if (statusCol.length > 0) {
        await sequelize.query(
          `UPDATE scheduled_flights
           SET is_active = (status != 'cancelled')
           WHERE is_active IS NULL`,
          { transaction: t }
        );
        console.log(`  Set is_active from status`);
      }

      // Step 3: Deduplicate - keep one template per (aircraft_id, day_of_week, departure_time)
      console.log('\nStep 3: Deduplicating...');

      const [countBefore] = await sequelize.query(
        `SELECT COUNT(*) as count FROM scheduled_flights`,
        { transaction: t }
      );
      console.log(`  Records before dedup: ${countBefore[0].count}`);

      // Delete duplicates, keeping the one with the earliest created_at
      await sequelize.query(
        `DELETE FROM scheduled_flights
         WHERE id NOT IN (
           SELECT DISTINCT ON (aircraft_id, day_of_week, departure_time) id
           FROM scheduled_flights
           WHERE day_of_week IS NOT NULL
           ORDER BY aircraft_id, day_of_week, departure_time, created_at ASC
         )`,
        { transaction: t }
      );

      const [countAfter] = await sequelize.query(
        `SELECT COUNT(*) as count FROM scheduled_flights`,
        { transaction: t }
      );
      console.log(`  Records after dedup: ${countAfter[0].count}`);
      console.log(`  Removed ${countBefore[0].count - countAfter[0].count} duplicate records`);

      // Step 4: Make day_of_week NOT NULL now that all rows have values
      console.log('\nStep 4: Setting constraints...');

      // Set any remaining NULLs to 0 (Sunday) as fallback
      await sequelize.query(
        `UPDATE scheduled_flights SET day_of_week = 0 WHERE day_of_week IS NULL`,
        { transaction: t }
      );
      await sequelize.query(
        `UPDATE scheduled_flights SET is_active = true WHERE is_active IS NULL`,
        { transaction: t }
      );

      await sequelize.query(
        `ALTER TABLE scheduled_flights ALTER COLUMN day_of_week SET NOT NULL`,
        { transaction: t }
      );

      // Step 5: Drop old columns
      console.log('\nStep 5: Dropping old columns...');

      // Drop old indexes first
      try {
        await sequelize.query(
          `DROP INDEX IF EXISTS scheduled_flights_scheduled_date`,
          { transaction: t }
        );
        await sequelize.query(
          `DROP INDEX IF EXISTS scheduled_flights_arrival_date`,
          { transaction: t }
        );
        await sequelize.query(
          `DROP INDEX IF EXISTS scheduled_flights_aircraft_id_scheduled_date_departure_time`,
          { transaction: t }
        );
      } catch (err) {
        console.log(`  (index cleanup: ${err.message})`);
      }

      // Drop old columns
      for (const col of ['scheduled_date', 'arrival_date', 'status']) {
        try {
          await sequelize.query(
            `ALTER TABLE scheduled_flights DROP COLUMN IF EXISTS ${col}`,
            { transaction: t }
          );
          console.log(`  - Dropped ${col}`);
        } catch (err) {
          console.log(`  ~ ${col}: ${err.message}`);
        }
      }

      // Drop the enum type for status
      try {
        await sequelize.query(
          `DROP TYPE IF EXISTS "enum_scheduled_flights_status"`,
          { transaction: t }
        );
        console.log(`  - Dropped enum_scheduled_flights_status type`);
      } catch (err) {
        // Ignore if it doesn't exist
      }
    } else {
      console.log('  Old columns not found - schema already migrated');
    }

    // Step 6: Create new indexes
    console.log('\nStep 6: Creating new indexes...');

    try {
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS scheduled_flights_day_of_week
         ON scheduled_flights (day_of_week)`,
        { transaction: t }
      );
      console.log(`  + day_of_week index`);
    } catch (err) {
      console.log(`  ~ day_of_week index: ${err.message}`);
    }

    try {
      await sequelize.query(
        `CREATE UNIQUE INDEX IF NOT EXISTS scheduled_flights_aircraft_day_time
         ON scheduled_flights (aircraft_id, day_of_week, departure_time)`,
        { transaction: t }
      );
      console.log(`  + unique (aircraft_id, day_of_week, departure_time) index`);
    } catch (err) {
      console.log(`  ~ unique index: ${err.message}`);
    }

    await t.commit();
    console.log('\n✓ Migration completed successfully!');

    // Show final state
    const [finalCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM scheduled_flights`
    );
    const [routeCount] = await sequelize.query(
      `SELECT COUNT(*) as count FROM routes`
    );
    console.log(`  Final scheduled_flights: ${finalCount[0].count} templates`);
    console.log(`  Routes: ${routeCount[0].count}`);

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    await t.rollback();
    console.error('\n✗ Migration failed:', error);
    await sequelize.close();
    process.exit(1);
  }
}

migrate();
