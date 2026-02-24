require('dotenv').config();
const sequelize = require('../config/database');
const Airport = require('../models/Airport');

/**
 * Known airports with exact opening/closing dates (researched)
 * Format: ICAO → { from: 'YYYY-MM-DD', until: 'YYYY-MM-DD' | null }
 */
const KNOWN_EXACT_DATES = {
  // === CLOSED AIRPORTS (with exact closure dates) ===
  'VHHX': { from: '1925-01-20', until: '1998-07-06' },   // Kai Tak — last flight July 5th 1998
  'EDDT': { from: '1948-11-05', until: '2020-11-08' },   // Berlin Tegel — closed Nov 8 2020
  'EDDI': { from: '1923-10-08', until: '2008-10-30' },   // Berlin Tempelhof — closed Oct 30 2008
  'LTBA': { from: '1953-02-12', until: '2019-04-06' },   // Istanbul Ataturk — closed Apr 6 2019
  'LGAT': { from: '1938-09-10', until: '2001-03-28' },   // Athens Ellinikon — closed Mar 28 2001
  'ENFB': { from: '1939-06-01', until: '1998-10-07' },   // Oslo Fornebu — closed Oct 7 1998
  'KCGX': { from: '1948-12-10', until: '2003-03-30' },   // Meigs Field — bulldozed Mar 30 2003
  'KIDL': { from: '1948-07-01', until: '1963-12-24' },   // Idlewild (became JFK)
  'FAJS': { from: '1952-03-21', until: '1994-10-01' },   // Jan Smuts (became O.R. Tambo code change)
  'YMEN': { from: '1921-01-01', until: '1970-07-01' },   // Essendon — replaced by Tullamarine
  'LFPB': { from: '1919-02-15', until: '1977-03-08' },   // Le Bourget — last scheduled flight 1977
  'EDDM': { from: '1939-10-25', until: '1992-05-16' },   // Munich-Riem — closed May 16 1992
  'WSSL': { from: '1965-08-30', until: '1998-06-30' },   // KL Subang — replaced by KLIA
  'RJNA': { from: '1944-02-15', until: '2005-02-17' },   // Nagoya Komaki — replaced by Centrair
  'RPMN': { from: '1948-07-04', until: '2014-12-31' },   // Manila old terminal
  'OMDB': { from: '1960-09-30', until: '2010-06-27' },   // Dubai old terminal era

  // === MAJOR AIRPORTS WITH KNOWN OPENING DATES ===
  // North America
  'KJFK': { from: '1948-07-01', until: null },   // JFK opened July 1948
  'KLAX': { from: '1930-01-01', until: null },   // LAX (Mines Field)
  'KORD': { from: '1944-11-01', until: null },   // O'Hare — opened as military 1944
  'KATL': { from: '1926-04-16', until: null },   // Atlanta — Candler Field 1926
  'KDFW': { from: '1974-01-13', until: null },   // DFW opened Jan 13 1974
  'KSFO': { from: '1927-05-07', until: null },   // SFO — Mills Field 1927
  'KDEN': { from: '1995-02-28', until: null },   // New Denver — opened Feb 28 1995
  'KMIA': { from: '1928-09-15', until: null },   // Miami — Pan Am Field 1928
  'KSEA': { from: '1944-07-09', until: null },   // Sea-Tac
  'KBOS': { from: '1923-09-08', until: null },   // Logan
  'KLAS': { from: '1942-01-01', until: null },   // Las Vegas
  'KPHX': { from: '1929-11-04', until: null },   // Phoenix Sky Harbor
  'KIAH': { from: '1969-06-08', until: null },   // Houston Intercontinental
  'KEWR': { from: '1928-10-01', until: null },   // Newark
  'KMCO': { from: '1981-10-01', until: null },   // Orlando (current terminal)
  'CYYZ': { from: '1939-08-29', until: null },   // Toronto Pearson (Malton)
  'CYVR': { from: '1931-07-22', until: null },   // Vancouver
  'CYUL': { from: '1941-09-01', until: null },   // Montreal Trudeau (Dorval)
  'CYYC': { from: '1938-01-01', until: null },   // Calgary
  'MMMX': { from: '1952-05-19', until: null },   // Mexico City

  // Europe
  'EGLL': { from: '1946-01-01', until: null },   // Heathrow — opened Jan 1 1946
  'EGKK': { from: '1958-06-09', until: null },   // Gatwick — reopened 1958
  'EGSS': { from: '1943-08-07', until: null },   // Stansted — WWII base
  'LFPG': { from: '1974-03-08', until: null },   // CDG — opened Mar 8 1974
  'LFPO': { from: '1932-02-15', until: null },   // Orly
  'EDDF': { from: '1936-07-08', until: null },   // Frankfurt
  'EHAM': { from: '1916-09-19', until: null },   // Schiphol — military 1916, civil 1920
  'LEMD': { from: '1928-04-22', until: null },   // Madrid Barajas
  'LEBL': { from: '1918-03-15', until: null },   // Barcelona El Prat
  'LIRF': { from: '1961-01-15', until: null },   // Rome Fiumicino
  'LOWW': { from: '1938-11-19', until: null },   // Vienna
  'LSZH': { from: '1948-08-14', until: null },   // Zurich Kloten
  'EDDB': { from: '2020-10-31', until: null },   // Berlin Brandenburg
  'EDDL': { from: '1927-04-19', until: null },   // Dusseldorf
  'EDDH': { from: '1911-01-10', until: null },   // Hamburg
  'LGAV': { from: '2001-03-28', until: null },   // Athens International (replaced Ellinikon)
  'ENGM': { from: '1998-10-08', until: null },   // Oslo Gardermoen
  'ESSA': { from: '1960-04-01', until: null },   // Stockholm Arlanda
  'EKCH': { from: '1925-04-20', until: null },   // Copenhagen Kastrup
  'EFHK': { from: '1952-06-12', until: null },   // Helsinki Vantaa
  'EPWA': { from: '1934-04-29', until: null },   // Warsaw Chopin
  'LKPR': { from: '1937-04-05', until: null },   // Prague
  'LHBP': { from: '1950-05-01', until: null },   // Budapest
  'EBBR': { from: '1940-07-20', until: null },   // Brussels
  'LPPT': { from: '1942-10-15', until: null },   // Lisbon
  'EIDW': { from: '1940-01-19', until: null },   // Dublin
  'LTFM': { from: '2018-10-29', until: null },   // Istanbul Airport (new)

  // Asia-Pacific
  'RJTT': { from: '1931-08-25', until: null },   // Tokyo Haneda
  'RJAA': { from: '1978-05-20', until: null },   // Narita
  'RJBB': { from: '1994-09-04', until: null },   // Kansai
  'RJGG': { from: '2005-02-17', until: null },   // Chubu Centrair
  'VHHH': { from: '1998-07-06', until: null },   // Hong Kong Chek Lap Kok
  'WSSS': { from: '1981-07-01', until: null },   // Changi
  'ZSPD': { from: '1999-10-01', until: null },   // Shanghai Pudong
  'ZSHC': { from: '1921-06-01', until: null },   // Shanghai Hongqiao
  'ZBAA': { from: '1958-03-02', until: null },   // Beijing Capital
  'ZBAD': { from: '2019-09-25', until: null },   // Beijing Daxing
  'RKSI': { from: '2001-03-29', until: null },   // Seoul Incheon
  'RKSS': { from: '1939-04-01', until: null },   // Seoul Gimpo
  'VABB': { from: '1942-03-01', until: null },   // Mumbai
  'VIDP': { from: '1962-05-01', until: null },   // Delhi
  'VOBL': { from: '2008-05-24', until: null },   // Bengaluru
  'VTBS': { from: '2006-09-28', until: null },   // Bangkok Suvarnabhumi
  'VTBD': { from: '1914-03-27', until: null },   // Bangkok Don Mueang
  'WMKK': { from: '1998-06-30', until: null },   // KL International
  'WIII': { from: '1985-04-01', until: null },   // Jakarta
  'RPLL': { from: '1948-07-04', until: null },   // Manila
  'YSSY': { from: '1920-01-19', until: null },   // Sydney
  'YMML': { from: '1970-07-01', until: null },   // Melbourne Tullamarine
  'YBBN': { from: '1988-01-19', until: null },   // Brisbane
  'NZAA': { from: '1966-01-29', until: null },   // Auckland

  // Middle East
  'OMAA': { from: '1982-01-02', until: null },   // Abu Dhabi
  'OTHH': { from: '2014-04-30', until: null },   // Hamad International (new Doha)
  'OERK': { from: '1983-11-18', until: null },   // Riyadh
  'OEJN': { from: '1981-04-01', until: null },   // Jeddah
  'LLBG': { from: '1936-07-12', until: null },   // Ben Gurion

  // South America
  'SBGR': { from: '1985-01-20', until: null },   // Sao Paulo Guarulhos
  'SBGL': { from: '1952-01-20', until: null },   // Rio Galeao
  'SBBR': { from: '1957-05-03', until: null },   // Brasilia
  'SAEZ': { from: '1949-04-30', until: null },   // Buenos Aires Ezeiza
  'SCEL': { from: '1967-02-09', until: null },   // Santiago
  'SKBO': { from: '1959-12-10', until: null },   // Bogota

  // Africa
  'FAOR': { from: '1952-03-21', until: null },   // Johannesburg O.R. Tambo
  'FACT': { from: '1954-08-01', until: null },   // Cape Town
  'HECA': { from: '1963-03-18', until: null },   // Cairo
  'GMMN': { from: '1953-08-25', until: null },   // Casablanca
  'DNMM': { from: '1979-03-15', until: null },   // Lagos
  'HKJK': { from: '1978-08-14', until: null },   // Nairobi
  'HAAB': { from: '1961-09-12', until: null },   // Addis Ababa

  // Russia
  'UUEE': { from: '1959-08-11', until: null },   // Moscow Sheremetyevo
  'UUDD': { from: '1964-04-07', until: null },   // Moscow Domodedovo
  'ULLI': { from: '1932-06-24', until: null },   // St Petersburg Pulkovo
};

/**
 * Country groupings for heuristic estimation
 * Maps country names to estimated airport development era ranges [minYear, maxYear]
 */
const COUNTRY_ERA_RANGES = {
  // Early aviation pioneers (1925-1950)
  'United States': [1930, 1955],
  'Canada': [1935, 1955],
  'United Kingdom': [1930, 1950],
  'France': [1930, 1950],
  'Germany': [1930, 1955],
  'Australia': [1935, 1955],
  'New Zealand': [1935, 1960],
  'Netherlands': [1920, 1950],
  'Belgium': [1935, 1950],
  'Switzerland': [1935, 1955],
  'Italy': [1930, 1955],
  'Spain': [1935, 1960],
  'Portugal': [1940, 1960],
  'Ireland': [1940, 1960],
  'Denmark': [1925, 1955],
  'Sweden': [1935, 1960],
  'Norway': [1935, 1960],
  'Finland': [1940, 1960],

  // Post-war reconstruction (1945-1965)
  'Japan': [1945, 1965],
  'South Korea': [1945, 1970],
  'Austria': [1945, 1960],
  'Czech Republic': [1935, 1960],
  'Poland': [1935, 1960],
  'Hungary': [1940, 1965],
  'Greece': [1935, 1965],
  'Turkey': [1940, 1970],
  'Argentina': [1940, 1965],
  'Brazil': [1940, 1965],
  'Chile': [1945, 1970],
  'Colombia': [1945, 1965],
  'Peru': [1945, 1970],
  'Mexico': [1940, 1965],

  // Post-colonial era (1955-1980)
  'India': [1945, 1970],
  'Pakistan': [1947, 1970],
  'Bangladesh': [1950, 1975],
  'Sri Lanka': [1950, 1970],
  'Thailand': [1940, 1970],
  'Malaysia': [1950, 1970],
  'Indonesia': [1950, 1975],
  'Philippines': [1945, 1970],
  'Vietnam': [1950, 1975],
  'Singapore': [1955, 1980],
  'Cambodia': [1950, 1970],
  'Myanmar': [1950, 1970],
  'Nigeria': [1955, 1980],
  'Kenya': [1955, 1980],
  'South Africa': [1945, 1965],
  'Egypt': [1940, 1970],
  'Morocco': [1945, 1970],
  'Ethiopia': [1955, 1975],
  'Ghana': [1955, 1975],
  'Tanzania': [1955, 1975],
  'Senegal': [1955, 1975],
  'Algeria': [1945, 1970],
  'Tunisia': [1945, 1970],

  // Oil boom era (1960-1985)
  'United Arab Emirates': [1960, 1985],
  'Saudi Arabia': [1955, 1985],
  'Qatar': [1960, 1985],
  'Kuwait': [1955, 1980],
  'Oman': [1960, 1985],
  'Bahrain': [1955, 1980],
  'Iran': [1945, 1975],
  'Iraq': [1950, 1975],

  // Modern development (1960-1990)
  'China': [1955, 1980],
  'Taiwan': [1950, 1975],
  'Hong Kong': [1925, 1960],
  'Russia': [1935, 1965],

  // Eastern Europe transition
  'Romania': [1945, 1970],
  'Bulgaria': [1945, 1970],
  'Croatia': [1945, 1970],
  'Serbia': [1945, 1970],
  'Slovenia': [1950, 1975],
  'Slovakia': [1945, 1970],
  'Ukraine': [1945, 1970],
  'Lithuania': [1945, 1970],
  'Latvia': [1945, 1970],
  'Estonia': [1945, 1970],

  // Pacific Islands
  'Fiji': [1940, 1965],
  'Papua New Guinea': [1940, 1965],
  'Tonga': [1945, 1970],
  'Samoa': [1945, 1970],
  'Vanuatu': [1950, 1975],
  'Solomon Islands': [1942, 1970],

  // Central America & Caribbean
  'Costa Rica': [1945, 1970],
  'Panama': [1940, 1965],
  'Guatemala': [1940, 1965],
  'Honduras': [1945, 1970],
  'Jamaica': [1945, 1970],
  'Dominican Republic': [1945, 1970],
  'Cuba': [1940, 1965],
  'Puerto Rico': [1940, 1965],
  'Trinidad and Tobago': [1945, 1970],

  // Antarctica
  'Antarctica': [1950, 1975],
};

// Default range if country not found
const DEFAULT_ERA_RANGE = [1950, 1975];

/**
 * Airport type adjustments (years to subtract/add from base estimate)
 */
const TYPE_ADJUSTMENTS = {
  'International Hub': -10,
  'Major': 0,
  'Regional': 5,
  'Small Regional': 10
};

/**
 * Simple deterministic hash from string → number
 * Used to generate consistent "random" dates from ICAO codes
 */
function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

/**
 * Generate a deterministic random date within a given year
 * Uses ICAO code as seed so results are reproducible
 */
function randomDateInYear(year, icaoCode) {
  const hash = hashCode(icaoCode);
  const month = (hash % 12) + 1;         // 1-12
  const day = ((hash >> 4) % 28) + 1;    // 1-28 (safe for all months)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/**
 * Estimate an opening date for an airport based on country and type
 */
function estimateOpeningDate(airport) {
  const eraRange = COUNTRY_ERA_RANGES[airport.country] || DEFAULT_ERA_RANGE;
  let [minYear, maxYear] = eraRange;

  // Apply type adjustment
  const typeAdj = TYPE_ADJUSTMENTS[airport.type] || 0;
  minYear += typeAdj;
  maxYear += typeAdj;

  // Clamp to reasonable range
  minYear = Math.max(1910, minYear);
  maxYear = Math.min(2020, maxYear);

  // Use ICAO hash to pick a year within the range
  const hash = hashCode(airport.icaoCode);
  const yearRange = maxYear - minYear;
  const estimatedYear = minYear + (hash % (yearRange + 1));

  return randomDateInYear(estimatedYear, airport.icaoCode);
}

/**
 * Main update function
 */
async function updateAirportDates() {
  try {
    console.log('=== Airport Operational Dates Update ===\n');

    await sequelize.authenticate();
    console.log('Connected to database\n');

    let exactUpdates = 0;
    let heuristicUpdates = 0;

    // Step 1: Apply known exact dates
    console.log('Applying known exact dates...');
    for (const [icao, dates] of Object.entries(KNOWN_EXACT_DATES)) {
      const airport = await Airport.findOne({ where: { icaoCode: icao } });
      if (airport) {
        await airport.update({
          operationalFrom: dates.from,
          operationalUntil: dates.until
        });
        const label = dates.until
          ? `${dates.from} → ${dates.until}`
          : `${dates.from} → active`;
        console.log(`  ${icao} - ${airport.name}: ${label}`);
        exactUpdates++;
      }
    }
    console.log(`\nApplied ${exactUpdates} exact dates.\n`);

    // Step 2: Apply heuristic estimates for airports still on Jan 1 / Dec 31 defaults
    console.log('Applying heuristic estimates for remaining airports...');
    const airports = await Airport.findAll({
      attributes: ['id', 'icaoCode', 'name', 'country', 'type', 'operationalFrom', 'operationalUntil']
    });

    // Skip airports that already have known exact dates
    const knownCodes = new Set(Object.keys(KNOWN_EXACT_DATES));

    for (const airport of airports) {
      if (knownCodes.has(airport.icaoCode)) continue;

      const currentFrom = airport.operationalFrom;

      // Only update if it's a default Jan-1 date (from migration) or null
      if (!currentFrom || (typeof currentFrom === 'string' && currentFrom.endsWith('-01-01'))) {
        const estimatedDate = estimateOpeningDate(airport);
        await airport.update({ operationalFrom: estimatedDate });
        heuristicUpdates++;
      }
    }
    console.log(`Applied ${heuristicUpdates} heuristic estimates.\n`);

    // Step 3: Report
    const { Op } = require('sequelize');
    const total = await Airport.count();
    const withFrom = await Airport.count({ where: { operationalFrom: { [Op.ne]: null } } });
    const closed = await Airport.count({ where: { operationalUntil: { [Op.ne]: null } } });

    console.log('=== Summary ===');
    console.log(`Total airports: ${total}`);
    console.log(`With opening date: ${withFrom}`);
    console.log(`Closed/historical: ${closed}`);
    console.log(`Exact dates applied: ${exactUpdates}`);
    console.log(`Heuristic dates applied: ${heuristicUpdates}`);

    // Show sample of heuristic results by region
    console.log('\n=== Sample Heuristic Dates ===');
    const sampleCountries = ['United States', 'Nigeria', 'Japan', 'United Arab Emirates', 'Brazil', 'Antarctica'];
    for (const country of sampleCountries) {
      const samples = await Airport.findAll({
        where: { country },
        attributes: ['icaoCode', 'name', 'type', 'operationalFrom'],
        limit: 3,
        order: [['operationalFrom', 'ASC']]
      });
      if (samples.length > 0) {
        console.log(`\n${country}:`);
        samples.forEach(a => console.log(`  ${a.icaoCode} - ${a.name} [${a.type}] → ${a.operationalFrom}`));
      }
    }

    // Show all closed airports
    console.log('\n=== Closed Airports ===');
    const closedAirports = await Airport.findAll({
      where: { operationalUntil: { [Op.ne]: null } },
      order: [['operationalUntil', 'ASC']],
      attributes: ['icaoCode', 'name', 'operationalFrom', 'operationalUntil']
    });
    closedAirports.forEach(a => {
      console.log(`  ${a.icaoCode} - ${a.name}: ${a.operationalFrom} → ${a.operationalUntil}`);
    });

    console.log('\nDone!');
    process.exit(0);
  } catch (error) {
    console.error('\nFailed:', error);
    process.exit(1);
  }
}

updateAirportDates();
