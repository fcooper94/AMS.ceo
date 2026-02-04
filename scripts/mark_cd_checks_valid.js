// Mark all C and D checks as valid for testing A checks
require('dotenv').config();
const sequelize = require('../src/config/database');

async function markCDChecksValid() {
  try {
    // Game time is around 2014, so set dates that make checks valid:
    // C check valid for ~2 years, set to 2013-06-01
    // D check valid for 5-7 years, set to 2012-01-01

    console.log('Marking C checks as valid...');
    const [cResults] = await sequelize.query(`
      UPDATE user_aircraft
      SET last_c_check_date = '2013-06-01'
      WHERE last_c_check_date IS NULL OR last_c_check_date < '2012-01-01'
      RETURNING registration, last_c_check_date
    `);
    console.log(`Updated ${cResults.length} aircraft C check dates`);

    console.log('\nMarking D checks as valid...');
    const [dResults] = await sequelize.query(`
      UPDATE user_aircraft
      SET last_d_check_date = '2012-01-01'
      WHERE last_d_check_date IS NULL OR last_d_check_date < '2010-01-01'
      RETURNING registration, last_d_check_date
    `);
    console.log(`Updated ${dResults.length} aircraft D check dates`);

    console.log('\nDone! C and D checks are now valid.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

markCDChecksValid();
