/**
 * Reset all maintenance history for testing
 * Run with: node scripts/reset-maintenance.js
 */

require('dotenv').config();
const sequelize = require('../src/config/database');

async function resetMaintenanceHistory() {
  try {
    console.log('Resetting maintenance history...\n');

    // 1. Clear all last check dates on aircraft
    const [updateResult] = await sequelize.query(`
      UPDATE user_aircraft SET
        last_daily_check_date = NULL,
        last_weekly_check_date = NULL,
        last_a_check_date = NULL,
        last_a_check_hours = NULL,
        last_c_check_date = NULL,
        last_d_check_date = NULL
    `);
    console.log('✓ Cleared all maintenance check dates from aircraft');

    // 2. Delete all scheduled/recurring maintenance
    const [deleteResult] = await sequelize.query(`
      DELETE FROM recurring_maintenance
    `);
    console.log('✓ Deleted all scheduled maintenance records');

    // 3. Verify the reset
    const [aircraftCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM user_aircraft
    `);
    const [maintenanceCount] = await sequelize.query(`
      SELECT COUNT(*) as count FROM recurring_maintenance
    `);

    console.log('\n--- Reset Complete ---');
    console.log(`Aircraft in database: ${aircraftCount[0].count}`);
    console.log(`Maintenance records remaining: ${maintenanceCount[0].count}`);
    console.log('\nAll aircraft will now show expired checks and can be tested fresh.');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting maintenance:', error.message);
    process.exit(1);
  }
}

resetMaintenanceHistory();
