require('dotenv').config();
const sequelize = require('../config/database');
const { User, Flight, World, WorldMembership } = require('../models');

async function syncDatabase() {
  try {
    console.log('Starting database synchronization...');

    // Sync all models
    await sequelize.sync({ alter: true });

    console.log('✓ Database synchronized successfully');
    console.log('\nTables created/updated:');
    console.log('  - users');
    console.log('  - worlds');
    console.log('  - world_memberships');
    console.log('  - flights');

    // Close connection
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Database synchronization failed:', error);
    process.exit(1);
  }
}

syncDatabase();
