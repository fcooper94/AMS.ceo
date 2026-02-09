require('dotenv').config();
const sequelize = require('../config/database');

// Import ALL models via index.js so associations are registered
const models = require('../models');

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');
    console.log(`Models loaded: ${Object.keys(models).join(', ')}`);

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
