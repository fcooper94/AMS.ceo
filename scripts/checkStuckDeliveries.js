#!/usr/bin/env node
/**
 * Diagnostic script: check for aircraft stuck in on_order status past their delivery date.
 * Usage: node scripts/checkStuckDeliveries.js [--fix]
 *   --fix  Force-deliver any stuck aircraft (set status to active, stamp check dates)
 */
require('dotenv').config();
const { Sequelize, Op } = require('sequelize');

const fix = process.argv.includes('--fix');

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const isLocal = /localhost|127\.0\.0\.1/.test(dbUrl);
const sequelize = new Sequelize(dbUrl, {
  logging: false,
  dialect: 'postgres',
  dialectOptions: isLocal ? {} : { ssl: { require: true, rejectUnauthorized: false } }
});

async function main() {
  try {
    await sequelize.authenticate();
    console.log('Connected to', isLocal ? 'local' : 'Railway', 'database\n');

    // Find all on-order aircraft with delivery dates in the past relative to their world's current time
    const [stuck] = await sequelize.query(`
      SELECT
        ua.id, ua.registration, ua.status,
        ua.expected_delivery_date, ua.acquisition_type, ua.financing_method,
        ua.remaining_payment, ua.world_membership_id,
        ua.aircraft_id,
        a.manufacturer, a.model,
        w.name AS world_name, w.current_time AS world_time, w.id AS world_id,
        w.last_processed_at,
        wm.airline_name, wm.is_active AS membership_active,
        wm.balance
      FROM user_aircraft ua
      JOIN world_memberships wm ON wm.id = ua.world_membership_id
      JOIN worlds w ON w.id = wm.world_id
      LEFT JOIN aircraft a ON a.id = ua.aircraft_id
      WHERE ua.status = 'on_order'
        AND ua.expected_delivery_date IS NOT NULL
        AND ua.expected_delivery_date <= w.current_time
      ORDER BY w.name, ua.expected_delivery_date
    `);

    if (stuck.length === 0) {
      console.log('No stuck deliveries found.');
      await sequelize.close();
      return;
    }

    console.log(`Found ${stuck.length} stuck on-order aircraft:\n`);
    for (const row of stuck) {
      const overdueDays = Math.floor(
        (new Date(row.world_time).getTime() - new Date(row.expected_delivery_date).getTime()) / 86400000
      );
      console.log(`  ${row.registration} (id=${row.id})`);
      console.log(`    World: ${row.world_name} (id=${row.world_id})`);
      console.log(`    Airline: ${row.airline_name} (membership active: ${row.membership_active})`);
      console.log(`    Aircraft: ${row.manufacturer} ${row.model} (aircraft_id: ${row.aircraft_id})`);
      console.log(`    Type: ${row.acquisition_type}, Financing: ${row.financing_method}`);
      console.log(`    Delivery date: ${new Date(row.expected_delivery_date).toISOString()}`);
      console.log(`    World time: ${new Date(row.world_time).toISOString()}`);
      console.log(`    Overdue: ${overdueDays} game-days`);
      console.log(`    Last processed at: ${row.last_processed_at ? new Date(row.last_processed_at).toISOString() : 'NULL'}`);
      console.log(`    Remaining payment: ${row.remaining_payment}`);
      console.log(`    Balance: ${row.balance}`);
      console.log();
    }

    if (!fix) {
      console.log('Run with --fix to force-deliver these aircraft.');
      await sequelize.close();
      return;
    }

    console.log('--- FIXING stuck deliveries ---\n');
    for (const row of stuck) {
      const now = new Date(row.world_time);
      try {
        await sequelize.query(`
          UPDATE user_aircraft SET
            status = 'active',
            acquired_at = :now,
            last_c_check_date = :now,
            last_d_check_date = :now,
            c_check_interval_days = :cInterval,
            d_check_interval_days = :dInterval,
            last_daily_check_date = :now,
            last_weekly_check_date = :now,
            last_a_check_date = :now,
            last_a_check_hours = 0,
            a_check_interval_hours = :aInterval
          WHERE id = :id AND status = 'on_order'
        `, {
          replacements: {
            id: row.id,
            now,
            cInterval: 600 + Math.floor(Math.random() * 120),
            dInterval: 2190 + Math.floor(Math.random() * 1460),
            aInterval: 800 + Math.floor(Math.random() * 200)
          }
        });

        // If it's a lease, set lease dates
        if (row.acquisition_type === 'lease') {
          const leaseEnd = new Date(now);
          leaseEnd.setMonth(leaseEnd.getMonth() + 36);
          await sequelize.query(`
            UPDATE user_aircraft SET
              lease_start_date = :now,
              lease_end_date = :leaseEnd
            WHERE id = :id
          `, { replacements: { id: row.id, now, leaseEnd } });
        }

        console.log(`  ✓ ${row.registration} (id=${row.id}) — force-delivered`);
      } catch (err) {
        console.error(`  ✗ ${row.registration} (id=${row.id}) — FAILED:`, err.message);
      }
    }

    console.log('\nDone. Stuck aircraft have been activated.');
  } catch (err) {
    console.error('Script failed:', err.message);
  } finally {
    await sequelize.close();
  }
}

main();
