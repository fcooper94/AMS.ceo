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
