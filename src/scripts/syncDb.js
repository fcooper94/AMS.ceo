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
        { table: 'user_aircraft', column: 'status', enumName: 'enum_user_aircraft_status', values: "'active','maintenance','storage','recalling','sold','listed_sale','listed_lease','leased_out','on_order','cabin_refit'", dflt: 'active' },
        { table: 'recurring_maintenance', column: 'check_type', enumName: 'enum_recurring_maintenance_check_type', values: "'daily','weekly','A','C','D'", dflt: null },
        { table: 'recurring_maintenance', column: 'status', enumName: 'enum_recurring_maintenance_status', values: "'active','inactive','completed'", dflt: 'active' },
        { table: 'loans', column: 'status', enumName: 'enum_loans_status', values: "'active','paid_off','defaulted'", dflt: 'active' },
        { table: 'loans', column: 'loan_type', enumName: 'enum_loans_loan_type', values: "'working_capital','fleet_expansion','infrastructure'", dflt: null },
        { table: 'loans', column: 'repayment_strategy', enumName: 'enum_loans_repayment_strategy', values: "'fixed','reducing','interest_only'", dflt: 'fixed' },
        { table: 'airspace_restrictions', column: 'restriction_type', enumName: 'enum_airspace_restrictions_restriction_type', values: "'until_further_notice','date_range'", dflt: null },
      ];
      for (const { table, column, enumName, values, dflt } of enumFixups) {
        try {
          // Check if column exists and what type it is
          const [cols] = await sequelize.query(
            `SELECT data_type, udt_name FROM information_schema.columns WHERE table_name='${table}' AND column_name='${column}'`
          );
          if (cols.length === 0) continue; // column doesn't exist yet, sync will create it
          // Even if the enum type matches, we still need to drop/recreate to fix stale defaults
          // Only skip if it's already the correct enum AND the type exists cleanly
          const isAlreadyEnum = cols[0].udt_name === enumName;

          await sequelize.query('SET statement_timeout = 0');
          // Drop any indexes referencing this column
          const [idxs] = await sequelize.query(
            `SELECT indexname FROM pg_indexes WHERE tablename='${table}' AND indexdef LIKE '%${column}%' AND indexname NOT LIKE '%pkey%'`
          );
          for (const idx of idxs) {
            await sequelize.query(`DROP INDEX IF EXISTS "${idx.indexname}"`);
          }
          // Drop default — try normal ALTER, then force via system catalog if that fails
          try {
            await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT`);
          } catch (_) {
            // Force-remove default via system catalog (broken enum operators block normal DROP DEFAULT)
            try {
              await sequelize.query(`
                DELETE FROM pg_catalog.pg_attrdef
                WHERE adrelid = '"${table}"'::regclass
                AND adnum = (SELECT attnum FROM pg_catalog.pg_attribute
                             WHERE attrelid = '"${table}"'::regclass AND attname = '${column}')
              `);
              await sequelize.query(`
                UPDATE pg_catalog.pg_attribute SET atthasdef = false
                WHERE attrelid = '"${table}"'::regclass AND attname = '${column}'
              `);
            } catch (__) {}
          }
          // Convert to TEXT first
          try {
            await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE TEXT USING ("${column}"::text)`);
          } catch (textErr) {
            // Stale enum operators block ALTER TYPE — use column-swap fallback
            try {
              await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}_tmp"`);
              await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}_tmp" TEXT`);
              await sequelize.query(`UPDATE "${table}" SET "${column}_tmp" = "${column}"::text`);
              await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN "${column}" CASCADE`);
              await sequelize.query(`ALTER TABLE "${table}" RENAME COLUMN "${column}_tmp" TO "${column}"`);
            } catch (swapErr) {
              // Column-swap also failed — clean up tmp column and try enum-only fix
              try { await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}_tmp"`); } catch (__) {}
              throw swapErr;
            }
          }
          // Drop old enum type and recreate with correct values
          await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumName}" CASCADE`);
          await sequelize.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${values})`);
          // Convert from TEXT to fresh enum
          await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE "public"."${enumName}" USING ("${column}"::"public"."${enumName}")`);
          if (dflt) {
            await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT '${dflt}'::"public"."${enumName}"`);
          }
          console.log(`  ✓ ${isAlreadyEnum ? 'Refreshed' : 'Converted'} ${table}.${column} to ${enumName}`);
        } catch (e) {
          // Full fixup failed — try to at least match Sequelize's expectations so sync() skips this column
          try { await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}_tmp"`); } catch (__) {}
          // Add any missing enum values (can't remove extras, but at least model values exist)
          const valueList = values.replace(/'/g, '').split(',');
          for (const val of valueList) {
            try { await sequelize.query(`ALTER TYPE "public"."${enumName}" ADD VALUE IF NOT EXISTS '${val.trim()}'`); } catch (__) {}
          }
          // Restore the default so Sequelize sees it as matching
          if (dflt) {
            try { await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" SET DEFAULT '${dflt}'::"public"."${enumName}"`); } catch (__) {}
          }
          // Drop NOT NULL if model allows null — prevents Sequelize from generating ALTER that cascades into TYPE change
          try { await sequelize.query(`ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP NOT NULL`); } catch (__) {}
          console.log(`  Note: ${table}.${column} fixup skipped (patched defaults): ${e.message || e}`);
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

    // Clean up orphaned rows that would block foreign key constraints
    try {
      const orphanTables = ['weekly_financials', 'notifications', 'user_aircraft', 'routes', 'loans', 'pricing_defaults'];
      let totalCleaned = 0;
      for (const table of orphanTables) {
        try {
          const [, meta] = await sequelize.query(
            `DELETE FROM "${table}" WHERE world_membership_id IS NOT NULL AND world_membership_id NOT IN (SELECT id FROM world_memberships)`
          );
          if (meta?.rowCount) totalCleaned += meta.rowCount;
        } catch (tableErr) {
          // Table may not exist yet or column name differs — skip
        }
      }
      console.log(`✓ Cleaned up orphaned rows${totalCleaned > 0 ? ` (${totalCleaned} removed)` : ''}`);
    } catch (e) {
      console.log(`Note: Orphan cleanup skipped: ${e.message}`);
    }

    // Fix ANY columns left as TEXT with stale enum defaults (from previous partial fixups)
    // Dynamically find all affected columns by querying the database
    try {
      const [brokenCols] = await sequelize.query(`
        SELECT c.table_name, c.column_name, c.column_default
        FROM information_schema.columns c
        WHERE c.table_schema = 'public'
        AND c.data_type IN ('text', 'character varying')
        AND (
          c.column_default LIKE '%::enum_%'
          OR EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'enum_' || c.table_name || '_' || c.column_name AND t.typtype = 'e')
        )
      `);
      for (const col of brokenCols) {
        const table = col.table_name;
        const column = col.column_name;
        try {
          // Determine enum type name: from default expression or from naming convention
          let enumName;
          let dflt = null;
          if (col.column_default) {
            const enumMatch = col.column_default.match(/::(?:public\.)?("?)(enum_[a-z_]+)\1/);
            if (enumMatch) enumName = enumMatch[2];
            const dfltMatch = col.column_default.match(/^'([^']+)'/);
            if (dfltMatch) dflt = dfltMatch[1];
          }
          if (!enumName) {
            // Derive from Sequelize naming convention: enum_{table}_{column}
            enumName = `enum_${table}_${column}`;
          }
          // Get enum values from pg_enum
          const [enumVals] = await sequelize.query(
            `SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname='${enumName}') ORDER BY enumsortorder`
          );
          if (enumVals.length === 0) continue;
          const values = enumVals.map(e => `'${e.enumlabel}'`).join(',');

          // Full column rebuild: backup → drop column → drop enum → recreate → restore
          await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}_bak" TEXT`);
          await sequelize.query(`UPDATE "${table}" SET "${column}_bak" = "${column}"`);
          await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN "${column}"`);
          await sequelize.query(`DROP TYPE IF EXISTS "public"."${enumName}" CASCADE`);
          await sequelize.query(`CREATE TYPE "public"."${enumName}" AS ENUM(${values})`);
          await sequelize.query(`ALTER TABLE "${table}" ADD COLUMN "${column}" "public"."${enumName}"${dflt ? ` DEFAULT '${dflt}'::"public"."${enumName}"` : ''}`);
          await sequelize.query(`UPDATE "${table}" SET "${column}" = "${column}_bak"::"public"."${enumName}"`);
          await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN "${column}_bak"`);
          console.log(`  ✓ Restored ${table}.${column} from TEXT to ${enumName}`);
        } catch (e) {
          try { await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${column}_bak"`); } catch (__) {}
          console.log(`  Note: ${table}.${column} restore failed: ${e.message}`);
        }
      }
      if (brokenCols.length > 0) {
        console.log(`✓ Fixed ${brokenCols.length} TEXT columns with stale enum defaults`);
      }
    } catch (e) {
      console.log(`Note: TEXT→enum restore scan skipped: ${e.message}`);
    }

    // Add revenue breakdown JSONB columns to weekly_financials if missing
    try {
      await sequelize.query(`
        ALTER TABLE weekly_financials
          ADD COLUMN IF NOT EXISTS passenger_revenue_breakdown JSONB DEFAULT '{}'::jsonb,
          ADD COLUMN IF NOT EXISTS cargo_revenue_breakdown JSONB DEFAULT '{}'::jsonb
      `);
      console.log('✓ Ensured revenue breakdown columns exist on weekly_financials');
    } catch (e) {
      console.log('Note: Revenue breakdown columns may already exist or table not yet created');
    }

    // Add marketing costs column to weekly_financials if missing
    try {
      await sequelize.query(`
        ALTER TABLE weekly_financials
          ADD COLUMN IF NOT EXISTS marketing_costs DECIMAL(15,2) DEFAULT 0
      `);
      console.log('✓ Ensured marketing_costs column exists on weekly_financials');
    } catch (e) {
      console.log('Note: marketing_costs column may already exist or table not yet created');
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
