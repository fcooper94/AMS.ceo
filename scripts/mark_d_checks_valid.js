// Mark all C checks as valid
require('dotenv').config();
const sequelize = require('../src/config/database');

async function markCChecksValid() {
  try {
    // Set last_c_check_date to 2013-02-01 for all aircraft (C check valid for 2 years)
    const [results] = await sequelize.query(`
      UPDATE user_aircraft
      SET last_c_check_date = '2013-02-01'
      WHERE last_c_check_date IS NULL OR last_c_check_date < '2012-01-01'
      RETURNING registration, last_c_check_date
    `);

    console.log(`Updated ${results.length} aircraft C check dates:`);
    results.forEach(r => console.log(`  ${r.registration}: ${r.last_c_check_date}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

markCChecksValid();
