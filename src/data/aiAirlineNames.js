/**
 * AI Airline Name Generator
 * Generates fictional airline names, ICAO codes, and IATA codes for SP worlds
 *
 * Names are either country-specific (geographic/cultural references) or generic.
 * No real airline names are used.
 */

// Country-specific name prefixes — geography, culture, fauna, landmarks
const COUNTRY_PREFIXES = {
  // Europe
  'United Kingdom': [
    'Pennine', 'Caledonian', 'Thistle', 'Cambrian', 'Albion', 'Sterling',
    'Wessex', 'Cotswold', 'Highland', 'Thames', 'Severn', 'Clyde',
    'Mersey', 'Balmoral', 'Windsor', 'Lancaster', 'Tudor', 'Dartmoor'
  ],
  'France': [
    'Provence', 'Aquitaine', 'Loire', 'Mistral', 'Garonne', 'Rhone',
    'Normandie', 'Bretagne', 'Picard', 'Corsair', 'Languedoc', 'Lavande',
    'Cevennes', 'Gironde', 'Riviera', 'Occitan', 'Alsace', 'Gascon'
  ],
  'Germany': [
    'Bavarian', 'Rhine', 'Elbe', 'Saxon', 'Hanseatic', 'Teutonic',
    'Danube', 'Schwarzwald', 'Adler', 'Hansa', 'Westfalen', 'Brandenburg',
    'Alpen', 'Neckar', 'Weser', 'Mosel', 'Holstein', 'Palatine'
  ],
  'Spain': [
    'Iberia Sol', 'Castilian', 'Andaluz', 'Cantabria', 'Levante', 'Navarra',
    'Sierra', 'Estrella', 'Dorado', 'Catalonia', 'Balearic', 'Galician',
    'Asturias', 'Aragon', 'Toro', 'Tramontana', 'Guadalquivir', 'Ebro'
  ],
  'Italy': [
    'Adriatico', 'Dolomiti', 'Vesuvio', 'Tirreno', 'Toscana', 'Lombard',
    'Venetian', 'Sardinian', 'Etna', 'Sicilian', 'Ligurian', 'Piemonte',
    'Appennino', 'Amalfi', 'Arno', 'Campania', 'Garda', 'Romana'
  ],
  'Netherlands': [
    'Batavia', 'Tulip', 'Zuider', 'Maas', 'Oranje', 'Frisian',
    'Polderland', 'Dijkstra', 'Windmill', 'Lowland', 'Zeeland', 'Noord'
  ],
  'Belgium': [
    'Flanders', 'Walloon', 'Ardennes', 'Brabant', 'Scheldt', 'Meuse'
  ],
  'Switzerland': [
    'Helvetic', 'Matterhorn', 'Jungfrau', 'Bernese', 'Lucerne', 'Ticino',
    'Engadin', 'Gotthard', 'Edelweiss', 'Aletsch', 'Zurich Star', 'Alpina'
  ],
  'Austria': [
    'Tyrolean', 'Danube Star', 'Styrian', 'Salzburg', 'Carinthian',
    'Habsburg', 'Wienerwald', 'Inntal', 'Grossglockner', 'Vorarlberg'
  ],
  'Sweden': [
    'Scandic', 'Norrland', 'Viking', 'Nordic Star', 'Lapland', 'Vasa',
    'Midnight Sun', 'Gotland', 'Baltic Star', 'Dalarna', 'Oresund', 'Svea'
  ],
  'Norway': [
    'Fjordline', 'Norse', 'Bergen Star', 'Nordkapp', 'Hurtig', 'Lofoten',
    'Trollfjord', 'Stavanger', 'Vestland', 'Polar Star', 'Hardanger', 'Svalbard'
  ],
  'Denmark': [
    'Jutland', 'Oresund Star', 'Bornholm', 'Faroe', 'Sjaelland', 'Fyn',
    'Skagerrak', 'Aarhus Star', 'Kattegat', 'Hamlet', 'Viborg', 'Odense Star'
  ],
  'Finland': [
    'Suomi', 'Boreal', 'Sauna', 'Karelia', 'Saimaa', 'Lappi',
    'Polar Bear', 'Auroral', 'Tundra Star', 'Helsinki Star', 'Oulu Star', 'Vaasa'
  ],
  'Ireland': [
    'Shamrock', 'Emerald', 'Connemara', 'Shannon Star', 'Celtic Star',
    'Galway', 'Claddagh', 'Erin', 'Aran', 'Kerry Star', 'Liffey', 'Wicklow'
  ],
  'Portugal': [
    'Lusitania', 'Algarve', 'Porto Star', 'Madeira', 'Azores', 'Tagus',
    'Fado', 'Douro', 'Minho', 'Beira', 'Alentejo', 'Sintra'
  ],
  'Greece': [
    'Aegean Star', 'Olympian', 'Cretan', 'Ionian', 'Spartan', 'Athenian',
    'Cycladic', 'Delphi', 'Thessaloniki Star', 'Peloponnese', 'Corinth', 'Minoan'
  ],
  'Poland': [
    'Vistula', 'Tatra', 'Mazovia', 'Silesian', 'Krakow Star', 'Pomeranian',
    'Gdansk Star', 'Carpathian', 'Wawel', 'Baltic Shore', 'Oder Star', 'Copernicus'
  ],
  'Czech Republic': [
    'Bohemian', 'Moravian', 'Vltava', 'Sudeten', 'Praha Star', 'Pilsner'
  ],
  'Hungary': [
    'Magyar', 'Danube Star', 'Pannonian', 'Tokaj', 'Balaton', 'Puszta'
  ],
  'Romania': [
    'Carpathian Star', 'Transylvanian', 'Danube Delta', 'Wallachian', 'Moldavan Star', 'Bucharest Star'
  ],
  'Turkey': [
    'Anatolian', 'Bosphorus', 'Cappadocia', 'Lycia', 'Ephesus', 'Ottoman Star',
    'Taurus', 'Aegean Sun', 'Marmara', 'Izmir Star', 'Galata', 'Seljuk'
  ],
  'Iceland': [
    'Geysir', 'Vatnajokull', 'Thingvellir', 'Reykja', 'Hekla', 'Polar North'
  ],
  'Croatia': [
    'Dalmatian', 'Dubrovnik Star', 'Istrian', 'Plitvice', 'Slavonian', 'Adriatic Sun'
  ],

  // North America
  'United States': [
    'Frontier Star', 'Appalachian', 'Cascade', 'Prairie', 'Ridgeline',
    'Redwood', 'Maverick', 'Keystone', 'Patriot', 'Sunbelt', 'Heartland',
    'Great Lakes', 'Ozark', 'Yellowstone', 'Mojave', 'Sierra Star',
    'Chesapeake', 'Shasta', 'Tidewater', 'Canyon', 'Sequoia', 'Piedmont Star'
  ],
  'Canada': [
    'Maple', 'Rockies', 'Yukon', 'Laurentian', 'Prairie Star', 'Huron',
    'Cascadia', 'Tundra', 'Churchill', 'Pacific Shore', 'Caribou', 'Chinook',
    'Baffin', 'Algonquin', 'Superior Star', 'Fraser', 'Kootenay', 'Athabasca'
  ],
  'Mexico': [
    'Azteca', 'Sierra Madre', 'Yucatan', 'Maya Star', 'Baja', 'Oaxaca',
    'Sonora', 'Jalisco', 'Cenote', 'Quetzal', 'Mariachi', 'Pacifico'
  ],

  // Asia
  'China': [
    'Yangtze', 'Jade Star', 'Great Wall', 'Pearl River', 'Silk Star',
    'Lotus', 'Dragon Star', 'Pagoda', 'Huangshan', 'Kunlun', 'Dynasty Star', 'Celestial'
  ],
  'Japan': [
    'Sakura', 'Fuji Star', 'Shinkansen', 'Nippon Star', 'Tokaido',
    'Kansai Star', 'Hokkaido', 'Okinawan', 'Tsuru', 'Shikoku', 'Kyushu Star', 'Taiyo'
  ],
  'South Korea': [
    'Halla Star', 'Hangang', 'Jeju Star', 'Goryeo', 'Mugunghwa', 'Taeback'
  ],
  'India': [
    'Ganges', 'Himalayan', 'Deccan Star', 'Mogul', 'Thar', 'Kerala Star',
    'Malabar', 'Indus Star', 'Rajput', 'Bengal', 'Konkan', 'Narmada'
  ],
  'Thailand': [
    'Siam', 'Andaman', 'Chao Phraya', 'Lanna Star', 'Golden Triangle', 'Isaan'
  ],
  'Singapore': [
    'Merlion', 'Straits Star', 'Changi Star', 'Lion City', 'Orchid Star', 'Raffles'
  ],
  'Malaysia': [
    'Borneo Star', 'Malacca', 'Langkawi', 'Kinabalu Star', 'Sarawak', 'Perak'
  ],
  'Indonesia': [
    'Nusantara', 'Bali Star', 'Komodo', 'Sumatra', 'Java Star', 'Borneo Sun',
    'Krakatoa', 'Raja Ampat', 'Sulawesi', 'Flores', 'Moluccan', 'Garuda Star'
  ],
  'Philippines': [
    'Visayan', 'Mindanao Star', 'Palawan', 'Taal Star', 'Mayon', 'Luzon Star'
  ],
  'Vietnam': [
    'Mekong', 'Halong', 'Saigon Star', 'Hanoi Star', 'Champa', 'Hue Star'
  ],
  'Taiwan': [
    'Formosa', 'Jade Mountain', 'Taroko', 'Sun Moon', 'Alishan', 'Taipei Star'
  ],
  'Hong Kong': [
    'Victoria Peak', 'Kowloon Star', 'Dragon Gate', 'Lantau', 'Pearl Delta', 'Cathay Star'
  ],

  // Middle East
  'United Arab Emirates': [
    'Desert Star', 'Falcon Star', 'Dune', 'Oasis Star', 'Mirage', 'Golden Sand',
    'Pearl Gulf', 'Crescent Star', 'Burj', 'Al Ain', 'Khaliji', 'Zayed Star'
  ],
  'Saudi Arabia': [
    'Hajr', 'Nabataean', 'Red Sea Star', 'Asir', 'Nejd', 'Hejaz Star'
  ],
  'Qatar': [
    'Doha Star', 'Al Corniche', 'Oryx Star', 'Barzan', 'Al Thani', 'Gulf Pearl'
  ],
  'Israel': [
    'Negev', 'Galilee', 'Carmel Star', 'Jordan Valley', 'Dead Sea Star', 'Masada'
  ],
  'Jordan': [
    'Petra Star', 'Wadi Rum', 'Hashemite', 'Amman Star', 'Aqaba', 'Jerash Star'
  ],
  'Lebanon': [
    'Cedar Star', 'Phoenician', 'Levant Star', 'Byblos', 'Sidon', 'Bekaa'
  ],
  'Bahrain': [
    'Pearl Isle', 'Dilmun', 'Gulf Star', 'Manama Star'
  ],
  'Oman': [
    'Muscat Star', 'Dhofar', 'Frankincense', 'Salalah Star', 'Hajar', 'Sur Star'
  ],
  'Kuwait': [
    'Kuwait Star', 'Failaka', 'Boom Star', 'Gulf Breeze'
  ],

  // Africa
  'South Africa': [
    'Protea', 'Springbok Star', 'Drakensberg', 'Karoo', 'Table Mountain',
    'Kruger', 'Highveld', 'Garden Route', 'Limpopo', 'Zulu Star', 'Namibrand'
  ],
  'Egypt': [
    'Pharaoh Star', 'Luxor', 'Sinai Star', 'Aswan', 'Delta Star',
    'Nubian', 'Sphinx Star', 'Cleopatra', 'Heliopolis', 'Suez Star'
  ],
  'Kenya': [
    'Masai Star', 'Serengeti Star', 'Mombasa', 'Rift Valley', 'Tsavo Star',
    'Amboseli', 'Turkana', 'Samburu', 'Flamingo Star', 'Nairobi Star'
  ],
  'Nigeria': [
    'Lagos Star', 'Niger Star', 'Abuja Star', 'Sahel Star', 'Calabar',
    'Harmattan Star', 'Benin Star', 'Aso Rock', 'Sokoto', 'Ogun Star'
  ],
  'Morocco': [
    'Atlas Star', 'Marrakech Star', 'Saharan', 'Rif Star', 'Fez Star',
    'Casablanca Star', 'Berber Star', 'Tangier Star', 'Souss', 'Ouarzazate'
  ],
  'Ethiopia': [
    'Abyssinian', 'Blue Nile', 'Simien Star', 'Lalibela', 'Addis Star', 'Omo Star'
  ],
  'Tanzania': [
    'Kilimanjaro Star', 'Zanzibar Star', 'Serengeti Sun', 'Ngorongoro', 'Pemba Star', 'Rufiji'
  ],
  'Ghana': [
    'Gold Coast Star', 'Ashanti', 'Volta Star', 'Kumasi Star', 'Elmina', 'Accra Star'
  ],

  // South America
  'Brazil': [
    'Amazonia', 'Pantanal', 'Tucano', 'Corcovado', 'Ipanema Star',
    'Cerrado', 'Sertao', 'Bahia Star', 'Manaus Star', 'Arara', 'Iguacu Star', 'Paulista'
  ],
  'Argentina': [
    'Pampas Star', 'Patagonia', 'Gaucho Star', 'Iguazu', 'Mendoza Star',
    'Andean Star', 'Tango', 'Cordoba Star', 'Tierra del Fuego', 'Condor Star'
  ],
  'Chile': [
    'Atacama', 'Patagonia Star', 'Rapanui', 'Austral Star', 'Torres Star',
    'Araucaria', 'Valparaiso Star', 'Mapocho', 'Elqui', 'Chiloe Star'
  ],
  'Colombia': [
    'Andean Sun', 'Magdalena', 'Caribe Star', 'Cali Star', 'Sierra Nevada',
    'Guatape', 'Medellin Star', 'Llanos', 'Boyaca', 'Cartagena Star'
  ],
  'Peru': [
    'Inca Star', 'Nazca', 'Altiplano Star', 'Cusco Star', 'Colca Star',
    'Titicaca', 'Moche', 'Lima Star', 'Huascaran', 'Chimu Star'
  ],
  'Ecuador': [
    'Equatorial Star', 'Galapagos', 'Cotopaxi', 'Quito Star', 'Chimborazo', 'Napo Star'
  ],

  // Oceania
  'Australia': [
    'Outback', 'Barrier Reef', 'Boomerang', 'Billabong', 'Uluru Star',
    'Kookaburra', 'Nullarbor', 'Kakadu', 'Barossa', 'Daintree Star',
    'Wattle', 'Eucalyptus', 'Coolabah', 'Platypus Star', 'Harbour Star'
  ],
  'New Zealand': [
    'Silver Fern', 'Aotearoa', 'Kiwi Star', 'Fiordland', 'Taupo Star',
    'Milford', 'Canterbury Star', 'Rotorua', 'Waikato', 'Tongariro', 'Cook Star'
  ],
  'Fiji': [
    'Fiji Star', 'Vanua', 'Coral Star', 'Yasawa', 'Viti Levu Star'
  ],
  'Papua New Guinea': [
    'Paradise Bird', 'Highlands Star', 'Sepik', 'Bismarck Star', 'Coral Sea Star'
  ]
};

// Generic prefixes — no geographic ties, work for any country
const GENERIC_PREFIXES = [
  'Redstrip', 'Skymark', 'Airfast', 'Cobalt', 'Jetstream', 'Clearsky',
  'Cirrus', 'Nimbus', 'Stratos', 'Altus', 'Zenith', 'Apex',
  'Summit', 'Compass', 'Meridian', 'Pinnacle', 'Vertex', 'Crest',
  'Crosswind', 'Tailwind', 'Windrose', 'Tradewind', 'Zephyr', 'Mistral Star',
  'Vanguard', 'Pioneer', 'Venture', 'Ascend', 'Elevate', 'Soar',
  'Brightsky', 'Blueline', 'Silverjet', 'Goldwing', 'Ironbird', 'Copperfield',
  'Starboard', 'Waypoint', 'Vector', 'Airlink', 'Skypath', 'Routemaster',
  'Astra', 'Nova', 'Orion Star', 'Polaris', 'Sirius', 'Vega Star',
  'Falcon Star', 'Hawk', 'Osprey', 'Condor Star', 'Swift', 'Albatross',
  'Arrow', 'Bolt', 'Flash', 'Dart', 'Comet Star', 'Meteor',
  'Sapphire', 'Amber', 'Onyx', 'Opal', 'Ruby Star', 'Topaz',
  'Atlas Star', 'Titan', 'Olympus', 'Pegasus', 'Griffin', 'Phoenix Star',
  'Northmark', 'Eastwind', 'Westbound', 'Southcross', 'Sunrise Star', 'Sunset Star',
  'Arcline', 'Wavecrest', 'Stormbird', 'Thunderbird', 'Firebird', 'Sunbird Star',
  'Magellan', 'Amundsen', 'Marco Polo', 'Vespucci', 'Discovery Star', 'Endeavour'
];

// Regional fallbacks for countries not in COUNTRY_PREFIXES
const REGIONAL_FALLBACKS = {
  'Europe': [
    'Continental', 'Eurostar', 'Transeuropa', 'Sovereign', 'Crown Star',
    'Royal Star', 'Imperial Star', 'Aurora Star', 'Boreal Star'
  ],
  'North America': [
    'Continental Star', 'Liberty Star', 'Republic Star', 'National Star',
    'Transcontinental', 'Gateway Star'
  ],
  'Asia': [
    'Orient Star', 'Pacific Star', 'Golden Star', 'Coral Star',
    'Pearl Star', 'Dynasty Star', 'Harmony Star'
  ],
  'South America': [
    'Andes Star', 'Southern Cross', 'Equatorial Star', 'Sol Star',
    'Austral Star', 'Tropical Star'
  ],
  'Africa': [
    'Safari Star', 'Savanna Star', 'Cape Star', 'Equator Star',
    'Majestic Star', 'Sunbird Star'
  ],
  'Oceania': [
    'Pacific Star', 'Southern Star', 'Oceanic Star', 'Tasman Star',
    'Tradewind Star', 'Coral Sea Star'
  ],
  'Middle East': [
    'Gulf Star', 'Arabian Star', 'Crescent Moon', 'Desert Sun',
    'Oasis Sun', 'Silk Road Star'
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
const ALPHANUMERIC = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

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
 * Generate a 2-character IATA code (real IATA codes use A-Z and 0-9)
 */
function generateIATACode(existingCodes) {
  // First try consonant-vowel pattern (most readable): 21×5 = 105 combos
  for (let i = 0; i < 200; i++) {
    const c1 = CONSONANTS[Math.floor(Math.random() * CONSONANTS.length)];
    const v = VOWELS[Math.floor(Math.random() * VOWELS.length)];
    const code = c1 + v;
    if (!existingCodes.has(code)) return code;
  }
  // Fallback: alphanumeric (like real IATA codes 2G, 7C, 9W): 36×36 = 1296 combos
  for (let i = 0; i < 500; i++) {
    const code = ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)] +
                 ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
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
 * Get the name prefix pool for a given country and region.
 * ~50% chance of country-specific name, ~50% generic.
 */
function pickPrefix(country, region) {
  const countryNames = COUNTRY_PREFIXES[country];
  const hasCountryNames = countryNames && countryNames.length > 0;

  // 50% country-specific, 50% generic (if country names exist)
  if (hasCountryNames && Math.random() < 0.55) {
    return pick(countryNames);
  }

  // 30% generic, 20% regional fallback (when not using country names)
  if (Math.random() < 0.6) {
    return pick(GENERIC_PREFIXES);
  }

  const fallbacks = REGIONAL_FALLBACKS[region] || REGIONAL_FALLBACKS['Europe'];
  return pick(fallbacks);
}

/**
 * Generate a fictional airline identity
 * @param {string} region - Broad region for fallback names
 * @param {number} era - Year for name style
 * @param {Set} existingICAO - Set of taken ICAO codes
 * @param {Set} existingIATA - Set of taken IATA codes
 * @param {Set} existingNames - Set of taken airline names
 * @param {string} [country] - Country name for geographically appropriate names
 * @returns {{ name: string, icaoCode: string, iataCode: string }}
 */
function generateAIAirline(region, era, existingICAO, existingIATA, existingNames, country) {
  const suffixes = era < 1980 ? CLASSIC_SUFFIXES : SUFFIXES;

  let name;
  let attempts = 0;
  do {
    const prefix = pickPrefix(country, region);
    // Some prefixes already end with "Star" — don't append suffix if name is long enough
    // and already sounds complete on its own
    name = prefix + ' ' + pick(suffixes);
    attempts++;
  } while (existingNames.has(name) && attempts < 150);

  // Fallback: combine two prefixes for uniqueness
  if (existingNames.has(name)) {
    const p1 = pickPrefix(country, region);
    const p2 = pick(GENERIC_PREFIXES);
    name = p1 + ' ' + pick(suffixes);
    if (existingNames.has(name)) {
      name = p2 + ' ' + pick(suffixes);
    }
  }

  const icaoCode = generateICAOCode(existingICAO);
  const iataCode = generateIATACode(existingIATA);

  return { name, icaoCode, iataCode };
}

module.exports = {
  generateAIAirline,
  generateICAOCode,
  generateIATACode,
  COUNTRY_PREFIXES,
  GENERIC_PREFIXES
};
