// One-off: delete all RecurringMaintenance rows for AI airlines.
// AI airlines now bypass maintenance entirely — these rows are dead weight.
require('dotenv').config();
const sequelize = require('../src/config/database');

async function purgeAIMaintenance() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    // Count first
    const [[{ count }]] = await sequelize.query(`
      SELECT COUNT(*) AS count FROM recurring_maintenance
      WHERE aircraft_id IN (
        SELECT ua.id FROM user_aircraft ua
        JOIN world_memberships wm ON wm.id = ua.world_membership_id
        WHERE wm.is_ai = true
      )
    `);
    console.log(`Found ${count} AI maintenance records to delete.`);

    if (parseInt(count) === 0) {
      console.log('Nothing to do.');
      process.exit(0);
    }

    // Delete in batches to avoid long locks
    let total = 0;
    for (let batch = 0; batch < 500; batch++) {
      const [, meta] = await sequelize.query(`
        DELETE FROM recurring_maintenance WHERE ctid IN (
          SELECT rm.ctid FROM recurring_maintenance rm
          JOIN user_aircraft ua ON ua.id = rm.aircraft_id
          JOIN world_memberships wm ON wm.id = ua.world_membership_id
          WHERE wm.is_ai = true
          LIMIT 10000
        )
      `);
      const n = meta.rowCount || 0;
      total += n;
      if (n > 0) process.stdout.write(`  Deleted ${total}...\r`);
      if (n < 10000) break;
    }

    console.log(`\nDone — purged ${total} AI maintenance records.`);
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

purgeAIMaintenance();
