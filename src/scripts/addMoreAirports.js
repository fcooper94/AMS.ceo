require('dotenv').config();
const https = require('https');
const { Airport } = require('../models');
const sequelize = require('../config/database');
const { getCountryName } = require('../utils/countryMapping');

/**
 * Script to add 1000 more airports from OurAirports database
 * Downloads CSV, parses it, filters existing airports, and adds the top 1000 by size
 */

// Download and parse OurAirports CSV
function downloadAirportsCSV() {
  return new Promise((resolve, reject) => {
    const url = 'https://davidmegginson.github.io/ourairports-data/airports.csv';
    console.log('Downloading OurAirports database...');

    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('✓ Download complete, parsing...');
        const lines = data.split('\n');
        const headers = lines[0].split(',').map(h => h.replace(/"/g, ''));

        const airports = lines.slice(1).map(line => {
          // Basic CSV parsing (handles quoted fields)
          const values = [];
          let current = '';
          let inQuotes = false;

          for (let char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
              values.push(current.trim());
              current = '';
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const airport = {};
          headers.forEach((header, i) => {
            airport[header] = values[i] || '';
          });
          return airport;
        }).filter(a => a.type); // Filter out empty rows

        console.log(`✓ Parsed ${airports.length} airports`);
        resolve(airports);
      });
    }).on('error', reject);
  });
}

// Determine airport type based on size and characteristics
function determineAirportType(airport) {
  const name = airport.name.toLowerCase();
  const iataCode = airport.iata_code;

  // International hubs - major airports with IATA codes
  if (iataCode && (
    name.includes('international') ||
    airport.type === 'large_airport'
  )) {
    return 'International Hub';
  }

  // Major airports
  if (iataCode && airport.type === 'medium_airport') {
    return 'Major';
  }

  // Regional airports
  if (iataCode || airport.type === 'small_airport') {
    return 'Regional';
  }

  // Small regional
  return 'Small Regional';
}

// Score airports by importance (for sorting)
function scoreAirport(airport, priorityCountries = []) {
  let score = 0;

  // Priority countries get massive boost
  if (priorityCountries.includes(airport.iso_country)) {
    score += 1000;
  }

  // IATA code adds significant value
  if (airport.iata_code) score += 100;

  // Type scoring
  if (airport.type === 'large_airport') score += 50;
  else if (airport.type === 'medium_airport') score += 30;
  else if (airport.type === 'small_airport') score += 10;

  // International in name
  if (airport.name.toLowerCase().includes('international')) score += 20;

  // Has scheduled service
  if (airport.scheduled_service === 'yes') score += 15;

  return score;
}

// Guess operational dates based on airport type
function guessOperationalDates(airport) {
  const type = airport.type;

  if (type === 'large_airport') {
    return { operationalFrom: 1950, operationalUntil: null };
  } else if (type === 'medium_airport') {
    return { operationalFrom: 1960, operationalUntil: null };
  } else {
    return { operationalFrom: 1970, operationalUntil: null };
  }
}

// Determine traffic demand (1-10 scale)
function determineTrafficDemand(airport, airportType) {
  let trafficDemand = 5;

  // Base levels on airport type
  if (airportType === 'International Hub') {
    trafficDemand = 9 + Math.floor(Math.random() * 2); // 9-10
  } else if (airportType === 'Major') {
    trafficDemand = 7 + Math.floor(Math.random() * 3); // 7-9
  } else if (airportType === 'Regional') {
    trafficDemand = 4 + Math.floor(Math.random() * 3); // 4-6
  } else { // Small Regional
    trafficDemand = 2 + Math.floor(Math.random() * 3); // 2-4
  }

  // Boost for airports with IATA codes (scheduled commercial service)
  if (airport.iata_code) {
    trafficDemand = Math.min(10, trafficDemand + 1);
  }

  // Boost for explicitly international airports
  if (airport.name.toLowerCase().includes('international')) {
    trafficDemand = Math.min(10, trafficDemand + 1);
  }

  // Ensure within bounds
  trafficDemand = Math.max(1, Math.min(10, trafficDemand));

  return trafficDemand;
}

async function addMoreAirports() {
  try {
    console.log('Starting airport addition process...\n');

    // Connect to database
    await sequelize.authenticate();
    console.log('✓ Database connected\n');

    // Get existing airports
    console.log('Fetching existing airports...');
    const existingAirports = await Airport.findAll({
      attributes: ['icaoCode', 'iataCode'],
      raw: true
    });

    const existingICAO = new Set(existingAirports.map(a => a.icaoCode));
    const existingIATA = new Set(existingAirports.map(a => a.iataCode).filter(Boolean));

    console.log(`✓ Found ${existingAirports.length} existing airports\n`);

    // Download OurAirports data
    const allAirports = await downloadAirportsCSV();

    // Filter and score airports (no country restrictions - selecting top airports worldwide)
    console.log('\nFiltering and scoring airports...');
    console.log('Selecting top airports from all countries worldwide');
    const candidateAirports = allAirports
      .filter(a => {
        // Must have ICAO code
        if (!a.ident) return false;

        // ICAO code must be 4 characters or less (database constraint)
        if (a.ident.length > 4) return false;

        // IATA code must be 3 characters or less if present
        if (a.iata_code && a.iata_code.length > 3) return false;

        // Must not already exist
        if (existingICAO.has(a.ident)) return false;
        if (a.iata_code && existingIATA.has(a.iata_code)) return false;

        // Must have coordinates
        if (!a.latitude_deg || !a.longitude_deg) return false;

        // Must be airport or heliport (not closed, seaplane base, etc.)
        if (!['large_airport', 'medium_airport', 'small_airport'].includes(a.type)) return false;

        return true;
      })
      .map(a => ({
        ...a,
        score: scoreAirport(a)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 700); // Take top 700 to reach ~6000 total

    console.log(`✓ Selected ${candidateAirports.length} new airports to add\n`);

    // Format for database
    console.log('Formatting airport data...');
    const airportsToAdd = candidateAirports.map(a => {
      const airportType = determineAirportType(a);
      const dates = guessOperationalDates(a);
      const trafficDemand = determineTrafficDemand(a, airportType);

      return {
        icaoCode: a.ident.substring(0, 4), // Ensure max 4 chars
        iataCode: a.iata_code ? a.iata_code.substring(0, 3) : null, // Ensure max 3 chars
        name: a.name.substring(0, 255), // Reasonable limit
        city: (a.municipality || a.name.split(' ')[0]).substring(0, 100),
        country: getCountryName(a.iso_country).substring(0, 100), // Convert ISO code to full name
        latitude: parseFloat(a.latitude_deg),
        longitude: parseFloat(a.longitude_deg),
        elevation: parseInt(a.elevation_ft) || 0,
        type: airportType,
        timezone: a.tz_database_time_zone || 'UTC',
        operationalFrom: dates.operationalFrom,
        operationalUntil: dates.operationalUntil,
        trafficDemand: trafficDemand,
        spareCapacity: 0, // All airports start with 0 spare capacity
        isActive: true
      };
    }).filter(a => {
      // Final validation
      return a.icaoCode.length <= 4 &&
             (!a.iataCode || a.iataCode.length <= 3) &&
             a.latitude >= -90 && a.latitude <= 90 &&
             a.longitude >= -180 && a.longitude <= 180 &&
             a.trafficDemand >= 1 && a.trafficDemand <= 10 &&
             a.spareCapacity >= 0 && a.spareCapacity <= 100;
    });

    // Debug: Check for invalid values
    const invalidAirports = airportsToAdd.filter(a =>
      a.trafficDemand < 1 || a.trafficDemand > 10 ||
      a.spareCapacity < 0 || a.spareCapacity > 100
    );

    if (invalidAirports.length > 0) {
      console.log('\n⚠️  Found invalid airports:');
      invalidAirports.slice(0, 5).forEach(a => {
        console.log(`  ${a.name}: traffic=${a.trafficDemand}, spare=${a.spareCapacity}`);
      });
    }

    // Additional safety: clamp all values
    airportsToAdd.forEach(a => {
      a.trafficDemand = Math.round(Math.max(1, Math.min(10, a.trafficDemand)));
      a.spareCapacity = Math.round(Math.max(0, Math.min(100, a.spareCapacity)));
    });

    // Insert in batches
    console.log('Inserting airports into database...');
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < airportsToAdd.length; i += batchSize) {
      const batch = airportsToAdd.slice(i, i + batchSize);
      try {
        await Airport.bulkCreate(batch, {
          ignoreDuplicates: true,
          validate: true,
          logging: false
        });
        inserted += batch.length;
        process.stdout.write(`\rInserted ${inserted}/${airportsToAdd.length} airports...`);
      } catch (error) {
        console.error(`\n❌ Error in batch ${i}-${i + batchSize}:`);
        console.error('Sample from failed batch:', batch.slice(0, 2).map(a => ({
          name: a.name,
          traffic: a.trafficDemand,
          spare: a.spareCapacity
        })));
        throw error;
      }
    }

    console.log('\n\n✅ Successfully added airports!');
    console.log(`\nSummary:`);
    console.log(`- Previous count: ${existingAirports.length}`);
    console.log(`- Added: ${airportsToAdd.length}`);
    console.log(`- New total: ${existingAirports.length + airportsToAdd.length}`);

    // Show breakdown by type
    const breakdown = airportsToAdd.reduce((acc, a) => {
      acc[a.type] = (acc[a.type] || 0) + 1;
      return acc;
    }, {});

    console.log(`\nBreakdown by type:`);
    Object.entries(breakdown).forEach(([type, count]) => {
      console.log(`- ${type}: ${count}`);
    });

    // Show average metrics
    const avgTraffic = (airportsToAdd.reduce((sum, a) => sum + a.trafficDemand, 0) / airportsToAdd.length).toFixed(1);
    const avgSpare = (airportsToAdd.reduce((sum, a) => sum + a.spareCapacity, 0) / airportsToAdd.length).toFixed(1);

    console.log(`\nAverage metrics:`);
    console.log(`- Traffic Demand: ${avgTraffic}/10`);
    console.log(`- Spare Capacity: ${avgSpare}%`);

    await sequelize.close();

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addMoreAirports();
}

module.exports = addMoreAirports;
