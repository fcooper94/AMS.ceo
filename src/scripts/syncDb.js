require('dotenv').config();
const sequelize = require('../config/database');

// Import ALL models via index.js so associations are registered
const models = require('../models');

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    console.log(`Models loaded: ${Object.keys(models).join(', ')}`);

    // Drop old global-unique registration constraints (now per-world unique via composite index)
    try {
      for (const name of ['user_aircraft_registration_key', 'user_aircraft_registration_key1', 'user_aircraft_registration_key2']) {
        await sequelize.query(`ALTER TABLE user_aircraft DROP CONSTRAINT IF EXISTS ${name}`);
        await sequelize.query(`DROP INDEX IF EXISTS ${name}`);
      }
      await sequelize.query('DROP INDEX IF EXISTS user_aircraft_registration');
      console.log('✓ Cleaned up old registration uniqueness constraints');
    } catch (e) {
      console.log('Note: Old registration constraints may already be removed');
    }

    // Drop accumulated worlds name uniqueness constraints (name no longer needs to be unique)
    try {
      const [nameConstraints] = await sequelize.query(
        "SELECT conname FROM pg_constraint WHERE conrelid = 'worlds'::regclass AND conname LIKE 'worlds_name_key%'"
      );
      for (const c of nameConstraints) {
        await sequelize.query(`ALTER TABLE worlds DROP CONSTRAINT IF EXISTS "${c.conname}"`);
        await sequelize.query(`DROP INDEX IF EXISTS "${c.conname}"`);
      }
      if (nameConstraints.length > 0) {
        console.log(`✓ Cleaned up ${nameConstraints.length} old worlds name uniqueness constraints`);
      }
    } catch (e) {
      console.log('Note: Worlds name constraints cleanup skipped');
    }

    // Add contractor columns to world_memberships if missing (needed before sync)
    try {
      for (const col of ['cleaning_contractor', 'ground_contractor', 'engineering_contractor']) {
        await sequelize.query(`
          ALTER TABLE world_memberships ADD COLUMN IF NOT EXISTS "${col}" VARCHAR(255) DEFAULT 'standard'
        `);
      }
      console.log('✓ Ensured contractor columns exist on world_memberships');
    } catch (e) {
      console.log('Note: Contractor columns may already exist or table not yet created');
    }

    // Drop old enum types for columns now using STRING (avoids Sequelize enum+comment bugs)
    try {
      for (const enumName of [
        'enum_worlds_world_type',
        'enum_used_aircraft_for_sale_seller_type',
        'enum_used_aircraft_for_sale_status'
      ]) {
        await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumName}" CASCADE`);
      }
      // Convert used_aircraft_for_sale enum columns to VARCHAR if needed (model now uses STRING)
      for (const col of ['seller_type', 'status']) {
        try {
          const [info] = await sequelize.query(
            `SELECT data_type FROM information_schema.columns WHERE table_name='used_aircraft_for_sale' AND column_name='${col}'`
          );
          if (info.length > 0 && info[0].data_type === 'USER-DEFINED') {
            await sequelize.query(`ALTER TABLE "used_aircraft_for_sale" ALTER COLUMN "${col}" DROP DEFAULT`);
            await sequelize.query(`ALTER TABLE "used_aircraft_for_sale" ALTER COLUMN "${col}" TYPE VARCHAR(255) USING ("${col}"::text)`);
          }
        } catch (e) { /* column may not exist yet */ }
      }
      console.log('✓ Dropped old enum types for STRING columns');
    } catch (e) {
      console.log('Note: enum type cleanup skipped');
    }

    // Pre-convert ENUM columns to their correct types before Sequelize sync.
    // Sequelize generates buggy SQL: SET DEFAULT 'value' then ALTER TYPE enum, which fails
    // because Postgres can't auto-cast the string default to the enum type.
    // By converting columns first, Sequelize sees them as already correct and skips the ALTER.
    try {
      const enumFixups = [
        { table: 'routes', column: 'transport_type', enumName: 'enum_routes_transport_type', values: "'both','passengers_only','cargo_only'", dflt: 'both' },
        { table: 'routes', column: 'frequency', enumName: 'enum_routes_frequency', values: "'daily','weekly','biweekly','monthly'", dflt: 'daily' },
        { table: 'airports', column: 'type', enumName: 'enum_airports_type', values: "'International Hub','Major','Regional','Small Regional'", dflt: 'Regional' },
        { table: 'aircraft', column: 'type', enumName: 'enum_aircraft_type', values: "'Narrowbody','Widebody','Regional','Cargo'", dflt: null },
        { table: 'aircraft', column: 'range_category', enumName: 'enum_aircraft_range_category', values: "'Short Haul','Medium Haul','Long Haul'", dflt: null },
        { table: 'airport_route_demands', column: 'demand_category', enumName: 'enum_airport_route_demands_demand_category', values: "'very_high','high','medium','low','very_low'", dflt: 'medium' },
        { table: 'airport_route_demands', column: 'route_type', enumName: 'enum_airport_route_demands_route_type', values: "'business','leisure','mixed','cargo','regional'", dflt: 'mixed' },
        { table: 'pricing_defaults', column: 'pricing_type', enumName: 'enum_pricing_defaults_pricing_type', values: "'global','aircraft_type'", dflt: null },
        { table: 'worlds', column: 'status', enumName: 'enum_worlds_status', values: "'setup','active','paused','completed'", dflt: 'setup' },
        { table: 'worlds', column: 'difficulty', enumName: 'enum_worlds_difficulty', values: "'easy','medium','hard'", dflt: null },
        { table: 'flights', column: 'state', enumName: 'enum_flights_state', values: "'scheduled','claimable','executing_ai','executing_human','pending_reconciliation','resolved'", dflt: 'scheduled' },
        { table: 'flights', column: 'execution_type', enumName: 'enum_flights_execution_type', values: "'ai','human'", dflt: null },
        { table: 'user_aircraft', column: 'acquisition_type', enumName: 'enum_user_aircraft_acquisition_type', values: "'purchase','lease'", dflt: 'purchase' },
        { table: 'user_aircraft', column: 'status', enumName: 'enum_user_aircraft_status', values: "'active','maintenance','storage','recalling','sold','listed_sale','listed_lease','leased_out'", dflt: 'active' },
        { table: 'recurring_maintenance', column: 'check_type', enumName: 'enum_recurring_maintenance_check_type', values: "'daily','weekly','A','C','D'", dflt: null },
        { table: 'recurring_maintenance', column: 'status', enumName: 'enum_recurring_maintenance_status', values: "'active','inactive','completed'", dflt: 'active' },
        { table: 'airspace_restrictions', column: 'restriction_type', enumName: 'enum_airspace_restrictions_restriction_type', values: "'until_further_notice','date_range'", dflt: null },
      ];
      for (const { table, column, enumName, values, dflt } of enumFixups) {
        try {
          // Check if column exists and what type it is
          const [cols] = await sequelize.query(
            `SELECT data_type, udt_name FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}'`
          );
          if (cols.length === 0) continue; // column doesn't exist yet, sync will create it
          if (cols[0].udt_name === enumName) continue; // already correct enum type

          // Column exists but is not the correct enum type — convert it
          // Use $$ dollar-quoting for the DO block to avoid single-quote escaping issues
          await sequelize.query('SET statement_timeout = 0'); // no timeout for DDL
          // Drop any indexes referencing this column (stale operator class refs block type conversion)
          const [idxs] = await sequelize.query(
            `SELECT indexname FROM pg_indexes WHERE tablename='${table}' AND indexdef LIKE '%${column}%' AND indexname NOT LIKE '%pkey%'`
          );
          for (const idx of idxs) {
            await sequelize.query(`DROP INDEX IF EXISTS "${idx.indexname}"`);
          }
          await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`);
          // Step 1: Convert to TEXT first (always fast, no value validation)
          await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TEXT USING ("${column}"::text)`);
          // Step 2: Drop old enum type (CASCADE to remove any operator references), then recreate
          await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumName}" CASCADE`);
          await sequelize.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${values})`);
          // Step 3: Convert from TEXT to fresh enum (no stale operator issues)
          await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE "public"."${enumName}" USING ("${column}"::"public"."${enumName}")`);
          if (dflt) {
            await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT '${dflt}'::"public"."${enumName}"`);
          }
          console.log(`  ✓ Converted ${table}.${column} to ${enumName}`);
        } catch (e) {
          console.log(`  Note: ${table}.${column} fixup skipped: ${e.message || e}`);
        }
      }
      console.log('✓ Ensured enum columns have correct types');
    } catch (e) {
      console.log('Note: Enum column fixup skipped');
    }

    // Drop old truncated pricing_defaults index (name collision with new index)
    try {
      await sequelize.query('DROP INDEX IF EXISTS "pricing_defaults_world_membership_id_pricing_type_aircraft_type"');
      await sequelize.query('DROP INDEX IF EXISTS "pricing_defaults_world_membership_id_pricing_type_aircraft_type_key"');
      console.log('✓ Cleaned up old pricing_defaults indexes');
    } catch (e) {
      console.log('Note: pricing_defaults index cleanup skipped');
    }

    // Sync all models (alter: true adds new columns/tables without dropping existing data)
    await sequelize.sync({ alter: true });

    console.log('\n✓ Database synchronized successfully');
    console.log('\nTables created/updated:');
    const tableNames = Object.values(models)
      .filter(m => m.tableName)
      .map(m => `  - ${m.tableName}`);
    tableNames.forEach(t => console.log(t));

    // Close connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database synchronization failed:', error);
    process.exit(1);
  }
}

syncDatabase();
