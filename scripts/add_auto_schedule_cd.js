require('dotenv').config();
const sequelize = require('../src/config/database');

async function addAutoScheduleColumns() {
  try {
    await sequelize.query(`
      ALTER TABLE user_aircraft
      ADD COLUMN IF NOT EXISTS auto_schedule_c BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS auto_schedule_d BOOLEAN DEFAULT FALSE;
    `);

    console.log('Successfully added auto_schedule_c and auto_schedule_d columns');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addAutoScheduleColumns();
