/**
 * AI Airline Name Generator
 * Generates fictional airline names, ICAO codes, and IATA codes for SP worlds
 */

const REGIONAL_PREFIXES = {
  'Europe': [
    'Alpine', 'Nordic', 'Celtic', 'Baltic', 'Adriatic', 'Iberian', 'Aegean',
    'Meridian', 'Aurora', 'Atlantic', 'Continental', 'Eurostar', 'Transeuropa',
    'Skybridge', 'Boreal', 'Sovereign', 'Imperial', 'Royal', 'Crown',
    'Crosswind', 'Zenith', 'Pinnacle', 'Horizon', 'Summit', 'Compass'
  ],
  'North America': [
    'Continental', 'Liberty', 'Eagle', 'Frontier', 'Summit', 'Prairie',
    'Pacific', 'Atlantic', 'Skyward', 'Pinnacle', 'Republic', 'National',
    'Transcontinental', 'Cascade', 'Ridgeline', 'Redwood', 'Maverick',
    'Compass', 'Heartland', 'Gateway', 'Vanguard', 'Keystone', 'Patriot',
    'Crossroads', 'Timber', 'Silverline'
  ],
  'Asia': [
    'Orient', 'Lotus', 'Jade', 'Silk Route', 'Monsoon', 'Pacific Rim',
    'Dragon', 'Phoenix', 'Bamboo', 'Sunrise', 'Golden', 'Coral',
    'Tiger', 'Saffron', 'Pearl', 'Pagoda', 'Mandarin', 'Dynasty',
    'Sakura', 'Emerald', 'Sapphire', 'Orchid', 'Celestial', 'Harmony'
  ],
  'South America': [
    'Andes', 'Amazon', 'Southern Cross', 'Condor', 'Pampas', 'Tropical',
    'Meridian', 'Equatorial', 'Patagonia', 'Rio', 'Carnival', 'Sol',
    'Sierra', 'Verde', 'Estrela', 'Austral', 'Oceanic', 'Altiplano',
    'Gaucho', 'Amazonia', 'Colibri', 'Flamingo', 'Jaguar', 'Tucano'
  ],
  'Africa': [
    'Safari', 'Savanna', 'Sahara', 'Kilimanjaro', 'Serengeti', 'Baobab',
    'Kalahari', 'Atlas', 'Nile', 'Ivory', 'Cape', 'Springbok',
    'Gazelle', 'Acacia', 'Zambezi', 'Majestic', 'Equator', 'Sunbird',
    'Sahel', 'Oasis', 'Harmattan', 'Monsoon', 'Rhino', 'Impala'
  ],
  'Oceania': [
    'Pacific', 'Southern Cross', 'Coral', 'Outback', 'Kiwi', 'Islander',
    'Oceanic', 'Tasman', 'Reef', 'Polynesian', 'Southern', 'Harbour',
    'Boomerang', 'Kangaroo', 'Silver Fern', 'Tropical', 'Barrier',
    'Tradewind', 'Meridian', 'Lagoon', 'Atoll', 'Tahitian', 'Maori'
  ],
  'Middle East': [
    'Oasis', 'Sahara', 'Desert', 'Gulf', 'Arabian', 'Falcon',
    'Crescent', 'Pearl', 'Golden', 'Royal', 'Imperial', 'Cedar',
    'Silk Road', 'Levant', 'Phoenician', 'Orient', 'Sandstorm',
    'Mirage', 'Dune', 'Zenith', 'Nebula', 'Astral', 'Citadel'
  ]
};

const SUFFIXES = [
  'Airways', 'Airlines', 'Air', 'Aviation', 'Express',
  'Connect', 'Jet', 'Wings', 'Aero', 'Fly',
  'Air Lines', 'Sky', 'Air Transport', 'Flyer'
];

// More formal suffixes for older eras
const CLASSIC_SUFFIXES = [
  'Airways', 'Airlines', 'Air Lines', 'Air Transport',
  'Aviation', 'Aero', 'Air Service', 'Flying Service'
];

// Consonants and vowels for ICAO/IATA code generation
const CONSONANTS = 'BCDFGHJKLMNPQRSTVWXYZ';
const VOWELS = 'AEIOU';

/**
 * Generate a pronounceable 3-letter ICAO code
 */
function generateICAOCode(existingCodes) {
  const maxAttempts = 200;
  for (let i = 0; i < maxAttempts; i++) {
    // Pattern: consonant-vowel-consonant (most readable)
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const c2 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const code = c1 + v + c2;
    if (!existingCodes.has(code)) return code;
  }
  // Fallback: fully random
  for (let i = 0; i < 100; i++) {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const code = letters[Math.floor(Math.random() * 26)] +
                 letters[Math.floor(Math.random() * 26)] +
                 letters[Math.floor(Math.random() * 26)];
    if (!existingCodes.has(code)) return code;
  }
  return null;
}

/**
 * Generate a 2-letter IATA code
 */
function generateIATACode(existingCodes) {
  const maxAttempts = 200;
  for (let i = 0; i < maxAttempts; i++) {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const code = c1 + v;
    if (!existingCodes.has(code)) return code;
  }
  // Fallback
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 100; i++) {
    const code = letters[Math.floor(Math.random() * 26)] +
                 letters[Math.floor(Math.random() * 26)];
    if (!existingCodes.has(code)) return code;
  }
  return null;
}

/**
 * Pick a random element from an array
 */
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generate a fictional airline identity
 * @param {string} region - Region for name flavour
 * @param {number} era - Year for name style
 * @param {Set} existingICAO - Set of taken ICAO codes
 * @param {Set} existingIATA - Set of taken IATA codes
 * @param {Set} existingNames - Set of taken airline names
 * @returns {{ name: string, icaoCode: string, iataCode: string }}
 */
function generateAIAirline(region, era, existingICAO, existingIATA, existingNames) {
  const prefixes = REGIONAL_PREFIXES[region] || REGIONAL_PREFIXES['Europe'];
  const suffixes = era < 1980 ? CLASSIC_SUFFIXES : SUFFIXES;

  let name;
  let attempts = 0;
  do {
    name = pick(prefixes) + ' ' + pick(suffixes);
    attempts++;
  } while (existingNames.has(name) && attempts < 100);

  // Ensure uniqueness by appending region hint if still duplicate
  if (existingNames.has(name)) {
    name = pick(prefixes) + ' ' + pick(prefixes) + ' ' + pick(suffixes);
  }

  const icaoCode = generateICAOCode(existingICAO);
  const iataCode = generateIATACode(existingIATA);

  return { name, icaoCode, iataCode };
}

module.exports = {
  generateAIAirline,
  generateICAOCode,
  generateIATACode,
  REGIONAL_PREFIXES
};
