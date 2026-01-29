require('dotenv').config();
const sequelize = require('../config/database');

/**
 * Replace infrastructure_level column with spare_capacity
 * Set all values to 0 initially
 */
async function replaceInfrastructure() {
  try {
    console.log('Starting infrastructure to spare capacity migration...\n');

    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Drop the old check constraint for infrastructure_level
    console.log('Dropping old infrastructure_level constraint...');
    await sequelize.query(`
      ALTER TABLE airports
      DROP CONSTRAINT IF EXISTS airports_infrastructure_level_check;
    `);
    console.log('✓ Constraint dropped\n');

    // Rename the column
    console.log('Renaming column from infrastructure_level to spare_capacity...');
    await sequelize.query(`
      ALTER TABLE airports
      RENAME COLUMN infrastructure_level TO spare_capacity;
    `);
    console.log('✓ Column renamed\n');

    // Update all values to 0
    console.log('Setting all spare_capacity values to 0...');
    const [results] = await sequelize.query(`
      UPDATE airports
      SET spare_capacity = 0;
    `);
    console.log(`✓ Updated ${results.rowCount} airports\n`);

    // Add new check constraint (0-100 range for percentage)
    console.log('Adding new spare_capacity constraint (0-100)...');
    await sequelize.query(`
      ALTER TABLE airports
      ADD CONSTRAINT airports_spare_capacity_check
      CHECK (spare_capacity >= 0 AND spare_capacity <= 100);
    `);
    console.log('✓ Constraint added\n');

    // Update column comment
    console.log('Updating column comment...');
    await sequelize.query(`
      COMMENT ON COLUMN airports.spare_capacity IS 'Airport spare capacity percentage (0-100)';
    `);
    console.log('✓ Comment updated\n');

    console.log('✅ Successfully migrated infrastructure to spare capacity!');
    console.log('All airports now have spare_capacity = 0');

    await sequelize.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  replaceInfrastructure();
}

module.exports = replaceInfrastructure;
