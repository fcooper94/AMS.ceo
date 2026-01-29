require('dotenv').config();
const { Airport } = require('../models');
const sequelize = require('../config/database');
const { getCountryName, isCountryCode } = require('../utils/countryMapping');

/**
 * Script to update all airport countries from ISO codes to full country names
 * Example: "GB" -> "United Kingdom", "AU" -> "Australia"
 */

async function fixCountryCodes() {
  try {
    console.log('Starting country code fix process...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Get all airports
    console.log('Fetching all airports...');
    const airports = await Airport.findAll({
      attributes: ['id', 'icaoCode', 'name', 'country'],
      raw: true
    });

    console.log(`✓ Found ${airports.length} airports\n`);

    // Analyze current state
    console.log('Analyzing country fields...');
    const airportsWithCodes = airports.filter(a => isCountryCode(a.country));
    const airportsWithFullNames = airports.filter(a => !isCountryCode(a.country));

    console.log(`- Airports with ISO codes: ${airportsWithCodes.length}`);
    console.log(`- Airports with full names: ${airportsWithFullNames.length}`);

    if (airportsWithCodes.length === 0) {
      console.log('\n✓ All airports already have full country names. No updates needed.');
      await sequelize.close();
      return;
    }

    // Show examples of what will be converted
    console.log('\nExamples of conversions:');
    const examples = airportsWithCodes.slice(0, 10);
    examples.forEach(a => {
      const newName = getCountryName(a.country);
      console.log(`  ${a.icaoCode} - ${a.name}: "${a.country}" -> "${newName}"`);
    });

    // Get unique ISO codes to convert
    const uniqueCodes = [...new Set(airportsWithCodes.map(a => a.country))];
    console.log(`\nUnique ISO codes to convert: ${uniqueCodes.length}`);
    console.log(`Codes: ${uniqueCodes.sort().join(', ')}\n`);

    // Perform updates using SQL for efficiency
    console.log('Updating airports...');
    let updated = 0;

    // Use a transaction for safety
    const transaction = await sequelize.transaction();

    try {
      // Update each unique country code
      for (const code of uniqueCodes) {
        const fullName = getCountryName(code);

        const [affectedCount] = await sequelize.query(`
          UPDATE airports
          SET country = :fullName
          WHERE country = :code
        `, {
          replacements: { fullName, code },
          transaction
        });

        updated += affectedCount;
        process.stdout.write(`\rUpdated ${updated} airports...`);
      }

      // Commit transaction
      await transaction.commit();
      console.log('\n✓ Transaction committed\n');

    } catch (error) {
      // Rollback on error
      await transaction.rollback();
      console.error('\n❌ Error during update, transaction rolled back');
      throw error;
    }

    // Verify results
    console.log('Verifying updates...');
    const verifyAirports = await Airport.findAll({
      attributes: ['country'],
      raw: true
    });

    const remainingCodes = verifyAirports.filter(a => isCountryCode(a.country));

    if (remainingCodes.length > 0) {
      console.log(`\n⚠️  Warning: ${remainingCodes.length} airports still have ISO codes`);
      console.log('Remaining codes:', [...new Set(remainingCodes.map(a => a.country))].join(', '));
    } else {
      console.log('✓ All airports now have full country names\n');
    }

    // Show country distribution
    const countryCount = verifyAirports.reduce((acc, a) => {
      acc[a.country] = (acc[a.country] || 0) + 1;
      return acc;
    }, {});

    console.log('✅ Country code fix complete!\n');
    console.log('Summary:');
    console.log(`- Total airports: ${airports.length}`);
    console.log(`- Airports updated: ${updated}`);
    console.log(`- Unique countries: ${Object.keys(countryCount).length}`);

    console.log('\nTop 10 countries by airport count:');
    Object.entries(countryCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([country, count]) => {
        console.log(`  ${country}: ${count}`);
      });

    await sequelize.close();
    console.log('\n✓ Database connection closed');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  fixCountryCodes();
}

module.exports = fixCountryCodes;
