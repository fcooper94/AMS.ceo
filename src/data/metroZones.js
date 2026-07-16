/**
 * metroZones.js - Metro Zone Definitions for Airline Simulation Game
 *
 * Each zone represents a metropolitan area containing one or more airports.
 * Used for the zone-based demand model to calculate passenger flows between cities.
 *
 * Schema:
 *   zoneId      - Short unique identifier (2-4 chars)
 *   name        - Display name of the metro area
 *   countryCode - ISO 3166-1 alpha-2 country code
 *   latitude    - Center latitude (decimal degrees)
 *   longitude   - Center longitude (decimal degrees)
 *   population  - Metro area population in THOUSANDS, by decade (1950-2020)
 *   airports    - Array of ICAO codes for airports within this zone
 *
 * Population sources: UN World Urbanization Prospects, national census data.
 * Airport codes follow ICAO conventions (K=US, C=Canada, EG=UK, LF=France, etc.)
 *
 * Total zones: ~350 covering all major metro areas worldwide.
 */

module.exports = [

  // ============================================================
  //  NORTH AMERICA - United States
  // ============================================================

  {
    zoneId: 'NYC',
    name: 'New York',
    countryCode: 'US',
    latitude: 40.6413,
    longitude: -73.7781,
    population: {
      1950: 12300, 1960: 14200, 1970: 16200, 1980: 15600,
      1990: 16100, 2000: 17800, 2010: 18900, 2020: 20100
    },
    airports: ['KJFK', 'KEWR', 'KLGA', 'KBDR', 'KDXR', 'KFRG', 'KHPN', 'KISP', 'KMMU', 'KSWF', 'KTEB']
  },
  {
    zoneId: 'LAX',
    name: 'Los Angeles',
    countryCode: 'US',
    latitude: 33.9425,
    longitude: -118.408,
    population: {
      1950: 4000, 1960: 6500, 1970: 8400, 1980: 9500,
      1990: 11300, 2000: 12400, 2010: 12830, 2020: 13200
    },
    airports: ['KLAX', 'KONT', 'KSNA', 'KBUR', 'KLGB', 'KBFL', 'KDAG', 'KHHR', 'KNTD', 'KOXR', 'KPMD', 'KRAL', 'KRIV', 'KSBA', 'KSBD', 'KSBP', 'KSMO', 'KSMX', 'KVBG', 'KVIS', 'KVNY']
  },
  {
    zoneId: 'CHI',
    name: 'Chicago',
    countryCode: 'US',
    latitude: 41.9742,
    longitude: -87.9073,
    population: {
      1950: 5500, 1960: 6200, 1970: 7000, 1980: 7100,
      1990: 7400, 2000: 8300, 2010: 9200, 2020: 9600
    },
    airports: ['KORD', 'KMDW', 'KBMI', 'KDBQ', 'KDPA', 'KGYY', 'KIKK', 'KMLI', 'KPIA', 'KPWK', 'KRFD', 'KSBN', 'KVPZ']
  },
  {
    zoneId: 'DFW',
    name: 'Dallas-Fort Worth',
    countryCode: 'US',
    latitude: 32.8998,
    longitude: -97.0403,
    population: {
      1950: 1100, 1960: 1600, 1970: 2300, 1980: 2900,
      1990: 3500, 2000: 4600, 2010: 5800, 2020: 7600
    },
    airports: ['KDFW', 'KDAL', 'KABI', 'KACT', 'KAFW', 'KDUA', 'KFTW', 'KGGG', 'KGYI', 'KPRX', 'KSHV', 'KTXK', 'KTYR']
  },
  {
    zoneId: 'HOU',
    name: 'Houston',
    countryCode: 'US',
    latitude: 29.9844,
    longitude: -95.3414,
    population: {
      1950: 800, 1960: 1200, 1970: 1800, 1980: 2700,
      1990: 3300, 2000: 4100, 2010: 5200, 2020: 7100
    },
    airports: ['KIAH', 'KHOU', 'KBPT', 'KCLL', 'KCXO', 'KDRI', 'KEFD', 'KGLS', 'KLBX', 'KLCH', 'KLFK', 'KSGR', 'KUTS']
  },
  {
    zoneId: 'WAS',
    name: 'Washington DC',
    countryCode: 'US',
    latitude: 38.8512,
    longitude: -77.0402,
    population: {
      1950: 1500, 1960: 2000, 1970: 2800, 1980: 3100,
      1990: 3900, 2000: 4800, 2010: 5600, 2020: 6300
    },
    airports: ['KIAD', 'KDCA', 'KBWI', 'KADW', 'KFME', 'KHEF', 'KHGR', 'KMRB', 'KMTN', 'KNHK', 'KSBY']
  },
  {
    zoneId: 'MIA',
    name: 'Miami',
    countryCode: 'US',
    latitude: 25.7959,
    longitude: -80.2870,
    population: {
      1950: 700, 1960: 1200, 1970: 1800, 1980: 2600,
      1990: 3200, 2000: 4000, 2010: 5000, 2020: 6100
    },
    airports: ['KMIA', 'KFLL', 'KPBI', '07FA', 'KBCT', 'KEYW', 'KFXE', 'KHST', 'KHWO', 'KMTH', 'KNQX', 'KOPF', 'KTMB']
  },
  {
    zoneId: 'ATL',
    name: 'Atlanta',
    countryCode: 'US',
    latitude: 33.6407,
    longitude: -84.4277,
    population: {
      1950: 700, 1960: 1000, 1970: 1400, 1980: 1800,
      1990: 2500, 2000: 3500, 2010: 4500, 2020: 6100
    },
    airports: ['KATL', 'KABY', 'KAHN', 'KCSG', 'KDHN', 'KFTY', 'KMCN', 'KMGE', 'KPDK', 'KRMG']
  },
  {
    zoneId: 'SFO',
    name: 'San Francisco Bay Area',
    countryCode: 'US',
    latitude: 37.6213,
    longitude: -122.379,
    population: {
      1950: 2000, 1960: 2600, 1970: 3100, 1980: 3300,
      1990: 3700, 2000: 4100, 2010: 4300, 2020: 4700
    },
    airports: ['KSFO', 'KOAK', 'KSJC', 'KCCR', 'KFAT', 'KMCE', 'KMER', 'KMOD', 'KMRY', 'KNLC', 'KPAO', 'KPRB', 'KSNS', 'KSQL', 'KSTS']
  },
  {
    zoneId: 'PHX',
    name: 'Phoenix',
    countryCode: 'US',
    latitude: 33.4373,
    longitude: -112.008,
    population: {
      1950: 330, 1960: 660, 1970: 1000, 1980: 1500,
      1990: 2100, 2000: 3000, 2010: 3800, 2020: 4900
    },
    airports: ['KPHX', 'KIWA', 'KFLG', 'KINW', 'KPRC', 'KSOW']
  },
  {
    zoneId: 'BOS',
    name: 'Boston',
    countryCode: 'US',
    latitude: 42.3656,
    longitude: -71.0096,
    population: {
      1950: 2600, 1960: 2800, 1970: 3000, 1980: 2900,
      1990: 3100, 2000: 3400, 2010: 3800, 2020: 4900
    },
    airports: ['KBOS', 'KAUG', 'KBED', 'KBGR', 'KBHB', 'KBVY', 'KBXM', 'KCAR', 'KCON', 'KHUL', 'KLEB', 'KLWM', 'KMHT', 'KMPV', 'KOWD', 'KPQI', 'KPSM', 'KPWM', 'KRKD']
  },
  {
    zoneId: 'SEA',
    name: 'Seattle',
    countryCode: 'US',
    latitude: 47.4502,
    longitude: -122.309,
    population: {
      1950: 800, 1960: 1100, 1970: 1400, 1980: 1500,
      1990: 1900, 2000: 2700, 2010: 3000, 2020: 4000
    },
    airports: ['KSEA', 'KBFI', 'KBLI', 'KCLM', 'KCOE', 'KEAT', 'KFHR', 'KGEG', 'KHQM', 'KMWH', 'KNUW', 'KOLM', 'KORS', 'KPAE', 'KPSC', 'KPWT', 'KSFF', 'KTIW', 'KYKM']
  },
  {
    zoneId: 'MSP',
    name: 'Minneapolis-St Paul',
    countryCode: 'US',
    latitude: 44.8848,
    longitude: -93.2223,
    population: {
      1950: 1100, 1960: 1400, 1970: 1700, 1980: 1900,
      1990: 2200, 2000: 2600, 2010: 3000, 2020: 3700
    },
    airports: ['KMSP', 'KABR', 'KATY', 'KAXN', 'KBDE', 'KBJI', 'KBRD', 'KCMX', 'KDLH', 'KEAU', 'KELO', 'KFAR', 'KGFK', 'KHIB', 'KHYR', 'KINL', 'KJMS', 'KLSE', 'KRHI', 'KRNH', 'KRST', 'KRWF', 'KSTC', 'KSTP', 'KTVF']
  },
  {
    zoneId: 'DEN',
    name: 'Denver',
    countryCode: 'US',
    latitude: 39.8561,
    longitude: -104.674,
    population: {
      1950: 500, 1960: 800, 1970: 1100, 1980: 1400,
      1990: 1600, 2000: 2100, 2010: 2500, 2020: 2900
    },
    airports: ['KDEN', 'KAIA', 'KAPA', 'KASE', 'KBFF', 'KBJC', 'KBKF', 'KCDR', 'KCOS', 'KCPR', 'KCYS', 'KEGE', 'KFCS', 'KFNL', 'KGCC', 'KGJT', 'KGLD', 'KGUC', 'KHDN', 'KLAA', 'KLAR', 'KLBF', 'KMCK', 'KMTJ', 'KPUB', 'KRAP', 'KRIL', 'KRWL', 'KSNY']
  },
  {
    zoneId: 'DTW',
    name: 'Detroit',
    countryCode: 'US',
    latitude: 42.2124,
    longitude: -83.3534,
    population: {
      1950: 3000, 1960: 3500, 1970: 3900, 1980: 3800,
      1990: 3700, 2000: 4000, 2010: 3900, 2020: 3500
    },
    airports: ['KDTW', 'KAPN', 'KAZO', 'KBTL', 'KDET', 'KFNT', 'KGRR', 'KJXN', 'KLAN', 'KMBS', 'KMTC', 'KPTK', 'KTOL', 'KYIP']
  },
  {
    zoneId: 'PHL',
    name: 'Philadelphia',
    countryCode: 'US',
    latitude: 39.8721,
    longitude: -75.2411,
    population: {
      1950: 3700, 1960: 4000, 1970: 4300, 1980: 4200,
      1990: 4300, 2000: 5100, 2010: 5600, 2020: 6200
    },
    airports: ['KPHL', 'KABE', 'KACY', 'KAVP', 'KILG', 'KIPT', 'KLNS', 'KMDT', 'KMIV', 'KNEL', 'KOXB', 'KPNE', 'KRDG', 'KTTN', 'KWWD']
  },
  {
    zoneId: 'CLT',
    name: 'Charlotte',
    countryCode: 'US',
    latitude: 35.2140,
    longitude: -80.9431,
    population: {
      1950: 200, 1960: 300, 1970: 500, 1980: 600,
      1990: 900, 2000: 1300, 2010: 1800, 2020: 2700
    },
    airports: ['KCLT', 'KBKW', 'KBLF', 'KCAE', 'KCUB', 'KHKY', 'KINT', 'KJQF']
  },
  {
    zoneId: 'MCO',
    name: 'Orlando',
    countryCode: 'US',
    latitude: 28.4312,
    longitude: -81.3081,
    population: {
      1950: 200, 1960: 300, 1970: 500, 1980: 700,
      1990: 1100, 2000: 1600, 2010: 2100, 2020: 2700
    },
    airports: ['KMCO', 'KSFB', 'KCOF', 'KDAB', 'KFPR', 'KISM', 'KLEE', 'KMLB', 'KORL', 'KTIX', 'KVRB']
  },
  {
    zoneId: 'TPA',
    name: 'Tampa',
    countryCode: 'US',
    latitude: 27.9756,
    longitude: -82.5333,
    population: {
      1950: 400, 1960: 700, 1970: 1000, 1980: 1400,
      1990: 1700, 2000: 2100, 2010: 2500, 2020: 3200
    },
    airports: ['KTPA', 'KPIE', 'KLAL', 'KSRQ']
  },
  {
    zoneId: 'STL',
    name: 'St Louis',
    countryCode: 'US',
    latitude: 38.7487,
    longitude: -90.3700,
    population: {
      1950: 1700, 1960: 2000, 1970: 2200, 1980: 2200,
      1990: 2300, 2000: 2500, 2010: 2600, 2020: 2800
    },
    airports: ['KSTL', 'KALN', 'KCGI', 'KCOU', 'KDEC', 'KMDH', 'KMWA', 'KSPI', 'KSUS', 'KTBN', 'KUIN']
  },
  // Note: Baltimore (BWI) is included in the Washington DC zone above
  {
    zoneId: 'SLC',
    name: 'Salt Lake City',
    countryCode: 'US',
    latitude: 40.7899,
    longitude: -111.979,
    population: {
      1950: 300, 1960: 400, 1970: 600, 1980: 800,
      1990: 1000, 2000: 1300, 2010: 1100, 2020: 1200
    },
    airports: ['KSLC', 'KBPI', 'KCNY', 'KCOD', 'KELY', 'KENV', 'KEVW', 'KIDA', 'KJAC', 'KLGU', 'KLND', 'KOGD', 'KPIH', 'KPNA', 'KPVU', 'KRIW', 'KRKS', 'KVEL', 'KWRL']
  },
  {
    zoneId: 'SAN',
    name: 'San Diego',
    countryCode: 'US',
    latitude: 32.7338,
    longitude: -117.190,
    population: {
      1950: 500, 1960: 800, 1970: 1200, 1980: 1700,
      1990: 2200, 2000: 2600, 2010: 2900, 2020: 3300
    },
    airports: ['KSAN', 'KBLH', 'KCRQ', 'KIPL', 'KNJK', 'KNKX', 'KNYL', 'KNZY', 'KPSP', 'KSDM', 'KTRM']
  },
  {
    zoneId: 'PIT',
    name: 'Pittsburgh',
    countryCode: 'US',
    latitude: 40.4915,
    longitude: -80.2329,
    population: {
      1950: 2200, 1960: 2300, 1970: 2300, 1980: 2100,
      1990: 2000, 2000: 2100, 2010: 2100, 2020: 2100
    },
    airports: ['KPIT', 'KAGC', 'KAOO', 'KBVI', 'KCKB', 'KDUJ', 'KEKN', 'KFKL', 'KHLG', 'KJST', 'KLBE', 'KMGW', 'KUNV', 'KYNG']
  },
  {
    zoneId: 'PDX',
    name: 'Portland',
    countryCode: 'US',
    latitude: 45.5898,
    longitude: -122.595,
    population: {
      1950: 600, 1960: 700, 1970: 900, 1980: 1100,
      1990: 1300, 2000: 1700, 2010: 2000, 2020: 2500
    },
    airports: ['KPDX', 'KAST', 'KCVO', 'KDLS', 'KEUG', 'KHIO', 'KKLS', 'KMFR', 'KONP', 'KOTH', 'KPDT', 'KRDM', 'KSLE', 'KTTD']
  },
  {
    zoneId: 'LAS',
    name: 'Las Vegas',
    countryCode: 'US',
    latitude: 36.0840,
    longitude: -115.153,
    population: {
      1950: 50, 1960: 130, 1970: 270, 1980: 460,
      1990: 750, 2000: 1400, 2010: 1900, 2020: 2300
    },
    airports: ['KLAS', 'K61B', 'K67L', 'KBCE', 'KCDC', 'KDRA', 'KEED', 'KGCN', 'KHII', 'KIFP', 'KIGM', 'KPGA', 'KSGU', 'KTPH', 'KVGT']
  },
  {
    zoneId: 'AUS',
    name: 'Austin',
    countryCode: 'US',
    latitude: 30.1975,
    longitude: -97.6664,
    population: {
      1950: 200, 1960: 250, 1970: 350, 1980: 500,
      1990: 700, 2000: 1100, 2010: 1500, 2020: 2300
    },
    airports: ['KAUS', 'KBBD', 'KTPL', 'KVCT']
  },
  {
    zoneId: 'NSH',
    name: 'Nashville',
    countryCode: 'US',
    latitude: 36.1263,
    longitude: -86.6774,
    population: {
      1950: 400, 1960: 500, 1970: 600, 1980: 700,
      1990: 900, 2000: 1100, 2010: 1400, 2020: 2000
    },
    airports: ['KBNA', 'KBWG', 'KCSV', 'KMQY', 'KPAH']
  },
  {
    zoneId: 'RDU',
    name: 'Raleigh-Durham',
    countryCode: 'US',
    latitude: 35.8801,
    longitude: -78.7880,
    population: {
      1950: 200, 1960: 300, 1970: 400, 1980: 500,
      1990: 700, 2000: 1000, 2010: 1100, 2020: 1400
    },
    airports: ['KRDU', 'KDAN', 'KEWN', 'KFAY', 'KGSO', 'KILM', 'KISO', 'KLBT', 'KLWB', 'KLYH', 'KOAJ', 'KPGV', 'KPOB', 'KROA', 'KRWI']
  },
  {
    zoneId: 'IND',
    name: 'Indianapolis',
    countryCode: 'US',
    latitude: 39.7173,
    longitude: -86.2944,
    population: {
      1950: 600, 1960: 700, 1970: 900, 1980: 1000,
      1990: 1100, 2000: 1300, 2010: 1500, 2020: 1700
    },
    airports: ['KIND', 'KBAK', 'KBMG', 'KCMI', 'KFWA', 'KGUS', 'KHUF', 'KLAF', 'KMIE']
  },
  {
    zoneId: 'CLE',
    name: 'Cleveland',
    countryCode: 'US',
    latitude: 41.4117,
    longitude: -81.8498,
    population: {
      1950: 1500, 1960: 1700, 1970: 1900, 1980: 1800,
      1990: 1700, 2000: 1800, 2010: 1800, 2020: 1800
    },
    airports: ['KCLE', 'KAKR', 'KBKL', 'KCAK', 'KCGF', 'KHZY', 'KMFD']
  },
  {
    zoneId: 'CMH',
    name: 'Columbus OH',
    countryCode: 'US',
    latitude: 39.9980,
    longitude: -82.8919,
    population: {
      1950: 500, 1960: 600, 1970: 800, 1980: 900,
      1990: 1100, 2000: 1300, 2010: 1500, 2020: 1700
    },
    airports: ['KCMH', 'KCRW', 'KFDY', 'KHTS', 'KLCK', 'KOSU', 'KPKB', 'KSGH', 'KZZV']
  },
  {
    zoneId: 'MKE',
    name: 'Milwaukee',
    countryCode: 'US',
    latitude: 42.9472,
    longitude: -87.8966,
    population: {
      1950: 800, 1960: 1000, 1970: 1200, 1980: 1200,
      1990: 1200, 2000: 1300, 2010: 1400, 2020: 1500
    },
    airports: ['KMKE', 'KATW', 'KAUW', 'KCIU', 'KCWA', 'KENW', 'KESC', 'KGRB', 'KIMT', 'KMKG', 'KMSN', 'KOSH', 'KPLN', 'KSAW', 'KTVC', 'KVOK']
  },
  {
    zoneId: 'JAX',
    name: 'Jacksonville',
    countryCode: 'US',
    latitude: 30.4941,
    longitude: -81.6879,
    population: {
      1950: 300, 1960: 400, 1970: 500, 1980: 600,
      1990: 800, 2000: 1000, 2010: 1200, 2020: 1600
    },
    airports: ['KJAX', 'KBQK', 'KCRG', 'KGNV', 'KNIP', 'KNRB', 'KSGJ', 'KSSI', 'KTLH', 'KVLD', 'KVQQ']
  },
  {
    zoneId: 'MCI',
    name: 'Kansas City',
    countryCode: 'US',
    latitude: 39.2976,
    longitude: -94.7139,
    population: {
      1950: 700, 1960: 900, 1970: 1100, 1980: 1200,
      1990: 1400, 2000: 1600, 2010: 1800, 2020: 2200
    },
    airports: ['KMCI', 'KFOE', 'KMHK', 'KMKC', 'KRSL', 'KSLN', 'KSTJ', 'KTOP']
  },
  {
    zoneId: 'SAT',
    name: 'San Antonio',
    countryCode: 'US',
    latitude: 29.5337,
    longitude: -98.4698,
    population: {
      1950: 400, 1960: 600, 1970: 800, 1980: 1000,
      1990: 1200, 2000: 1500, 2010: 1800, 2020: 2600
    },
    airports: ['KSAT', 'KALI', 'KBRO', 'KCRP', 'KDRT', 'KHRL', 'KJCT', 'KLRD', 'KMFE', 'KNGP', 'KNQI', 'KSJT', 'KSSF']
  },
  {
    zoneId: 'MEM',
    name: 'Memphis',
    countryCode: 'US',
    latitude: 35.0424,
    longitude: -89.9767,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 800,
      1990: 900, 2000: 1100, 2010: 1200, 2020: 1300
    },
    airports: ['KMEM', 'KBPK', 'KBYH', 'KELD', 'KGLH', 'KGWO', 'KHOT', 'KJBR', 'KLIT', 'KMKL', 'KNQA', 'KPBF', 'KTUP', 'KUOX']
  },
  {
    zoneId: 'CVG',
    name: 'Cincinnati',
    countryCode: 'US',
    latitude: 39.0488,
    longitude: -84.6678,
    population: {
      1950: 900, 1960: 1000, 1970: 1200, 1980: 1200,
      1990: 1300, 2000: 1500, 2010: 1600, 2020: 1700
    },
    airports: ['KCVG', 'KDAY', 'KILN', 'KLUK']
  },
  {
    zoneId: 'MSY',
    name: 'New Orleans',
    countryCode: 'US',
    latitude: 29.9934,
    longitude: -90.2580,
    population: {
      1950: 700, 1960: 800, 1970: 1000, 1980: 1100,
      1990: 1200, 2000: 1300, 2010: 1100, 2020: 1300
    },
    airports: ['KMSY', 'KAEX', 'KARA', 'KBFM', 'KBTR', 'KGPT', 'KHBG', 'KJAN', 'KLFT', 'KMCB', 'KMLU', 'KMOB', 'KNEW', 'KNPA', 'KPIB', 'KPNS']
  },
  {
    zoneId: 'BUF',
    name: 'Buffalo',
    countryCode: 'US',
    latitude: 42.9405,
    longitude: -78.7322,
    population: {
      1950: 900, 1960: 1000, 1970: 1100, 1980: 1000,
      1990: 950, 2000: 1000, 2010: 1000, 2020: 1000
    },
    airports: ['KBUF', 'KART', 'KBFD', 'KBGM', 'KELM', 'KERI', 'KIAG', 'KITH', 'KJHW', 'KOGS', 'KROC', 'KSYR']
  },
  {
    zoneId: 'HNL',
    name: 'Honolulu',
    countryCode: 'US',
    latitude: 21.3187,
    longitude: -157.922,
    population: {
      1950: 350, 1960: 500, 1970: 600, 1980: 700,
      1990: 800, 2000: 870, 2010: 950, 2020: 1000
    },
    airports: ['PHNL', 'PHBK', 'PHHN', 'PHJH', 'PHJR', 'PHKO', 'PHLI', 'PHMK', 'PHMU', 'PHNG', 'PHNY', 'PHOG', 'PHTO']
  },
  {
    zoneId: 'ANC',
    name: 'Anchorage',
    countryCode: 'US',
    latitude: 61.1743,
    longitude: -149.996,
    population: {
      1950: 30, 1960: 80, 1970: 120, 1980: 175,
      1990: 225, 2000: 260, 2010: 290, 2020: 400
    },
    airports: ['PANC', 'PAAQ', 'PACV', 'PADL', 'PADQ', 'PAEN', 'PAFA', 'PAGA', 'PAGK', 'PAHC', 'PAHO', 'PAII', 'PAIL', 'PAKN', 'PAMC', 'PAMR', 'PANI', 'PANN', 'PAOR', 'PARY', 'PASX', 'PATK', 'PAVD', 'PAWD', 'PAWS']
  },
  {
    zoneId: 'RNO',
    name: 'Reno',
    countryCode: 'US',
    latitude: 39.4991,
    longitude: -119.768,
    population: {
      1950: 80, 1960: 130, 1970: 180, 1980: 250,
      1990: 300, 2000: 380, 2010: 420, 2020: 490
    },
    airports: ['KRNO', 'KBIH', 'KCXP', 'KLMT', 'KLOL', 'KNFL', 'KTRK', 'KTVL', 'KWMC']
  },
  {
    zoneId: 'OKC',
    name: 'Oklahoma City',
    countryCode: 'US',
    latitude: 35.3931,
    longitude: -97.6007,
    population: {
      1950: 400, 1960: 500, 1970: 600, 1980: 700,
      1990: 800, 2000: 1000, 2010: 1100, 2020: 1400
    },
    airports: ['KOKC', 'KADH', 'KAMA', 'KCDS', 'KDDC', 'KGCK', 'KGUY', 'KHBR', 'KLAW', 'KLBB', 'KLBL', 'KSWO', 'KWWR']
  },
  {
    zoneId: 'RIC',
    name: 'Richmond',
    countryCode: 'US',
    latitude: 37.5052,
    longitude: -77.3197,
    population: {
      1950: 400, 1960: 500, 1970: 600, 1980: 650,
      1990: 750, 2000: 900, 2010: 1100, 2020: 1300
    },
    airports: ['KRIC', 'KCHO', 'KSHD']
  },
  {
    zoneId: 'ABQ',
    name: 'Albuquerque',
    countryCode: 'US',
    latitude: 35.0402,
    longitude: -106.609,
    population: {
      1950: 150, 1960: 250, 1970: 350, 1980: 450,
      1990: 550, 2000: 700, 2010: 800, 2020: 920
    },
    airports: ['KABQ', 'KALS', 'KCEZ', 'KCVN', 'KDHT', 'KDRO', 'KFMN', 'KGUP', 'KLVS', 'KSAF', 'KSKX', 'KTCC', 'KTEX']
  },
  {
    zoneId: 'TUL',
    name: 'Tulsa',
    countryCode: 'US',
    latitude: 36.1984,
    longitude: -95.8881,
    population: {
      1950: 350, 1960: 400, 1970: 500, 1980: 600,
      1990: 700, 2000: 800, 2010: 900, 2020: 1000
    },
    airports: ['KTUL', 'KBBG', 'KCNU', 'KFSM', 'KFYV', 'KHRO', 'KHUT', 'KICT', 'KJLN', 'KMLC', 'KPNC', 'KRVS', 'KSGF', 'KXNA']
  },
  {
    zoneId: 'BHM',
    name: 'Birmingham AL',
    countryCode: 'US',
    latitude: 33.5628,
    longitude: -86.7535,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 750,
      1990: 800, 2000: 900, 2010: 1000, 2020: 1100
    },
    airports: ['KBHM', 'KANB', 'KCEW', 'KDTS', 'KECP', 'KEGI', 'KGTR', 'KMEI', 'KMGM', 'KNSE', 'KOZR', 'KTCL', 'KTOI', 'KVPS']
  },
  {
    zoneId: 'ELP',
    name: 'El Paso',
    countryCode: 'US',
    latitude: 31.8073,
    longitude: -106.378,
    population: {
      1950: 200, 1960: 300, 1970: 400, 1980: 480,
      1990: 550, 2000: 650, 2010: 750, 2020: 870
    },
    airports: ['KELP', 'KALM', 'KCNM', 'KDMN', 'KFST', 'KHOB', 'KINK', 'KLRU', 'KMAF', 'KROW', 'KSRR', 'KSVC', 'KTCS']
  },

  // ============================================================
  //  NORTH AMERICA - Canada
  // ============================================================

  {
    zoneId: 'YYZ',
    name: 'Toronto',
    countryCode: 'CA',
    latitude: 43.6777,
    longitude: -79.6248,
    population: {
      1950: 1300, 1960: 1800, 1970: 2600, 1980: 3000,
      1990: 3700, 2000: 4700, 2010: 5400, 2020: 6200
    },
    airports: ['CYYZ', 'CYHM']
  },
  {
    zoneId: 'YVR',
    name: 'Vancouver',
    countryCode: 'CA',
    latitude: 49.1967,
    longitude: -123.184,
    population: {
      1950: 500, 1960: 700, 1970: 1000, 1980: 1200,
      1990: 1600, 2000: 2000, 2010: 2300, 2020: 2600
    },
    airports: ['CYVR']
  },
  {
    zoneId: 'YUL',
    name: 'Montreal',
    countryCode: 'CA',
    latitude: 45.4706,
    longitude: -73.7408,
    population: {
      1950: 1500, 1960: 2000, 1970: 2700, 1980: 2800,
      1990: 3100, 2000: 3400, 2010: 3700, 2020: 4100
    },
    airports: ['CYUL']
  },
  {
    zoneId: 'YYC',
    name: 'Calgary',
    countryCode: 'CA',
    latitude: 51.1215,
    longitude: -114.013,
    population: {
      1950: 130, 1960: 230, 1970: 380, 1980: 560,
      1990: 710, 2000: 900, 2010: 1100, 2020: 1400
    },
    airports: ['CYYC']
  },
  {
    zoneId: 'YEG',
    name: 'Edmonton',
    countryCode: 'CA',
    latitude: 53.3097,
    longitude: -113.580,
    population: {
      1950: 170, 1960: 310, 1970: 460, 1980: 650,
      1990: 770, 2000: 900, 2010: 1050, 2020: 1400
    },
    airports: ['CYEG']
  },
  {
    zoneId: 'YOW',
    name: 'Ottawa',
    countryCode: 'CA',
    latitude: 45.3225,
    longitude: -75.6692,
    population: {
      1950: 280, 1960: 400, 1970: 550, 1980: 650,
      1990: 800, 2000: 950, 2010: 1100, 2020: 1400
    },
    airports: ['CYOW']
  },
  {
    zoneId: 'YWG',
    name: 'Winnipeg',
    countryCode: 'CA',
    latitude: 49.9100,
    longitude: -97.2399,
    population: {
      1950: 350, 1960: 450, 1970: 530, 1980: 580,
      1990: 620, 2000: 660, 2010: 710, 2020: 830
    },
    airports: ['CYWG']
  },
  {
    zoneId: 'YHZ',
    name: 'Halifax',
    countryCode: 'CA',
    latitude: 44.8808,
    longitude: -63.5085,
    population: {
      1950: 160, 1960: 200, 1970: 260, 1980: 280,
      1990: 310, 2000: 340, 2010: 380, 2020: 440
    },
    airports: ['CYHZ']
  },
  {
    zoneId: 'YQB',
    name: 'Quebec City',
    countryCode: 'CA',
    latitude: 46.7912,
    longitude: -71.3933,
    population: {
      1950: 250, 1960: 300, 1970: 400, 1980: 500,
      1990: 600, 2000: 650, 2010: 720, 2020: 830
    },
    airports: ['CYQB']
  },

  // ============================================================
  //  NORTH AMERICA - Additional US Cities
  // ============================================================

  {
    zoneId: 'RSW',
    name: 'Fort Myers',
    countryCode: 'US',
    latitude: 26.5362,
    longitude: -81.7553,
    population: {
      1950: 30, 1960: 55, 1970: 100, 1980: 200,
      1990: 340, 2000: 480, 2010: 620, 2020: 800
    },
    airports: ['KRSW', 'KAPF', 'KFMY', 'KPGD']
  },
  {
    zoneId: 'SDF',
    name: 'Louisville',
    countryCode: 'US',
    latitude: 38.1744,
    longitude: -85.7360,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 750,
      1990: 800, 2000: 900, 2010: 1000, 2020: 1100
    },
    airports: ['KSDF', 'KEVV', 'KLEX', 'KLOU', 'KLOZ', 'KOWB', 'KSME']
  },
  {
    zoneId: 'SMF',
    name: 'Sacramento',
    countryCode: 'US',
    latitude: 38.6954,
    longitude: -121.591,
    population: {
      1950: 300, 1960: 500, 1970: 700, 1980: 900,
      1990: 1200, 2000: 1600, 2010: 1800, 2020: 2400
    },
    airports: ['KSMF', 'KACV', 'KCEC', 'KEKA', 'KMHR', 'KMYV', 'KRBL', 'KRDD', 'KSAC', 'KSCK', 'KUKI']
  },
  {
    zoneId: 'TUS',
    name: 'Tucson',
    countryCode: 'US',
    latitude: 32.1161,
    longitude: -110.941,
    population: {
      1950: 120, 1960: 250, 1970: 350, 1980: 500,
      1990: 650, 2000: 840, 2010: 980, 2020: 1050
    },
    airports: ['KTUS', 'KDUG', 'KOLS']
  },
  {
    zoneId: 'OMA',
    name: 'Omaha',
    countryCode: 'US',
    latitude: 41.3032,
    longitude: -95.8941,
    population: {
      1950: 350, 1960: 420, 1970: 490, 1980: 550,
      1990: 620, 2000: 720, 2010: 830, 2020: 950
    },
    airports: ['KOMA', 'KEAR', 'KFSD', 'KGRI', 'KHON', 'KHYS', 'KLNK', 'KOFK', 'KOLU', 'KPIR', 'KSUX', 'KVTN', 'KYKN']
  },
  {
    zoneId: 'DSM',
    name: 'Des Moines',
    countryCode: 'US',
    latitude: 41.5340,
    longitude: -93.6631,
    population: {
      1950: 200, 1960: 250, 1970: 300, 1980: 340,
      1990: 380, 2000: 450, 2010: 530, 2020: 700
    },
    airports: ['KDSM', 'KALO', 'KBRL', 'KCCY', 'KCID', 'KFOD', 'KIRK', 'KMCW', 'KOTM']
  },
  {
    zoneId: 'HSV',
    name: 'Huntsville',
    countryCode: 'US',
    latitude: 34.6372,
    longitude: -86.7751,
    population: {
      1950: 80, 1960: 150, 1970: 220, 1980: 290,
      1990: 340, 2000: 380, 2010: 420, 2020: 490
    },
    airports: ['KHSV', 'KCHA', 'KMSL']
  },
  {
    zoneId: 'GSP',
    name: 'Greenville SC',
    countryCode: 'US',
    latitude: 34.8957,
    longitude: -82.2189,
    population: {
      1950: 200, 1960: 280, 1970: 370, 1980: 450,
      1990: 550, 2000: 650, 2010: 750, 2020: 930
    },
    airports: ['KGSP', 'KAGS', 'KAND', 'KAVL', 'KDNL', 'KGMU', 'KTRI', 'KTYS']
  },
  {
    zoneId: 'BOI',
    name: 'Boise',
    countryCode: 'US',
    latitude: 43.5644,
    longitude: -116.223,
    population: {
      1950: 70, 1960: 100, 1970: 130, 1980: 190,
      1990: 250, 2000: 350, 2010: 450, 2020: 750
    },
    airports: ['KBOI', 'KALW', 'KBKE', 'KBNO', 'KBTM', 'KBYI', 'KBZN', 'KEKO', 'KGPI', 'KHLN', 'KLVM', 'KLWS', 'KMSO', 'KMYL', 'KONO', 'KPUW', 'KSMN', 'KSUN', 'KTWF', 'KWYS']
  },
  {
    zoneId: 'CHS',
    name: 'Charleston SC',
    countryCode: 'US',
    latitude: 32.8986,
    longitude: -80.0405,
    population: {
      1950: 160, 1960: 200, 1970: 260, 1980: 350,
      1990: 450, 2000: 530, 2010: 630, 2020: 800
    },
    airports: ['KCHS', 'KCRE', 'KFLO', 'KHXD', 'KMMT', 'KMYR', 'KOGB', 'KSAV']
  },

  // ============================================================
  //  NORTH AMERICA - Mexico
  // ============================================================

  {
    zoneId: 'MEX',
    name: 'Mexico City',
    countryCode: 'MX',
    latitude: 19.4363,
    longitude: -99.0721,
    population: {
      1950: 3100, 1960: 5000, 1970: 8600, 1980: 13000,
      1990: 15300, 2000: 18100, 2010: 20100, 2020: 21800
    },
    airports: ['MMMX', 'MMSM']
  },
  {
    zoneId: 'CUN',
    name: 'Cancun',
    countryCode: 'MX',
    latitude: 21.0365,
    longitude: -86.8771,
    population: {
      1950: 5, 1960: 5, 1970: 10, 1980: 30,
      1990: 170, 2000: 400, 2010: 630, 2020: 890
    },
    airports: ['MMUN']
  },
  {
    zoneId: 'GDL',
    name: 'Guadalajara',
    countryCode: 'MX',
    latitude: 20.5218,
    longitude: -103.311,
    population: {
      1950: 700, 1960: 1100, 1970: 1700, 1980: 2500,
      1990: 3000, 2000: 3700, 2010: 4400, 2020: 5300
    },
    airports: ['MMGL']
  },
  {
    zoneId: 'MTY',
    name: 'Monterrey',
    countryCode: 'MX',
    latitude: 25.7785,
    longitude: -100.107,
    population: {
      1950: 400, 1960: 700, 1970: 1200, 1980: 2000,
      1990: 2600, 2000: 3200, 2010: 3900, 2020: 5100
    },
    airports: ['MMMY']
  },
  {
    zoneId: 'TIJ',
    name: 'Tijuana',
    countryCode: 'MX',
    latitude: 32.5411,
    longitude: -116.970,
    population: {
      1950: 60, 1960: 160, 1970: 340, 1980: 450,
      1990: 700, 2000: 1200, 2010: 1600, 2020: 2100
    },
    airports: ['MMTJ']
  },

  // ============================================================
  //  CENTRAL AMERICA & CARIBBEAN
  // ============================================================

  {
    zoneId: 'PTY',
    name: 'Panama City',
    countryCode: 'PA',
    latitude: 9.0714,
    longitude: -79.3835,
    population: {
      1950: 250, 1960: 370, 1970: 530, 1980: 660,
      1990: 830, 2000: 1100, 2010: 1400, 2020: 1800
    },
    airports: ['MPTO']
  },
  {
    zoneId: 'SJO',
    name: 'San Jose CR',
    countryCode: 'CR',
    latitude: 9.9939,
    longitude: -84.2088,
    population: {
      1950: 200, 1960: 300, 1970: 450, 1980: 600,
      1990: 800, 2000: 1050, 2010: 1200, 2020: 1400
    },
    airports: ['MROC']
  },
  {
    zoneId: 'HAV',
    name: 'Havana',
    countryCode: 'CU',
    latitude: 22.9892,
    longitude: -82.4091,
    population: {
      1950: 1100, 1960: 1400, 1970: 1700, 1980: 1900,
      1990: 2100, 2000: 2100, 2010: 2100, 2020: 2100
    },
    airports: ['MUHA']
  },
  {
    zoneId: 'SDQ',
    name: 'Santo Domingo',
    countryCode: 'DO',
    latitude: 18.4297,
    longitude: -69.6688,
    population: {
      1950: 200, 1960: 400, 1970: 700, 1980: 1200,
      1990: 1700, 2000: 2200, 2010: 2700, 2020: 3500
    },
    airports: ['MDSD', 'MDPC']
  },
  {
    zoneId: 'KIN',
    name: 'Kingston',
    countryCode: 'JM',
    latitude: 17.9357,
    longitude: -76.7875,
    population: {
      1950: 280, 1960: 380, 1970: 470, 1980: 550,
      1990: 600, 2000: 660, 2010: 700, 2020: 800
    },
    airports: ['MKJP']
  },
  {
    zoneId: 'NAS',
    name: 'Nassau',
    countryCode: 'BS',
    latitude: 25.0390,
    longitude: -77.4662,
    population: {
      1950: 40, 1960: 60, 1970: 100, 1980: 135,
      1990: 170, 2000: 210, 2010: 250, 2020: 280
    },
    airports: ['MYNN']
  },
  {
    zoneId: 'SJU',
    name: 'San Juan',
    countryCode: 'PR',
    latitude: 18.4394,
    longitude: -66.0018,
    population: {
      1950: 450, 1960: 600, 1970: 900, 1980: 1100,
      1990: 1300, 2000: 1500, 2010: 1500, 2020: 1300
    },
    airports: ['TJSJ']
  },
  {
    zoneId: 'GUA',
    name: 'Guatemala City',
    countryCode: 'GT',
    latitude: 14.5833,
    longitude: -90.5275,
    population: {
      1950: 300, 1960: 450, 1970: 700, 1980: 1100,
      1990: 1500, 2000: 2100, 2010: 2700, 2020: 3300
    },
    airports: ['MGGT']
  },
  {
    zoneId: 'SAP',
    name: 'San Pedro Sula',
    countryCode: 'HN',
    latitude: 15.4526,
    longitude: -87.9236,
    population: {
      1950: 50, 1960: 80, 1970: 150, 1980: 250,
      1990: 350, 2000: 480, 2010: 600, 2020: 800
    },
    airports: ['MHLM']
  },
  {
    zoneId: 'SAL',
    name: 'San Salvador',
    countryCode: 'SV',
    latitude: 13.4409,
    longitude: -89.0558,
    population: {
      1950: 250, 1960: 400, 1970: 550, 1980: 700,
      1990: 900, 2000: 1200, 2010: 1500, 2020: 1800
    },
    airports: ['MSLP']
  },

  // ============================================================
  //  EUROPE - United Kingdom
  // ============================================================

  {
    zoneId: 'LON',
    name: 'London',
    countryCode: 'GB',
    latitude: 51.4700,
    longitude: -0.4610,
    population: {
      1950: 8300, 1960: 8200, 1970: 7500, 1980: 6800,
      1990: 6900, 2000: 7200, 2010: 8200, 2020: 9000
    },
    airports: ['EGLL', 'EGKK', 'EGSS', 'EGLC', 'EGMC', 'EGGW', 'EGHI', 'EGKA', 'EGKB', 'EGLF', 'EGLK', 'EGMD', 'EGSC', 'EGSH', 'EGTK']
  },
  {
    zoneId: 'MAN',
    name: 'Manchester',
    countryCode: 'GB',
    latitude: 53.3537,
    longitude: -2.2750,
    population: {
      1950: 2500, 1960: 2500, 1970: 2400, 1980: 2300,
      1990: 2300, 2000: 2400, 2010: 2600, 2020: 2800
    },
    airports: ['EGCC']
  },
  {
    zoneId: 'BHX',
    name: 'Birmingham UK',
    countryCode: 'GB',
    latitude: 52.4539,
    longitude: -1.7480,
    population: {
      1950: 2300, 1960: 2300, 1970: 2300, 1980: 2200,
      1990: 2200, 2000: 2300, 2010: 2400, 2020: 2600
    },
    airports: ['EGBB', 'EGBE', 'EGBN', 'EGNX']
  },
  {
    zoneId: 'EDI',
    name: 'Edinburgh',
    countryCode: 'GB',
    latitude: 55.9508,
    longitude: -3.3615,
    population: {
      1950: 470, 1960: 470, 1970: 450, 1980: 430,
      1990: 440, 2000: 450, 2010: 480, 2020: 530
    },
    airports: ['EGPH', 'EGED', 'EGPA', 'EGPC', 'EGPD', 'EGPE', 'EGPN']
  },
  {
    zoneId: 'GLA',
    name: 'Glasgow',
    countryCode: 'GB',
    latitude: 55.8642,
    longitude: -4.4317,
    population: {
      1950: 1700, 1960: 1700, 1970: 1600, 1980: 1500,
      1990: 1400, 2000: 1400, 2010: 1400, 2020: 1500
    },
    airports: ['EGPF', 'EGPK', 'EGEC', 'EGPL', 'EGPO', 'EGPR', 'EGPU']
  },
  {
    zoneId: 'BRS',
    name: 'Bristol',
    countryCode: 'GB',
    latitude: 51.3827,
    longitude: -2.7192,
    population: {
      1950: 440, 1960: 430, 1970: 420, 1980: 400,
      1990: 400, 2000: 420, 2010: 450, 2020: 470
    },
    airports: ['EGGD', 'EGFF', 'EGBJ', 'EGFE', 'EGFH', 'EGHH', 'EGHQ', 'EGTE']
  },
  {
    zoneId: 'BFS',
    name: 'Belfast',
    countryCode: 'GB',
    latitude: 54.6575,
    longitude: -6.2158,
    population: {
      1950: 550, 1960: 530, 1970: 500, 1980: 480,
      1990: 480, 2000: 500, 2010: 530, 2020: 600
    },
    airports: ['EGAA', 'EGAC', 'EGAB', 'EGAE', 'EGPI']
  },
  {
    zoneId: 'LDS',
    name: 'Leeds-Bradford',
    countryCode: 'GB',
    latitude: 53.8659,
    longitude: -1.6606,
    population: {
      1950: 1700, 1960: 1700, 1970: 1600, 1980: 1500,
      1990: 1400, 2000: 1500, 2010: 1600, 2020: 1800
    },
    airports: ['EGNM', 'EGNJ']
  },
  {
    zoneId: 'NCL',
    name: 'Newcastle',
    countryCode: 'GB',
    latitude: 55.0374,
    longitude: -1.6917,
    population: {
      1950: 900, 1960: 880, 1970: 850, 1980: 800,
      1990: 780, 2000: 790, 2010: 800, 2020: 830
    },
    airports: ['EGNT', 'EGNC', 'EGNV']
  },
  {
    zoneId: 'LPL',
    name: 'Liverpool',
    countryCode: 'GB',
    latitude: 53.3336,
    longitude: -2.8508,
    population: {
      1950: 1400, 1960: 1300, 1970: 1200, 1980: 1100,
      1990: 1000, 2000: 1000, 2010: 1050, 2020: 1100
    },
    airports: ['EGGP', 'EGNH', 'EGNL', 'EGNR', 'EGOV']
  },

  // ============================================================
  //  EUROPE - France
  // ============================================================

  {
    zoneId: 'PAR',
    name: 'Paris',
    countryCode: 'FR',
    latitude: 49.0097,
    longitude: 2.5479,
    population: {
      1950: 5400, 1960: 7200, 1970: 8200, 1980: 8700,
      1990: 9300, 2000: 9700, 2010: 10400, 2020: 11000
    },
    airports: ['LFPG', 'LFPO', 'LFOB']
  },
  {
    zoneId: 'NCE',
    name: 'Nice',
    countryCode: 'FR',
    latitude: 43.6584,
    longitude: 7.2159,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 800,
      1990: 900, 2000: 950, 2010: 1000, 2020: 1010
    },
    airports: ['LFMN']
  },
  {
    zoneId: 'LYS',
    name: 'Lyon',
    countryCode: 'FR',
    latitude: 45.7256,
    longitude: 5.0811,
    population: {
      1950: 700, 1960: 900, 1970: 1100, 1980: 1200,
      1990: 1300, 2000: 1400, 2010: 1600, 2020: 1700
    },
    airports: ['LFLL']
  },
  {
    zoneId: 'MRS',
    name: 'Marseille',
    countryCode: 'FR',
    latitude: 43.4393,
    longitude: 5.2214,
    population: {
      1950: 700, 1960: 800, 1970: 1000, 1980: 1100,
      1990: 1200, 2000: 1300, 2010: 1500, 2020: 1600
    },
    airports: ['LFML']
  },
  {
    zoneId: 'TLS',
    name: 'Toulouse',
    countryCode: 'FR',
    latitude: 43.6291,
    longitude: 1.3678,
    population: {
      1950: 300, 1960: 400, 1970: 500, 1980: 550,
      1990: 650, 2000: 800, 2010: 900, 2020: 1000
    },
    airports: ['LFBO']
  },
  {
    zoneId: 'BOD',
    name: 'Bordeaux',
    countryCode: 'FR',
    latitude: 44.8283,
    longitude: -0.7151,
    population: {
      1950: 450, 1960: 500, 1970: 560, 1980: 620,
      1990: 680, 2000: 750, 2010: 850, 2020: 960
    },
    airports: ['LFBD']
  },
  {
    zoneId: 'NTE',
    name: 'Nantes',
    countryCode: 'FR',
    latitude: 47.1532,
    longitude: -1.6107,
    population: {
      1950: 300, 1960: 350, 1970: 400, 1980: 450,
      1990: 500, 2000: 560, 2010: 620, 2020: 700
    },
    airports: ['LFRS']
  },
  {
    zoneId: 'SXB',
    name: 'Strasbourg',
    countryCode: 'FR',
    latitude: 48.5383,
    longitude: 7.6282,
    population: {
      1950: 250, 1960: 300, 1970: 360, 1980: 400,
      1990: 430, 2000: 450, 2010: 470, 2020: 500
    },
    airports: ['LFST']
  },

  // ============================================================
  //  EUROPE - Germany
  // ============================================================

  {
    zoneId: 'FRA',
    name: 'Frankfurt',
    countryCode: 'DE',
    latitude: 50.0379,
    longitude: 8.5622,
    population: {
      1950: 1500, 1960: 1800, 1970: 2100, 1980: 2200,
      1990: 2300, 2000: 2500, 2010: 2600, 2020: 2800
    },
    airports: ['EDDF', 'EDFE']
  },
  {
    zoneId: 'MUC',
    name: 'Munich',
    countryCode: 'DE',
    latitude: 48.3538,
    longitude: 11.7861,
    population: {
      1950: 800, 1960: 1100, 1970: 1400, 1980: 1500,
      1990: 1600, 2000: 1800, 2010: 2000, 2020: 2300
    },
    airports: ['EDDM']
  },
  {
    zoneId: 'BER',
    name: 'Berlin',
    countryCode: 'DE',
    latitude: 52.3667,
    longitude: 13.5033,
    population: {
      1950: 3300, 1960: 3200, 1970: 3100, 1980: 3000,
      1990: 3400, 2000: 3400, 2010: 3400, 2020: 3600
    },
    airports: ['EDDB']
  },
  {
    zoneId: 'HAM',
    name: 'Hamburg',
    countryCode: 'DE',
    latitude: 53.6304,
    longitude: 9.9882,
    population: {
      1950: 1600, 1960: 1800, 1970: 1800, 1980: 1600,
      1990: 1600, 2000: 1700, 2010: 1800, 2020: 1900
    },
    airports: ['EDDH']
  },
  {
    zoneId: 'DUS',
    name: 'Dusseldorf',
    countryCode: 'DE',
    latitude: 51.2895,
    longitude: 6.7668,
    population: {
      1950: 1000, 1960: 1300, 1970: 1400, 1980: 1300,
      1990: 1200, 2000: 1200, 2010: 1300, 2020: 1400
    },
    airports: ['EDDL']
  },
  {
    zoneId: 'STR',
    name: 'Stuttgart',
    countryCode: 'DE',
    latitude: 48.6899,
    longitude: 9.2220,
    population: {
      1950: 700, 1960: 900, 1970: 1100, 1980: 1100,
      1990: 1100, 2000: 1200, 2010: 1300, 2020: 1400
    },
    airports: ['EDDS']
  },
  {
    zoneId: 'CGN',
    name: 'Cologne-Bonn',
    countryCode: 'DE',
    latitude: 50.8659,
    longitude: 7.1427,
    population: {
      1950: 1400, 1960: 1700, 1970: 1800, 1980: 1700,
      1990: 1700, 2000: 1800, 2010: 1900, 2020: 2000
    },
    airports: ['EDDK']
  },
  {
    zoneId: 'HAJ',
    name: 'Hannover',
    countryCode: 'DE',
    latitude: 52.4611,
    longitude: 9.6850,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 700,
      1990: 750, 2000: 800, 2010: 820, 2020: 850
    },
    airports: ['EDDV']
  },

  // ============================================================
  //  EUROPE - Spain
  // ============================================================

  {
    zoneId: 'MAD',
    name: 'Madrid',
    countryCode: 'ES',
    latitude: 40.4983,
    longitude: -3.5676,
    population: {
      1950: 1500, 1960: 2200, 1970: 3100, 1980: 4200,
      1990: 4800, 2000: 5200, 2010: 6100, 2020: 6800
    },
    airports: ['LEMD']
  },
  {
    zoneId: 'BCN',
    name: 'Barcelona',
    countryCode: 'ES',
    latitude: 41.2974,
    longitude: 2.0833,
    population: {
      1950: 1800, 1960: 2400, 1970: 3300, 1980: 3700,
      1990: 3900, 2000: 4200, 2010: 4800, 2020: 5600
    },
    airports: ['LEBL']
  },
  {
    zoneId: 'AGP',
    name: 'Malaga',
    countryCode: 'ES',
    latitude: 36.6749,
    longitude: -4.4991,
    population: {
      1950: 300, 1960: 350, 1970: 450, 1980: 550,
      1990: 650, 2000: 800, 2010: 950, 2020: 1100
    },
    airports: ['LEMG']
  },
  {
    zoneId: 'PMI',
    name: 'Palma de Mallorca',
    countryCode: 'ES',
    latitude: 39.5517,
    longitude: 2.7388,
    population: {
      1950: 150, 1960: 180, 1970: 250, 1980: 320,
      1990: 370, 2000: 400, 2010: 450, 2020: 500
    },
    airports: ['LEPA']
  },
  {
    zoneId: 'ALC',
    name: 'Alicante',
    countryCode: 'ES',
    latitude: 38.2822,
    longitude: -0.5582,
    population: {
      1950: 200, 1960: 250, 1970: 350, 1980: 450,
      1990: 500, 2000: 550, 2010: 650, 2020: 700
    },
    airports: ['LEAL']
  },
  {
    zoneId: 'SVQ',
    name: 'Seville',
    countryCode: 'ES',
    latitude: 37.4180,
    longitude: -5.8932,
    population: {
      1950: 500, 1960: 600, 1970: 750, 1980: 900,
      1990: 1000, 2000: 1100, 2010: 1300, 2020: 1500
    },
    airports: ['LEZL']
  },
  {
    zoneId: 'VLC',
    name: 'Valencia',
    countryCode: 'ES',
    latitude: 39.4893,
    longitude: -0.4816,
    population: {
      1950: 600, 1960: 750, 1970: 1000, 1980: 1200,
      1990: 1300, 2000: 1400, 2010: 1600, 2020: 1800
    },
    airports: ['LEVC']
  },
  {
    zoneId: 'TFS',
    name: 'Tenerife',
    countryCode: 'ES',
    latitude: 28.0445,
    longitude: -16.5725,
    population: {
      1950: 300, 1960: 350, 1970: 400, 1980: 500,
      1990: 600, 2000: 700, 2010: 850, 2020: 930
    },
    airports: ['GCTS', 'GCXO']
  },
  {
    zoneId: 'LPA',
    name: 'Gran Canaria',
    countryCode: 'ES',
    latitude: 27.9319,
    longitude: -15.3866,
    population: {
      1950: 200, 1960: 250, 1970: 350, 1980: 450,
      1990: 550, 2000: 650, 2010: 750, 2020: 850
    },
    airports: ['GCLP']
  },
  {
    zoneId: 'IBZ',
    name: 'Ibiza',
    countryCode: 'ES',
    latitude: 38.8729,
    longitude: 1.3731,
    population: {
      1950: 35, 1960: 35, 1970: 40, 1980: 50,
      1990: 60, 2000: 90, 2010: 120, 2020: 150
    },
    airports: ['LEIB']
  },

  // ============================================================
  //  EUROPE - Italy
  // ============================================================

  {
    zoneId: 'ROM',
    name: 'Rome',
    countryCode: 'IT',
    latitude: 41.8003,
    longitude: 12.2389,
    population: {
      1950: 1800, 1960: 2300, 1970: 2900, 1980: 3200,
      1990: 3400, 2000: 3500, 2010: 3700, 2020: 4300
    },
    airports: ['LIRF', 'LIRA']
  },
  {
    zoneId: 'MIL',
    name: 'Milan',
    countryCode: 'IT',
    latitude: 45.6306,
    longitude: 8.7281,
    population: {
      1950: 2500, 1960: 3200, 1970: 3900, 1980: 3800,
      1990: 3700, 2000: 3600, 2010: 3900, 2020: 4300
    },
    airports: ['LIMC', 'LIML', 'LIME']
  },
  {
    zoneId: 'NAP',
    name: 'Naples',
    countryCode: 'IT',
    latitude: 40.8860,
    longitude: 14.2908,
    population: {
      1950: 2000, 1960: 2300, 1970: 2600, 1980: 2800,
      1990: 2900, 2000: 3000, 2010: 3100, 2020: 3100
    },
    airports: ['LIRN']
  },
  {
    zoneId: 'VCE',
    name: 'Venice',
    countryCode: 'IT',
    latitude: 45.5053,
    longitude: 12.3519,
    population: {
      1950: 350, 1960: 380, 1970: 370, 1980: 340,
      1990: 310, 2000: 280, 2010: 270, 2020: 260
    },
    airports: ['LIPZ']
  },
  {
    zoneId: 'BLQ',
    name: 'Bologna',
    countryCode: 'IT',
    latitude: 44.5354,
    longitude: 11.2887,
    population: {
      1950: 400, 1960: 500, 1970: 550, 1980: 550,
      1990: 500, 2000: 480, 2010: 500, 2020: 530
    },
    airports: ['LIPE']
  },
  {
    zoneId: 'FLR',
    name: 'Florence',
    countryCode: 'IT',
    latitude: 43.8100,
    longitude: 11.2051,
    population: {
      1950: 400, 1960: 450, 1970: 500, 1980: 480,
      1990: 450, 2000: 430, 2010: 450, 2020: 470
    },
    airports: ['LIRQ']
  },
  {
    zoneId: 'CTA',
    name: 'Catania',
    countryCode: 'IT',
    latitude: 37.4668,
    longitude: 15.0664,
    population: {
      1950: 300, 1960: 350, 1970: 400, 1980: 450,
      1990: 480, 2000: 500, 2010: 530, 2020: 550
    },
    airports: ['LICC']
  },
  {
    zoneId: 'PMO',
    name: 'Palermo',
    countryCode: 'IT',
    latitude: 38.1764,
    longitude: 13.0910,
    population: {
      1950: 500, 1960: 580, 1970: 650, 1980: 700,
      1990: 720, 2000: 700, 2010: 680, 2020: 680
    },
    airports: ['LICJ']
  },

  // ============================================================
  //  EUROPE - Netherlands, Belgium
  // ============================================================

  {
    zoneId: 'AMS',
    name: 'Amsterdam',
    countryCode: 'NL',
    latitude: 52.3105,
    longitude: 4.7683,
    population: {
      1950: 1400, 1960: 1600, 1970: 1700, 1980: 1600,
      1990: 1600, 2000: 1700, 2010: 1800, 2020: 2100
    },
    airports: ['EHAM']
  },
  {
    zoneId: 'BRU',
    name: 'Brussels',
    countryCode: 'BE',
    latitude: 50.9014,
    longitude: 4.4844,
    population: {
      1950: 1400, 1960: 1500, 1970: 1600, 1980: 1600,
      1990: 1600, 2000: 1600, 2010: 1800, 2020: 2100
    },
    airports: ['EBBR', 'EBCI']
  },

  // ============================================================
  //  EUROPE - Switzerland, Austria
  // ============================================================

  {
    zoneId: 'ZRH',
    name: 'Zurich',
    countryCode: 'CH',
    latitude: 47.4647,
    longitude: 8.5492,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 700,
      1990: 750, 2000: 800, 2010: 900, 2020: 1000
    },
    airports: ['LSZH']
  },
  {
    zoneId: 'GVA',
    name: 'Geneva',
    countryCode: 'CH',
    latitude: 46.2381,
    longitude: 6.1090,
    population: {
      1950: 250, 1960: 320, 1970: 380, 1980: 380,
      1990: 400, 2000: 440, 2010: 500, 2020: 600
    },
    airports: ['LSGG']
  },
  {
    zoneId: 'BSL',
    name: 'Basel',
    countryCode: 'CH',
    latitude: 47.5896,
    longitude: 7.5299,
    population: {
      1950: 350, 1960: 400, 1970: 420, 1980: 400,
      1990: 400, 2000: 410, 2010: 420, 2020: 450
    },
    airports: ['LFSB']
  },
  {
    zoneId: 'VIE',
    name: 'Vienna',
    countryCode: 'AT',
    latitude: 48.1103,
    longitude: 16.5697,
    population: {
      1950: 1600, 1960: 1600, 1970: 1600, 1980: 1500,
      1990: 1500, 2000: 1600, 2010: 1700, 2020: 1900
    },
    airports: ['LOWW']
  },

  // ============================================================
  //  EUROPE - Ireland
  // ============================================================

  {
    zoneId: 'DUB',
    name: 'Dublin',
    countryCode: 'IE',
    latitude: 53.4213,
    longitude: -6.2701,
    population: {
      1950: 600, 1960: 600, 1970: 680, 1980: 800,
      1990: 920, 2000: 1050, 2010: 1200, 2020: 1400
    },
    airports: ['EIDW']
  },
  {
    zoneId: 'SNN',
    name: 'Shannon',
    countryCode: 'IE',
    latitude: 52.7020,
    longitude: -8.9247,
    population: {
      1950: 50, 1960: 55, 1970: 60, 1980: 65,
      1990: 70, 2000: 80, 2010: 90, 2020: 100
    },
    airports: ['EINN']
  },
  {
    zoneId: 'ORK',
    name: 'Cork',
    countryCode: 'IE',
    latitude: 51.8413,
    longitude: -8.4911,
    population: {
      1950: 130, 1960: 130, 1970: 140, 1980: 160,
      1990: 180, 2000: 200, 2010: 220, 2020: 250
    },
    airports: ['EICK']
  },

  // ============================================================
  //  EUROPE - Portugal
  // ============================================================

  {
    zoneId: 'LIS',
    name: 'Lisbon',
    countryCode: 'PT',
    latitude: 38.7742,
    longitude: -9.1342,
    population: {
      1950: 1200, 1960: 1500, 1970: 1700, 1980: 2000,
      1990: 2500, 2000: 2600, 2010: 2800, 2020: 2900
    },
    airports: ['LPPT']
  },
  {
    zoneId: 'OPO',
    name: 'Porto',
    countryCode: 'PT',
    latitude: 41.2481,
    longitude: -8.6814,
    population: {
      1950: 700, 1960: 800, 1970: 1000, 1980: 1200,
      1990: 1300, 2000: 1300, 2010: 1300, 2020: 1300
    },
    airports: ['LPPR']
  },
  {
    zoneId: 'FAO',
    name: 'Faro',
    countryCode: 'PT',
    latitude: 37.0144,
    longitude: -7.9659,
    population: {
      1950: 200, 1960: 220, 1970: 240, 1980: 260,
      1990: 300, 2000: 350, 2010: 400, 2020: 450
    },
    airports: ['LPFR']
  },

  // ============================================================
  //  EUROPE - Scandinavia
  // ============================================================

  {
    zoneId: 'STO',
    name: 'Stockholm',
    countryCode: 'SE',
    latitude: 59.6519,
    longitude: 17.9186,
    population: {
      1950: 1000, 1960: 1200, 1970: 1400, 1980: 1400,
      1990: 1500, 2000: 1600, 2010: 1900, 2020: 2400
    },
    airports: ['ESSA', 'ESSB']
  },
  {
    zoneId: 'OSL',
    name: 'Oslo',
    countryCode: 'NO',
    latitude: 60.1976,
    longitude: 11.1004,
    population: {
      1950: 470, 1960: 560, 1970: 650, 1980: 680,
      1990: 720, 2000: 800, 2010: 900, 2020: 1100
    },
    airports: ['ENGM']
  },
  {
    zoneId: 'CPH',
    name: 'Copenhagen',
    countryCode: 'DK',
    latitude: 55.6180,
    longitude: 12.6561,
    population: {
      1950: 1200, 1960: 1300, 1970: 1400, 1980: 1300,
      1990: 1300, 2000: 1300, 2010: 1300, 2020: 1400
    },
    airports: ['EKCH']
  },
  {
    zoneId: 'HEL',
    name: 'Helsinki',
    countryCode: 'FI',
    latitude: 60.3172,
    longitude: 24.9633,
    population: {
      1950: 500, 1960: 600, 1970: 750, 1980: 800,
      1990: 850, 2000: 950, 2010: 1050, 2020: 1300
    },
    airports: ['EFHK']
  },
  {
    zoneId: 'GOT',
    name: 'Gothenburg',
    countryCode: 'SE',
    latitude: 57.6627,
    longitude: 12.2798,
    population: {
      1950: 400, 1960: 450, 1970: 500, 1980: 500,
      1990: 500, 2000: 520, 2010: 560, 2020: 620
    },
    airports: ['ESGG']
  },
  {
    zoneId: 'BGO',
    name: 'Bergen',
    countryCode: 'NO',
    latitude: 60.2934,
    longitude: 5.2181,
    population: {
      1950: 140, 1960: 165, 1970: 190, 1980: 200,
      1990: 210, 2000: 230, 2010: 260, 2020: 290
    },
    airports: ['ENBR']
  },
  {
    zoneId: 'MMX',
    name: 'Malmo',
    countryCode: 'SE',
    latitude: 55.5363,
    longitude: 13.3762,
    population: {
      1950: 200, 1960: 240, 1970: 260, 1980: 250,
      1990: 240, 2000: 260, 2010: 300, 2020: 350
    },
    airports: ['ESMS']
  },

  // ============================================================
  //  EUROPE - Additional cities
  // ============================================================

  {
    zoneId: 'LUX',
    name: 'Luxembourg',
    countryCode: 'LU',
    latitude: 49.6233,
    longitude: 6.2044,
    population: {
      1950: 60, 1960: 70, 1970: 80, 1980: 80,
      1990: 90, 2000: 100, 2010: 110, 2020: 130
    },
    airports: ['ELLX']
  },
  {
    zoneId: 'GDN',
    name: 'Gdansk',
    countryCode: 'PL',
    latitude: 54.3776,
    longitude: 18.4662,
    population: {
      1950: 250, 1960: 350, 1970: 410, 1980: 450,
      1990: 460, 2000: 460, 2010: 460, 2020: 480
    },
    airports: ['EPGD']
  },
  {
    zoneId: 'SPU',
    name: 'Split',
    countryCode: 'HR',
    latitude: 43.5389,
    longitude: 16.2980,
    population: {
      1950: 60, 1960: 80, 1970: 120, 1980: 170,
      1990: 190, 2000: 190, 2010: 180, 2020: 180
    },
    airports: ['LDSP']
  },
  {
    zoneId: 'DBV',
    name: 'Dubrovnik',
    countryCode: 'HR',
    latitude: 42.5614,
    longitude: 18.2682,
    population: {
      1950: 20, 1960: 25, 1970: 35, 1980: 50,
      1990: 50, 2000: 40, 2010: 40, 2020: 45
    },
    airports: ['LDDU']
  },
  {
    zoneId: 'TIV',
    name: 'Tivat',
    countryCode: 'ME',
    latitude: 42.4047,
    longitude: 18.7233,
    population: {
      1950: 10, 1960: 12, 1970: 15, 1980: 18,
      1990: 20, 2000: 18, 2010: 15, 2020: 15
    },
    airports: ['LYTV']
  },
  {
    zoneId: 'SKP',
    name: 'Skopje',
    countryCode: 'MK',
    latitude: 41.9619,
    longitude: 21.6214,
    population: {
      1950: 100, 1960: 160, 1970: 240, 1980: 380,
      1990: 450, 2000: 500, 2010: 540, 2020: 600
    },
    airports: ['LWSK']
  },
  {
    zoneId: 'TIA',
    name: 'Tirana',
    countryCode: 'AL',
    latitude: 41.4147,
    longitude: 19.7206,
    population: {
      1950: 80, 1960: 140, 1970: 180, 1980: 220,
      1990: 280, 2000: 350, 2010: 600, 2020: 800
    },
    airports: ['LATI']
  },
  {
    zoneId: 'CLJ',
    name: 'Cluj-Napoca',
    countryCode: 'RO',
    latitude: 46.7852,
    longitude: 23.6862,
    population: {
      1950: 110, 1960: 150, 1970: 210, 1980: 310,
      1990: 330, 2000: 320, 2010: 320, 2020: 330
    },
    airports: ['LRCL']
  },
  {
    zoneId: 'KBP',
    name: 'Kyiv',
    countryCode: 'UA',
    latitude: 50.3450,
    longitude: 30.8947,
    population: {
      1950: 1100, 1960: 1400, 1970: 1800, 1980: 2200,
      1990: 2600, 2000: 2600, 2010: 2800, 2020: 2900
    },
    airports: ['UKBB']
  },
  {
    zoneId: 'ODS',
    name: 'Odesa',
    countryCode: 'UA',
    latitude: 46.4268,
    longitude: 30.6764,
    population: {
      1950: 500, 1960: 600, 1970: 750, 1980: 900,
      1990: 1010, 2000: 1010, 2010: 1010, 2020: 1020
    },
    airports: ['UKOO']
  },
  {
    zoneId: 'MSQ',
    name: 'Minsk',
    countryCode: 'BY',
    latitude: 53.8825,
    longitude: 28.0308,
    population: {
      1950: 350, 1960: 600, 1970: 900, 1980: 1300,
      1990: 1600, 2000: 1700, 2010: 1800, 2020: 2000
    },
    airports: ['UMMS']
  },
  {
    zoneId: 'KZN',
    name: 'Kazan',
    countryCode: 'RU',
    latitude: 55.6062,
    longitude: 49.2787,
    population: {
      1950: 400, 1960: 600, 1970: 800, 1980: 1000,
      1990: 1100, 2000: 1100, 2010: 1100, 2020: 1260
    },
    airports: ['UWKD']
  },

  // ============================================================
  //  EUROPE - Greece
  // ============================================================

  {
    zoneId: 'ATH',
    name: 'Athens',
    countryCode: 'GR',
    latitude: 37.9364,
    longitude: 23.9445,
    population: {
      1950: 1350, 1960: 1850, 1970: 2500, 1980: 3000,
      1990: 3200, 2000: 3400, 2010: 3500, 2020: 3700
    },
    airports: ['LGAV']
  },
  {
    zoneId: 'SKG',
    name: 'Thessaloniki',
    countryCode: 'GR',
    latitude: 40.5197,
    longitude: 22.9709,
    population: {
      1950: 300, 1960: 400, 1970: 550, 1980: 700,
      1990: 800, 2000: 900, 2010: 1000, 2020: 1100
    },
    airports: ['LGTS']
  },
  {
    zoneId: 'HER',
    name: 'Heraklion',
    countryCode: 'GR',
    latitude: 35.3397,
    longitude: 25.1803,
    population: {
      1950: 60, 1960: 80, 1970: 100, 1980: 120,
      1990: 140, 2000: 160, 2010: 175, 2020: 210
    },
    airports: ['LGIR']
  },
  {
    zoneId: 'RHO',
    name: 'Rhodes',
    countryCode: 'GR',
    latitude: 36.4054,
    longitude: 28.0862,
    population: {
      1950: 40, 1960: 45, 1970: 50, 1980: 55,
      1990: 65, 2000: 80, 2010: 100, 2020: 120
    },
    airports: ['LGRP']
  },
  {
    zoneId: 'CFU',
    name: 'Corfu',
    countryCode: 'GR',
    latitude: 39.6019,
    longitude: 19.9117,
    population: {
      1950: 35, 1960: 35, 1970: 30, 1980: 30,
      1990: 35, 2000: 40, 2010: 45, 2020: 50
    },
    airports: ['LGKR']
  },

  // ============================================================
  //  EUROPE - Turkey
  // ============================================================

  {
    zoneId: 'IST',
    name: 'Istanbul',
    countryCode: 'TR',
    latitude: 41.2753,
    longitude: 28.7519,
    population: {
      1950: 1100, 1960: 1700, 1970: 2700, 1980: 4400,
      1990: 6600, 2000: 8800, 2010: 12600, 2020: 15500
    },
    airports: ['LTFM', 'LTFJ']
  },
  {
    zoneId: 'ANK',
    name: 'Ankara',
    countryCode: 'TR',
    latitude: 40.1281,
    longitude: 32.9951,
    population: {
      1950: 450, 1960: 700, 1970: 1200, 1980: 2000,
      1990: 2800, 2000: 3500, 2010: 4400, 2020: 5700
    },
    airports: ['LTAC']
  },
  {
    zoneId: 'AYT',
    name: 'Antalya',
    countryCode: 'TR',
    latitude: 36.8987,
    longitude: 30.8005,
    population: {
      1950: 50, 1960: 70, 1970: 110, 1980: 200,
      1990: 400, 2000: 700, 2010: 1100, 2020: 1500
    },
    airports: ['LTAI']
  },
  {
    zoneId: 'IZM',
    name: 'Izmir',
    countryCode: 'TR',
    latitude: 38.2924,
    longitude: 27.1570,
    population: {
      1950: 400, 1960: 600, 1970: 900, 1980: 1400,
      1990: 2000, 2000: 2700, 2010: 3400, 2020: 4400
    },
    airports: ['LTBJ']
  },

  // ============================================================
  //  EUROPE - Eastern Europe
  // ============================================================

  {
    zoneId: 'WAW',
    name: 'Warsaw',
    countryCode: 'PL',
    latitude: 52.1657,
    longitude: 20.9671,
    population: {
      1950: 800, 1960: 1100, 1970: 1300, 1980: 1600,
      1990: 1700, 2000: 1700, 2010: 1700, 2020: 1800
    },
    airports: ['EPWA']
  },
  {
    zoneId: 'KRK',
    name: 'Krakow',
    countryCode: 'PL',
    latitude: 50.0777,
    longitude: 19.7848,
    population: {
      1950: 400, 1960: 480, 1970: 580, 1980: 700,
      1990: 740, 2000: 750, 2010: 760, 2020: 800
    },
    airports: ['EPKK']
  },
  {
    zoneId: 'PRG',
    name: 'Prague',
    countryCode: 'CZ',
    latitude: 50.1008,
    longitude: 14.2632,
    population: {
      1950: 900, 1960: 1000, 1970: 1100, 1980: 1200,
      1990: 1200, 2000: 1200, 2010: 1300, 2020: 1300
    },
    airports: ['LKPR']
  },
  {
    zoneId: 'BUD',
    name: 'Budapest',
    countryCode: 'HU',
    latitude: 47.4298,
    longitude: 19.2611,
    population: {
      1950: 1600, 1960: 1800, 1970: 2000, 1980: 2100,
      1990: 2000, 2000: 1800, 2010: 1700, 2020: 1800
    },
    airports: ['LHBP']
  },
  {
    zoneId: 'OTP',
    name: 'Bucharest',
    countryCode: 'RO',
    latitude: 44.5711,
    longitude: 26.0850,
    population: {
      1950: 900, 1960: 1200, 1970: 1500, 1980: 1800,
      1990: 2000, 2000: 1900, 2010: 1800, 2020: 1800
    },
    airports: ['LROP']
  },
  {
    zoneId: 'SOF',
    name: 'Sofia',
    countryCode: 'BG',
    latitude: 42.6952,
    longitude: 23.4062,
    population: {
      1950: 500, 1960: 700, 1970: 900, 1980: 1100,
      1990: 1200, 2000: 1100, 2010: 1200, 2020: 1300
    },
    airports: ['LBSF']
  },
  {
    zoneId: 'ZAG',
    name: 'Zagreb',
    countryCode: 'HR',
    latitude: 45.7430,
    longitude: 16.0688,
    population: {
      1950: 350, 1960: 450, 1970: 570, 1980: 700,
      1990: 780, 2000: 770, 2010: 790, 2020: 800
    },
    airports: ['LDZA']
  },
  {
    zoneId: 'BEG',
    name: 'Belgrade',
    countryCode: 'RS',
    latitude: 44.8184,
    longitude: 20.3091,
    population: {
      1950: 500, 1960: 700, 1970: 900, 1980: 1100,
      1990: 1200, 2000: 1200, 2010: 1200, 2020: 1400
    },
    airports: ['LYBE']
  },
  {
    zoneId: 'BTS',
    name: 'Bratislava',
    countryCode: 'SK',
    latitude: 48.1702,
    longitude: 17.2127,
    population: {
      1950: 200, 1960: 260, 1970: 330, 1980: 400,
      1990: 440, 2000: 430, 2010: 440, 2020: 470
    },
    airports: ['LZIB']
  },
  {
    zoneId: 'LJU',
    name: 'Ljubljana',
    countryCode: 'SI',
    latitude: 46.2237,
    longitude: 14.4576,
    population: {
      1950: 130, 1960: 170, 1970: 220, 1980: 260,
      1990: 280, 2000: 280, 2010: 280, 2020: 300
    },
    airports: ['LJLJ']
  },
  {
    zoneId: 'VNO',
    name: 'Vilnius',
    countryCode: 'LT',
    latitude: 54.6341,
    longitude: 25.2858,
    population: {
      1950: 200, 1960: 300, 1970: 370, 1980: 480,
      1990: 580, 2000: 550, 2010: 540, 2020: 580
    },
    airports: ['EYVI']
  },
  {
    zoneId: 'RIX',
    name: 'Riga',
    countryCode: 'LV',
    latitude: 56.9236,
    longitude: 23.9711,
    population: {
      1950: 480, 1960: 580, 1970: 700, 1980: 800,
      1990: 840, 2000: 760, 2010: 700, 2020: 640
    },
    airports: ['EVRA']
  },
  {
    zoneId: 'TLL',
    name: 'Tallinn',
    countryCode: 'EE',
    latitude: 59.4133,
    longitude: 24.8328,
    population: {
      1950: 230, 1960: 300, 1970: 370, 1980: 430,
      1990: 480, 2000: 400, 2010: 400, 2020: 440
    },
    airports: ['EETN']
  },

  // ============================================================
  //  EUROPE - Russia
  // ============================================================

  {
    zoneId: 'MOW',
    name: 'Moscow',
    countryCode: 'RU',
    latitude: 55.9736,
    longitude: 37.4125,
    population: {
      1950: 5400, 1960: 6200, 1970: 7200, 1980: 8100,
      1990: 9000, 2000: 10100, 2010: 11500, 2020: 12700
    },
    airports: ['UUEE', 'UUDD', 'UUWW']
  },
  {
    zoneId: 'LED',
    name: 'St Petersburg',
    countryCode: 'RU',
    latitude: 59.8003,
    longitude: 30.2625,
    population: {
      1950: 2900, 1960: 3300, 1970: 3900, 1980: 4500,
      1990: 5000, 2000: 4700, 2010: 4900, 2020: 5400
    },
    airports: ['ULLI']
  },

  // ============================================================
  //  MIDDLE EAST
  // ============================================================

  {
    zoneId: 'DXB',
    name: 'Dubai',
    countryCode: 'AE',
    latitude: 25.2532,
    longitude: 55.3657,
    population: {
      1950: 20, 1960: 40, 1970: 80, 1980: 280,
      1990: 560, 2000: 900, 2010: 1900, 2020: 3400
    },
    airports: ['OMDB', 'OMDW']
  },
  {
    zoneId: 'AUH',
    name: 'Abu Dhabi',
    countryCode: 'AE',
    latitude: 24.4330,
    longitude: 54.6511,
    population: {
      1950: 15, 1960: 25, 1970: 60, 1980: 240,
      1990: 400, 2000: 550, 2010: 950, 2020: 1500
    },
    airports: ['OMAA']
  },
  {
    zoneId: 'DOH',
    name: 'Doha',
    countryCode: 'QA',
    latitude: 25.2609,
    longitude: 51.6138,
    population: {
      1950: 14, 1960: 40, 1970: 90, 1980: 200,
      1990: 340, 2000: 500, 2010: 1400, 2020: 2400
    },
    airports: ['OTHH']
  },
  {
    zoneId: 'RUH',
    name: 'Riyadh',
    countryCode: 'SA',
    latitude: 24.9576,
    longitude: 46.6988,
    population: {
      1950: 80, 1960: 160, 1970: 400, 1980: 1200,
      1990: 2300, 2000: 3600, 2010: 5200, 2020: 7500
    },
    airports: ['OERK']
  },
  {
    zoneId: 'JED',
    name: 'Jeddah',
    countryCode: 'SA',
    latitude: 21.6796,
    longitude: 39.1565,
    population: {
      1950: 100, 1960: 200, 1970: 500, 1980: 1000,
      1990: 1800, 2000: 2800, 2010: 3400, 2020: 4700
    },
    airports: ['OEJN']
  },
  {
    zoneId: 'KWI',
    name: 'Kuwait City',
    countryCode: 'KW',
    latitude: 29.2266,
    longitude: 47.9689,
    population: {
      1950: 80, 1960: 200, 1970: 500, 1980: 1000,
      1990: 1100, 2000: 1500, 2010: 2200, 2020: 3100
    },
    airports: ['OKBK']
  },
  {
    zoneId: 'MCT',
    name: 'Muscat',
    countryCode: 'OM',
    latitude: 23.5933,
    longitude: 58.2844,
    population: {
      1950: 25, 1960: 40, 1970: 60, 1980: 200,
      1990: 500, 2000: 700, 2010: 1000, 2020: 1500
    },
    airports: ['OOMS']
  },
  {
    zoneId: 'BAH',
    name: 'Bahrain',
    countryCode: 'BH',
    latitude: 26.2708,
    longitude: 50.6336,
    population: {
      1950: 100, 1960: 150, 1970: 200, 1980: 300,
      1990: 450, 2000: 600, 2010: 1100, 2020: 1500
    },
    airports: ['OBBI']
  },
  {
    zoneId: 'TLV',
    name: 'Tel Aviv',
    countryCode: 'IL',
    latitude: 32.0055,
    longitude: 34.8854,
    population: {
      1950: 500, 1960: 800, 1970: 1100, 1980: 1300,
      1990: 1700, 2000: 2500, 2010: 3200, 2020: 4000
    },
    airports: ['LLBG']
  },
  {
    zoneId: 'AMM',
    name: 'Amman',
    countryCode: 'JO',
    latitude: 31.7226,
    longitude: 35.9932,
    population: {
      1950: 100, 1960: 250, 1970: 500, 1980: 850,
      1990: 1200, 2000: 1600, 2010: 2500, 2020: 4000
    },
    airports: ['OJAI']
  },
  {
    zoneId: 'BEY',
    name: 'Beirut',
    countryCode: 'LB',
    latitude: 33.8209,
    longitude: 35.4884,
    population: {
      1950: 400, 1960: 600, 1970: 1000, 1980: 1100,
      1990: 900, 2000: 1500, 2010: 2000, 2020: 2400
    },
    airports: ['OLBA']
  },
  {
    zoneId: 'BGW',
    name: 'Baghdad',
    countryCode: 'IQ',
    latitude: 33.2625,
    longitude: 44.2346,
    population: {
      1950: 600, 1960: 1200, 1970: 2100, 1980: 3400,
      1990: 4100, 2000: 5100, 2010: 6100, 2020: 7300
    },
    airports: ['ORBI']
  },
  {
    zoneId: 'THR',
    name: 'Tehran',
    countryCode: 'IR',
    latitude: 35.6891,
    longitude: 51.3114,
    population: {
      1950: 1000, 1960: 1900, 1970: 3300, 1980: 5100,
      1990: 6400, 2000: 7100, 2010: 8200, 2020: 9100
    },
    airports: ['OIIE', 'OIII']
  },

  // ============================================================
  //  AFRICA
  // ============================================================

  {
    zoneId: 'JNB',
    name: 'Johannesburg',
    countryCode: 'ZA',
    latitude: -26.1392,
    longitude: 28.2460,
    population: {
      1950: 1200, 1960: 1600, 1970: 2100, 1980: 2800,
      1990: 3700, 2000: 5200, 2010: 7400, 2020: 8200
    },
    airports: ['FAOR', 'FAJS', 'FAKN']
  },
  {
    zoneId: 'CPT',
    name: 'Cape Town',
    countryCode: 'ZA',
    latitude: -33.9649,
    longitude: 18.6017,
    population: {
      1950: 600, 1960: 800, 1970: 1100, 1980: 1400,
      1990: 1900, 2000: 2700, 2010: 3400, 2020: 4600
    },
    airports: ['FACT']
  },
  {
    zoneId: 'CAI',
    name: 'Cairo',
    countryCode: 'EG',
    latitude: 30.1219,
    longitude: 31.4056,
    population: {
      1950: 2400, 1960: 3500, 1970: 5000, 1980: 7000,
      1990: 9100, 2000: 11900, 2010: 15100, 2020: 20900
    },
    airports: ['HECA']
  },
  {
    zoneId: 'NBO',
    name: 'Nairobi',
    countryCode: 'KE',
    latitude: -1.3192,
    longitude: 36.9278,
    population: {
      1950: 140, 1960: 310, 1970: 540, 1980: 870,
      1990: 1400, 2000: 2200, 2010: 3400, 2020: 4900
    },
    airports: ['HKJK']
  },
  {
    zoneId: 'LOS',
    name: 'Lagos',
    countryCode: 'NG',
    latitude: 6.5774,
    longitude: 3.3212,
    population: {
      1950: 300, 1960: 700, 1970: 1400, 1980: 2600,
      1990: 4800, 2000: 7200, 2010: 10600, 2020: 14900
    },
    airports: ['DNMM']
  },
  {
    zoneId: 'ADD',
    name: 'Addis Ababa',
    countryCode: 'ET',
    latitude: 8.9779,
    longitude: 38.7993,
    population: {
      1950: 390, 1960: 500, 1970: 750, 1980: 1200,
      1990: 1800, 2000: 2500, 2010: 3100, 2020: 5000
    },
    airports: ['HAAB']
  },
  {
    zoneId: 'CMN',
    name: 'Casablanca',
    countryCode: 'MA',
    latitude: 33.3675,
    longitude: -7.5900,
    population: {
      1950: 600, 1960: 1000, 1970: 1500, 1980: 2200,
      1990: 2800, 2000: 3100, 2010: 3500, 2020: 3800
    },
    airports: ['GMMN']
  },
  {
    zoneId: 'TUN',
    name: 'Tunis',
    countryCode: 'TN',
    latitude: 36.8510,
    longitude: 10.2272,
    population: {
      1950: 450, 1960: 600, 1970: 800, 1980: 1100,
      1990: 1400, 2000: 1700, 2010: 2000, 2020: 2400
    },
    airports: ['DTTA']
  },
  {
    zoneId: 'ALG',
    name: 'Algiers',
    countryCode: 'DZ',
    latitude: 36.6910,
    longitude: 3.2154,
    population: {
      1950: 500, 1960: 800, 1970: 1200, 1980: 1600,
      1990: 1900, 2000: 2400, 2010: 2800, 2020: 3500
    },
    airports: ['DAAG']
  },
  {
    zoneId: 'ACC',
    name: 'Accra',
    countryCode: 'GH',
    latitude: 5.6052,
    longitude: -0.1668,
    population: {
      1950: 180, 1960: 340, 1970: 600, 1980: 950,
      1990: 1400, 2000: 1800, 2010: 2400, 2020: 3300
    },
    airports: ['DGAA']
  },
  {
    zoneId: 'DAR',
    name: 'Dar es Salaam',
    countryCode: 'TZ',
    latitude: -6.8781,
    longitude: 39.2026,
    population: {
      1950: 70, 1960: 150, 1970: 350, 1980: 800,
      1990: 1400, 2000: 2100, 2010: 3400, 2020: 6700
    },
    airports: ['HTDA']
  },
  {
    zoneId: 'LAD',
    name: 'Luanda',
    countryCode: 'AO',
    latitude: -8.8583,
    longitude: 13.2312,
    population: {
      1950: 140, 1960: 220, 1970: 480, 1980: 900,
      1990: 1600, 2000: 2600, 2010: 5000, 2020: 8300
    },
    airports: ['FNLU']
  },
  {
    zoneId: 'MRU',
    name: 'Mauritius',
    countryCode: 'MU',
    latitude: -20.4302,
    longitude: 57.6836,
    population: {
      1950: 480, 1960: 650, 1970: 800, 1980: 950,
      1990: 1050, 2000: 1150, 2010: 1250, 2020: 1270
    },
    airports: ['FIMP']
  },
  {
    zoneId: 'ABJ',
    name: 'Abidjan',
    countryCode: 'CI',
    latitude: 5.2615,
    longitude: -3.9262,
    population: {
      1950: 65, 1960: 250, 1970: 700, 1980: 1500,
      1990: 2100, 2000: 3000, 2010: 4100, 2020: 5600
    },
    airports: ['DIAP']
  },
  {
    zoneId: 'DSS',
    name: 'Dakar',
    countryCode: 'SN',
    latitude: 14.7397,
    longitude: -17.4902,
    population: {
      1950: 200, 1960: 370, 1970: 600, 1980: 900,
      1990: 1400, 2000: 1900, 2010: 2700, 2020: 3700
    },
    airports: ['GOBD']
  },
  {
    zoneId: 'KRT',
    name: 'Khartoum',
    countryCode: 'SD',
    latitude: 15.5895,
    longitude: 32.5532,
    population: {
      1950: 200, 1960: 320, 1970: 560, 1980: 1100,
      1990: 1800, 2000: 3000, 2010: 4600, 2020: 6000
    },
    airports: ['HSSS']
  },
  {
    zoneId: 'ABV',
    name: 'Abuja',
    countryCode: 'NG',
    latitude: 9.0068,
    longitude: 7.2632,
    population: {
      1950: 20, 1960: 30, 1970: 50, 1980: 100,
      1990: 350, 2000: 800, 2010: 1900, 2020: 3600
    },
    airports: ['DNAA']
  },
  {
    zoneId: 'DUR',
    name: 'Durban',
    countryCode: 'ZA',
    latitude: -29.6144,
    longitude: 31.1197,
    population: {
      1950: 600, 1960: 800, 1970: 1100, 1980: 1500,
      1990: 2000, 2000: 2500, 2010: 2900, 2020: 3100
    },
    airports: ['FALE']
  },

  // ============================================================
  //  SOUTH ASIA
  // ============================================================

  {
    zoneId: 'DEL',
    name: 'Delhi',
    countryCode: 'IN',
    latitude: 28.5562,
    longitude: 77.1000,
    population: {
      1950: 1400, 1960: 2300, 1970: 3500, 1980: 5600,
      1990: 8200, 2000: 12400, 2010: 16800, 2020: 30300
    },
    airports: ['VIDP']
  },
  {
    zoneId: 'BOM',
    name: 'Mumbai',
    countryCode: 'IN',
    latitude: 19.0896,
    longitude: 72.8656,
    population: {
      1950: 2900, 1960: 4100, 1970: 5800, 1980: 8700,
      1990: 12300, 2000: 16100, 2010: 18400, 2020: 20700
    },
    airports: ['VABB']
  },
  {
    zoneId: 'BLR',
    name: 'Bangalore',
    countryCode: 'IN',
    latitude: 13.1986,
    longitude: 77.7066,
    population: {
      1950: 780, 1960: 1200, 1970: 1600, 1980: 2800,
      1990: 3800, 2000: 5200, 2010: 7200, 2020: 12300
    },
    airports: ['VOBL']
  },
  {
    zoneId: 'MAA',
    name: 'Chennai',
    countryCode: 'IN',
    latitude: 12.9941,
    longitude: 80.1709,
    population: {
      1950: 1400, 1960: 1800, 1970: 2700, 1980: 3500,
      1990: 4600, 2000: 5900, 2010: 7100, 2020: 10900
    },
    airports: ['VOMM']
  },
  {
    zoneId: 'CCU',
    name: 'Kolkata',
    countryCode: 'IN',
    latitude: 22.6520,
    longitude: 88.4463,
    population: {
      1950: 4500, 1960: 5600, 1970: 6900, 1980: 8000,
      1990: 10300, 2000: 12100, 2010: 14100, 2020: 14900
    },
    airports: ['VECC']
  },
  {
    zoneId: 'HYD',
    name: 'Hyderabad',
    countryCode: 'IN',
    latitude: 17.2403,
    longitude: 78.4294,
    population: {
      1950: 1100, 1960: 1400, 1970: 1800, 1980: 2500,
      1990: 3500, 2000: 5000, 2010: 6800, 2020: 10000
    },
    airports: ['VOHS']
  },
  {
    zoneId: 'GOI',
    name: 'Goa',
    countryCode: 'IN',
    latitude: 15.3808,
    longitude: 73.8314,
    population: {
      1950: 550, 1960: 600, 1970: 700, 1980: 800,
      1990: 1000, 2000: 1200, 2010: 1400, 2020: 1500
    },
    airports: ['VOGO']
  },
  {
    zoneId: 'KHI',
    name: 'Karachi',
    countryCode: 'PK',
    latitude: 24.9065,
    longitude: 67.1609,
    population: {
      1950: 1100, 1960: 1800, 1970: 3100, 1980: 5000,
      1990: 7100, 2000: 10000, 2010: 12800, 2020: 16100
    },
    airports: ['OPKC']
  },
  {
    zoneId: 'LHE',
    name: 'Lahore',
    countryCode: 'PK',
    latitude: 31.5216,
    longitude: 74.4036,
    population: {
      1950: 800, 1960: 1200, 1970: 1900, 1980: 3000,
      1990: 4100, 2000: 5400, 2010: 7100, 2020: 12600
    },
    airports: ['OPLA']
  },
  {
    zoneId: 'ISB',
    name: 'Islamabad',
    countryCode: 'PK',
    latitude: 33.6167,
    longitude: 73.0991,
    population: {
      1950: 50, 1960: 100, 1970: 250, 1980: 400,
      1990: 600, 2000: 800, 2010: 1200, 2020: 1100
    },
    airports: ['OPIS']
  },
  {
    zoneId: 'DAC',
    name: 'Dhaka',
    countryCode: 'BD',
    latitude: 23.8432,
    longitude: 90.3978,
    population: {
      1950: 340, 1960: 530, 1970: 1300, 1980: 3200,
      1990: 5300, 2000: 8500, 2010: 12800, 2020: 22000
    },
    airports: ['VGHS']
  },
  {
    zoneId: 'CMB',
    name: 'Colombo',
    countryCode: 'LK',
    latitude: 7.1807,
    longitude: 79.8841,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 800,
      1990: 900, 2000: 1100, 2010: 1300, 2020: 1500
    },
    airports: ['VCBI']
  },
  {
    zoneId: 'KTM',
    name: 'Kathmandu',
    countryCode: 'NP',
    latitude: 27.6966,
    longitude: 85.3591,
    population: {
      1950: 100, 1960: 150, 1970: 200, 1980: 300,
      1990: 500, 2000: 700, 2010: 1000, 2020: 1500
    },
    airports: ['VNKT']
  },
  {
    zoneId: 'COK',
    name: 'Kochi',
    countryCode: 'IN',
    latitude: 10.1520,
    longitude: 76.4019,
    population: {
      1950: 400, 1960: 500, 1970: 600, 1980: 800,
      1990: 1100, 2000: 1400, 2010: 1700, 2020: 2100
    },
    airports: ['VOCI']
  },

  // ============================================================
  //  SOUTHEAST ASIA
  // ============================================================

  {
    zoneId: 'SIN',
    name: 'Singapore',
    countryCode: 'SG',
    latitude: 1.3502,
    longitude: 103.994,
    population: {
      1950: 1000, 1960: 1600, 1970: 2100, 1980: 2400,
      1990: 3000, 2000: 4000, 2010: 5100, 2020: 5900
    },
    airports: ['WSSS']
  },
  {
    zoneId: 'BKK',
    name: 'Bangkok',
    countryCode: 'TH',
    latitude: 13.6900,
    longitude: 100.750,
    population: {
      1950: 1400, 1960: 2100, 1970: 3100, 1980: 4700,
      1990: 5900, 2000: 6400, 2010: 8300, 2020: 10500
    },
    airports: ['VTBS', 'VTBD']
  },
  {
    zoneId: 'KUL',
    name: 'Kuala Lumpur',
    countryCode: 'MY',
    latitude: 2.7456,
    longitude: 101.710,
    population: {
      1950: 400, 1960: 700, 1970: 1100, 1980: 1800,
      1990: 2600, 2000: 3800, 2010: 5800, 2020: 7700
    },
    airports: ['WMKK', 'WMSA']
  },
  {
    zoneId: 'CGK',
    name: 'Jakarta',
    countryCode: 'ID',
    latitude: -6.1256,
    longitude: 106.656,
    population: {
      1950: 1800, 1960: 2800, 1970: 4500, 1980: 7600,
      1990: 10200, 2000: 13200, 2010: 17100, 2020: 34500
    },
    airports: ['WIII']
  },
  {
    zoneId: 'MNL',
    name: 'Manila',
    countryCode: 'PH',
    latitude: 14.5086,
    longitude: 121.020,
    population: {
      1950: 1500, 1960: 2500, 1970: 3600, 1980: 5900,
      1990: 7800, 2000: 9900, 2010: 11900, 2020: 13900
    },
    airports: ['RPLL']
  },
  {
    zoneId: 'SGN',
    name: 'Ho Chi Minh City',
    countryCode: 'VN',
    latitude: 10.8188,
    longitude: 106.652,
    population: {
      1950: 1200, 1960: 1900, 1970: 2700, 1980: 3200,
      1990: 3600, 2000: 4600, 2010: 6200, 2020: 8600
    },
    airports: ['VVTS']
  },
  {
    zoneId: 'HAN',
    name: 'Hanoi',
    countryCode: 'VN',
    latitude: 21.2187,
    longitude: 105.807,
    population: {
      1950: 400, 1960: 700, 1970: 1200, 1980: 2100,
      1990: 2400, 2000: 2700, 2010: 3400, 2020: 4700
    },
    airports: ['VVNB']
  },
  {
    zoneId: 'DPS',
    name: 'Bali',
    countryCode: 'ID',
    latitude: -8.7482,
    longitude: 115.167,
    population: {
      1950: 1100, 1960: 1400, 1970: 1700, 1980: 2100,
      1990: 2500, 2000: 2900, 2010: 3300, 2020: 4300
    },
    airports: ['WADD']
  },
  {
    zoneId: 'PNH',
    name: 'Phnom Penh',
    countryCode: 'KH',
    latitude: 11.5466,
    longitude: 104.844,
    population: {
      1950: 350, 1960: 600, 1970: 1200, 1980: 300,
      1990: 600, 2000: 1000, 2010: 1500, 2020: 2100
    },
    airports: ['VDPP']
  },
  {
    zoneId: 'RGN',
    name: 'Yangon',
    countryCode: 'MM',
    latitude: 16.9074,
    longitude: 96.1332,
    population: {
      1950: 700, 1960: 1100, 1970: 1700, 1980: 2200,
      1990: 2800, 2000: 3600, 2010: 4400, 2020: 5300
    },
    airports: ['VYYY']
  },
  {
    zoneId: 'SUB',
    name: 'Surabaya',
    countryCode: 'ID',
    latitude: -7.3798,
    longitude: 112.787,
    population: {
      1950: 1000, 1960: 1400, 1970: 1700, 1980: 2200,
      1990: 2700, 2000: 2900, 2010: 3000, 2020: 3300
    },
    airports: ['WARR']
  },

  // ============================================================
  //  EAST ASIA - Japan
  // ============================================================

  {
    zoneId: 'TYO',
    name: 'Tokyo',
    countryCode: 'JP',
    latitude: 35.5533,
    longitude: 139.781,
    population: {
      1950: 11300, 1960: 15900, 1970: 20500, 1980: 24200,
      1990: 27500, 2000: 30000, 2010: 33800, 2020: 37400
    },
    airports: ['RJTT', 'RJAA']
  },
  {
    zoneId: 'OSA',
    name: 'Osaka',
    countryCode: 'JP',
    latitude: 34.4347,
    longitude: 135.244,
    population: {
      1950: 4100, 1960: 6700, 1970: 10500, 1980: 12100,
      1990: 14100, 2000: 16400, 2010: 17400, 2020: 19200
    },
    airports: ['RJBB', 'RJOO']
  },
  {
    zoneId: 'CTS',
    name: 'Sapporo',
    countryCode: 'JP',
    latitude: 43.0154,
    longitude: 141.381,
    population: {
      1950: 600, 1960: 900, 1970: 1200, 1980: 1500,
      1990: 1700, 2000: 1900, 2010: 1900, 2020: 2000
    },
    airports: ['RJCC']
  },
  {
    zoneId: 'FUK',
    name: 'Fukuoka',
    countryCode: 'JP',
    latitude: 33.5860,
    longitude: 130.451,
    population: {
      1950: 700, 1960: 1000, 1970: 1300, 1980: 1500,
      1990: 1700, 2000: 2000, 2010: 2200, 2020: 2500
    },
    airports: ['RJFF']
  },
  {
    zoneId: 'NGO',
    name: 'Nagoya',
    countryCode: 'JP',
    latitude: 34.8584,
    longitude: 136.805,
    population: {
      1950: 2100, 1960: 3100, 1970: 4800, 1980: 5600,
      1990: 6500, 2000: 7100, 2010: 7500, 2020: 7500
    },
    airports: ['RJGG', 'RJNA']
  },
  {
    zoneId: 'OKA',
    name: 'Okinawa',
    countryCode: 'JP',
    latitude: 26.1958,
    longitude: 127.646,
    population: {
      1950: 300, 1960: 400, 1970: 500, 1980: 600,
      1990: 700, 2000: 800, 2010: 850, 2020: 870
    },
    airports: ['ROAH']
  },

  // ============================================================
  //  EAST ASIA - China
  // ============================================================

  {
    zoneId: 'PEK',
    name: 'Beijing',
    countryCode: 'CN',
    latitude: 40.0801,
    longitude: 116.585,
    population: {
      1950: 3900, 1960: 5500, 1970: 6700, 1980: 8700,
      1990: 9400, 2000: 10800, 2010: 16400, 2020: 20500
    },
    airports: ['ZBAA', 'ZBAD']
  },
  {
    zoneId: 'SHA',
    name: 'Shanghai',
    countryCode: 'CN',
    latitude: 31.1443,
    longitude: 121.805,
    population: {
      1950: 6000, 1960: 7000, 1970: 7500, 1980: 8500,
      1990: 10000, 2000: 13200, 2010: 19600, 2020: 27100
    },
    airports: ['ZSPD', 'ZSSS']
  },
  {
    zoneId: 'CAN',
    name: 'Guangzhou',
    countryCode: 'CN',
    latitude: 23.3924,
    longitude: 113.299,
    population: {
      1950: 1500, 1960: 2000, 1970: 2300, 1980: 2800,
      1990: 3700, 2000: 6100, 2010: 10500, 2020: 16500
    },
    airports: ['ZGGG']
  },
  {
    zoneId: 'SZX',
    name: 'Shenzhen',
    countryCode: 'CN',
    latitude: 22.6393,
    longitude: 113.811,
    population: {
      1950: 3, 1960: 5, 1970: 10, 1980: 60,
      1990: 870, 2000: 4400, 2010: 10200, 2020: 12600
    },
    airports: ['ZGSZ']
  },
  {
    zoneId: 'CTU',
    name: 'Chengdu',
    countryCode: 'CN',
    latitude: 30.5728,
    longitude: 103.947,
    population: {
      1950: 800, 1960: 1200, 1970: 1700, 1980: 2200,
      1990: 2900, 2000: 3600, 2010: 5600, 2020: 9100
    },
    airports: ['ZUUU', 'ZUTF']
  },
  {
    zoneId: 'KMG',
    name: 'Kunming',
    countryCode: 'CN',
    latitude: 24.9924,
    longitude: 102.744,
    population: {
      1950: 400, 1960: 600, 1970: 800, 1980: 1200,
      1990: 1600, 2000: 2100, 2010: 3200, 2020: 4500
    },
    airports: ['ZPPP']
  },
  {
    zoneId: 'XMN',
    name: 'Xiamen',
    countryCode: 'CN',
    latitude: 24.5440,
    longitude: 118.128,
    population: {
      1950: 200, 1960: 400, 1970: 550, 1980: 600,
      1990: 800, 2000: 1200, 2010: 2200, 2020: 4000
    },
    airports: ['ZSAM']
  },
  {
    zoneId: 'WUH',
    name: 'Wuhan',
    countryCode: 'CN',
    latitude: 30.7838,
    longitude: 114.208,
    population: {
      1950: 1100, 1960: 1800, 1970: 2300, 1980: 2800,
      1990: 3500, 2000: 5200, 2010: 7600, 2020: 11100
    },
    airports: ['ZHHH']
  },
  {
    zoneId: 'HGH',
    name: 'Hangzhou',
    countryCode: 'CN',
    latitude: 30.2295,
    longitude: 120.434,
    population: {
      1950: 700, 1960: 800, 1970: 900, 1980: 1100,
      1990: 1500, 2000: 2200, 2010: 4300, 2020: 7600
    },
    airports: ['ZSHC']
  },
  {
    zoneId: 'CKG',
    name: 'Chongqing',
    countryCode: 'CN',
    latitude: 29.7192,
    longitude: 106.642,
    population: {
      1950: 1700, 1960: 2200, 1970: 2600, 1980: 3000,
      1990: 3600, 2000: 4600, 2010: 6300, 2020: 8500
    },
    airports: ['ZUCK']
  },
  {
    zoneId: 'NKG',
    name: 'Nanjing',
    countryCode: 'CN',
    latitude: 31.7420,
    longitude: 118.862,
    population: {
      1950: 1100, 1960: 1400, 1970: 1700, 1980: 2000,
      1990: 2400, 2000: 3000, 2010: 4600, 2020: 6500
    },
    airports: ['ZSNJ']
  },

  // ============================================================
  //  EAST ASIA - South Korea
  // ============================================================

  {
    zoneId: 'SEL',
    name: 'Seoul',
    countryCode: 'KR',
    latitude: 37.4602,
    longitude: 126.441,
    population: {
      1950: 1000, 1960: 2400, 1970: 5300, 1980: 8300,
      1990: 11000, 2000: 14200, 2010: 19500, 2020: 21800
    },
    airports: ['RKSI', 'RKSS']
  },
  {
    zoneId: 'PUS',
    name: 'Busan',
    countryCode: 'KR',
    latitude: 35.1796,
    longitude: 128.938,
    population: {
      1950: 500, 1960: 1100, 1970: 1800, 1980: 2700,
      1990: 3200, 2000: 3500, 2010: 3400, 2020: 3400
    },
    airports: ['RKPK']
  },
  {
    zoneId: 'CJU',
    name: 'Jeju',
    countryCode: 'KR',
    latitude: 33.5113,
    longitude: 126.529,
    population: {
      1950: 250, 1960: 280, 1970: 330, 1980: 400,
      1990: 450, 2000: 500, 2010: 540, 2020: 670
    },
    airports: ['RKPC']
  },

  // ============================================================
  //  EAST ASIA - Taiwan, Hong Kong, Macau
  // ============================================================

  {
    zoneId: 'TPE',
    name: 'Taipei',
    countryCode: 'TW',
    latitude: 25.0777,
    longitude: 121.233,
    population: {
      1950: 500, 1960: 1000, 1970: 2200, 1980: 4000,
      1990: 5200, 2000: 6200, 2010: 6900, 2020: 7100
    },
    airports: ['RCTP', 'RCSS']
  },
  {
    zoneId: 'HKG',
    name: 'Hong Kong',
    countryCode: 'HK',
    latitude: 22.3080,
    longitude: 113.918,
    population: {
      1950: 1700, 1960: 3000, 1970: 3900, 1980: 4600,
      1990: 5600, 2000: 6600, 2010: 7000, 2020: 7500
    },
    airports: ['VHHH']
  },
  {
    zoneId: 'MFM',
    name: 'Macau',
    countryCode: 'MO',
    latitude: 22.1496,
    longitude: 113.592,
    population: {
      1950: 180, 1960: 200, 1970: 250, 1980: 300,
      1990: 370, 2000: 430, 2010: 540, 2020: 680
    },
    airports: ['VMMC']
  },

  // ============================================================
  //  OCEANIA
  // ============================================================

  {
    zoneId: 'SYD',
    name: 'Sydney',
    countryCode: 'AU',
    latitude: -33.9461,
    longitude: 151.177,
    population: {
      1950: 1700, 1960: 2200, 1970: 2800, 1980: 3200,
      1990: 3600, 2000: 4000, 2010: 4400, 2020: 5300
    },
    airports: ['YSSY']
  },
  {
    zoneId: 'MEL',
    name: 'Melbourne',
    countryCode: 'AU',
    latitude: -37.6733,
    longitude: 144.843,
    population: {
      1950: 1300, 1960: 1800, 1970: 2400, 1980: 2700,
      1990: 3000, 2000: 3400, 2010: 3900, 2020: 5000
    },
    airports: ['YMML']
  },
  {
    zoneId: 'BNE',
    name: 'Brisbane',
    countryCode: 'AU',
    latitude: -27.3842,
    longitude: 153.117,
    population: {
      1950: 500, 1960: 650, 1970: 850, 1980: 1100,
      1990: 1300, 2000: 1600, 2010: 2000, 2020: 2500
    },
    airports: ['YBBN']
  },
  {
    zoneId: 'PER',
    name: 'Perth',
    countryCode: 'AU',
    latitude: -31.9403,
    longitude: 115.967,
    population: {
      1950: 350, 1960: 470, 1970: 650, 1980: 900,
      1990: 1100, 2000: 1400, 2010: 1700, 2020: 2100
    },
    airports: ['YPPH']
  },
  {
    zoneId: 'ADL',
    name: 'Adelaide',
    countryCode: 'AU',
    latitude: -34.9450,
    longitude: 138.531,
    population: {
      1950: 480, 1960: 600, 1970: 800, 1980: 920,
      1990: 1000, 2000: 1080, 2010: 1180, 2020: 1350
    },
    airports: ['YPAD']
  },
  {
    zoneId: 'OOL',
    name: 'Gold Coast',
    countryCode: 'AU',
    latitude: -28.1644,
    longitude: 153.505,
    population: {
      1950: 30, 1960: 50, 1970: 100, 1980: 200,
      1990: 300, 2000: 420, 2010: 530, 2020: 700
    },
    airports: ['YBCG']
  },
  {
    zoneId: 'CNS',
    name: 'Cairns',
    countryCode: 'AU',
    latitude: -16.8858,
    longitude: 145.755,
    population: {
      1950: 30, 1960: 40, 1970: 50, 1980: 70,
      1990: 100, 2000: 130, 2010: 150, 2020: 170
    },
    airports: ['YBCS']
  },
  {
    zoneId: 'AKL',
    name: 'Auckland',
    countryCode: 'NZ',
    latitude: -37.0082,
    longitude: 174.792,
    population: {
      1950: 350, 1960: 450, 1970: 600, 1980: 750,
      1990: 850, 2000: 1000, 2010: 1200, 2020: 1600
    },
    airports: ['NZAA']
  },
  {
    zoneId: 'WLG',
    name: 'Wellington',
    countryCode: 'NZ',
    latitude: -41.3272,
    longitude: 174.805,
    population: {
      1950: 170, 1960: 210, 1970: 260, 1980: 300,
      1990: 330, 2000: 360, 2010: 390, 2020: 420
    },
    airports: ['NZWN']
  },
  {
    zoneId: 'CHC',
    name: 'Christchurch',
    countryCode: 'NZ',
    latitude: -43.4894,
    longitude: 172.532,
    population: {
      1950: 170, 1960: 210, 1970: 260, 1980: 290,
      1990: 310, 2000: 340, 2010: 370, 2020: 400
    },
    airports: ['NZCH']
  },

  // ============================================================
  //  SOUTH AMERICA
  // ============================================================

  {
    zoneId: 'GRU',
    name: 'Sao Paulo',
    countryCode: 'BR',
    latitude: -23.4356,
    longitude: -46.4731,
    population: {
      1950: 2300, 1960: 3800, 1970: 7600, 1980: 12100,
      1990: 14800, 2000: 17100, 2010: 19700, 2020: 22000
    },
    airports: ['SBGR', 'SBSP']
  },
  {
    zoneId: 'GIG',
    name: 'Rio de Janeiro',
    countryCode: 'BR',
    latitude: -22.8100,
    longitude: -43.2505,
    population: {
      1950: 3000, 1960: 4400, 1970: 6600, 1980: 8600,
      1990: 9600, 2000: 10800, 2010: 11800, 2020: 13500
    },
    airports: ['SBGL', 'SBRJ']
  },
  {
    zoneId: 'BSB',
    name: 'Brasilia',
    countryCode: 'BR',
    latitude: -15.8711,
    longitude: -47.9186,
    population: {
      1950: 5, 1960: 140, 1970: 520, 1980: 1200,
      1990: 1800, 2000: 2400, 2010: 3200, 2020: 4700
    },
    airports: ['SBBR']
  },
  {
    zoneId: 'EZE',
    name: 'Buenos Aires',
    countryCode: 'AR',
    latitude: -34.8222,
    longitude: -58.5358,
    population: {
      1950: 5100, 1960: 6700, 1970: 8100, 1980: 9400,
      1990: 10500, 2000: 11800, 2010: 13000, 2020: 15200
    },
    airports: ['SAEZ', 'SABE']
  },
  {
    zoneId: 'SCL',
    name: 'Santiago',
    countryCode: 'CL',
    latitude: -33.3930,
    longitude: -70.7858,
    population: {
      1950: 1300, 1960: 1900, 1970: 2600, 1980: 3700,
      1990: 4700, 2000: 5400, 2010: 6000, 2020: 6800
    },
    airports: ['SCEL']
  },
  {
    zoneId: 'BOG',
    name: 'Bogota',
    countryCode: 'CO',
    latitude: 4.7016,
    longitude: -74.1469,
    population: {
      1950: 600, 1960: 1200, 1970: 2300, 1980: 3500,
      1990: 4700, 2000: 6200, 2010: 7700, 2020: 10800
    },
    airports: ['SKBO']
  },
  {
    zoneId: 'LIM',
    name: 'Lima',
    countryCode: 'PE',
    latitude: -12.0219,
    longitude: -77.1143,
    population: {
      1950: 1000, 1960: 1700, 1970: 2700, 1980: 4400,
      1990: 5800, 2000: 7200, 2010: 8600, 2020: 10700
    },
    airports: ['SPJC']
  },
  {
    zoneId: 'UIO',
    name: 'Quito',
    countryCode: 'EC',
    latitude: -0.1292,
    longitude: -78.3575,
    population: {
      1950: 300, 1960: 450, 1970: 600, 1980: 850,
      1990: 1100, 2000: 1400, 2010: 1700, 2020: 1900
    },
    airports: ['SEQM']
  },
  {
    zoneId: 'CCS',
    name: 'Caracas',
    countryCode: 'VE',
    latitude: 10.6031,
    longitude: -66.9906,
    population: {
      1950: 700, 1960: 1300, 1970: 2100, 1980: 2700,
      1990: 3100, 2000: 3400, 2010: 2900, 2020: 2900
    },
    airports: ['SVMI']
  },
  {
    zoneId: 'MVD',
    name: 'Montevideo',
    countryCode: 'UY',
    latitude: -34.8384,
    longitude: -56.0308,
    population: {
      1950: 1100, 1960: 1200, 1970: 1300, 1980: 1400,
      1990: 1500, 2000: 1600, 2010: 1700, 2020: 1800
    },
    airports: ['SUMU']
  },
  {
    zoneId: 'MDE',
    name: 'Medellin',
    countryCode: 'CO',
    latitude: 6.1645,
    longitude: -75.4231,
    population: {
      1950: 400, 1960: 700, 1970: 1200, 1980: 1700,
      1990: 2300, 2000: 2800, 2010: 3300, 2020: 3900
    },
    airports: ['SKRG']
  },
  {
    zoneId: 'CTG',
    name: 'Cartagena',
    countryCode: 'CO',
    latitude: 10.4424,
    longitude: -75.5130,
    population: {
      1950: 130, 1960: 200, 1970: 300, 1980: 450,
      1990: 600, 2000: 750, 2010: 900, 2020: 1100
    },
    airports: ['SKCG']
  },
  {
    zoneId: 'GYE',
    name: 'Guayaquil',
    countryCode: 'EC',
    latitude: -2.1572,
    longitude: -79.8837,
    population: {
      1950: 300, 1960: 500, 1970: 700, 1980: 1100,
      1990: 1500, 2000: 1900, 2010: 2300, 2020: 2700
    },
    airports: ['SEGU']
  },
  {
    zoneId: 'CNF',
    name: 'Belo Horizonte',
    countryCode: 'BR',
    latitude: -19.6244,
    longitude: -43.9720,
    population: {
      1950: 400, 1960: 800, 1970: 1600, 1980: 2500,
      1990: 3400, 2000: 4300, 2010: 5100, 2020: 6000
    },
    airports: ['SBCF']
  },
  {
    zoneId: 'SSA',
    name: 'Salvador',
    countryCode: 'BR',
    latitude: -12.9086,
    longitude: -38.3225,
    population: {
      1950: 400, 1960: 600, 1970: 1000, 1980: 1600,
      1990: 2300, 2000: 2900, 2010: 3500, 2020: 3900
    },
    airports: ['SBSV']
  },
  {
    zoneId: 'POA',
    name: 'Porto Alegre',
    countryCode: 'BR',
    latitude: -29.9939,
    longitude: -51.1711,
    population: {
      1950: 500, 1960: 800, 1970: 1300, 1980: 1900,
      1990: 2600, 2000: 3100, 2010: 3500, 2020: 4000
    },
    airports: ['SBPA']
  },
  {
    zoneId: 'ASU',
    name: 'Asuncion',
    countryCode: 'PY',
    latitude: -25.2399,
    longitude: -57.5190,
    population: {
      1950: 250, 1960: 350, 1970: 500, 1980: 700,
      1990: 1000, 2000: 1400, 2010: 1900, 2020: 2400
    },
    airports: ['SGAS']
  },

  // ============================================================
  //  ADDITIONAL ZONES - Various Regions
  // ============================================================

  // --- More Africa ---
  {
    zoneId: 'ENB',
    name: 'Entebbe/Kampala',
    countryCode: 'UG',
    latitude: 0.0424,
    longitude: 32.4435,
    population: {
      1950: 100, 1960: 190, 1970: 330, 1980: 530,
      1990: 770, 2000: 1200, 2010: 1700, 2020: 3500
    },
    airports: ['HUEN']
  },
  {
    zoneId: 'MPM',
    name: 'Maputo',
    countryCode: 'MZ',
    latitude: -25.9208,
    longitude: 32.5726,
    population: {
      1950: 90, 1960: 170, 1970: 380, 1980: 550,
      1990: 800, 2000: 1100, 2010: 1600, 2020: 2800
    },
    airports: ['FQMA']
  },
  {
    zoneId: 'TNR',
    name: 'Antananarivo',
    countryCode: 'MG',
    latitude: -18.7969,
    longitude: 47.4788,
    population: {
      1950: 180, 1960: 250, 1970: 400, 1980: 600,
      1990: 900, 2000: 1300, 2010: 1900, 2020: 3200
    },
    airports: ['FMMI']
  },
  {
    zoneId: 'LFW',
    name: 'Lome',
    countryCode: 'TG',
    latitude: 6.1657,
    longitude: 1.2543,
    population: {
      1950: 30, 1960: 80, 1970: 190, 1980: 400,
      1990: 700, 2000: 1000, 2010: 1500, 2020: 2100
    },
    airports: ['DXXX']
  },

  // --- More Middle East ---
  {
    zoneId: 'DMM',
    name: 'Dammam',
    countryCode: 'SA',
    latitude: 26.4712,
    longitude: 49.7979,
    population: {
      1950: 20, 1960: 50, 1970: 120, 1980: 400,
      1990: 700, 2000: 1000, 2010: 1500, 2020: 2100
    },
    airports: ['OEDF']
  },
  {
    zoneId: 'MED',
    name: 'Medina',
    countryCode: 'SA',
    latitude: 24.5534,
    longitude: 39.7051,
    population: {
      1950: 60, 1960: 100, 1970: 180, 1980: 350,
      1990: 600, 2000: 900, 2010: 1200, 2020: 1500
    },
    airports: ['OEMA']
  },

  // --- More South Asia ---
  {
    zoneId: 'AMD',
    name: 'Ahmedabad',
    countryCode: 'IN',
    latitude: 23.0773,
    longitude: 72.6347,
    population: {
      1950: 800, 1960: 1100, 1970: 1600, 1980: 2100,
      1990: 2900, 2000: 3800, 2010: 5100, 2020: 8000
    },
    airports: ['VAAH']
  },
  {
    zoneId: 'PNQ',
    name: 'Pune',
    countryCode: 'IN',
    latitude: 18.5822,
    longitude: 73.9197,
    population: {
      1950: 600, 1960: 800, 1970: 1100, 1980: 1600,
      1990: 2400, 2000: 3600, 2010: 5000, 2020: 7400
    },
    airports: ['VAPO']
  },
  {
    zoneId: 'JAI',
    name: 'Jaipur',
    countryCode: 'IN',
    latitude: 26.8242,
    longitude: 75.8122,
    population: {
      1950: 300, 1960: 500, 1970: 600, 1980: 900,
      1990: 1500, 2000: 2300, 2010: 3100, 2020: 3900
    },
    airports: ['VIJP']
  },

  // --- More Southeast Asia ---
  {
    zoneId: 'CEB',
    name: 'Cebu',
    countryCode: 'PH',
    latitude: 10.3075,
    longitude: 123.979,
    population: {
      1950: 200, 1960: 300, 1970: 450, 1980: 600,
      1990: 700, 2000: 800, 2010: 900, 2020: 1000
    },
    airports: ['RPVM']
  },
  {
    zoneId: 'HKT',
    name: 'Phuket',
    countryCode: 'TH',
    latitude: 8.1132,
    longitude: 98.3169,
    population: {
      1950: 80, 1960: 100, 1970: 120, 1980: 150,
      1990: 200, 2000: 280, 2010: 380, 2020: 420
    },
    airports: ['VTSP']
  },
  {
    zoneId: 'REP',
    name: 'Siem Reap',
    countryCode: 'KH',
    latitude: 13.4107,
    longitude: 103.813,
    population: {
      1950: 20, 1960: 30, 1970: 40, 1980: 30,
      1990: 50, 2000: 80, 2010: 150, 2020: 250
    },
    airports: ['VDSR']
  },
  {
    zoneId: 'VTE',
    name: 'Vientiane',
    countryCode: 'LA',
    latitude: 17.9884,
    longitude: 102.563,
    population: {
      1950: 80, 1960: 120, 1970: 170, 1980: 250,
      1990: 400, 2000: 600, 2010: 750, 2020: 950
    },
    airports: ['VLVT']
  },

  // --- More East Asia ---
  {
    zoneId: 'TSN',
    name: 'Tianjin',
    countryCode: 'CN',
    latitude: 39.1246,
    longitude: 117.346,
    population: {
      1950: 2400, 1960: 3200, 1970: 3900, 1980: 4900,
      1990: 5800, 2000: 6700, 2010: 9200, 2020: 13600
    },
    airports: ['ZBTJ']
  },
  {
    zoneId: 'SHE',
    name: 'Shenyang',
    countryCode: 'CN',
    latitude: 41.6398,
    longitude: 123.483,
    population: {
      1950: 1600, 1960: 2400, 1970: 2800, 1980: 3500,
      1990: 4200, 2000: 4800, 2010: 5700, 2020: 6800
    },
    airports: ['ZYTX']
  },
  {
    zoneId: 'DLC',
    name: 'Dalian',
    countryCode: 'CN',
    latitude: 38.9657,
    longitude: 121.539,
    population: {
      1950: 700, 1960: 1000, 1970: 1300, 1980: 1600,
      1990: 2000, 2000: 2500, 2010: 3500, 2020: 4400
    },
    airports: ['ZYTL']
  },
  {
    zoneId: 'TAO',
    name: 'Qingdao',
    countryCode: 'CN',
    latitude: 36.2661,
    longitude: 120.374,
    population: {
      1950: 700, 1960: 800, 1970: 900, 1980: 1100,
      1990: 1400, 2000: 1900, 2010: 3100, 2020: 4100
    },
    airports: ['ZSQD']
  },
  {
    zoneId: 'XIY',
    name: 'Xian',
    countryCode: 'CN',
    latitude: 34.4471,
    longitude: 108.752,
    population: {
      1950: 700, 1960: 1200, 1970: 1600, 1980: 2100,
      1990: 2700, 2000: 3200, 2010: 4600, 2020: 6500
    },
    airports: ['ZLXY']
  },
  {
    zoneId: 'CSX',
    name: 'Changsha',
    countryCode: 'CN',
    latitude: 28.1892,
    longitude: 113.220,
    population: {
      1950: 600, 1960: 800, 1970: 1000, 1980: 1200,
      1990: 1500, 2000: 2000, 2010: 3000, 2020: 4500
    },
    airports: ['ZGHA']
  },
  {
    zoneId: 'HRB',
    name: 'Harbin',
    countryCode: 'CN',
    latitude: 45.6234,
    longitude: 126.250,
    population: {
      1950: 800, 1960: 1500, 1970: 2000, 1980: 2500,
      1990: 2900, 2000: 3400, 2010: 4600, 2020: 5500
    },
    airports: ['ZYHB']
  },

  // --- More South America ---
  {
    zoneId: 'CWB',
    name: 'Curitiba',
    countryCode: 'BR',
    latitude: -25.5285,
    longitude: -49.1758,
    population: {
      1950: 200, 1960: 400, 1970: 700, 1980: 1300,
      1990: 1800, 2000: 2400, 2010: 2900, 2020: 3600
    },
    airports: ['SBCT']
  },
  {
    zoneId: 'REC',
    name: 'Recife',
    countryCode: 'BR',
    latitude: -8.1265,
    longitude: -34.9231,
    population: {
      1950: 600, 1960: 900, 1970: 1400, 1980: 2000,
      1990: 2600, 2000: 3100, 2010: 3500, 2020: 4000
    },
    airports: ['SBRF']
  },
  {
    zoneId: 'FOR',
    name: 'Fortaleza',
    countryCode: 'BR',
    latitude: -3.7763,
    longitude: -38.5323,
    population: {
      1950: 300, 1960: 500, 1970: 900, 1980: 1500,
      1990: 2100, 2000: 2800, 2010: 3400, 2020: 4100
    },
    airports: ['SBFZ']
  },
  {
    zoneId: 'COR',
    name: 'Cordoba AR',
    countryCode: 'AR',
    latitude: -31.3236,
    longitude: -64.2080,
    population: {
      1950: 400, 1960: 550, 1970: 700, 1980: 900,
      1990: 1100, 2000: 1300, 2010: 1500, 2020: 1700
    },
    airports: ['SACO']
  },

  // --- Pacific Islands ---
  {
    zoneId: 'NAN',
    name: 'Nadi/Fiji',
    countryCode: 'FJ',
    latitude: -17.7554,
    longitude: 177.443,
    population: {
      1950: 200, 1960: 300, 1970: 400, 1980: 500,
      1990: 600, 2000: 700, 2010: 780, 2020: 900
    },
    airports: ['NFFN']
  },
  {
    zoneId: 'PPT',
    name: 'Papeete',
    countryCode: 'PF',
    latitude: -17.5537,
    longitude: -149.607,
    population: {
      1950: 20, 1960: 30, 1970: 50, 1980: 80,
      1990: 100, 2000: 130, 2010: 150, 2020: 180
    },
    airports: ['NTAA']
  },
  {
    zoneId: 'GUM',
    name: 'Guam',
    countryCode: 'GU',
    latitude: 13.4834,
    longitude: 144.796,
    population: {
      1950: 60, 1960: 70, 1970: 90, 1980: 110,
      1990: 130, 2000: 155, 2010: 160, 2020: 170
    },
    airports: ['PGUM']
  },

  // --- More Mexico ---
  {
    zoneId: 'PVR',
    name: 'Puerto Vallarta',
    countryCode: 'MX',
    latitude: 20.6801,
    longitude: -105.254,
    population: {
      1950: 10, 1960: 15, 1970: 25, 1980: 50,
      1990: 100, 2000: 200, 2010: 300, 2020: 400
    },
    airports: ['MMPR']
  },
  {
    zoneId: 'SJD',
    name: 'Los Cabos',
    countryCode: 'MX',
    latitude: 23.1518,
    longitude: -109.721,
    population: {
      1950: 5, 1960: 8, 1970: 12, 1980: 20,
      1990: 40, 2000: 100, 2010: 200, 2020: 350
    },
    airports: ['MMSD']
  },

  // --- Additional Europe - Malta, Cyprus, Iceland ---
  {
    zoneId: 'MLA',
    name: 'Malta',
    countryCode: 'MT',
    latitude: 35.8575,
    longitude: 14.4775,
    population: {
      1950: 310, 1960: 330, 1970: 310, 1980: 340,
      1990: 360, 2000: 380, 2010: 410, 2020: 520
    },
    airports: ['LMML']
  },
  {
    zoneId: 'LCA',
    name: 'Larnaca',
    countryCode: 'CY',
    latitude: 34.8751,
    longitude: 33.6249,
    population: {
      1950: 200, 1960: 300, 1970: 400, 1980: 500,
      1990: 600, 2000: 700, 2010: 800, 2020: 900
    },
    airports: ['LCLK', 'LCPH']
  },
  {
    zoneId: 'KEF',
    name: 'Reykjavik',
    countryCode: 'IS',
    latitude: 63.9850,
    longitude: -22.6056,
    population: {
      1950: 60, 1960: 80, 1970: 100, 1980: 120,
      1990: 150, 2000: 175, 2010: 200, 2020: 230
    },
    airports: ['BIKF']
  },

  // --- Additional Caribbean ---
  {
    zoneId: 'POS',
    name: 'Port of Spain',
    countryCode: 'TT',
    latitude: 10.5955,
    longitude: -61.3372,
    population: {
      1950: 220, 1960: 350, 1970: 450, 1980: 500,
      1990: 530, 2000: 550, 2010: 550, 2020: 550
    },
    airports: ['TTPP']
  },
  {
    zoneId: 'BGI',
    name: 'Barbados',
    countryCode: 'BB',
    latitude: 13.0747,
    longitude: -59.4925,
    population: {
      1950: 210, 1960: 230, 1970: 240, 1980: 250,
      1990: 260, 2000: 270, 2010: 280, 2020: 290
    },
    airports: ['TBPB']
  },
  {
    zoneId: 'MBJ',
    name: 'Montego Bay',
    countryCode: 'JM',
    latitude: 18.5037,
    longitude: -77.9134,
    population: {
      1950: 20, 1960: 40, 1970: 60, 1980: 80,
      1990: 90, 2000: 110, 2010: 120, 2020: 140
    },
    airports: ['MKJS']
  },

  // --- Additional US ---
  {
    zoneId: 'ORF',
    name: 'Norfolk',
    countryCode: 'US',
    latitude: 36.8946,
    longitude: -76.2012,
    population: {
      1950: 500, 1960: 700, 1970: 900, 1980: 1000,
      1990: 1200, 2000: 1500, 2010: 1600, 2020: 1800
    },
    airports: ['KORF', 'KECG', 'KNGU', 'KNTU', 'KPHF']
  },
  {
    zoneId: 'PVD',
    name: 'Providence',
    countryCode: 'US',
    latitude: 41.7236,
    longitude: -71.4281,
    population: {
      1950: 700, 1960: 750, 1970: 800, 1980: 800,
      1990: 850, 2000: 900, 2010: 950, 2020: 1000
    },
    airports: ['KPVD', 'KACK', 'KEWB', 'KGON', 'KHYA', 'KOQU', 'KORH', 'KWST']
  },
  {
    zoneId: 'BDL',
    name: 'Hartford',
    countryCode: 'US',
    latitude: 41.9389,
    longitude: -72.6831,
    population: {
      1950: 500, 1960: 600, 1970: 700, 1980: 750,
      1990: 800, 2000: 850, 2010: 900, 2020: 1000
    },
    airports: ['KBDL', 'KALB', 'KBAF', 'KBTV', 'KCEF', 'KEEN', 'KGFL', 'KHFD', 'KHVN', 'KMSS', 'KPBG', 'KPOU', 'KRME', 'KRUT', 'KSCH', 'KSLK']
  },

  // ============================================================
  //  AUTO-GENERATED ZONES — additional coverage for ~5000 airports
  //  Generated 2026-07-16 from airport database clustering
  // ============================================================

  // --- NORTH AMERICA - United States (additional) ---
  {
    zoneId: 'ALE',
    name: 'Alexandria',
    countryCode: 'US',
    latitude: 31.3258280, longitude: -92.5467020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KAEX', 'KARA', 'KBAD', 'KDRI', 'KELD', 'KESF', 'KLCH', 'KLFK', 'KLFT', 'KMLU', 'KPOE', 'KSHV', 'K4R7', 'KAGO', 'KASL', 'KCRT', 'KCWF', 'KDTN', 'KHEZ', 'KJAS', 'KOCH', 'KOPL', 'KRSN', 'KVKS']
  },
  {
    zoneId: 'AMA',
    name: 'Amarillo',
    countryCode: 'US',
    latitude: 35.2178570, longitude: -101.7064440,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KAMA', 'KLBB', 'KCDS', 'KCVN', 'KCVS', 'KDHT', 'KGUY', 'KLBL', 'KTCC', '8XS8', 'KBGD', 'KCAO', 'KELK', 'KGAG', 'KPPA', 'KPVW', 'KTDW']
  },
  {
    zoneId: 'APP',
    name: 'Appleton',
    countryCode: 'US',
    latitude: 44.2585150, longitude: -88.5190000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KATW', 'KGRB', 'KAUW', 'KCWA', 'KESC', 'KIMT', 'KRHI', 'KVOK', 'K5N2', 'KARV', 'KCLI', 'KCMY', 'KEGV', 'KISW', 'KLDM', 'KLNR', 'KMBL', 'KMDZ', 'KMFI', 'KMNM', 'KRRL', 'KSTE', 'KSUE']
  },
  {
    zoneId: 'WIL',
    name: 'Wilkes-Barre/Scranton',
    countryCode: 'US',
    latitude: 41.3370640, longitude: -75.7242320,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KAVP', 'KSYR', 'KBGM', 'KELM', 'KIPT', 'KITH', 'KRME', 'KUNV', 'KLHV', 'KN03', 'KN23', 'KN66', 'KOIC', 'KPSB', 'KRVL', 'KSEG', 'KWBW']
  },
  {
    zoneId: 'BAN',
    name: 'Bangor',
    countryCode: 'US',
    latitude: 44.8063640, longitude: -68.8266680,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KBGR', 'KPWM', 'KAUG', 'KBHB', 'KBXM', 'KHUL', 'KPQI', 'KRKD', 'KBML', 'KERR', 'KHIE', 'KIWI', 'KIZG', 'KLEW', 'KMLT', 'KOLD', 'KOWK', 'KPNN', 'KWVL']
  },
  {
    zoneId: 'BIL',
    name: 'Billings',
    countryCode: 'US',
    latitude: 45.8078240, longitude: -108.5336670,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KBIL', 'KBZN', 'KCOD', 'KLVM', 'KLWT', 'KMLS', 'KSHR', 'KWRL', 'KBYG', 'KGEY', 'KJDN', 'KPOY', 'KRPX']
  },
  {
    zoneId: 'KIN1',
    name: 'Kincheloe',
    countryCode: 'US',
    latitude: 46.2420380, longitude: -84.4620820,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KCIU', 'KTVC', 'KAPN', 'KPLN', 'KACB', 'KDRM', 'KGLR', 'KHTL', 'KISQ', 'KMCD', 'KOSC']
  },
  {
    zoneId: 'COR1',
    name: 'Corpus Christi',
    countryCode: 'US',
    latitude: 27.7703990, longitude: -97.5011980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KCRP', 'KLRD', 'KALI', 'KBRO', 'KHRL', 'KMFE', 'KNGP', 'KNQI', 'KVCT', 'KNGW', 'KPSX', 'KRFG', 'KRKP', '1XA2']
  },
  {
    zoneId: 'DUL',
    name: 'Duluth',
    countryCode: 'US',
    latitude: 46.8420980, longitude: -92.1936040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KDLH', 'KBJI', 'KBRD', 'KELO', 'KHIB', 'KHYR', 'KINL', 'KASX', 'KCKC', 'KEVM', 'KGPZ', 'KIWD', 'KPKD', 'KPKF', 'KSUW']
  },
  {
    zoneId: 'PAN',
    name: 'Panama City Beach',
    countryCode: 'US',
    latitude: 30.3571060, longitude: -85.7954140,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KECP', 'KPNS', 'KTLH', 'KVPS', 'KABY', 'KBFM', 'KCEW', 'KDHN', 'KDTS', 'KEGI', 'KNPA', 'KNSE', 'KOZR', 'KPAM', 'KTOI', 'K40J', 'KAAF', 'KBGE', 'KEDN', 'KEUF', 'KJKA', 'KMGR', 'KMUL', 'KMVC', 'KNBJ', 'KTVI']
  },
  {
    zoneId: 'EUG',
    name: 'Eugene',
    countryCode: 'US',
    latitude: 44.1245990, longitude: -123.2119980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KEUG', 'KMFR', 'KONP', 'KOTH', 'KRDM', 'K2S7', 'K3S8', 'K4S1', 'K6S2', 'KRBG', 'KS03', 'KS05', 'KS21', 'KS33', 'KS39']
  },
  {
    zoneId: 'FAR',
    name: 'Fargo',
    countryCode: 'US',
    latitude: 46.9207000, longitude: -96.8158040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KFAR', 'KGFK', 'KABR', 'KAXN', 'KDVL', 'KJMS', 'KRDR', 'KTVF', 'KASY', 'KBBB', 'KBTN', 'KBWP', 'KCKN', 'KDTL', 'KFFM', 'KMOX']
  },
  {
    zoneId: 'FRE',
    name: 'Fresno',
    countryCode: 'US',
    latitude: 36.7757670, longitude: -119.7180180,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KFAT', 'KBFL', 'KBIH', 'KMCE', 'KMER', 'KNLC', 'KPRB', 'KSBP', 'KSMX', 'KVIS', 'KC80', 'KFCH', 'KIYK', 'KKIC', 'KMAE', 'KMIT', 'KMMH', 'KMPI', 'KPTV', 'KTLR']
  },
  {
    zoneId: 'SIO',
    name: 'Sioux Falls',
    countryCode: 'US',
    latitude: 43.5854630, longitude: -96.7411520,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KFSD', 'KATY', 'KHON', 'KRWF', 'KYKN', 'K7G9', 'KAXA', 'KBDH', 'KBKX', 'KDVP', 'KEST', 'KFRM', 'KLRJ', 'KMDS', 'KMHE', 'KMJQ', 'KMML', 'KMVE', 'KMWM', 'KONL', 'KOTG', 'KPOH', 'KSLB', 'KSPW']
  },
  {
    zoneId: 'FOR1',
    name: 'Fort Wayne',
    countryCode: 'US',
    latitude: 40.9788960, longitude: -85.1944650,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KFWA', 'KGRR', 'KAZO', 'KBTL', 'KANQ', 'KEKM', 'KGSH', 'KHAI', 'KIRS', 'KRCR', 'KSMD']
  },
  {
    zoneId: 'SPO',
    name: 'Spokane',
    countryCode: 'US',
    latitude: 47.6199000, longitude: -117.5339970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KGEG', 'KALW', 'KCOE', 'KEAT', 'KLWS', 'KMWH', 'KPSC', 'KPUW', 'KSFF', 'KSKA', 'K3W7', 'KEPH', 'KGIC', 'KOMK', 'KRLD', 'KTHM']
  },
  {
    zoneId: 'KAL',
    name: 'Kalispell',
    countryCode: 'US',
    latitude: 48.3105010, longitude: -114.2559970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KGPI', 'KMSO', 'KCTB', 'KSBX']
  },
  {
    zoneId: 'GRE',
    name: 'Great Falls',
    countryCode: 'US',
    latitude: 47.4819980, longitude: -111.3710020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KGTF', 'KBTM', 'KHLN', 'KHVR']
  },
  {
    zoneId: 'WIC',
    name: 'Wichita',
    countryCode: 'US',
    latitude: 37.6503140, longitude: -97.4285830,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KICT', 'KCNU', 'KFRI', 'KHUT', 'KHYS', 'KIAB', 'KMHK', 'KRSL', 'KSLN', 'KANY', 'KBEC', 'KCEA', 'KCKA', 'KCNK', 'KEMP', 'KEQA', 'KEWK', 'KGBD', 'KLYO', 'KMPR', 'KPTT']
  },
  {
    zoneId: 'WIL1',
    name: 'Wilmington',
    countryCode: 'US',
    latitude: 34.2717190, longitude: -77.9046440,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KILM', 'KCRE', 'KEWN', 'KOAJ', 'KDLC', 'KOCW']
  },
  {
    zoneId: 'JAC',
    name: 'Jackson',
    countryCode: 'US',
    latitude: 32.3111990, longitude: -90.0758970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KJAN', 'KCBM', 'KGLH', 'KGTR', 'KGWO', 'KHBG', 'KMEI', 'KPIB', '5MS1', 'KHKS', 'KLMS', 'KLUL', 'KMBO', 'KOSX', 'KUBS']
  },
  {
    zoneId: 'LIT',
    name: 'Little Rock',
    countryCode: 'US',
    latitude: 34.7292220, longitude: -92.2235910,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KLIT', 'KBBG', 'KBPK', 'KFSM', 'KHOT', 'KHRO', 'KLRF', 'KPBF', 'KTXK', 'KBVX', 'KCDH', 'KCVK', 'KFLP', 'KMEZ', 'KMPJ', 'KRKR', 'KSGT', 'KSRC']
  },
  {
    zoneId: 'FRE1',
    name: 'Freeland',
    countryCode: 'US',
    latitude: 43.5331810, longitude: -84.0831040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KMBS', 'K6D9', 'KAMN', 'KCAD', 'KGDW', 'KMOP', 'KRQB', 'KY31']
  },
  {
    zoneId: 'MOL',
    name: 'Moline',
    countryCode: 'US',
    latitude: 41.4485020, longitude: -90.5075000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KMLI', 'KPIA', 'KALO', 'KBMI', 'KBRL', 'KCID', 'KDBQ', 'KUIN', '3IS8', 'KCWI', 'KDVN', 'KEOK', 'KFFL', 'KFSW', 'KGBG', 'KIOW', 'KMPZ', 'KMQB', 'KMUT', 'KMXO', 'KPDC']
  },
  {
    zoneId: 'MIN',
    name: 'Minot',
    countryCode: 'US',
    latitude: 48.2580100, longitude: -101.2791230,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KMOT', 'KBIS', 'KDIK', 'KMIB', 'KXWA', 'KD60']
  },
  {
    zoneId: 'YUM',
    name: 'Yuma',
    countryCode: 'US',
    latitude: 32.6509380, longitude: -114.6093750,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KNYL', 'KBLH', 'KHII', 'KIPL', 'KBWC', 'KCLR', 'KCXL', 'KLGF', 'KTNP']
  },
  {
    zoneId: 'PLA',
    name: 'Plattsburgh',
    countryCode: 'US',
    latitude: 44.6509020, longitude: -73.4681020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KPBG', 'KART', 'KBTV', 'KGFL', 'KLEB', 'KMPV', 'KMSS', 'KOGS', 'KRUT', 'KSLK', '89NY', 'KCDA', 'KCNH', 'KEFK', 'KLKP', 'KMVL', 'KVSF']
  },
  {
    zoneId: 'GWI',
    name: 'Gwinn',
    countryCode: 'US',
    latitude: 46.3514980, longitude: -87.3958840,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KSAW', 'KCMX']
  },
  {
    zoneId: 'SPR',
    name: 'Springfield',
    countryCode: 'US',
    latitude: 37.2450470, longitude: -93.3885960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KSGF', 'KCOU', 'KFYV', 'KJLN', 'KTBN', 'KAIZ', 'KASG', 'KEOS', 'KFSK', 'KJEF', 'KK15', 'KNVD', 'KPLK', 'KPTS', 'KROG']
  },
  {
    zoneId: 'KNO',
    name: 'Knoxville/Maryville',
    countryCode: 'US',
    latitude: 35.8110010, longitude: -83.9940030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['KTYS', 'KCHA', 'KLOZ', 'KSME', 'KTRI', 'KGCY', 'KGKT', 'KLNP', 'KMMI', 'KMOR', 'KRKW', 'KVJI']
  },
  {
    zoneId: 'FAI',
    name: 'Fairbanks',
    countryCode: 'US',
    latitude: 64.8151020, longitude: -147.8560030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PAFA', 'PABI', 'PAEI', 'PAFB', 'PANN', 'PACE', 'PACR', 'PAIN', 'PAML', 'PAST', 'PATA', 'PAWB', 'AK13']
  },
  {
    zoneId: 'JUN',
    name: 'Juneau',
    countryCode: 'US',
    latitude: 58.3549350, longitude: -134.5744160,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PAJN', 'PAGS', 'PAHN', 'PAPG', 'PASI', 'PAGY', 'PAOH']
  },
  {
    zoneId: 'KAI',
    name: 'Kailua-Kona',
    countryCode: 'US',
    latitude: 19.7387830, longitude: -156.0456030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PHKO', 'PHOG', 'PHTO', 'PHHN', 'PHMU', 'PHSF', 'PHUP']
  },
  {
    zoneId: 'LIH',
    name: 'Lihue, Kauai',
    countryCode: 'US',
    latitude: 21.9743930, longitude: -159.3371460,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PHLI', 'PHBK', 'HI01', 'PHPA']
  },
  {
    zoneId: 'ABI',
    name: 'Abilene',
    countryCode: 'US',
    latitude: 32.4113007, longitude: -99.6819000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KABI', 'KBBD', 'KDYS', 'KJCT', 'KSJT', 'KSPS', 'KBKD', 'KBPG', 'KBWD', 'KCOM', 'KCWC', 'KETN', 'KF05', 'KONY', 'KSNK', 'KSWW']
  },
  {
    zoneId: 'ARC',
    name: 'Arcata/Eureka',
    countryCode: 'US',
    latitude: 40.9781010, longitude: -124.1090000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KACV', 'KCEC', 'KEKA', 'KRBL', 'KRDD', '82CL', 'K1O5', 'KBOK', 'KSIY']
  },
  {
    zoneId: 'AUG',
    name: 'Augusta',
    countryCode: 'US',
    latitude: 33.3699000, longitude: -81.9645000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KAGS', 'KDNL', 'KDBN', 'KLHW', 'KMQW', 'KTBR', 'KVDI']
  },
  {
    zoneId: 'ALL',
    name: 'Alliance',
    countryCode: 'US',
    latitude: 42.0525430, longitude: -102.8039650,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KAIA', 'KBFF', 'KCDR', 'KLBF', 'KSNY', 'KVTN', 'KEAN', 'KGRN', 'KIEN', 'KIML', 'KLSK', 'KOGA', 'KOKS', 'KTOR']
  },
  {
    zoneId: 'ALA',
    name: 'Alamosa',
    countryCode: 'US',
    latitude: 37.4348980, longitude: -105.8669970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KALS', 'KASE', 'KDRO', 'KGUC', 'KMTJ', 'KPUB', 'KSKX', 'KTEX', '0CO2', 'K00C', 'K1V6', 'K7V2', 'KANK', 'KAXX', 'KLXV', 'KPSO', 'KRTN', 'KTAD']
  },
  {
    zoneId: 'ALT',
    name: 'Altoona',
    countryCode: 'US',
    latitude: 40.2963980, longitude: -78.3200000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KAOO', 'KEKN', 'KCBE', 'KOYM', 'KW99']
  },
  {
    zoneId: 'BRY',
    name: 'Bryce Canyon',
    countryCode: 'US',
    latitude: 37.7064018, longitude: -112.1449966,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBCE', 'KCDC', 'KGCN', 'KPGA', 'KSGU', 'K0V7', 'K41U', 'K44U', 'KDTA', 'KFOM', 'KHVE', 'KKNB', 'KL41', 'KMLF', 'KRIF', 'KT03', 'KU07', 'KU34', 'KU55', 'UT25']
  },
  {
    zoneId: 'BAU',
    name: 'Baudette',
    countryCode: 'US',
    latitude: 48.7284012, longitude: -94.6121979,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBDE', 'KPMB', 'KROX', 'KRRT']
  },
  {
    zoneId: 'BAK',
    name: 'Baker City',
    countryCode: 'US',
    latitude: 44.8372993, longitude: -117.8089981,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBKE', 'KBNO', 'KPDT', 'KGCD', 'KHRI', 'KLGD']
  },
  {
    zoneId: 'BEA',
    name: 'Beaver',
    countryCode: 'US',
    latitude: 37.7873000, longitude: -81.1241990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBKW', 'KBLF', 'KCRW', 'KHTS', 'KLWB', 'KLYH', 'KROA', 'KSHD', 'KBCB', 'KHSP', 'KHTW', 'KPBX', 'KPSK']
  },
  {
    zoneId: 'BEL',
    name: 'Bellingham',
    countryCode: 'US',
    latitude: 48.7928009, longitude: -122.5380020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBLI', '7WA5', 'KUIL']
  },
  {
    zoneId: 'BIG',
    name: 'Big Piney',
    countryCode: 'US',
    latitude: 42.5850983, longitude: -110.1110001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBPI', 'KIDA', 'KJAC', 'KLND', 'KPIH', 'KPNA', 'KRIW', 'KRKS', 'KAFO', 'KEMM', 'KHSG', 'KMLD', 'KRXE']
  },
  {
    zoneId: 'BUR',
    name: 'Burley',
    countryCode: 'US',
    latitude: 42.5425987, longitude: -113.7720032,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBYI', 'KENV', 'KSUN', 'KTWF', 'K06U', 'KLWL']
  },
  {
    zoneId: 'FOR2',
    name: 'Fort Irwin/Barstow',
    countryCode: 'US',
    latitude: 35.2804985, longitude: -116.6299973,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KBYS', 'KDAG', 'KEED', 'KBTY', 'KL06', 'KL72']
  },
  {
    zoneId: 'CAR',
    name: 'Caribou',
    countryCode: 'US',
    latitude: 46.8714980, longitude: -68.0178990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCAR', 'KFVE', 'ME16']
  },
  {
    zoneId: 'CHA',
    name: 'Charles City',
    countryCode: 'US',
    latitude: 43.0726013, longitude: -92.6108017,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCCY', 'KLSE', 'KMCW', 'KDEH', 'KFXY']
  },
  {
    zoneId: 'COR2',
    name: 'Cortez',
    countryCode: 'US',
    latitude: 37.3030010, longitude: -108.6279980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCEZ', 'KCNY', 'KFMN', 'KGJT', 'KGUP', 'KBDG']
  },
  {
    zoneId: 'CAP',
    name: 'Cape Girardeau',
    countryCode: 'US',
    latitude: 37.2253000, longitude: -89.5708010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCGI', 'KEVV', 'KMWA', 'KPAH', 'KCEY', 'KCIR', 'KHSB', 'KMAW', 'KOLY', 'KPHT', 'KPOF', 'KSIK', 'KUCY']
  },
  {
    zoneId: 'SAV',
    name: 'Savoy',
    countryCode: 'US',
    latitude: 40.0398190, longitude: -88.2762490,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCMI', 'KDEC', 'KLWV', 'KMTO', 'KOEA']
  },
  {
    zoneId: 'CAR1',
    name: 'Carlsbad',
    countryCode: 'US',
    latitude: 32.3375015, longitude: -104.2630005,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCNM', 'KFST', 'KHOB', 'KINK', 'KMAF', 'KROW', 'KSRR', 'KATS', 'KE01', 'KE13', 'KMDD', 'KMRF', 'KODO', 'KPEQ', 'KVHN', 'NM83']
  },
  {
    zoneId: 'CAS',
    name: 'Casper',
    countryCode: 'US',
    latitude: 42.9073810, longitude: -106.4616090,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KCPR', 'KGCC', 'KLAR', 'KRWL', 'KDGW', 'KECS', 'KSAA']
  },
  {
    zoneId: 'DOD',
    name: 'Dodge City',
    countryCode: 'US',
    latitude: 37.7634010, longitude: -99.9655991,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KDDC', 'KGCK', 'KWWR', 'KCBK', 'KHLC']
  },
  {
    zoneId: 'DEL1',
    name: 'Del Rio',
    countryCode: 'US',
    latitude: 29.3595010, longitude: -100.7780020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KDLF', 'KDRT', 'K2F0', 'K5T9', 'KCZT', 'KOZA']
  },
  {
    zoneId: 'KEA',
    name: 'Kearney',
    countryCode: 'US',
    latitude: 40.7270010, longitude: -99.0067980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KEAR', 'KGRI', 'KMCK', 'K37V', 'KANW', 'KBBW', 'KBUB', 'KFBY', 'KHDE', 'KHSI', 'KLXN']
  },
  {
    zoneId: 'EAG',
    name: 'Eagle',
    countryCode: 'US',
    latitude: 39.6426010, longitude: -106.9179993,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KEGE', 'KHDN', 'KRIL', 'KCAG', 'KGWS', 'KSBS']
  },
  {
    zoneId: 'ELK',
    name: 'Elko',
    countryCode: 'US',
    latitude: 40.8249016, longitude: -115.7919998,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KEKO', 'KELY', 'KWMC', 'K05U', 'K9U3', 'KBAM']
  },
  {
    zoneId: 'ERI',
    name: 'Erie',
    countryCode: 'US',
    latitude: 42.0831270, longitude: -80.1738670,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KERI']
  },
  {
    zoneId: 'KEY',
    name: 'Key West',
    countryCode: 'US',
    latitude: 24.5561010, longitude: -81.7595980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KEYW', 'KNQX']
  },
  {
    zoneId: 'FLA',
    name: 'Flagstaff',
    countryCode: 'US',
    latitude: 35.1397570, longitude: -111.6698260,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KFLG', 'KINW', 'KSOW', 'K40G', 'KE24', 'KE51', 'KP10', 'KP14', 'KSEZ', 'KSJN', 'KTYL']
  },
  {
    zoneId: 'GLE',
    name: 'Glendive',
    countryCode: 'US',
    latitude: 47.1376580, longitude: -104.8069100,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KGDV', 'KGGW', 'KOLF', 'KSDY', 'K00F', 'KBWW', 'KPWD']
  },
  {
    zoneId: 'LON1',
    name: 'Longview',
    countryCode: 'US',
    latitude: 32.3839989, longitude: -94.7115021,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KGGG', 'KPRX', 'KTYR', 'K80F', 'KHHW', 'KJSO', 'KOSA', 'KPSN']
  },
  {
    zoneId: 'GOO',
    name: 'Goodland',
    countryCode: 'US',
    latitude: 39.3707010, longitude: -101.6997530,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KGLD', 'KLAA']
  },
  {
    zoneId: 'KIR',
    name: 'Kirksville',
    countryCode: 'US',
    latitude: 40.0934982, longitude: -92.5448990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KIRK', 'KMBY']
  },
  {
    zoneId: 'KLA',
    name: 'Klamath Falls',
    countryCode: 'US',
    latitude: 42.1561010, longitude: -121.7330020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KLMT', 'KLKV']
  },
  {
    zoneId: 'FOR3',
    name: 'Fort Benning',
    countryCode: 'US',
    latitude: 32.3325460, longitude: -84.9880030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KLSF', 'KSYV', 'KTMA']
  },
  {
    zoneId: 'ALT1',
    name: 'Altus',
    countryCode: 'US',
    latitude: 34.6670990, longitude: -99.2667010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KLTS', 'KAXS', 'KFDR']
  },
  {
    zoneId: 'MOB',
    name: 'Mobridge',
    countryCode: 'US',
    latitude: 45.5465012, longitude: -100.4079971,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KMBG', 'KPIR', 'KLEM', 'KPHP']
  },
  {
    zoneId: 'MOB1',
    name: 'Mobile',
    countryCode: 'US',
    latitude: 30.6912000, longitude: -88.2427980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KMOB', 'KPQL']
  },
  {
    zoneId: 'OCE',
    name: 'Ocean City',
    countryCode: 'US',
    latitude: 38.3103980, longitude: -75.1240010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KOXB']
  },
  {
    zoneId: 'RAP',
    name: 'Rapid City',
    countryCode: 'US',
    latitude: 44.0452995, longitude: -103.0569992,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KRAP', 'KRCA', 'KSPF']
  },
  {
    zoneId: 'SAL1',
    name: 'Salmon',
    countryCode: 'US',
    latitude: 45.1222330, longitude: -113.8819600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KSMN', 'KDLN', 'KLLJ']
  },
  {
    zoneId: 'SIL',
    name: 'Silver City',
    countryCode: 'US',
    latitude: 32.6367010, longitude: -108.1547360,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KSVC', 'KTCS', 'KCFT', 'KDGL', 'KLSB']
  },
  {
    zoneId: 'TON',
    name: 'Tonopah',
    countryCode: 'US',
    latitude: 38.0601997, longitude: -117.0869980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KTPH', 'KGAB', 'KTNX']
  },
  {
    zoneId: 'VAL',
    name: 'Valdosta',
    countryCode: 'US',
    latitude: 30.9678001, longitude: -83.1930008,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KVAD', 'KVLD', 'KCTY']
  },
  {
    zoneId: 'LOM',
    name: 'Lompoc',
    countryCode: 'US',
    latitude: 34.7373010, longitude: -120.5840000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KVBG', 'KIZA', 'KLPC']
  },
  {
    zoneId: 'VER',
    name: 'Vernal',
    countryCode: 'US',
    latitude: 40.4362140, longitude: -109.5116610,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KVEL', 'K74V', 'KPUC']
  },
  {
    zoneId: 'WES',
    name: 'West Yellowstone',
    countryCode: 'US',
    latitude: 44.6884000, longitude: -111.1179960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KWYS']
  },
  {
    zoneId: 'YAK',
    name: 'Yakima',
    countryCode: 'US',
    latitude: 46.5681992, longitude: -120.5439987,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['KYKM']
  },
  {
    zoneId: 'BAR',
    name: 'Barter Island',
    countryCode: 'US',
    latitude: 70.1340030, longitude: -143.5820010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PABA', 'PASC']
  },
  {
    zoneId: 'BET',
    name: 'Bethel',
    countryCode: 'US',
    latitude: 60.7798004, longitude: -161.8379974,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PABE', 'PAHC', 'PANI', 'PAPM', 'PACK', 'PADM', 'PADY', 'PAEE', 'PAEW', 'PAGG', 'PAGT', 'PAKI', 'PALG', 'PAMO', 'PANA', 'PAOO', 'PAPK', 'PAQH', 'PARS', 'PASM', 'PATG', 'PAVA', 'PFAK', 'PFKA', 'PFKW']
  },
  {
    zoneId: 'UTQ',
    name: 'Utqiaġvik',
    countryCode: 'US',
    latitude: 71.2854020, longitude: -156.7660080,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PABR', 'PATQ', 'PAWI', 'PALN']
  },
  {
    zoneId: 'COL',
    name: 'Cold Bay',
    countryCode: 'US',
    latitude: 55.2078710, longitude: -162.7250290,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PACD', 'PASD', 'AK33', 'PAAL', 'PACS', 'PAKF', 'PAOU', 'PAUT', 'PAVC']
  },
  {
    zoneId: 'COR3',
    name: 'Cordova',
    countryCode: 'US',
    latitude: 60.4917980, longitude: -145.4779970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PACV', 'PAGK', 'PAVD', '19AK', 'AK97', 'PACY', 'PAMD', 'PAMX', 'PFCB']
  },
  {
    zoneId: 'CAP1',
    name: 'Cape Romanzof',
    countryCode: 'US',
    latitude: 61.7803001, longitude: -166.0390015,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PACZ', 'PAEM', 'PAMY', 'PACM', 'PAHP', 'PAUK', 'PFKO']
  },
  {
    zoneId: 'DEE',
    name: 'Deering',
    countryCode: 'US',
    latitude: 66.0689010, longitude: -162.7669140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PADE', 'PAIK', 'PAOM', 'PAOT', 'PAPC', 'AK26', 'AK49', 'AK75', 'PABL', 'PADG', 'PAGL', 'PAGZ', 'PAKK', 'PASH', 'PASK', 'PATE', 'PAVL', 'PAWM', 'PAWN', 'PFEL', 'PFKT', 'PFNO', 'PFSH']
  },
  {
    zoneId: 'ADA',
    name: 'Adak',
    countryCode: 'US',
    latitude: 51.8835640, longitude: -176.6427830,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PADK', 'PAAK']
  },
  {
    zoneId: 'DIL',
    name: 'Dillingham',
    countryCode: 'US',
    latitude: 59.0447006, longitude: -158.5050049,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PADL', 'PAEH', 'PAII', 'PAIL', 'PAKN', 'PABM', 'PAIG', 'PAJZ', 'PAKL', 'PAMB', 'PANW', 'PAOC', 'PAPN', 'PFCL', 'PFKK', 'PFWS']
  },
  {
    zoneId: 'KOD',
    name: 'Kodiak',
    countryCode: 'US',
    latitude: 57.7500000, longitude: -152.4940033,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PADQ', 'PAHO', 'PAKD', 'PAKH', 'PAKY', 'PALB', 'PASO']
  },
  {
    zoneId: 'UNA',
    name: 'Unalaska',
    countryCode: 'US',
    latitude: 53.8988100, longitude: -166.5449960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PADU', 'PAKO']
  },
  {
    zoneId: 'AMB',
    name: 'Ambler',
    countryCode: 'US',
    latitude: 67.1055290, longitude: -157.8553390,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAFM', 'PAHL', 'PAIM', '2AK6', 'PAGH', 'PAHU', 'PAOB']
  },
  {
    zoneId: 'GAL',
    name: 'Galena',
    countryCode: 'US',
    latitude: 64.7361980, longitude: -156.9369970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAGA', 'PAMC', 'PARY', 'PATL', 'PAUN', 'PAKV', 'PANU', 'PFKU']
  },
  {
    zoneId: 'GAM',
    name: 'Gambell',
    countryCode: 'US',
    latitude: 63.7676940, longitude: -171.7333030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAGM', 'PASA']
  },
  {
    zoneId: 'ANA',
    name: 'Anaktuvuk Pass',
    countryCode: 'US',
    latitude: 68.1335980, longitude: -151.7429960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAKP', 'PABT', 'PACX', 'PAGB', 'PALR', 'PAPR', 'PAUM', 'PFAL']
  },
  {
    zoneId: 'KET',
    name: 'Ketchikan',
    countryCode: 'US',
    latitude: 55.3555985, longitude: -131.7140045,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAKT', 'PAKW', 'PANT', 'PAWG']
  },
  {
    zoneId: 'CAP2',
    name: 'Cape Lisburne',
    countryCode: 'US',
    latitude: 68.8750990, longitude: -166.1100010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PALU', 'PPIZ', 'PAPO']
  },
  {
    zoneId: 'ANV',
    name: 'Anvik',
    countryCode: 'US',
    latitude: 62.6467020, longitude: -160.1909940,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PANV', 'PAHX', 'PAMK', 'PASL']
  },
  {
    zoneId: 'NOR',
    name: 'Northway',
    countryCode: 'US',
    latitude: 62.9613000, longitude: -141.9290010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAOR', 'PAEG', 'PFTO']
  },
  {
    zoneId: 'ST',
    name: 'St George',
    countryCode: 'US',
    latitude: 56.5773450, longitude: -169.6638230,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAPB', 'PASN']
  },
  {
    zoneId: 'POR',
    name: 'Port Heiden',
    countryCode: 'US',
    latitude: 56.9578930, longitude: -158.6302190,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAPH', 'PAJC', 'PAPE']
  },
  {
    zoneId: 'NUI',
    name: 'Nuiqsut',
    countryCode: 'US',
    latitude: 70.2099990, longitude: -151.0059980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAQT', 'PAKU']
  },
  {
    zoneId: 'ARC1',
    name: 'Arctic Village',
    countryCode: 'US',
    latitude: 68.1147000, longitude: -145.5789950,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PARC', 'PFYU', 'PACI', 'PAVE']
  },
  {
    zoneId: 'SPA',
    name: 'Sparrevohn',
    countryCode: 'US',
    latitude: 61.0974007, longitude: -155.5740051,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PASV', 'PALJ', 'PANO']
  },
  {
    zoneId: 'SHE1',
    name: 'Shemya',
    countryCode: 'US',
    latitude: 52.7122994, longitude: 174.1139984,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PASY', 'PAAT']
  },
  {
    zoneId: 'YAK1',
    name: 'Yakutat',
    countryCode: 'US',
    latitude: 59.5087170, longitude: -139.6604350,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PAYA']
  },

  // --- OCEANIA ---
  {
    zoneId: 'LAE',
    name: 'Lae',
    countryCode: 'PG',
    latitude: -6.5679950, longitude: 146.7265440,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['AYNZ', 'AYCH', 'AYGA', 'AYKM', 'AYMD', 'AYAN', 'AYAX', 'AYAY', 'AYBC', 'AYBG', 'AYBP', 'AYBR', 'AYBU', 'AYDE', 'AYDI', 'AYDN', 'AYEA', 'AYEN', 'AYER', 'AYEW', 'AYFI', 'AYGF', 'AYGG', 'AYGI', 'AYGP', 'AYHE', 'AYHU', 'AYID', 'AYII', 'AYKB', 'AYKD', 'AYKH', 'AYKT', 'AYLB', 'AYLG', 'AYLN', 'AYLO', 'AYLP', 'AYLS', 'AYLT', 'AYLX', 'AYMB', 'AYMC', 'AYMI', 'AYMJ', 'AYMP', 'AYMW', 'AYNA', 'AYNB', 'AYNM', 'AYNO', 'AYNS', 'AYNY', 'AYOE', 'AYOG', 'AYOK', 'AYOM', 'AYOP', 'AYPD', 'AYQO', 'AYQS', 'AYRA', 'AYRI', 'AYRO', 'AYSD', 'AYSP', 'AYSW', 'AYSX', 'AYTI', 'AYTP', 'AYTR', 'AYTS', 'AYTW', 'AYTY', 'AYTZ', 'AYUC', 'AYUM', 'AYWB', 'AYWC', 'AYWS', 'AYWU', 'AYXE', 'AYXI', 'AYYE', 'AYYR', 'AYZA', 'AYWO']
  },
  {
    zoneId: 'POR1',
    name: 'Port Moresby',
    countryCode: 'PG',
    latitude: -9.4433804, longitude: 147.2200012,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['AYPY', 'AYGR', 'AYAF', 'AYBD', 'AYDR', 'AYEB', 'AYEF', 'AYEO', 'AYFA', 'AYGC', 'AYGX', 'AYJO', 'AYKO', 'AYMA', 'AYNC', 'AYNJ', 'AYQQ', 'AYRK', 'AYSF', 'AYSG', 'AYTF', 'AYUE', 'AYWG', 'AYWT', 'AYYO', 'AYKQ']
  },
  {
    zoneId: 'BAI',
    name: 'Baimuru',
    countryCode: 'PG',
    latitude: -7.4969550, longitude: 144.8217560,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYBA', 'AYBM', 'AYMN', 'AYMH', 'AYAE', 'AYBF', 'AYBO', 'AYEV', 'AYHO', 'AYIU', 'AYKK', 'AYKU', 'AYMR', 'AYNE', 'AYOL', 'AYOQ', 'AYPG', 'AYPJ', 'AYPO', 'AYPU', 'AYSS']
  },
  {
    zoneId: 'BUK',
    name: 'Buka Island',
    countryCode: 'PG',
    latitude: -5.4222990, longitude: 154.6726980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYBK', 'AYIA', 'AYIQ', 'AYMV', 'AYSH', 'AYUI', 'AYVO', 'AYWQ', 'AYZI']
  },
  {
    zoneId: 'DAR1',
    name: 'Daru',
    countryCode: 'PG',
    latitude: -9.0867600, longitude: 143.2079930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYDU', 'AYAW', 'AYBH', 'AYDL', 'AYEH', 'AYIW', 'AYKW', 'AYLI', 'AYMQ', 'AYSU', 'AYUR', 'AYXP']
  },
  {
    zoneId: 'GUR',
    name: 'Gurney',
    countryCode: 'PG',
    latitude: -10.3114996, longitude: 150.3339996,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYGN', 'AYAG', 'AYBZ', 'AYCS', 'AYDO', 'AYKA', 'AYPQ', 'AYRE', 'AYTU', 'AYWJ', 'AYSL']
  },
  {
    zoneId: 'KIM',
    name: 'Kimbe',
    countryCode: 'PG',
    latitude: -5.4638460, longitude: 150.4073270,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYHK', 'AYBL', 'AYCG', 'AYES', 'AYGL', 'AYGT', 'AYIX', 'AYKC', 'AYLL', 'AYNG', 'AYOY', 'AYSV', 'AYUZ', 'AYVL', 'AYXO', 'AYZM']
  },
  {
    zoneId: 'KAV',
    name: 'Kavieng',
    countryCode: 'PG',
    latitude: -2.5794001, longitude: 150.8079987,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYKV', 'AYEE', 'AYKY', 'AYMZ', 'AYSE', 'AYNX']
  },
  {
    zoneId: 'MAN1',
    name: 'Manus Island',
    countryCode: 'PG',
    latitude: -2.0618900, longitude: 147.4239960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYMO']
  },
  {
    zoneId: 'KOK',
    name: 'Kokopo',
    countryCode: 'PG',
    latitude: -4.3404600, longitude: 152.3800050,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYTK']
  },
  {
    zoneId: 'VAN',
    name: 'Vanimo',
    countryCode: 'PG',
    latitude: -2.6926000, longitude: 141.3028000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYVN', 'AYAA', 'AYAI', 'AYAM', 'AYBI', 'AYGU', 'AYGV', 'AYIO', 'AYLU', 'AYNU', 'AYVW', 'AYYP', 'AYZN', 'AYZS', 'AYED', 'AYRV', 'AYTO']
  },
  {
    zoneId: 'WAP',
    name: 'Wapenamanda',
    countryCode: 'PG',
    latitude: -5.6352930, longitude: 143.8922310,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYWD', 'AYAO', 'AYAQ', 'AYCB', 'AYDK', 'AYFU', 'AYHB', 'AYHH', 'AYJS', 'AYKG', 'AYKJ', 'AYML', 'AYNN', 'AYOJ', 'AYOO', 'AYOW', 'AYPB', 'AYPE', 'AYQA', 'AYRM', 'AYSA', 'AYSJ', 'AYSK', 'AYSQ', 'AYTA', 'AYTN', 'AYTV', 'AYVM', 'AYWF', 'AYWH', 'AYYK', 'AYYL', 'AYAT']
  },
  {
    zoneId: 'WEW',
    name: 'Wewak',
    countryCode: 'PG',
    latitude: -3.5838301, longitude: 143.6690063,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AYWK', 'AYFR', 'AYHF']
  },
  {
    zoneId: 'AIA',
    name: 'Aiambak',
    countryCode: 'PG',
    latitude: -7.3427778, longitude: 141.2675000,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['AYAK', 'AYBQ', 'AYDB', 'AYET', 'AYGS', 'AYIM', 'AYKI', 'AYOB', 'AYOF', 'AYOV', 'AYPC', 'AYRG', 'AYTT', 'AYXW']
  },
  {
    zoneId: 'ELI',
    name: 'Eliptamin',
    countryCode: 'PG',
    latitude: -5.0412000, longitude: 141.6779000,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['AYEL', 'AYIY', 'AYQL', 'AYSO', 'AYTB', 'AYTE', 'AYTH', 'AYUP', 'AYUY', 'AYYM', 'AYFE']
  },
  {
    zoneId: 'MIS',
    name: 'Misima Island',
    countryCode: 'PG',
    latitude: -10.6892004, longitude: 152.8379974,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['AYMS', 'AYTG', 'AYGJ']
  },
  {
    zoneId: 'LAB',
    name: 'Labasa',
    countryCode: 'FJ',
    latitude: -16.4667000, longitude: 179.3399960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NFNL', 'NFCI', 'NFFR', 'NFNG', 'NFNH', 'NFNM', 'NFNO', 'NFNS', 'NFNW', 'NFVB']
  },
  {
    zoneId: 'TAU',
    name: 'Taupo',
    countryCode: 'NZ',
    latitude: -38.7397003, longitude: 176.0839996,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NZAP', 'NZGS', 'NZNP', 'NZNR', 'NZRO', 'NZWK', 'NZWO', 'NZWU', 'NZTO']
  },
  {
    zoneId: 'TE',
    name: 'Te One',
    countryCode: 'NZ',
    latitude: -43.8118900, longitude: -176.4651400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NZCI']
  },
  {
    zoneId: 'DUN1',
    name: 'Dunedin',
    countryCode: 'NZ',
    latitude: -45.9281010, longitude: 170.1979980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NZDN', 'NZLX', 'NZMO', 'NZNV', 'NZOU', 'NZQN', 'NZUK', 'NZWF', 'NZRC']
  },
  {
    zoneId: 'GLE1',
    name: 'Glentanner Station',
    countryCode: 'NZ',
    latitude: -43.9067001, longitude: 170.1280060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NZGT', 'NZHK', 'NZMC', 'NZFJ', 'NZGM', 'NZMF']
  },
  {
    zoneId: 'KER',
    name: 'Kerikeri',
    countryCode: 'NZ',
    latitude: -35.2591480, longitude: 173.9133170,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NZKK', 'NZKT', 'NZKO']
  },
  {
    zoneId: 'WES1',
    name: 'Westport',
    countryCode: 'NZ',
    latitude: -41.7371110, longitude: 171.5790330,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NZWS', 'NZMK', 'NZTK']
  },
  {
    zoneId: 'BRO',
    name: 'Broome',
    countryCode: 'AU',
    latitude: -17.9491940, longitude: 122.2283000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['YBRM', 'YCIN', 'YDBY', 'YBGB', 'YMYR']
  },
  {
    zoneId: 'HOB',
    name: 'Hobart (Cambridge)',
    countryCode: 'AU',
    latitude: -42.8370320, longitude: 147.5130220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['YMHB', 'YDPO', 'YMLT', 'YGTO', 'YQNS', 'YSRN', 'YSTH']
  },
  {
    zoneId: 'DAR3',
    name: 'Darwin',
    countryCode: 'AU',
    latitude: -12.4149700, longitude: 130.8818500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['YPDN', 'YBTI', 'YGPT', 'YSNB', 'YCOO', 'YDLV', 'YDMN', 'YJAB', 'YSMP']
  },
  {
    zoneId: 'POR8',
    name: 'Port Hedland',
    countryCode: 'AU',
    latitude: -20.3827870, longitude: 118.6297890,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['YPPD', 'YPKA', 'YCWY', 'YHIL', 'YIBO', 'YMBL', 'YMUC', 'YPDO', 'YROE', 'YSHG', 'YWAL', 'YWGA', 'YWIT', 'YWWG']
  },
  {
    zoneId: 'ALB',
    name: 'Albany',
    countryCode: 'AU',
    latitude: -34.9433330, longitude: 117.8088890,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YABA', 'YKNG', 'YMJM']
  },
  {
    zoneId: 'ARA3',
    name: 'Ararat',
    countryCode: 'AU',
    latitude: -37.3099780, longitude: 142.9886880,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YARA', 'YECH', 'YHML', 'YHPN', 'YHSM', 'YKER', 'YMTG', 'YPOD', 'YSWH', 'YSWL', 'YWKB', 'YNRC', 'YWBL']
  },
  {
    zoneId: 'ARM',
    name: 'Armidale',
    countryCode: 'AU',
    latitude: -30.5280991, longitude: 151.6170044,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YARM', 'YCFS', 'YGDH', 'YGFN', 'YGLI', 'YIVL', 'YKMP', 'YMOR', 'YNBR', 'YPMQ', 'YSTW', 'YTRE', 'YFST', 'YNHS', 'YQDI', 'YSCO', 'YSPE', 'YWCH', 'YWWA']
  },
  {
    zoneId: 'YUL1',
    name: 'Yulara',
    countryCode: 'AU',
    latitude: -25.1859130, longitude: 130.9770300,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YAYE', 'YAMT', 'YDVR', 'YERN', 'YKCA', 'YKCS', 'YMUP']
  },
  {
    zoneId: 'BAR7',
    name: 'Barcaldine',
    countryCode: 'AU',
    latitude: -23.5662680, longitude: 145.3020860,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBAR', 'YBCK', 'YLRE', 'YAMC', 'YAPH', 'YISF', 'YMTB']
  },
  {
    zoneId: 'ALI',
    name: 'Alice Springs',
    countryCode: 'AU',
    latitude: -23.8065880, longitude: 133.9034270,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBAS', 'YERL', 'YFNE', 'YHBY', 'YHMB', 'YMDS', 'YMNS', 'YNPB']
  },
  {
    zoneId: 'CHA5',
    name: 'Charleville',
    countryCode: 'AU',
    latitude: -26.4132996, longitude: 146.2619934,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBCV', 'YCMU', 'YQLP', 'YBLL', 'YMIT']
  },
  {
    zoneId: 'UNK13',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -25.8974991, longitude: 139.3480072,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBDV', 'YBIE', 'YADS', 'YARY', 'YBEO', 'YCFH', 'YCOD', 'YDRI', 'YGLE', 'YMNK', 'YMNY', 'YMOO', 'YPDI', 'YRSB', 'YUNY']
  },
  {
    zoneId: 'BRO1',
    name: 'Broken Hill',
    countryCode: 'AU',
    latitude: -32.0014000, longitude: 141.4720001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBHI', 'YWCA']
  },
  {
    zoneId: 'HAM1',
    name: 'Hamilton Island',
    countryCode: 'AU',
    latitude: -20.3581009, longitude: 148.9519959,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBHM', 'YBMK', 'YBPN', 'YMRB', 'YAYR', 'YBPI', 'YBWN', 'YCSV', 'YLIN', 'YSHR']
  },
  {
    zoneId: 'UNK14',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -30.0391998, longitude: 145.9519958,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBKE', 'YBRW', 'YCBA', 'YLRD', 'YWLG', 'YNYN']
  },
  {
    zoneId: 'BEN3',
    name: 'Benalla',
    countryCode: 'AU',
    latitude: -36.5518990, longitude: 146.0070040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBLA', 'YBNS', 'YCOR', 'YCRG', 'YDLQ', 'YHOT', 'YLTV', 'YMAY', 'YNAR', 'YSWG', 'YWGT', 'YWSL', 'YFIL', 'YPOK', 'YTOC']
  },
  {
    zoneId: 'MOU',
    name: 'Mount Isa',
    countryCode: 'AU',
    latitude: -20.6663800, longitude: 139.4884680,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBMA', 'YCCY', 'YAUS', 'YBAW', 'YCBE', 'YCMW', 'YDAJ', 'YESE', 'YGON', 'YHDY', 'YKML', 'YLKN', 'YLOR', 'YOSB', 'YTEE', 'YTMO']
  },
  {
    zoneId: 'UNK15',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -22.9132996, longitude: 139.8999939,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBOU', 'YDPD', 'YGLO', 'YMCR', 'YMWX', 'YSPV', 'YTMY']
  },
  {
    zoneId: 'ROC',
    name: 'Rockhampton',
    countryCode: 'AU',
    latitude: -23.3800190, longitude: 150.4753590,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBRK', 'YBTR', 'YGLA', 'YTNG', 'YBLE', 'YGKL', 'YMMU', 'YMTO', 'YTDR']
  },
  {
    zoneId: 'UNK16',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -34.6248340, longitude: 143.5771140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBRN', 'YHAY', 'YMIA', 'YOUY', 'YROI']
  },
  {
    zoneId: 'BAT1',
    name: 'Bathurst',
    countryCode: 'AU',
    latitude: -33.4068170, longitude: 149.6511610,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBTH', 'YCTM', 'YCWR', 'YFBS', 'YGLB', 'YMDG', 'YNRM', 'YORG', 'YPKS', 'YSCB', 'YSDU', 'YYNG', 'YCAH', 'YCUA', 'YGNF']
  },
  {
    zoneId: 'TOW',
    name: 'Townsville',
    countryCode: 'AU',
    latitude: -19.2529040, longitude: 146.7665120,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBTL', 'YCHT', 'YGNV', 'YIGM', 'YNMN', 'YPAM', 'YWDV']
  },
  {
    zoneId: 'BUN1',
    name: 'Bundaberg',
    countryCode: 'AU',
    latitude: -24.9050390, longitude: 152.3226120,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBUD', 'YHBA', 'YKRY', 'YGAY', 'YMYB', 'YORC', 'YWND']
  },
  {
    zoneId: 'WEI',
    name: 'Weipa',
    countryCode: 'AU',
    latitude: -12.6774930, longitude: 141.9226180,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YBWP', 'YCOE', 'YLHR', 'YAUR', 'YBTV', 'YHTL', 'YMEU', 'YMOT', 'YNPE']
  },
  {
    zoneId: 'CAR3',
    name: 'Carnarvon',
    countryCode: 'AU',
    latitude: -24.8843370, longitude: 113.6663930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCAR', 'YSHK', 'YGSC', 'YUSL']
  },
  {
    zoneId: 'UNK17',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -31.3325000, longitude: 149.2669980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCBB', 'YCNM', 'YCBR']
  },
  {
    zoneId: 'COO',
    name: 'Coober Pedy',
    countryCode: 'AU',
    latitude: -29.0383120, longitude: 134.7221660,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCBP', 'YALA', 'YOOD', 'YPMH', 'YTAR']
  },
  {
    zoneId: 'CHI12',
    name: 'Chinchilla',
    countryCode: 'AU',
    latitude: -26.7719470, longitude: 150.6175710,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCCA', 'YROM', 'YDAY', 'YGDI', 'YMLS', 'YTAA', 'YTAM']
  },
  {
    zoneId: 'UNK18',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -32.1306000, longitude: 133.7100067,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCDU', 'YKBY', 'YMPA', 'YPNG', 'YWUD', 'YYTA']
  },
  {
    zoneId: 'UNK19',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -33.7097020, longitude: 136.5050050,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCEE', 'YPAG', 'YPIR', 'YPLC', 'YWHA', 'YCWL', 'YLOK']
  },
  {
    zoneId: 'UNK20',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -15.4436490, longitude: 145.1832210,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCKN', 'YBIZ', 'YCFL', 'YDIX', 'YGAM', 'YHPV', 'YKLB', 'YKPR', 'YLFD', 'YLND', 'YLRA', 'YLRS', 'YLZI', 'YMGV', 'YWMP']
  },
  {
    zoneId: 'UNK21',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -22.7731000, longitude: 147.6210020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCMT', 'YDYS', 'YEML']
  },
  {
    zoneId: 'COO1',
    name: 'Cooma',
    countryCode: 'AU',
    latitude: -36.3004450, longitude: 148.9724080,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YCOM', 'YMER', 'YMRY', 'YTMU', 'YMCO', 'YORB']
  },
  {
    zoneId: 'UNK22',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -28.5879120, longitude: 148.2171610,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YDBI', 'YSGE']
  },
  {
    zoneId: 'ELC',
    name: 'Elcho Island',
    countryCode: 'AU',
    latitude: -12.0193996, longitude: 135.5709991,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YELD', 'YMGD', 'YPGV', 'YLEV', 'YMGB', 'YRNG']
  },
  {
    zoneId: 'ESP',
    name: 'Esperance',
    countryCode: 'AU',
    latitude: -33.6843990, longitude: 121.8229980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YESP', 'YNRV', 'YNSM']
  },
  {
    zoneId: 'UNK23',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -22.4283950, longitude: 116.8878790,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YEWA', 'YPBO', 'YANG', 'YBGD', 'YCWA', 'YKBA', 'YOLW', 'YSOL', 'YTMP']
  },
  {
    zoneId: 'UNK24',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -30.8366200, longitude: 128.1128110,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YFRT', 'YECL']
  },
  {
    zoneId: 'UNK25',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -18.1835960, longitude: 125.5597830,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YFTZ', 'YBAN', 'YBYS', 'YCRK', 'YGIB', 'YMGR', 'YMHO', 'YNKA', 'YTAB']
  },
  {
    zoneId: 'MOO1',
    name: 'Moonyoonooka',
    countryCode: 'AU',
    latitude: -28.7961010, longitude: 114.7070010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YGEL', 'YDRA', 'YEEB', 'YJNB', 'YKAR', 'YKBR', 'YMRW', 'YMWA', 'YYAL']
  },
  {
    zoneId: 'GRO1',
    name: 'Groote Eylandt',
    countryCode: 'AU',
    latitude: -13.9724050, longitude: 136.4585530,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YGTE', 'YNGU', 'YNUM']
  },
  {
    zoneId: 'GRI',
    name: 'Griffith',
    countryCode: 'AU',
    latitude: -34.2508011, longitude: 146.0670013,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YGTH', 'YTEM', 'YWWL', 'YCDO']
  },
  {
    zoneId: 'HOR',
    name: 'Horn',
    countryCode: 'AU',
    latitude: -10.5856360, longitude: 142.2927700,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YHID', 'YBAU', 'YBOI', 'YCCT', 'YDNI', 'YKUB', 'YMAA', 'YMAE', 'YSII', 'YWBS', 'YYKI', 'YYMI']
  },
  {
    zoneId: 'UNK26',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -18.2339000, longitude: 127.6699980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YHLC', 'YARG', 'YBDF', 'YBEB', 'YBGO', 'YBIL', 'YFLO', 'YGDN', 'YINW', 'YKIR', 'YNIC', 'YORV', 'YTKY']
  },
  {
    zoneId: 'UNK27',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -39.8774986, longitude: 143.8780060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YKII', 'YSMI', 'YWYY']
  },
  {
    zoneId: 'KOW',
    name: 'Kowanyama',
    countryCode: 'AU',
    latitude: -15.4853690, longitude: 141.7525720,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YKOW', 'YDBR', 'YDDF', 'YDLT', 'YDOR', 'YHHY', 'YIKM', 'YKLA', 'YLOV', 'YMIR', 'YPMP', 'YRTP', 'YVRS']
  },
  {
    zoneId: 'UNK28',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -30.5983010, longitude: 138.4259950,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YLEC', 'YAMK', 'YBLC', 'YDLK', 'YEDA', 'YHAW', 'YMGN', 'YMRE', 'YMWT', 'YOLD', 'YPWR']
  },
  {
    zoneId: 'LEO',
    name: 'Leonora',
    countryCode: 'AU',
    latitude: -28.8780994, longitude: 121.3150024,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YLEO', 'YLST', 'YMNE', 'YPKG', 'YLTN', 'YMMI', 'YSAN', 'YSCD', 'YWDA', 'YYLR']
  },
  {
    zoneId: 'UNK29',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -26.6117001, longitude: 118.5479965,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YMEK', 'YMOG', 'YWLU', 'YCUE', 'YDGA']
  },
  {
    zoneId: 'NOR4',
    name: 'Normanton',
    countryCode: 'AU',
    latitude: -17.6840900, longitude: 141.0696640,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YNTN', 'YAGD', 'YBKT', 'YCRY', 'YGDS', 'YIFY', 'YKMB', 'YSMR', 'YWDL']
  },
  {
    zoneId: 'NEW',
    name: 'Newman',
    countryCode: 'AU',
    latitude: -23.4178009, longitude: 119.8030014,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YNWN', 'YBRY', 'YCHK', 'YFDF', 'YGIA', 'YKDD', 'YNUL', 'YRYH']
  },
  {
    zoneId: 'WAD1',
    name: 'Wadeye',
    countryCode: 'AU',
    latitude: -14.2497010, longitude: 129.5295380,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YPKT', 'YPKU', 'YAUV', 'YFRV', 'YTBR', 'YWYM']
  },
  {
    zoneId: 'EXM',
    name: 'Exmouth',
    countryCode: 'AU',
    latitude: -22.2352010, longitude: 114.0900240,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YPLM', 'YBWX', 'YEXM']
  },
  {
    zoneId: 'UNK30',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -14.5211000, longitude: 132.3780060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YPTN', 'YDLW', 'YMVY']
  },
  {
    zoneId: 'UNK31',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -34.1964000, longitude: 140.6739960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YREN']
  },
  {
    zoneId: 'UNK32',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -21.7150000, longitude: 122.2289960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YTEF', 'YCNF', 'YWWI']
  },
  {
    zoneId: 'THA',
    name: 'Thargomindah',
    countryCode: 'AU',
    latitude: -27.9863680, longitude: 143.8120650,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YTGM', 'YDRH', 'YLLE', 'YTHY']
  },
  {
    zoneId: 'UNK33',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -29.4510990, longitude: 142.0579990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YTIB', 'YMYT']
  },
  {
    zoneId: 'TEN',
    name: 'Tennant Creek',
    countryCode: 'AU',
    latitude: -19.6343994, longitude: 134.1829987,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YTNK', 'YBRU', 'YELK', 'YEVA', 'YKUR', 'YWAC']
  },
  {
    zoneId: 'WIN1',
    name: 'Windorah',
    countryCode: 'AU',
    latitude: -25.4106410, longitude: 142.6684280,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YWDH', 'YJDA', 'YSGW', 'YTNB']
  },
  {
    zoneId: 'UNK34',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -22.3635998, longitude: 143.0859985,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['YWTN', 'YHUG', 'YRMD']
  },
  {
    zoneId: 'ABI1',
    name: 'Abingdon Downs',
    countryCode: 'AU',
    latitude: -17.6088140, longitude: 143.1835310,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YABI', 'YBWM', 'YBWR', 'YCPN', 'YEIN', 'YGTN', 'YLHS', 'YROB', 'YSPK', 'YUDA']
  },
  {
    zoneId: 'UNK35',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -19.0601997, longitude: 136.7100067,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YALX', 'YANL', 'YLAH', 'YMTA']
  },
  {
    zoneId: 'BUS',
    name: 'Busselton',
    countryCode: 'AU',
    latitude: -33.6872220, longitude: 115.4002780,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YBLN', 'YBUN', 'YCOI', 'YMGT', 'YNRG']
  },
  {
    zoneId: 'UNK36',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -16.0753000, longitude: 136.3020020,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YBRL', 'YMHU', 'YRBR', 'YWOR']
  },
  {
    zoneId: 'UNK37',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -17.6070004, longitude: 131.5489960,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YCAC', 'YCFD', 'YHBR', 'YHOO', 'YKKG', 'YLIM', 'YMSF', 'YVRD', 'YWAV']
  },
  {
    zoneId: 'UNK38',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -11.1650000, longitude: 132.4830020,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YCKI', 'YGBI', 'YOEN']
  },
  {
    zoneId: 'UNK39',
    name: 'Unknown',
    countryCode: 'AU',
    latitude: -27.7117004, longitude: 138.3280029,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YCWI', 'YMUG', 'YMUK', 'YOOM']
  },
  {
    zoneId: 'DRY',
    name: 'Drysdale River',
    countryCode: 'AU',
    latitude: -15.3864290, longitude: 126.3022350,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['YDGN', 'YDRD', 'YKAL', 'YMIP', 'YTHD', 'YTST']
  },

  // --- EUROPE ---
  {
    zoneId: 'AKU',
    name: 'Akureyri',
    countryCode: 'IS',
    latitude: 65.6565730, longitude: -18.0720180,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['BIAR', 'BIEG', 'BISI', 'BIHN', 'BIHU', 'BIGR', 'BIBK', 'BIBL', 'BIBV', 'BIDV', 'BIFF', 'BIFM', 'BIGJ', 'BIOF', 'BIRE', 'BIRG', 'BIRL', 'BITN', 'BIVO', 'BIHK', 'BIKP', 'BIKR', 'BINF', 'BIBF']
  },
  {
    zoneId: 'SA',
    name: 'Ísafjörður',
    countryCode: 'IS',
    latitude: 66.0580980, longitude: -23.1353000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['BIIS', 'BIBD', 'BIPA', 'BITE', 'BIHT', 'BIID']
  },
  {
    zoneId: 'ERF',
    name: 'Erfurt',
    countryCode: 'DE',
    latitude: 50.9782810, longitude: 10.9607130,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EDDE', 'EDAC', 'EDGE', 'EDQD', 'EDQM', 'EDQE']
  },
  {
    zoneId: 'ZIR',
    name: 'Zirchow',
    countryCode: 'DE',
    latitude: 53.8787000, longitude: 14.1523000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EDAH', 'ETNL', 'EDBH', 'EDCG', 'EDCP']
  },
  {
    zoneId: 'SYL',
    name: 'Sylt',
    countryCode: 'DE',
    latitude: 54.9132000, longitude: 8.3404700,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EDXW', 'EDWE', 'EDWJ', 'EDWL', 'EDWR', 'EDWS', 'EDWY', 'EDWZ', 'EDXY']
  },
  {
    zoneId: 'KUR',
    name: 'Kuressaare',
    countryCode: 'EE',
    latitude: 58.2299004, longitude: 22.5095005,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EEKE']
  },
  {
    zoneId: 'TAR',
    name: 'Tartu',
    countryCode: 'EE',
    latitude: 58.3074380, longitude: 26.6864730,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EETU']
  },
  {
    zoneId: 'IVA',
    name: 'Ivalo',
    countryCode: 'FI',
    latitude: 68.6073000, longitude: 27.4053000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EFIV', 'EFKT', 'EFET', 'EFSO']
  },
  {
    zoneId: 'KUO',
    name: 'Kuopio / Siilinjärvi',
    countryCode: 'FI',
    latitude: 63.0070990, longitude: 27.7978000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EFKU', 'EFLP', 'EFHA', 'EFIT', 'EFJO', 'EFJY', 'EFKI', 'EFMI', 'EFSA', 'EFVR', 'EFYL']
  },
  {
    zoneId: 'MAR',
    name: 'Mariehamn',
    countryCode: 'FI',
    latitude: 60.1222000, longitude: 19.8981990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EFMA', 'EFPO']
  },
  {
    zoneId: 'OUL',
    name: 'Oulu / Oulunsalo',
    countryCode: 'FI',
    latitude: 64.9300990, longitude: 25.3546010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EFOU', 'EFRO', 'EFKE', 'EFKK', 'EFKS']
  },
  {
    zoneId: 'VAA',
    name: 'Vaasa',
    countryCode: 'FI',
    latitude: 63.0502300, longitude: 21.7625430,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EFVA', 'EFKA', 'EFKJ', 'EFSI']
  },
  {
    zoneId: 'ABE',
    name: 'Aberdeen',
    countryCode: 'GB',
    latitude: 57.2019000, longitude: -2.1977800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EGPD', 'EGPA', 'EGPC', 'EGPE', 'EGQS', 'EGEI', 'EGER']
  },
  {
    zoneId: 'EDA',
    name: 'Eday',
    countryCode: 'GB',
    latitude: 59.1906013, longitude: -2.7722199,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EGED', 'EGPB', 'EGEF', 'EGEH', 'EGEN', 'EGEP', 'EGES', 'EGET', 'EGEW']
  },
  {
    zoneId: 'HAV1',
    name: 'Haverfordwest',
    countryCode: 'GB',
    latitude: 51.8330994, longitude: -4.9611101,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EGFE', 'EGHQ', 'EGHC']
  },
  {
    zoneId: 'BAL',
    name: 'Balivanich',
    countryCode: 'GB',
    latitude: 57.4810980, longitude: -7.3627800,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EGPL', 'EGPO', 'EGPR', 'EGPU', 'EGEL']
  },
  {
    zoneId: 'NOR2',
    name: 'Norwich, Norfolk',
    countryCode: 'GB',
    latitude: 52.6758000, longitude: 1.2827800,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EGSH']
  },
  {
    zoneId: 'MAA1',
    name: 'Maastricht',
    countryCode: 'NL',
    latitude: 50.9117010, longitude: 5.7701400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EHBK']
  },
  {
    zoneId: 'GRO',
    name: 'Groningen',
    countryCode: 'NL',
    latitude: 53.1197010, longitude: 6.5794400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EHGG']
  },
  {
    zoneId: 'DON',
    name: 'Donegal',
    countryCode: 'IE',
    latitude: 55.0442009, longitude: -8.3409996,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['EIDL', 'EISG', 'EIBT']
  },
  {
    zoneId: 'BIL1',
    name: 'Billund',
    countryCode: 'DK',
    latitude: 55.7403350, longitude: 9.1570190,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EKBI', 'EKEB', 'EKKA', 'EKSB', 'EKSN', 'EKSP', 'EKSV', 'EKTS', 'EKVJ', 'EKYT', 'EKLS']
  },
  {
    zoneId: 'LE',
    name: 'Ålesund',
    countryCode: 'NO',
    latitude: 62.5604430, longitude: 6.1108450,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ENAL', 'ENKB', 'ENML', 'ENOL', 'ENOV', 'ENSD']
  },
  {
    zoneId: 'BOD1',
    name: 'Bodø',
    countryCode: 'NO',
    latitude: 67.2692030, longitude: 14.3653000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ENBO', 'ENEV', 'ENLK', 'ENMS', 'ENRA', 'ENSH', 'ENSK', 'ENST', 'ENRS']
  },
  {
    zoneId: 'KRI',
    name: 'Kristiansand(Kjevik)',
    countryCode: 'NO',
    latitude: 58.2042010, longitude: 8.0853700,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ENCN', 'ENZV']
  },
  {
    zoneId: 'TRO',
    name: 'Tromsø',
    countryCode: 'NO',
    latitude: 69.6832960, longitude: 18.9189000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ENTC', 'ENAN', 'ENAT', 'ENDU', 'ENHF', 'ENSR', 'ENHK']
  },
  {
    zoneId: 'TRO1',
    name: 'Trondheim',
    countryCode: 'NO',
    latitude: 63.4578020, longitude: 10.9240000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ENVA', 'ENRM', 'ENRO', 'ENNM']
  },
  {
    zoneId: 'BR',
    name: 'Brønnøy',
    countryCode: 'NO',
    latitude: 65.4610980, longitude: 12.2175000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ENBN']
  },
  {
    zoneId: 'BT',
    name: 'Båtsfjord',
    countryCode: 'NO',
    latitude: 70.6002500, longitude: 29.6926120,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ENBS', 'ENBV', 'ENHV', 'ENKR', 'ENMH', 'ENNA', 'ENSS', 'ENVD']
  },
  {
    zoneId: 'LON2',
    name: 'Longyearbyen',
    countryCode: 'NO',
    latitude: 78.2461010, longitude: 15.4656000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ENSB']
  },
  {
    zoneId: 'LUB',
    name: 'Lublin',
    countryCode: 'PL',
    latitude: 51.2401570, longitude: 22.7134610,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EPLB', 'EPRZ']
  },
  {
    zoneId: 'POZ',
    name: 'Poznań',
    countryCode: 'PL',
    latitude: 52.4215980, longitude: 16.8233590,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EPPO', 'EPWR', 'EPSC', 'EPZG']
  },
  {
    zoneId: 'MAL',
    name: 'Malung-Sälen',
    countryCode: 'SE',
    latitude: 61.1650800, longitude: 12.8335200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ESKS', 'ESKK', 'ESKM', 'ESOK', 'ESSD', 'ESST', 'ESND', 'ESOH', 'ESUE']
  },
  {
    zoneId: 'KIR1',
    name: 'Kiruna',
    countryCode: 'SE',
    latitude: 67.8219990, longitude: 20.3368000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ESNQ', 'ESNG', 'ESUP']
  },
  {
    zoneId: 'UME',
    name: 'Umeå',
    countryCode: 'SE',
    latitude: 63.7918010, longitude: 20.2828010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ESNU', 'ESPA', 'ESNK', 'ESNL', 'ESNN', 'ESNO', 'ESNS', 'ESNV', 'ESNX', 'ESUD']
  },
  {
    zoneId: 'LIN',
    name: 'Linköping',
    countryCode: 'SE',
    latitude: 58.4049090, longitude: 15.6844990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ESSL', 'ESSV', 'ESMQ', 'ESMX', 'ESOE', 'ESSP', 'ESMO', 'ESSF', 'ESSW']
  },
  {
    zoneId: 'SD',
    name: 'Söderhamn',
    countryCode: 'SE',
    latitude: 61.2615010, longitude: 17.0991000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ESNY']
  },
  {
    zoneId: 'ST3',
    name: 'Östersund',
    countryCode: 'SE',
    latitude: 63.1941350, longitude: 14.5003220,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ESNZ']
  },
  {
    zoneId: 'LIE',
    name: 'Liepāja',
    countryCode: 'LV',
    latitude: 56.5175020, longitude: 21.0969010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EVLA', 'EVVA']
  },
  {
    zoneId: 'PAL',
    name: 'Palanga',
    countryCode: 'LT',
    latitude: 55.9732020, longitude: 21.0939010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EYPA', 'EYSA']
  },
  {
    zoneId: 'EL2',
    name: 'El Matorral',
    countryCode: 'ES',
    latitude: 28.4527000, longitude: -13.8638000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GCFV', 'GCRR']
  },
  {
    zoneId: 'RAN1',
    name: 'Ranón',
    countryCode: 'ES',
    latitude: 43.5635990, longitude: -6.0346200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LEAS', 'LELN', 'LEST', 'LECO', 'LEXJ']
  },
  {
    zoneId: 'BIL2',
    name: 'Bilbao',
    countryCode: 'ES',
    latitude: 43.3011020, longitude: -2.9106100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LEBB', 'LEBG', 'LELO', 'LEPP', 'LESO', 'LEVT']
  },
  {
    zoneId: 'ZAR',
    name: 'Zaragoza',
    countryCode: 'ES',
    latitude: 41.6661990, longitude: -1.0415500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LEZG', 'LEHC']
  },
  {
    zoneId: 'MEL2',
    name: 'Melilla',
    countryCode: 'ES',
    latitude: 35.2798000, longitude: -2.9562600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GEML', 'LEAM']
  },
  {
    zoneId: 'BAD',
    name: 'Badajoz',
    countryCode: 'ES',
    latitude: 38.8913000, longitude: -6.8213300,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LEBZ']
  },
  {
    zoneId: 'CIU',
    name: 'Ciudad Real',
    countryCode: 'ES',
    latitude: 38.8564790, longitude: -3.9699440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LERL']
  },
  {
    zoneId: 'SAL2',
    name: 'Salamanca',
    countryCode: 'ES',
    latitude: 40.9520990, longitude: -5.5019900,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LESA', 'LEVD']
  },
  {
    zoneId: 'VIG',
    name: 'Vigo',
    countryCode: 'ES',
    latitude: 42.2318000, longitude: -8.6267700,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LEVX']
  },
  {
    zoneId: 'BAS',
    name: 'Bastia',
    countryCode: 'FR',
    latitude: 42.5527000, longitude: 9.4837300,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LFKB', 'LFKF', 'LFKC', 'LFKJ', 'LFKS', 'LFKO']
  },
  {
    zoneId: 'LES',
    name: 'Lesquin',
    countryCode: 'FR',
    latitude: 50.5665640, longitude: 3.1024290,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LFQQ', 'LFAC', 'LFAT', 'LFQT']
  },
  {
    zoneId: 'BRE',
    name: 'Brest',
    countryCode: 'FR',
    latitude: 48.4478990, longitude: -4.4185400,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LFRB', 'LFRD', 'LFRF', 'LFRH', 'LFRJ', 'LFRO', 'LFRQ', 'LFRT', 'LFRU', 'LFEC']
  },
  {
    zoneId: 'AUR',
    name: 'Aurillac',
    countryCode: 'FR',
    latitude: 44.8913990, longitude: 2.4219400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LFLW', 'LFBK', 'LFBL', 'LFMU', 'LFNB', 'LFSL']
  },
  {
    zoneId: 'POI',
    name: 'Poitiers/Biard',
    countryCode: 'FR',
    latitude: 46.5877000, longitude: 0.3066660,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LFBI', 'LFLD', 'LFLX', 'LFOT', 'LFQG', 'LFRM']
  },
  {
    zoneId: 'BIA',
    name: 'Biarritz',
    countryCode: 'FR',
    latitude: 43.4683720, longitude: -1.5232230,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LFBZ']
  },
  {
    zoneId: 'PER1',
    name: 'Perpignan/Rivesaltes',
    countryCode: 'FR',
    latitude: 42.7403980, longitude: 2.8706700,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LFMP']
  },
  {
    zoneId: 'LE1',
    name: 'Le Havre',
    countryCode: 'FR',
    latitude: 49.5340380, longitude: 0.0884060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LFOH', 'LFRC', 'LFRG', 'LFRK']
  },
  {
    zoneId: 'DIJ',
    name: 'Dijon',
    countryCode: 'FR',
    latitude: 47.2689020, longitude: 5.0900000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LFSD']
  },
  {
    zoneId: 'BUR2',
    name: 'Burgas',
    countryCode: 'BG',
    latitude: 42.5699170, longitude: 27.5151730,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LBBG', 'LBWN', 'LBGO', 'LBRS']
  },
  {
    zoneId: 'PUL',
    name: 'Pula',
    countryCode: 'HR',
    latitude: 44.8935010, longitude: 13.9222000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LDPL', 'LDLO']
  },
  {
    zoneId: 'OSI',
    name: 'Osijek(Klisa)',
    countryCode: 'HR',
    latitude: 45.4623550, longitude: 18.8112780,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LDOS']
  },
  {
    zoneId: 'AND',
    name: 'Andravida',
    countryCode: 'GR',
    latitude: 37.9207000, longitude: 21.2926010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LGAD', 'LGKF', 'LGKL', 'LGRX', 'LGZA', 'LGSP']
  },
  {
    zoneId: 'ALE3',
    name: 'Alexandroupolis',
    countryCode: 'GR',
    latitude: 40.8559000, longitude: 25.9563010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LGAL', 'LGMT', 'LGLM']
  },
  {
    zoneId: 'CHI4',
    name: 'Chios Island',
    countryCode: 'GR',
    latitude: 38.3432007, longitude: 26.1406002,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LGHI', 'LGSM', 'LGIK', 'LGNX', 'LGPL']
  },
  {
    zoneId: 'DEB',
    name: 'Debrecen',
    countryCode: 'HU',
    latitude: 47.4894690, longitude: 21.6162780,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LHDC']
  },
  {
    zoneId: 'PC',
    name: 'Pécs',
    countryCode: 'HU',
    latitude: 45.9888910, longitude: 18.2420440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LHPP', 'LHSM']
  },
  {
    zoneId: 'BAR1',
    name: 'Bari',
    countryCode: 'IT',
    latitude: 41.1389010, longitude: 16.7605990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LIBD', 'LIBR', 'LIBG', 'LIBN']
  },
  {
    zoneId: 'PES',
    name: 'Pescara',
    countryCode: 'IT',
    latitude: 42.4310790, longitude: 14.1829810,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LIBP', 'LIPY']
  },
  {
    zoneId: 'LAM1',
    name: 'Lamezia Terme (CZ)',
    countryCode: 'IT',
    latitude: 38.9062140, longitude: 16.2460070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LICA', 'LIBC']
  },
  {
    zoneId: 'CAG',
    name: 'Cagliari',
    countryCode: 'IT',
    latitude: 39.2514990, longitude: 9.0542800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LIEE', 'LIEO', 'LIEA', 'LIED', 'LIER']
  },
  {
    zoneId: 'LAM2',
    name: 'Lampedusa',
    countryCode: 'IT',
    latitude: 35.4978980, longitude: 12.6181000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LICD', 'LICG']
  },
  {
    zoneId: 'MO1',
    name: 'Mošnov',
    countryCode: 'CZ',
    latitude: 49.6963010, longitude: 18.1110990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LKMT', 'LKKU', 'LKPO', 'LKTB', 'LKOL', 'LKZA']
  },
  {
    zoneId: 'FEL',
    name: 'Feldkirchen bei Graz',
    countryCode: 'AT',
    latitude: 46.9911000, longitude: 15.4396000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LOWG', 'LOWK', 'LOWL', 'LOWS']
  },
  {
    zoneId: 'INN',
    name: 'Innsbruck',
    countryCode: 'AT',
    latitude: 47.2602010, longitude: 11.3440000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LOWI', 'LOIH']
  },
  {
    zoneId: 'FUN',
    name: 'Funchal',
    countryCode: 'PT',
    latitude: 32.6978120, longitude: -16.7746130,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LPMA', 'LPPS']
  },
  {
    zoneId: 'PON',
    name: 'Ponta Delgada',
    countryCode: 'PT',
    latitude: 37.7411995, longitude: -25.6979008,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LPPD', 'LPAZ', 'LPLA']
  },
  {
    zoneId: 'BRA1',
    name: 'Bragança',
    countryCode: 'PT',
    latitude: 41.8578000, longitude: -6.7071300,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LPBG']
  },
  {
    zoneId: 'SAN2',
    name: 'Santa Cruz das Flores',
    countryCode: 'PT',
    latitude: 39.4552994, longitude: -31.1313992,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LPFL', 'LPCR']
  },
  {
    zoneId: 'SAN3',
    name: 'Santa Cruz da Graciosa',
    countryCode: 'PT',
    latitude: 39.0922012, longitude: -28.0298004,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LPGR', 'LPHR', 'LPPI', 'LPSJ']
  },
  {
    zoneId: 'MAH1',
    name: 'Mahovljani',
    countryCode: 'BA',
    latitude: 44.9413990, longitude: 17.2975010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LQBK', 'LQMO', 'LQSA', 'LQTZ']
  },
  {
    zoneId: 'BAC',
    name: 'Bacău',
    countryCode: 'RO',
    latitude: 46.5219000, longitude: 26.9102990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LRBC', 'LRIA', 'LRSV', 'LRTC']
  },
  {
    zoneId: 'CON',
    name: 'Constanța',
    countryCode: 'RO',
    latitude: 44.3622020, longitude: 28.4883000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LRCK']
  },
  {
    zoneId: 'CRA',
    name: 'Craiova',
    countryCode: 'RO',
    latitude: 44.3181000, longitude: 23.8885990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LRCV', 'LRCS']
  },
  {
    zoneId: 'TIM',
    name: 'Timişoara',
    countryCode: 'RO',
    latitude: 45.8098980, longitude: 21.3379000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LRTR', 'LRAR']
  },
  {
    zoneId: 'AGN',
    name: 'Agno',
    countryCode: 'CH',
    latitude: 46.0042990, longitude: 8.9105800,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LSZA']
  },
  {
    zoneId: 'SEY',
    name: 'Seyhan',
    countryCode: 'TR',
    latitude: 36.9822010, longitude: 35.2803990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LTAF', 'LTAJ', 'LTAU', 'LTDB', 'LTAG', 'LTCN', 'LTDA', 'LTAZ']
  },
  {
    zoneId: 'KON',
    name: 'Konya',
    countryCode: 'TR',
    latitude: 37.9790000, longitude: 32.5619010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LTAN', 'LTAH']
  },
  {
    zoneId: 'DAL',
    name: 'Dalaman',
    countryCode: 'TR',
    latitude: 36.7131000, longitude: 28.7925000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LTBS']
  },
  {
    zoneId: 'ESK',
    name: 'Eskişehir',
    countryCode: 'TR',
    latitude: 39.8116440, longitude: 30.5192680,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LTBY', 'LTBI', 'LTBO', 'LTBZ']
  },
  {
    zoneId: 'AN',
    name: 'Şanlıurfa',
    countryCode: 'TR',
    latitude: 37.4456630, longitude: 38.8955920,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LTCS', 'LTAT', 'LTCA', 'LTCC', 'LTCJ', 'LTCP', 'LTCR', 'LTCU']
  },
  {
    zoneId: 'ZON',
    name: 'Zonguldak',
    countryCode: 'TR',
    latitude: 41.5064010, longitude: 32.0886000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LTAS']
  },
  {
    zoneId: 'TOK',
    name: 'Tokat',
    countryCode: 'TR',
    latitude: 40.3247200, longitude: 36.3905600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LTAW', 'LTCB', 'LTCM', 'LTFH', 'LTAP', 'LTAR']
  },
  {
    zoneId: 'BAL1',
    name: 'Balıkesir',
    countryCode: 'TR',
    latitude: 39.6193010, longitude: 27.9260010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LTBF', 'LTBH', 'LTFK']
  },
  {
    zoneId: 'ERZ',
    name: 'Erzincan',
    countryCode: 'TR',
    latitude: 39.7102013, longitude: 39.5270004,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LTCD', 'LTCE', 'LTCG', 'LTCK', 'LTFO']
  },
  {
    zoneId: 'KAR1',
    name: 'Kars',
    countryCode: 'TR',
    latitude: 40.5621986, longitude: 43.1150017,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LTCF', 'LTCO', 'LTCT']
  },
  {
    zoneId: 'VAN1',
    name: 'Van',
    countryCode: 'TR',
    latitude: 38.4682007, longitude: 43.3322983,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LTCI', 'LTCL', 'LTCV', 'LTCW']
  },
  {
    zoneId: 'CHI5',
    name: 'Chişinău',
    countryCode: 'MD',
    latitude: 46.9277400, longitude: 28.9317040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LUKK', 'LUBL']
  },
  {
    zoneId: 'NI',
    name: 'Niš',
    countryCode: 'RS',
    latitude: 43.3365380, longitude: 21.8562420,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LYNI']
  },
  {
    zoneId: 'KO',
    name: 'Košice',
    countryCode: 'SK',
    latitude: 48.6631010, longitude: 21.2411000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['LZKZ', 'LZSL', 'LZTT', 'LZZI', 'LZLU', 'LZPW']
  },
  {
    zoneId: 'SIM',
    name: 'Simferopol',
    countryCode: 'UA',
    latitude: 45.0522000, longitude: 33.9751010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UKFF', 'UKFB', 'UKFK']
  },
  {
    zoneId: 'LVI',
    name: 'Lviv',
    countryCode: 'UA',
    latitude: 49.8125000, longitude: 23.9561000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UKLL', 'UKLU', 'UKLH', 'UKLI', 'UKLR', 'UKLC', 'UKLT']
  },
  {
    zoneId: 'MAR5',
    name: 'Mariupol',
    countryCode: 'UA',
    latitude: 47.0760994, longitude: 37.4496002,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UKCM', 'UKDB', 'UKDE', 'UKCK']
  },
  {
    zoneId: 'DNI',
    name: 'Dnipro',
    countryCode: 'UA',
    latitude: 48.3572010, longitude: 35.1006010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UKDD', 'UKDR', 'UKHH', 'UKHP', 'UKKG']
  },
  {
    zoneId: 'CHE4',
    name: 'Chernivtsi',
    countryCode: 'UA',
    latitude: 48.2593002, longitude: 25.9808006,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UKLN', 'UKWW']
  },
  {
    zoneId: 'BRE1',
    name: 'Brest',
    countryCode: 'BY',
    latitude: 52.1081380, longitude: 23.8967600,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UMBB', 'UMMG']
  },
  {
    zoneId: 'GOM1',
    name: 'Gomel',
    countryCode: 'BY',
    latitude: 52.5270004, longitude: 31.0167007,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UMGG']
  },
  {
    zoneId: 'VIT1',
    name: 'Vitebsk',
    countryCode: 'BY',
    latitude: 55.1264992, longitude: 30.3495998,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UMII']
  },

  // --- NORTH AMERICA - Canada (additional) ---
  {
    zoneId: 'SAG',
    name: 'Saguenay',
    countryCode: 'CA',
    latitude: 48.3301230, longitude: -70.9920120,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYBG', 'CYDO', 'CYFE', 'CYRI', 'CYRJ', 'CYTF', 'CYXK', 'CYYY']
  },
  {
    zoneId: 'DEE1',
    name: 'Deer Lake',
    countryCode: 'CA',
    latitude: 49.2081590, longitude: -57.3961470,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYDF', 'CYJT', 'CYQX', 'CTB6', 'CTU5', 'CYHR']
  },
  {
    zoneId: 'IQA',
    name: 'Iqaluit',
    countryCode: 'CA',
    latitude: 63.7564020, longitude: -68.5558010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYFB', 'CYLC']
  },
  {
    zoneId: 'FRE2',
    name: 'Fredericton',
    countryCode: 'CA',
    latitude: 45.8686970, longitude: -66.5298910,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYFC', 'CYQM', 'CYCH', 'CYID', 'CYSJ', 'CYSL', 'CYSU', 'CZBF']
  },
  {
    zoneId: 'KEL',
    name: 'Kelowna',
    countryCode: 'CA',
    latitude: 49.9561000, longitude: -119.3779980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYLW', 'CAZ5', 'CYCG', 'CYKA', 'CYRV', 'CYVK', 'CYYF', 'CZAM', 'CZGF', 'CAD4', 'CAD5', 'CAL3']
  },
  {
    zoneId: 'FOR4',
    name: 'Fort McMurray',
    countryCode: 'CA',
    latitude: 56.6533010, longitude: -111.2220000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYMM', 'CAL4', 'CER4', 'CET2', 'CFG6', 'CJS3', 'CRL4', 'CYLB', 'CYNR', 'CYVT']
  },
  {
    zoneId: 'WIN',
    name: 'Windsor',
    countryCode: 'CA',
    latitude: 42.2756000, longitude: -82.9555970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYQG', 'CYCE', 'CYQS', 'CYZR', 'CYCK']
  },
  {
    zoneId: 'REG',
    name: 'Regina',
    countryCode: 'CA',
    latitude: 50.4319380, longitude: -104.6609060,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYQR', 'CYEN', 'CYMJ', 'CYQV', 'CYYN']
  },
  {
    zoneId: 'THU',
    name: 'Thunder Bay',
    countryCode: 'CA',
    latitude: 48.3718990, longitude: -89.3238980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYQT', 'CYIB', 'CYYW', 'CZUC']
  },
  {
    zoneId: 'SAS',
    name: 'Saskatoon',
    countryCode: 'CA',
    latitude: 52.1707230, longitude: -106.7007930,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYXE', 'CYKY', 'CYPA', 'CYQW', 'CJY3']
  },
  {
    zoneId: 'PRI',
    name: 'Prince George',
    countryCode: 'CA',
    latitude: 53.8843110, longitude: -122.6665540,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYXS', 'CYCQ', 'CYPZ', 'CYQZ', 'CYWL', 'CBX7']
  },
  {
    zoneId: 'WHI',
    name: 'Whitehorse',
    countryCode: 'CA',
    latitude: 60.7085330, longitude: -135.0657050,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYXY', 'CYDM', 'CYHT', 'CYZW', 'CZFA']
  },
  {
    zoneId: 'CHA1',
    name: 'Charlottetown',
    countryCode: 'CA',
    latitude: 46.2889110, longitude: -63.1251740,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYYG', 'CYGR', 'CYPD']
  },
  {
    zoneId: 'ST1',
    name: 'St. John\'s',
    countryCode: 'CA',
    latitude: 47.6185990, longitude: -52.7519000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYYT']
  },
  {
    zoneId: 'YEL',
    name: 'Yellowknife',
    countryCode: 'CA',
    latitude: 62.4627990, longitude: -114.4400020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['CYZF', 'CYFR', 'CYHY', 'CEM3', 'CFA7', 'CSK6', 'CYLK', 'CYWE']
  },
  {
    zoneId: 'ANA1',
    name: 'Anahim Lake',
    countryCode: 'CA',
    latitude: 52.4515010, longitude: -125.3037760,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CAJ4', 'CBBC', 'CYBD', 'CAG3']
  },
  {
    zoneId: 'FOR5',
    name: 'Fort Frances',
    countryCode: 'CA',
    latitude: 48.6557490, longitude: -93.4434900,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYAG', 'CYHD', 'CYQK', 'CYXL']
  },
  {
    zoneId: 'LA',
    name: 'La Grande-4',
    countryCode: 'CA',
    latitude: 53.7546997, longitude: -73.6753006,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYAH', 'CTU2', 'CYAD']
  },
  {
    zoneId: 'SAU',
    name: 'Sault Ste Marie',
    countryCode: 'CA',
    latitude: 46.4832160, longitude: -84.5084670,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYAM', 'CYEL', 'CYEM', 'CYLD', 'CYXZ', 'CYZE', 'CPF2']
  },
  {
    zoneId: 'KAS',
    name: 'Kasabonika',
    countryCode: 'CA',
    latitude: 53.5247002, longitude: -88.6427994,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYAQ', 'CJV7', 'CKB6', 'CKL3', 'CKM8', 'CNE3', 'CNM5', 'CYLH', 'CYTL', 'CYWP', 'CZMD', 'CZRJ']
  },
  {
    zoneId: 'ST2',
    name: 'St. Anthony',
    countryCode: 'CA',
    latitude: 51.3919090, longitude: -56.0832100,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYAY', 'CYBX', 'CYIF', 'CCA6', 'CCH4', 'CCK4', 'CCP4', 'CYMH']
  },
  {
    zoneId: 'TOF',
    name: 'Tofino',
    countryCode: 'CA',
    latitude: 49.0798330, longitude: -125.7755830,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYAZ', 'CYBL', 'CYZT', 'CAT5', 'CYAL']
  },
  {
    zoneId: 'BAI1',
    name: 'Baie-Comeau',
    countryCode: 'CA',
    latitude: 49.1325000, longitude: -68.2043990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYBC', 'CYCL', 'CYME', 'CYZV']
  },
  {
    zoneId: 'BON',
    name: 'Bonnyville',
    countryCode: 'CA',
    latitude: 54.3041990, longitude: -110.7440030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYBF', 'CYLJ', 'CYLL', 'CYOD', 'CYVG']
  },
  {
    zoneId: 'BAK1',
    name: 'Baker Lake',
    countryCode: 'CA',
    latitude: 64.2988968, longitude: -96.0777969,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYBK']
  },
  {
    zoneId: 'BRA',
    name: 'Brandon',
    countryCode: 'CA',
    latitude: 49.9100000, longitude: -99.9518970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYBR', 'CYDN']
  },
  {
    zoneId: 'CAM',
    name: 'Cambridge Bay',
    countryCode: 'CA',
    latitude: 69.1081009, longitude: -105.1380005,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYCB', 'CDL7']
  },
  {
    zoneId: 'COC',
    name: 'Cochrane',
    countryCode: 'CA',
    latitude: 49.1055984, longitude: -81.0136032,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYCN', 'CYEY', 'CYHF', 'CYKX', 'CYTS', 'CYUY', 'CYXR', 'CYYU', 'CSR8']
  },
  {
    zoneId: 'DAW',
    name: 'Dawson City',
    countryCode: 'CA',
    latitude: 64.0430984, longitude: -139.1280060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYDA', 'CYMA', 'CYXQ']
  },
  {
    zoneId: 'BUR1',
    name: 'Burwash Landing',
    countryCode: 'CA',
    latitude: 61.3711010, longitude: -139.0410000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYDB']
  },
  {
    zoneId: 'DAW1',
    name: 'Dawson Creek',
    countryCode: 'CA',
    latitude: 55.7412450, longitude: -120.1832630,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYDQ', 'CYPE', 'CYQU', 'CYXJ', 'CEB5', 'CFM4', 'CYNH']
  },
  {
    zoneId: 'EDS',
    name: 'Edson',
    countryCode: 'CA',
    latitude: 53.5788994, longitude: -116.4649963,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYET', 'CYZH', 'CYZU', 'CEC4', 'CYJA', 'CZHP']
  },
  {
    zoneId: 'INU',
    name: 'Inuvik',
    countryCode: 'CA',
    latitude: 68.3041992, longitude: -133.4830017,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYEV', 'CYKD', 'CYUB', 'CZFM']
  },
  {
    zoneId: 'FOR6',
    name: 'Fort Simpson',
    countryCode: 'CA',
    latitude: 61.7602005, longitude: -121.2369995,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYFS', 'CYJF', 'CYWY']
  },
  {
    zoneId: 'LA1',
    name: 'La Grande Rivière',
    countryCode: 'CA',
    latitude: 53.6253014, longitude: -77.7042007,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYGL', 'CYGW', 'CSU2', 'CYNC', 'CZEM']
  },
  {
    zoneId: 'GAS',
    name: 'Gaspé',
    countryCode: 'CA',
    latitude: 48.7749150, longitude: -64.4818930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYGP', 'CYGV', 'CYPN', 'CYVB']
  },
  {
    zoneId: 'GER',
    name: 'Geraldton',
    countryCode: 'CA',
    latitude: 49.7783012, longitude: -86.9393997,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYGQ', 'CYHN', 'CYMG', 'CYQN', 'CYSP', 'CYFH', 'CYKP']
  },
  {
    zoneId: 'ISL',
    name: 'Island Lake',
    countryCode: 'CA',
    latitude: 53.8572006, longitude: -94.6536026,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYIV', 'CZSJ', 'CJT3', 'CKQ3', 'CPV8', 'CYCR', 'CYGO', 'CYHP', 'CYNE', 'CYOH', 'CYRS', 'CYST', 'CYVZ', 'CZGI', 'CZGR', 'CZNG', 'CZPB']
  },
  {
    zoneId: 'KEY1',
    name: 'Key Lake',
    countryCode: 'CA',
    latitude: 57.2560997, longitude: -105.6179962,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYKJ', 'CYNL', 'CYSF', 'CJL2', 'CYKC', 'CZPO', 'CZWL']
  },
  {
    zoneId: 'SCH',
    name: 'Schefferville',
    countryCode: 'CA',
    latitude: 54.8053017, longitude: -66.8052979,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYKL', 'CYWK']
  },
  {
    zoneId: 'KIN2',
    name: 'Kincardine',
    countryCode: 'CA',
    latitude: 44.2014010, longitude: -81.6066970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYKM', 'CYVV', 'CNK4']
  },
  {
    zoneId: 'LEA',
    name: 'Leaf Rapids',
    countryCode: 'CA',
    latitude: 56.5133018, longitude: -99.9852982,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYLR', 'CYTH', 'CYYL', 'CZEE', 'CZLQ', 'CZMN', 'CJC8', 'CYBT', 'CZFG', 'CZSN']
  },
  {
    zoneId: 'ALE1',
    name: 'Alert',
    countryCode: 'CA',
    latitude: 82.5172630, longitude: -62.2830370,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYLT']
  },
  {
    zoneId: 'MOO',
    name: 'Moosonee',
    countryCode: 'CA',
    latitude: 51.2910995, longitude: -80.6078033,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYMO', 'CYAT', 'CYFA', 'CYKQ', 'CZKE']
  },
  {
    zoneId: 'CHI1',
    name: 'Chibougamau',
    countryCode: 'CA',
    latitude: 49.7719002, longitude: -74.5280991,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYMT', 'CSH4']
  },
  {
    zoneId: 'NAT',
    name: 'Natashquan',
    countryCode: 'CA',
    latitude: 50.1901140, longitude: -61.7889800,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYNA', 'CTK6', 'CTT5']
  },
  {
    zoneId: 'MAT',
    name: 'Matagami',
    countryCode: 'CA',
    latitude: 49.7616997, longitude: -77.8028030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYNM', 'CYVO']
  },
  {
    zoneId: 'EKA',
    name: 'Ekati',
    countryCode: 'CA',
    latitude: 64.6988983, longitude: -110.6149979,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYOA', 'CDK2', 'CGK2']
  },
  {
    zoneId: 'HIG',
    name: 'High Level',
    countryCode: 'CA',
    latitude: 58.6213989, longitude: -117.1650009,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYOJ', 'CYOP']
  },
  {
    zoneId: 'PIC',
    name: 'Pickle Lake',
    countryCode: 'CA',
    latitude: 51.4463997, longitude: -90.2142029,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYPL', 'CYAC']
  },
  {
    zoneId: 'PRI1',
    name: 'Prince Rupert',
    countryCode: 'CA',
    latitude: 54.2860985, longitude: -130.4450073,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYPR', 'CYXT', 'CYYD', 'CYZP', 'CZMT', 'CZST']
  },
  {
    zoneId: 'PUV',
    name: 'Puvirnituq',
    countryCode: 'CA',
    latitude: 60.0505980, longitude: -77.2869030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYPX', 'CYKO', 'CYPH']
  },
  {
    zoneId: 'FOR7',
    name: 'Fort Chipewyan',
    countryCode: 'CA',
    latitude: 58.7672005, longitude: -111.1169968,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYPY', 'CYSM', 'CYBE']
  },
  {
    zoneId: 'THE',
    name: 'The Pas',
    countryCode: 'CA',
    latitude: 53.9714012, longitude: -101.0910034,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYQD', 'CZJG', 'CZJN', 'CYFO', 'CYHB']
  },
  {
    zoneId: 'WAT',
    name: 'Watson Lake',
    countryCode: 'CA',
    latitude: 60.1168390, longitude: -128.8219930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYQH', 'CBX5', 'CYDL']
  },
  {
    zoneId: 'YAR',
    name: 'Yarmouth',
    countryCode: 'CA',
    latitude: 43.8269005, longitude: -66.0880966,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYQI']
  },
  {
    zoneId: 'LET',
    name: 'Lethbridge',
    countryCode: 'CA',
    latitude: 49.6302986, longitude: -112.8000031,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYQL', 'CYXC', 'CYXH', 'CZPC', 'CYYM']
  },
  {
    zoneId: 'SYD1',
    name: 'Sydney',
    countryCode: 'CA',
    latitude: 46.1614000, longitude: -60.0477980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYQY']
  },
  {
    zoneId: 'RES',
    name: 'Resolute Bay',
    countryCode: 'CA',
    latitude: 74.7169037, longitude: -94.9693985,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYRB']
  },
  {
    zoneId: 'RED',
    name: 'Red Lake',
    countryCode: 'CA',
    latitude: 51.0668983, longitude: -93.7930984,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYRL', 'CYPM', 'CZTA']
  },
  {
    zoneId: 'RAN',
    name: 'Rankin Inlet',
    countryCode: 'CA',
    latitude: 62.8114014, longitude: -92.1157990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYRT', 'CYCS', 'CYEK', 'CYXN']
  },
  {
    zoneId: 'SUD',
    name: 'Sudbury',
    countryCode: 'CA',
    latitude: 46.6250000, longitude: -80.7988968,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYSB', 'CYYB']
  },
  {
    zoneId: 'SHE2',
    name: 'Sherbrooke',
    countryCode: 'CA',
    latitude: 45.4385990, longitude: -71.6913990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYSC']
  },
  {
    zoneId: 'TRE',
    name: 'Trenton',
    countryCode: 'CA',
    latitude: 44.1189003, longitude: -77.5280991,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYTR']
  },
  {
    zoneId: 'SAN1',
    name: 'Sanirajak',
    countryCode: 'CA',
    latitude: 68.7761000, longitude: -81.2425000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYUX', 'CYGT']
  },
  {
    zoneId: 'LA2',
    name: 'La Ronge',
    countryCode: 'CA',
    latitude: 55.1514015, longitude: -105.2620010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYVC']
  },
  {
    zoneId: 'KUU',
    name: 'Kuujjuaq',
    countryCode: 'CA',
    latitude: 58.0960999, longitude: -68.4269028,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYVP', 'CYLA', 'CYLU', 'CYTQ']
  },
  {
    zoneId: 'NOR1',
    name: 'Norman Wells',
    countryCode: 'CA',
    latitude: 65.2816010, longitude: -126.7979965,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYVQ', 'CYGH', 'CYVL', 'CYWJ', 'CZFN']
  },
  {
    zoneId: 'FOR8',
    name: 'Fort Nelson',
    countryCode: 'CA',
    latitude: 58.8363991, longitude: -122.5970001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYYE']
  },
  {
    zoneId: 'CHU',
    name: 'Churchill',
    countryCode: 'CA',
    latitude: 58.7392006, longitude: -94.0650024,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYYQ']
  },
  {
    zoneId: 'GOO1',
    name: 'Goose Bay',
    countryCode: 'CA',
    latitude: 53.3191986, longitude: -60.4258003,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYYR', 'CCD4', 'CCZ2', 'CYFT']
  },
  {
    zoneId: 'COR4',
    name: 'Coral Harbour',
    countryCode: 'CA',
    latitude: 64.1932983, longitude: -83.3593979,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['CYZS']
  },
  {
    zoneId: 'KAS1',
    name: 'Kasba Lake',
    countryCode: 'CA',
    latitude: 60.2919006, longitude: -102.5019989,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['CJL8', 'CKV4', 'CZWH']
  },
  {
    zoneId: 'NAT1',
    name: 'Natuashish',
    countryCode: 'CA',
    latitude: 55.9138980, longitude: -61.1843990,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['CNH2', 'CYDP', 'CYHO']
  },
  {
    zoneId: 'KAT',
    name: 'Kattiniq',
    countryCode: 'CA',
    latitude: 61.6622010, longitude: -73.3214040,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['CTP9', 'CYHA', 'CYKG', 'CYZG']
  },
  {
    zoneId: 'GIL',
    name: 'Gillam',
    countryCode: 'CA',
    latitude: 56.3571200, longitude: -94.7115040,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['CYGX', 'CZAC', 'CZBD', 'CZTM']
  },

  // --- AFRICA - North ---
  {
    zoneId: 'BJ',
    name: 'Béjaïa',
    countryCode: 'DZ',
    latitude: 36.7125470, longitude: 5.0699090,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DAAE', 'DAAV', 'DABC', 'DABT', 'DAUB', 'DAAD', 'DAAS']
  },
  {
    zoneId: 'DJA',
    name: 'Djanet',
    countryCode: 'DZ',
    latitude: 24.2854480, longitude: 9.4636520,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DAAJ']
  },
  {
    zoneId: 'ANN',
    name: 'Annaba',
    countryCode: 'DZ',
    latitude: 36.8267810, longitude: 7.8133400,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DABB', 'DABS']
  },
  {
    zoneId: 'CHL',
    name: 'Chlef',
    countryCode: 'DZ',
    latitude: 36.2166140, longitude: 1.3411140,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DAOI', 'DAOO', 'DAOB', 'DAOL', 'DAOV', 'DA14', 'DAOS']
  },
  {
    zoneId: 'ZEN',
    name: 'Zenata',
    countryCode: 'DZ',
    latitude: 35.0127320, longitude: -1.4571170,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DAON', 'DAAY']
  },
  {
    zoneId: 'ILL',
    name: 'Illizi',
    countryCode: 'DZ',
    latitude: 26.7234990, longitude: 8.6226500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAAP', 'DAUZ']
  },
  {
    zoneId: 'TAM',
    name: 'Tamanrasset',
    countryCode: 'DZ',
    latitude: 22.8115010, longitude: 5.4510800,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAAT']
  },
  {
    zoneId: 'HAS',
    name: 'Hassi R\'Mel',
    countryCode: 'DZ',
    latitude: 32.9304010, longitude: 3.3115400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAFH', 'DAUG', 'DAUL']
  },
  {
    zoneId: 'TIN',
    name: 'Tindouf',
    countryCode: 'DZ',
    latitude: 27.7003994, longitude: -8.1671000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAOF']
  },
  {
    zoneId: 'BC',
    name: 'Béchar',
    countryCode: 'DZ',
    latitude: 31.6457005, longitude: -2.2698600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAOR']
  },
  {
    zoneId: 'ADR',
    name: 'Adrar',
    countryCode: 'DZ',
    latitude: 27.8376010, longitude: -0.1864140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAUA', 'DAUT']
  },
  {
    zoneId: 'EL',
    name: 'El Menia',
    countryCode: 'DZ',
    latitude: 30.5807320, longitude: 2.8615950,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAUE']
  },
  {
    zoneId: 'HAS1',
    name: 'Hassi Messaoud',
    countryCode: 'DZ',
    latitude: 31.6730000, longitude: 6.1404400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAUH', 'DAUK', 'DAUO', 'DAUU']
  },
  {
    zoneId: 'IN',
    name: 'In Salah',
    countryCode: 'DZ',
    latitude: 27.2509990, longitude: 2.5120200,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DAUI']
  },
  {
    zoneId: 'MEL1',
    name: 'Mellita',
    countryCode: 'TN',
    latitude: 33.8737190, longitude: 10.7773000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DTTJ', 'DTTX', 'DTTF', 'DTTG']
  },
  {
    zoneId: 'EL1',
    name: 'El Borma',
    countryCode: 'TN',
    latitude: 31.7043000, longitude: 9.2546200,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DTTR']
  },
  {
    zoneId: 'TOZ',
    name: 'Tozeur',
    countryCode: 'TN',
    latitude: 33.9397011, longitude: 8.1105604,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DTTZ']
  },
  {
    zoneId: 'AGA',
    name: 'Agadir (Temsia)',
    countryCode: 'MA',
    latitude: 30.3224780, longitude: -9.4120030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GMAD', 'GMMX', 'GMMI']
  },
  {
    zoneId: 'ZAG1',
    name: 'Zagora',
    countryCode: 'MA',
    latitude: 30.2657880, longitude: -5.8608080,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GMAZ', 'GMMZ']
  },
  {
    zoneId: 'SA1',
    name: 'Saïss',
    countryCode: 'MA',
    latitude: 33.9272990, longitude: -4.9779600,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GMFF', 'GMMD', 'GMMW', 'GMTN', 'GMTT', 'GMFM', 'GMTA']
  },
  {
    zoneId: 'AHL',
    name: 'Ahl Angad',
    countryCode: 'MA',
    latitude: 34.7895580, longitude: -1.9260410,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GMFO']
  },
  {
    zoneId: 'TAN',
    name: 'Tan Tan',
    countryCode: 'MA',
    latitude: 28.4482002, longitude: -11.1612997,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GMAT']
  },
  {
    zoneId: 'BOU',
    name: 'Bouarfa',
    countryCode: 'MA',
    latitude: 32.5143060, longitude: -1.9830560,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GMFB']
  },
  {
    zoneId: 'ERR',
    name: 'Errachidia',
    countryCode: 'MA',
    latitude: 31.9475002, longitude: -4.3983302,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GMFK']
  },
  {
    zoneId: 'EL3',
    name: 'El Hassana',
    countryCode: 'EG',
    latitude: 30.4107140, longitude: 33.1553500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HE36', 'HEAR', 'HEPS', 'HESC', 'HETB', 'HEGR']
  },
  {
    zoneId: 'EL4',
    name: 'El Alamein',
    countryCode: 'EG',
    latitude: 30.9243240, longitude: 28.4616100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HEAL', 'HEBA', 'HEMM']
  },
  {
    zoneId: 'ASY',
    name: 'Asyut',
    countryCode: 'EG',
    latitude: 27.0459620, longitude: 31.0127600,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HEAT', 'HESG', 'HE25', 'HEKG']
  },
  {
    zoneId: 'ABU',
    name: 'Abu Simbel',
    countryCode: 'EG',
    latitude: 22.3744020, longitude: 31.6098810,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HEBL', 'HESN']
  },
  {
    zoneId: 'HUR',
    name: 'Hurghada',
    countryCode: 'EG',
    latitude: 27.1767760, longitude: 33.7966920,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HEGN', 'HELX', 'HEMA', 'HESH', 'HETR']
  },
  {
    zoneId: 'SIR',
    name: 'Sirt',
    countryCode: 'LY',
    latitude: 31.0585780, longitude: 16.5970950,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HLGD', 'HLMS']
  },
  {
    zoneId: 'BEN1',
    name: 'Benina',
    countryCode: 'LY',
    latitude: 32.0968020, longitude: 20.2695010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HLLB', 'HLLQ', 'HLMB']
  },
  {
    zoneId: 'TRI',
    name: 'Tripoli',
    countryCode: 'LY',
    latitude: 32.8917700, longitude: 13.2878780,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HLLM', 'HLZN', 'HLZW']
  },
  {
    zoneId: 'GHA',
    name: 'Ghat',
    countryCode: 'LY',
    latitude: 25.1455994, longitude: 10.1426001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HLGT']
  },
  {
    zoneId: 'KUF',
    name: 'Kufra',
    countryCode: 'LY',
    latitude: 24.1786995, longitude: 23.3139992,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HLKF']
  },
  {
    zoneId: 'SAB',
    name: 'Sabha',
    countryCode: 'LY',
    latitude: 26.9924520, longitude: 14.4661620,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HLLS', 'HLUB']
  },
  {
    zoneId: 'GHA1',
    name: 'Ghadames',
    countryCode: 'LY',
    latitude: 30.1516990, longitude: 9.7153100,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HLTD']
  },
  {
    zoneId: 'POR4',
    name: 'Port Sudan',
    countryCode: 'SD',
    latitude: 19.4345580, longitude: 37.2341250,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HSPN']
  },
  {
    zoneId: 'DON1',
    name: 'Dongola',
    countryCode: 'SD',
    latitude: 19.1539001, longitude: 30.4300995,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HSDN', 'HSMN', 'HSDB']
  },
  {
    zoneId: 'EL5',
    name: 'El Fasher',
    countryCode: 'SD',
    latitude: 13.6148996, longitude: 25.3246002,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HSFS', 'HSNN', 'HSZA']
  },
  {
    zoneId: 'KAS3',
    name: 'Kassala',
    countryCode: 'SD',
    latitude: 15.3874998, longitude: 36.3288002,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HSKA', 'HSKG', 'HSNW']
  },
  {
    zoneId: 'EL6',
    name: 'El-Obeid',
    countryCode: 'SD',
    latitude: 13.1532000, longitude: 30.2327000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HSOB', 'HSNH']
  },

  // --- AFRICA - West & Central ---
  {
    zoneId: 'TAM1',
    name: 'Tamale',
    countryCode: 'GH',
    latitude: 9.5539090, longitude: -0.8660600,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DGLE', 'DGLW']
  },
  {
    zoneId: 'KUM',
    name: 'Kumasi',
    countryCode: 'GH',
    latitude: 6.7145600, longitude: -1.5908200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DGSI', 'DGSN', 'DGTK']
  },
  {
    zoneId: 'YAM',
    name: 'Yamoussoukro',
    countryCode: 'CI',
    latitude: 6.9031700, longitude: -5.3655800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DIYO', 'DIBK', 'DIDL', 'DIAU', 'DIDK', 'DIGA', 'DISG']
  },
  {
    zoneId: 'KOR',
    name: 'Korhogo',
    countryCode: 'CI',
    latitude: 9.3871800, longitude: -5.5566600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DIKO', 'DIBI', 'DIOD', 'DIOF']
  },
  {
    zoneId: 'UNK',
    name: 'Unknown',
    countryCode: 'CI',
    latitude: 7.2720700, longitude: -7.5873600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DIMN', 'DIGL', 'DITM']
  },
  {
    zoneId: 'UNK1',
    name: 'Unknown',
    countryCode: 'CI',
    latitude: 4.7467200, longitude: -6.6608200,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DISP', 'DIGN', 'DISS', 'DITB']
  },
  {
    zoneId: 'BAU1',
    name: 'Bauchi',
    countryCode: 'NG',
    latitude: 10.4828330, longitude: 9.7440000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DNBC', 'DNKN', 'DNGO', 'DNJO']
  },
  {
    zoneId: 'ILO',
    name: 'Ilorin/Ogbomosho',
    countryCode: 'NG',
    latitude: 8.4402100, longitude: 4.4939200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DNIL', 'DNAK']
  },
  {
    zoneId: 'KAD',
    name: 'Kaduna',
    countryCode: 'NG',
    latitude: 10.6960000, longitude: 7.3201100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DNKA', 'DNZA']
  },
  {
    zoneId: 'MAI',
    name: 'Maiduguri',
    countryCode: 'NG',
    latitude: 11.8541630, longitude: 13.0807020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DNMA']
  },
  {
    zoneId: 'POR2',
    name: 'Port Harcourt',
    countryCode: 'NG',
    latitude: 5.0154900, longitude: 6.9495900,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DNPO', 'DNAI', 'DNAS', 'DNBE', 'DNCA', 'DNEN', 'DNIM', 'DNSU']
  },
  {
    zoneId: 'SOK',
    name: 'Sokoto',
    countryCode: 'NG',
    latitude: 12.9157290, longitude: 5.2075470,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DNSO']
  },
  {
    zoneId: 'KAT1',
    name: 'Katsina',
    countryCode: 'NG',
    latitude: 13.0078000, longitude: 7.6604500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DN57']
  },
  {
    zoneId: 'MAK',
    name: 'Makurdi',
    countryCode: 'NG',
    latitude: 7.7038800, longitude: 8.6139400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DNMK']
  },
  {
    zoneId: 'YOL',
    name: 'Yola',
    countryCode: 'NG',
    latitude: 9.2575502, longitude: 12.4303999,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DNYO']
  },
  {
    zoneId: 'DOU',
    name: 'Douala',
    countryCode: 'CM',
    latitude: 4.0060800, longitude: 9.7194800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FKKD', 'FKYS', 'FKKC', 'FKKM', 'FKKU', 'FKKY', 'FKKB', 'FKKF', 'FKKG', 'FKKS', 'FKKW']
  },
  {
    zoneId: 'MAR2',
    name: 'Maroua',
    countryCode: 'CM',
    latitude: 10.4513998, longitude: 14.2573996,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FKKL', 'FKKR', 'FKKH', 'FKKJ']
  },
  {
    zoneId: 'NG',
    name: 'N\'Gaoundéré',
    countryCode: 'CM',
    latitude: 7.3570099, longitude: 13.5592003,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FKKN']
  },
  {
    zoneId: 'BAM',
    name: 'Bamenda',
    countryCode: 'CM',
    latitude: 6.0392400, longitude: 10.1226000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FKKV']
  },
  {
    zoneId: 'MBA',
    name: 'Mbanza Congo',
    countryCode: 'AO',
    latitude: -6.2698998, longitude: 14.2469997,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNBC', 'FNNG', 'FNSO', 'FNUG', 'FNZE']
  },
  {
    zoneId: 'BEN',
    name: 'Benguela',
    countryCode: 'AO',
    latitude: -12.6090000, longitude: 13.4037000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNBG', 'FNCT', 'FNPA', 'FNSU', 'FNLB']
  },
  {
    zoneId: 'CAB',
    name: 'Cabinda',
    countryCode: 'AO',
    latitude: -5.5983900, longitude: 12.1881450,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNCA']
  },
  {
    zoneId: 'CHI2',
    name: 'Chitato',
    countryCode: 'AO',
    latitude: -7.4008899, longitude: 20.8185005,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNDU', 'FNCH', 'FNLK', 'FNZG']
  },
  {
    zoneId: 'NGI',
    name: 'Ngiva',
    countryCode: 'AO',
    latitude: -17.0435009, longitude: 15.6837997,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNGI', 'FNXA']
  },
  {
    zoneId: 'HUA',
    name: 'Huambo',
    countryCode: 'AO',
    latitude: -12.8089000, longitude: 15.7605000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNHU', 'FNKU', 'FNWK']
  },
  {
    zoneId: 'MAL2',
    name: 'Malanje',
    countryCode: 'AO',
    latitude: -9.5250902, longitude: 16.3124008,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNMA', 'FNCF', 'FNCP', 'FNLZ']
  },
  {
    zoneId: 'MEN',
    name: 'Menongue',
    countryCode: 'AO',
    latitude: -14.6576004, longitude: 17.7198009,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNME', 'FNCV']
  },
  {
    zoneId: 'MO',
    name: 'Moçâmedes',
    countryCode: 'AO',
    latitude: -15.2612000, longitude: 12.1468000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNMO', 'FNUB']
  },
  {
    zoneId: 'SAU1',
    name: 'Saurimo',
    countryCode: 'AO',
    latitude: -9.6890700, longitude: 20.4319000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNSA', 'FNCX']
  },
  {
    zoneId: 'LUE',
    name: 'Luena',
    countryCode: 'AO',
    latitude: -11.7681000, longitude: 19.8976990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FNUE']
  },
  {
    zoneId: 'KIN3',
    name: 'Kinshasa',
    countryCode: 'CD',
    latitude: -4.3857500, longitude: 15.4446000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FZAA', 'FZAB', 'FZAL', 'FZAR']
  },
  {
    zoneId: 'KIS',
    name: 'Kisangani',
    countryCode: 'CD',
    latitude: 0.4816390, longitude: 25.3379990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FZIC', 'FZIR']
  },
  {
    zoneId: 'GOM',
    name: 'Goma',
    countryCode: 'CD',
    latitude: -1.6667580, longitude: 29.2380370,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FZNA', 'FZMA', 'FZMB']
  },
  {
    zoneId: 'LUB1',
    name: 'Lubumbashi',
    countryCode: 'CD',
    latitude: -11.5914940, longitude: 27.5307530,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FZQA', 'FZQG']
  },
  {
    zoneId: 'BAN1',
    name: 'Bandundu',
    countryCode: 'CD',
    latitude: -3.3113200, longitude: 17.3817010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZBO', 'FZBA', 'FZBI', 'FZCV']
  },
  {
    zoneId: 'KIK',
    name: 'Kikwit',
    countryCode: 'CD',
    latitude: -5.0357700, longitude: 18.7856010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZCA', 'FZCB', 'FZVR', 'FZVS']
  },
  {
    zoneId: 'MBA1',
    name: 'Mbandaka',
    countryCode: 'CD',
    latitude: 0.0226000, longitude: 18.2887001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZEA', 'FZBT', 'FZEN']
  },
  {
    zoneId: 'GBA',
    name: 'Gbadolite',
    countryCode: 'CD',
    latitude: 4.2527450, longitude: 20.9752710,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZFD', 'FZFK', 'FZFP']
  },
  {
    zoneId: 'LIS1',
    name: 'Lisala',
    countryCode: 'CD',
    latitude: 2.1706600, longitude: 21.4969010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZGA', 'FZFU']
  },
  {
    zoneId: 'ISI',
    name: 'Isiro',
    countryCode: 'CD',
    latitude: 2.8276100, longitude: 27.5883010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZJH']
  },
  {
    zoneId: 'BUN',
    name: 'Bunia',
    countryCode: 'CD',
    latitude: 1.5657430, longitude: 30.2206850,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZKA', 'FZNP']
  },
  {
    zoneId: 'BUT',
    name: 'Buta',
    countryCode: 'CD',
    latitude: 2.8180580, longitude: 24.7939970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZKJ']
  },
  {
    zoneId: 'KIN4',
    name: 'Kindu',
    countryCode: 'CD',
    latitude: -2.9191799, longitude: 25.9153996,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZOA', 'FZOD', 'FZOP']
  },
  {
    zoneId: 'KOL',
    name: 'Kolwezi',
    countryCode: 'CD',
    latitude: -10.7659000, longitude: 25.5056990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZQM']
  },
  {
    zoneId: 'KAL1',
    name: 'Kalemie',
    countryCode: 'CD',
    latitude: -5.8755600, longitude: 29.2500000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZRF', 'FZRB']
  },
  {
    zoneId: 'KAN',
    name: 'Kananga',
    countryCode: 'CD',
    latitude: -5.9000500, longitude: 22.4692000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FZUA', 'FZWA', 'FZUG', 'FZUK', 'FZVI', 'FZVM']
  },
  {
    zoneId: 'MUA',
    name: 'Muanda',
    countryCode: 'CD',
    latitude: -5.9306370, longitude: 12.3513340,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['FZAG', 'FZAJ', 'FZAM']
  },
  {
    zoneId: 'ZIG',
    name: 'Ziguinchor',
    countryCode: 'SN',
    latitude: 12.5555900, longitude: -16.2832980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GOGG', 'GOGS', 'GOOK', 'GODK']
  },
  {
    zoneId: 'OUR',
    name: 'Ouro Sogui',
    countryCode: 'SN',
    latitude: 15.5936000, longitude: -13.3228000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GOSM', 'GOTB', 'GOTT', 'GOSP']
  },
  {
    zoneId: 'SAI',
    name: 'Saint Louis',
    countryCode: 'SN',
    latitude: 16.0498140, longitude: -16.4610390,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GOSS', 'GOSR']
  },
  {
    zoneId: 'KD',
    name: 'Kédougou',
    countryCode: 'SN',
    latitude: 12.5723000, longitude: -12.2202997,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GOTK', 'GOTS']
  },

  // --- AFRICA - Southern ---
  {
    zoneId: 'BLO',
    name: 'Bloemfontein',
    countryCode: 'ZA',
    latitude: -29.0926990, longitude: 26.3024010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FABL', 'FAFB', 'FAKM', 'FABU', 'FATN', 'FAWM']
  },
  {
    zoneId: 'EAS',
    name: 'East London',
    countryCode: 'ZA',
    latitude: -33.0355990, longitude: 27.8258990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FAEL', 'FABE', 'FAQT', 'FAUT', 'FAPA']
  },
  {
    zoneId: 'GEO',
    name: 'George',
    countryCode: 'ZA',
    latitude: -34.0056000, longitude: 22.3789020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FAGG', 'FAOH', 'FAPG', 'FAMO', 'FAOB']
  },
  {
    zoneId: 'GQE',
    name: 'Gqeberha (Port Elizabeth)',
    countryCode: 'ZA',
    latitude: -33.9897150, longitude: 25.6173530,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FAPE', 'FACD']
  },
  {
    zoneId: 'POL',
    name: 'Polokwane',
    countryCode: 'ZA',
    latitude: -23.8452690, longitude: 29.4586150,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FAPP', 'FAHT', 'FAPH', 'FATZ', 'FAAL', 'FAER', 'FAGI', 'FALO', 'FAMH', 'FANG', 'FATH', 'FAUS']
  },
  {
    zoneId: 'UPI',
    name: 'Upington',
    countryCode: 'ZA',
    latitude: -28.4005170, longitude: 21.2633570,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FAUP', 'FALC', 'FASS', 'FAPK']
  },
  {
    zoneId: 'ALE2',
    name: 'Alexander Bay',
    countryCode: 'ZA',
    latitude: -28.5750010, longitude: 16.5333000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAAB', 'FAKZ', 'FASB']
  },
  {
    zoneId: 'AGG',
    name: 'Aggeneys',
    countryCode: 'ZA',
    latitude: -29.2817990, longitude: 18.8139000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAAG']
  },
  {
    zoneId: 'HAR',
    name: 'Harrismith',
    countryCode: 'ZA',
    latitude: -28.2351000, longitude: 29.1061990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAHR', 'FALY', 'FANC', 'FAVY']
  },
  {
    zoneId: 'KLE',
    name: 'Klerksdorp',
    countryCode: 'ZA',
    latitude: -26.8710990, longitude: 26.7180000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAKD', 'FAMM', 'FAVB']
  },
  {
    zoneId: 'KUR1',
    name: 'Kuruman',
    countryCode: 'ZA',
    latitude: -27.4566994, longitude: 23.4113998,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAKU', 'FARI']
  },
  {
    zoneId: 'MAL1',
    name: 'Malamala',
    countryCode: 'ZA',
    latitude: -24.8168660, longitude: 31.5440850,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAMD', 'FASZ', 'FACC', 'FAKP', 'FALD', 'FAMN', 'FANS', 'FASE']
  },
  {
    zoneId: 'MAR1',
    name: 'Margate',
    countryCode: 'ZA',
    latitude: -30.8574009, longitude: 30.3430004,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAMG', 'FAPJ']
  },
  {
    zoneId: 'MKU',
    name: 'Mkuze',
    countryCode: 'ZA',
    latitude: -27.6261005, longitude: 32.0443001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAMU', 'FADK', 'FADQ', 'FAHL']
  },
  {
    zoneId: 'VRE',
    name: 'Vredendal',
    countryCode: 'ZA',
    latitude: -31.6410007, longitude: 18.5447998,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FAVR']
  },
  {
    zoneId: 'FRA1',
    name: 'Francistown',
    countryCode: 'BW',
    latitude: -21.1591830, longitude: 27.4688260,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FBFT', 'FBSN', 'FBSP', 'FBTL']
  },
  {
    zoneId: 'KAS2',
    name: 'Kasane',
    countryCode: 'BW',
    latitude: -17.8316530, longitude: 25.1661950,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FBKE', 'FBKR', 'FBSV']
  },
  {
    zoneId: 'MAU',
    name: 'Maun',
    countryCode: 'BW',
    latitude: -19.9704910, longitude: 23.4314090,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FBMN']
  },
  {
    zoneId: 'GAB',
    name: 'Gaborone',
    countryCode: 'BW',
    latitude: -24.5552010, longitude: 25.9182000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FBSK', 'FBJW', 'FBLO']
  },
  {
    zoneId: 'POR3',
    name: 'Port Mathurin',
    countryCode: 'MU',
    latitude: -19.7577000, longitude: 63.3610000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FIMR']
  },
  {
    zoneId: 'TOA',
    name: 'Toamasina',
    countryCode: 'MG',
    latitude: -18.1135370, longitude: 49.3922620,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FMMT', 'FMMS', 'FMNC', 'FMMH', 'FMMQ', 'FMMY', 'FMMZ']
  },
  {
    zoneId: 'MAH',
    name: 'Mahajanga',
    countryCode: 'MG',
    latitude: -15.6668420, longitude: 46.3512330,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FMNM', 'FMNL', 'FMNW', 'FMNG', 'FMNO', 'FMNP', 'FMNT']
  },
  {
    zoneId: 'MIA1',
    name: 'Miandrivazo',
    countryCode: 'MG',
    latitude: -19.5627990, longitude: 45.4508020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMMN', 'FMMV', 'FMMC', 'FMMG', 'FMMK', 'FMML', 'FMMR', 'FMMX', 'FMSC']
  },
  {
    zoneId: 'ANT',
    name: 'Antisiranana',
    countryCode: 'MG',
    latitude: -12.3494000, longitude: 49.2916980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMNA', 'FMNN', 'FMNV', 'FMNE', 'FMNZ']
  },
  {
    zoneId: 'UNK2',
    name: 'Unknown',
    countryCode: 'MG',
    latitude: -14.6517000, longitude: 49.6206017,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMND', 'FMNH', 'FMNR', 'FMNS', 'FMNB', 'FMNF', 'FMNX']
  },
  {
    zoneId: 'BES',
    name: 'Besalampy',
    countryCode: 'MG',
    latitude: -16.7445300, longitude: 44.4824840,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMNQ', 'FMMO', 'FMMU']
  },
  {
    zoneId: 'TL',
    name: 'Tôlanaro',
    countryCode: 'MG',
    latitude: -25.0380990, longitude: 46.9561000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMSD', 'FMSL', 'FMSU']
  },
  {
    zoneId: 'FIA',
    name: 'Fianarantsoa',
    countryCode: 'MG',
    latitude: -21.4416010, longitude: 47.1116980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMSF', 'FMSK', 'FMSM', 'FMSB', 'FMSG', 'FMSI']
  },
  {
    zoneId: 'MOR',
    name: 'Morombe',
    countryCode: 'MG',
    latitude: -21.7538370, longitude: 43.3747530,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FMSR', 'FMST', 'FMSJ', 'FMSN', 'FMSZ']
  },
  {
    zoneId: 'BEI',
    name: 'Beira',
    countryCode: 'MZ',
    latitude: -19.7964000, longitude: 34.9076000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FQBR', 'FQCH']
  },
  {
    zoneId: 'INH',
    name: 'Inhambane',
    countryCode: 'MZ',
    latitude: -23.8764000, longitude: 35.4085010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FQIN', 'FQVL', 'FQXA']
  },
  {
    zoneId: 'LIC',
    name: 'Lichinga',
    countryCode: 'MZ',
    latitude: -13.2740000, longitude: 35.2663000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FQLC', 'FQCB']
  },
  {
    zoneId: 'MUE',
    name: 'Mueda',
    countryCode: 'MZ',
    latitude: -11.6729000, longitude: 39.5630990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FQMD', 'FQMP', 'FQPB', 'FQIB']
  },
  {
    zoneId: 'NAM',
    name: 'Nampula',
    countryCode: 'MZ',
    latitude: -15.1056004, longitude: 39.2817993,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FQNP', 'FQAG', 'FQLU', 'FQNC']
  },
  {
    zoneId: 'QUE',
    name: 'Quelimane',
    countryCode: 'MZ',
    latitude: -17.8554993, longitude: 36.8690987,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FQQL']
  },
  {
    zoneId: 'TET',
    name: 'Tete',
    countryCode: 'MZ',
    latitude: -16.1047993, longitude: 33.6402016,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FQTT']
  },
  {
    zoneId: 'BUL',
    name: 'Bulawayo',
    countryCode: 'ZW',
    latitude: -20.0162840, longitude: 28.6228970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FVBU', 'FVTL']
  },
  {
    zoneId: 'VIC',
    name: 'Victoria Falls',
    countryCode: 'ZW',
    latitude: -18.0974370, longitude: 25.8368670,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FVFA', 'FVWN', 'FVWT']
  },
  {
    zoneId: 'HAR1',
    name: 'Harare',
    countryCode: 'ZW',
    latitude: -17.9318010, longitude: 31.0928000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FVHA', 'FVMU']
  },
  {
    zoneId: 'CHI3',
    name: 'Chiredzi',
    countryCode: 'ZW',
    latitude: -21.0081010, longitude: 31.5786000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FVCZ', 'FVMV', 'FVCH', 'FVMH']
  },
  {
    zoneId: 'KAR',
    name: 'Kariba',
    countryCode: 'ZW',
    latitude: -16.5198000, longitude: 28.8850000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FVKB', 'FVBM']
  },

  // --- AFRICA - East ---
  {
    zoneId: 'DIR',
    name: 'Dire Dawa',
    countryCode: 'ET',
    latitude: 9.6235490, longitude: 41.8550270,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HADR', 'HAJJ']
  },
  {
    zoneId: 'HAW',
    name: 'Hawassa',
    countryCode: 'ET',
    latitude: 7.1006110, longitude: 38.3964550,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HALA', 'HAAM', 'HAJM', 'HAGB', 'HASD', 'HASK']
  },
  {
    zoneId: 'AXU',
    name: 'Axum',
    countryCode: 'ET',
    latitude: 14.1468000, longitude: 38.7728000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HAAX', 'HAMK', 'HAHU']
  },
  {
    zoneId: 'BAH1',
    name: 'Bahir Dar',
    countryCode: 'ET',
    latitude: 11.6081000, longitude: 37.3216020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HABD', 'HAGN', 'HADM', 'HADT', 'HALL', 'HAMA', 'HAMM', 'HAPW']
  },
  {
    zoneId: 'GAM1',
    name: 'Gambela',
    countryCode: 'ET',
    latitude: 8.1287600, longitude: 34.5630990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HAGM', 'HASO', 'HABE', 'HADD', 'HAGR', 'HAMN', 'HAMT', 'HANJ', 'HATP']
  },
  {
    zoneId: 'GOD',
    name: 'Gode',
    countryCode: 'ET',
    latitude: 5.9351301, longitude: 43.5786018,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HAGO', 'HAKD', 'HAKL', 'HASL']
  },
  {
    zoneId: 'ELD',
    name: 'Eldoret',
    countryCode: 'KE',
    latitude: 0.4044580, longitude: 35.2388990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HKEL', 'HKKI', 'HKKT', 'HKMS', 'HKKE', 'HKKG', 'HKKR']
  },
  {
    zoneId: 'MOM',
    name: 'Mombasa',
    countryCode: 'KE',
    latitude: -4.0348300, longitude: 39.5942000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HKMO', 'HKML', 'HKKL', 'HKUK']
  },
  {
    zoneId: 'AMB1',
    name: 'Amboseli National Park',
    countryCode: 'KE',
    latitude: -2.6450500, longitude: 37.2531013,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HKAM']
  },
  {
    zoneId: 'LOK',
    name: 'Lokichogio',
    countryCode: 'KE',
    latitude: 4.2041200, longitude: 34.3482020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HKLK', 'HKLO', 'HKES', 'HKFG']
  },
  {
    zoneId: 'LAM',
    name: 'Lamu',
    countryCode: 'KE',
    latitude: -2.2524310, longitude: 40.9128920,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HKLU', 'HKHO']
  },
  {
    zoneId: 'WAJ',
    name: 'Wajir',
    countryCode: 'KE',
    latitude: 1.7332400, longitude: 40.0915990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HKWJ', 'HKMY']
  },
  {
    zoneId: 'ARU',
    name: 'Arusha',
    countryCode: 'TZ',
    latitude: -3.4270490, longitude: 37.0735300,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HTKJ', 'HTAR', 'HTLM', 'HTMS']
  },
  {
    zoneId: 'MWA',
    name: 'Mwanza',
    countryCode: 'TZ',
    latitude: -2.4465630, longitude: 32.9360490,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HTMW', 'HTBU', 'HTGE', 'HTGR', 'HTMD', 'HTMU', 'HTSN', 'HTSY']
  },
  {
    zoneId: 'DOD1',
    name: 'Dodoma',
    countryCode: 'TZ',
    latitude: -6.1704400, longitude: 35.7526020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HTDO', 'HTIR']
  },
  {
    zoneId: 'MBE',
    name: 'Mbeya',
    countryCode: 'TZ',
    latitude: -8.9199420, longitude: 33.2739810,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HTGW', 'HTNJ', 'HTSU']
  },
  {
    zoneId: 'MTW',
    name: 'Mtwara',
    countryCode: 'TZ',
    latitude: -10.3362040, longitude: 40.1819970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HTMT', 'HTKI', 'HTLI', 'HTMI', 'HTNA']
  },
  {
    zoneId: 'CHA2',
    name: 'Chake Chake',
    countryCode: 'TZ',
    latitude: -5.2572600, longitude: 39.8114010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HTPE', 'HTTG']
  },
  {
    zoneId: 'ARU1',
    name: 'Arua',
    countryCode: 'UG',
    latitude: 3.0491520, longitude: 30.9117140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HUAR', 'HUGU', 'HUMI', 'HUPA']
  },
  {
    zoneId: 'SOR',
    name: 'Soroti',
    countryCode: 'UG',
    latitude: 1.7276900, longitude: 33.6227989,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HUSO', 'HUTO']
  },

  // --- MIDDLE EAST ---
  {
    zoneId: 'EIL',
    name: 'Eilat',
    countryCode: 'IL',
    latitude: 29.7270090, longitude: 35.0141160,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LLER', 'LLEY', 'LLMR', 'LLOV']
  },
  {
    zoneId: 'ABH',
    name: 'Abha',
    countryCode: 'SA',
    latitude: 18.2404000, longitude: 42.6566010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OEAB', 'OEBH', 'OEGN', 'OEKM', 'OENG']
  },
  {
    zoneId: 'AL',
    name: 'Al Ula',
    countryCode: 'SA',
    latitude: 26.4833330, longitude: 38.1169440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEAO', 'OEWJ']
  },
  {
    zoneId: 'AL1',
    name: 'Al-Baha',
    countryCode: 'SA',
    latitude: 20.2985060, longitude: 41.6361530,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEBA']
  },
  {
    zoneId: 'DAW2',
    name: 'Dawadmi',
    countryCode: 'SA',
    latitude: 24.4499000, longitude: 44.1212010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEDM', 'OEGS']
  },
  {
    zoneId: 'GUR1',
    name: 'Gurayat',
    countryCode: 'SA',
    latitude: 31.4124130, longitude: 37.2788980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEGT', 'OETR']
  },
  {
    zoneId: 'HA',
    name: 'Ha\'il',
    countryCode: 'SA',
    latitude: 27.4379010, longitude: 41.6862980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEHL']
  },
  {
    zoneId: 'KIN5',
    name: 'King Khaled Military City',
    countryCode: 'SA',
    latitude: 27.9009000, longitude: 45.5281980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEKK', 'OEPA', 'OEZL']
  },
  {
    zoneId: 'SHA1',
    name: 'Sharma',
    countryCode: 'SA',
    latitude: 27.9275980, longitude: 35.2887400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OENN', 'OETB']
  },
  {
    zoneId: 'RAF',
    name: 'Rafha',
    countryCode: 'SA',
    latitude: 29.6264000, longitude: 43.4906006,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OERF']
  },
  {
    zoneId: 'ARA',
    name: 'Arar',
    countryCode: 'SA',
    latitude: 30.9066010, longitude: 41.1381989,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OERR', 'OESK']
  },
  {
    zoneId: 'SHA2',
    name: 'Sharurah',
    countryCode: 'SA',
    latitude: 17.4669000, longitude: 47.1213990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OESH']
  },
  {
    zoneId: 'WAD',
    name: 'Wadi Al Dawasir',
    countryCode: 'SA',
    latitude: 20.5042990, longitude: 45.1996000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEWD', 'OESL']
  },
  {
    zoneId: 'YAN',
    name: 'Yanbu',
    countryCode: 'SA',
    latitude: 24.1441990, longitude: 38.0634000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OEYN']
  },
  {
    zoneId: 'ABA',
    name: 'Abadan',
    countryCode: 'IR',
    latitude: 30.3678870, longitude: 48.2300750,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIAA', 'OIAW', 'OIAG', 'OIAI', 'OIAM', 'OI20', 'OIAJ']
  },
  {
    zoneId: 'KIS1',
    name: 'Kish Island',
    countryCode: 'IR',
    latitude: 26.5254270, longitude: 53.9804620,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIBK', 'OIKQ', 'OIBA', 'OIBJ', 'OIBL', 'OIBP', 'OIBS', 'OIBV', 'OISL', 'OISR']
  },
  {
    zoneId: 'ISF',
    name: 'Isfahan',
    countryCode: 'IR',
    latitude: 32.7551420, longitude: 51.8838770,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIFM', 'OIFK', 'OIFS', 'OIFE']
  },
  {
    zoneId: 'BAN2',
    name: 'Bandar Abbas',
    countryCode: 'IR',
    latitude: 27.2183000, longitude: 56.3778000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIKB', 'OIKJ', 'OIKP']
  },
  {
    zoneId: 'KER1',
    name: 'Kerman',
    countryCode: 'IR',
    latitude: 30.2712760, longitude: 56.9496920,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIKK', 'OIKM', 'OIKR', 'OIKY']
  },
  {
    zoneId: 'BIR',
    name: 'Birjand',
    countryCode: 'IR',
    latitude: 32.8965250, longitude: 59.2812580,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIMB']
  },
  {
    zoneId: 'MAS',
    name: 'Mashhad',
    countryCode: 'IR',
    latitude: 36.2348210, longitude: 59.6429490,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OIMM', 'OIMC', 'OIMS']
  },
  {
    zoneId: 'SHI',
    name: 'Shiraz',
    countryCode: 'IR',
    latitude: 29.5392000, longitude: 52.5898020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OISS', 'OIAH', 'OIBB', 'OIBQ', 'OISF', 'OISY', 'OISJ']
  },
  {
    zoneId: 'DEZ',
    name: 'Dezful',
    countryCode: 'IR',
    latitude: 32.4343990, longitude: 48.3975980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIAD', 'OICK']
  },
  {
    zoneId: 'KER2',
    name: 'Kermanshah',
    countryCode: 'IR',
    latitude: 34.3459015, longitude: 47.1581001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OICC', 'OICI', 'OICS', 'OIHH', 'OIHS']
  },
  {
    zoneId: 'RAS',
    name: 'Rasht',
    countryCode: 'IR',
    latitude: 37.3233330, longitude: 49.6177780,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIGG', 'OITL', 'OITZ']
  },
  {
    zoneId: 'BOJ',
    name: 'Bojnord',
    countryCode: 'IR',
    latitude: 37.4930000, longitude: 57.3082008,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIMN', 'OINE']
  },
  {
    zoneId: 'TAB',
    name: 'Tabas',
    countryCode: 'IR',
    latitude: 33.6678010, longitude: 56.8927000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIMT']
  },
  {
    zoneId: 'GOR',
    name: 'Gorgan',
    countryCode: 'IR',
    latitude: 36.9094009, longitude: 54.4012985,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OING', 'OINZ', 'OIIS', 'OIMJ']
  },
  {
    zoneId: 'URM',
    name: 'Urmia',
    countryCode: 'IR',
    latitude: 37.6680984, longitude: 45.0686989,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OITR', 'OITT', 'OITU', 'OITH', 'OITK', 'OITM']
  },
  {
    zoneId: 'YAZ',
    name: 'Yazd',
    countryCode: 'IR',
    latitude: 31.9048996, longitude: 54.2765007,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIYY']
  },
  {
    zoneId: 'ZAB',
    name: 'Zabol',
    countryCode: 'IR',
    latitude: 31.0983010, longitude: 61.5439000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIZB', 'OIZH']
  },
  {
    zoneId: 'KON1',
    name: 'Konarak',
    countryCode: 'IR',
    latitude: 25.4431900, longitude: 60.3821670,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OIZC', 'OIZI']
  },
  {
    zoneId: 'AQA',
    name: 'Aqaba',
    countryCode: 'JO',
    latitude: 29.6116010, longitude: 35.0181010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OJAQ']
  },
  {
    zoneId: 'SIR1',
    name: 'Sir Bani Yas',
    countryCode: 'AE',
    latitude: 24.2836110, longitude: 52.5802780,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OMBY', 'OMDL']
  },
  {
    zoneId: 'SAL3',
    name: 'Salalah',
    countryCode: 'OM',
    latitude: 17.0387000, longitude: 54.0913010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OOSA', 'OOTH', 'OOMX']
  },
  {
    zoneId: 'KHA',
    name: 'Khasab',
    countryCode: 'OM',
    latitude: 26.1710000, longitude: 56.2406010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OOKB', 'OOSH', 'OOBR']
  },
  {
    zoneId: 'MAS1',
    name: 'Masirah',
    countryCode: 'OM',
    latitude: 20.6754000, longitude: 58.8904990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OOMA', 'OOGB', 'OOJA']
  },
  {
    zoneId: 'MOS',
    name: 'Mosul',
    countryCode: 'IQ',
    latitude: 36.3058010, longitude: 43.1474000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ORBM', 'ORER', 'ORKK', 'ORQW', 'ORSU', 'ORBB']
  },
  {
    zoneId: 'BAS1',
    name: 'Basra',
    countryCode: 'IQ',
    latitude: 30.5491010, longitude: 47.6621020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ORMM', 'ORTL']
  },
  {
    zoneId: 'HT',
    name: 'Hīt',
    countryCode: 'IQ',
    latitude: 33.7855988, longitude: 42.4412003,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ORAA']
  },

  // --- CENTRAL AMERICA & CARIBBEAN ---
  {
    zoneId: 'BAR2',
    name: 'Barahona',
    countryCode: 'DO',
    latitude: 18.2514992, longitude: -71.1203995,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MDBH', 'MDCR', 'MDPP']
  },
  {
    zoneId: 'SAN4',
    name: 'San Benito',
    countryCode: 'GT',
    latitude: 16.9123910, longitude: -89.8647920,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MGTK', 'MGPB', 'MGRB', 'MGCR', 'MGPG', 'MGPP', 'MGRD']
  },
  {
    zoneId: 'GUA1',
    name: 'Guanaja',
    countryCode: 'HN',
    latitude: 16.4454000, longitude: -85.9066010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MHNJ', 'MHRO', 'MHTJ', 'MHAH', 'MHBL', 'MHGE', 'MHIR', 'MHJU', 'MHLN', 'MHPC', 'MHTO']
  },
  {
    zoneId: 'TEG',
    name: 'Tegucigalpa',
    countryCode: 'HN',
    latitude: 14.0609000, longitude: -87.2172010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MHTG']
  },
  {
    zoneId: 'CUL',
    name: 'Culiacán',
    countryCode: 'MX',
    latitude: 24.7650400, longitude: -107.4752280,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMCL', 'MMMZ', 'MMLM']
  },
  {
    zoneId: 'CAM1',
    name: 'Campeche',
    countryCode: 'MX',
    latitude: 19.8159690, longitude: -90.5001250,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMCP', 'MMMD', 'MMCE']
  },
  {
    zoneId: 'CIU1',
    name: 'Ciudad Juárez',
    countryCode: 'MX',
    latitude: 31.6366730, longitude: -106.4285330,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMCS', 'MMCG']
  },
  {
    zoneId: 'CHI6',
    name: 'Chihuahua',
    countryCode: 'MX',
    latitude: 28.7026490, longitude: -105.9637640,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMCU']
  },
  {
    zoneId: 'CIU2',
    name: 'Ciudad Victoria',
    countryCode: 'MX',
    latitude: 23.7033000, longitude: -98.9564970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMCV', 'MMTM', 'MMDM', 'MMTN']
  },
  {
    zoneId: 'DUR1',
    name: 'Durango',
    countryCode: 'MX',
    latitude: 24.1254680, longitude: -104.5279380,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMDO', 'MMTC']
  },
  {
    zoneId: 'HER1',
    name: 'Hermosillo',
    countryCode: 'MX',
    latitude: 29.0928110, longitude: -111.0530150,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMHO', 'MMGM']
  },
  {
    zoneId: 'SIL1',
    name: 'Silao',
    countryCode: 'MX',
    latitude: 20.9926950, longitude: -101.4802840,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMLO', 'MMQT', 'MMSP', 'MMAS', 'MMCY', 'MMMM', 'MMPN']
  },
  {
    zoneId: 'LOR',
    name: 'Loreto',
    countryCode: 'MX',
    latitude: 25.9895490, longitude: -111.3484080,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMLT', 'MMCN', 'MMDA', 'MMMG']
  },
  {
    zoneId: 'NUE',
    name: 'Nuevo Laredo',
    countryCode: 'MX',
    latitude: 27.4438990, longitude: -99.5705030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMNL', 'MMMV', 'MMPG', 'MMRX']
  },
  {
    zoneId: 'OAX',
    name: 'Oaxaca',
    countryCode: 'MX',
    latitude: 16.9987730, longitude: -96.7260920,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMOX', 'MMBT', 'MMIT', 'MMPS', 'MMHC', 'MMSZ']
  },
  {
    zoneId: 'TUX',
    name: 'Tuxtla Gutiérrez',
    countryCode: 'MX',
    latitude: 16.5616110, longitude: -93.0257310,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMTG', 'MMVA', 'MMTP', 'MMCO', 'MMPQ']
  },
  {
    zoneId: 'VER1',
    name: 'Veracruz',
    countryCode: 'MX',
    latitude: 19.1395890, longitude: -96.1886020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMVR', 'MMJA', 'MMMT', 'MMPA']
  },
  {
    zoneId: 'ZAC',
    name: 'Zacatecas',
    countryCode: 'MX',
    latitude: 22.8949420, longitude: -102.6871540,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MMZC']
  },
  {
    zoneId: 'ACA',
    name: 'Acapulco',
    countryCode: 'MX',
    latitude: 16.7571260, longitude: -99.7531130,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMAA', 'MMZH']
  },
  {
    zoneId: 'CHE',
    name: 'Chetumal',
    countryCode: 'MX',
    latitude: 18.5049850, longitude: -88.3280180,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMCM']
  },
  {
    zoneId: 'LZ',
    name: 'Lázaro Cárdenas',
    countryCode: 'MX',
    latitude: 18.0016720, longitude: -102.2203160,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMLC']
  },
  {
    zoneId: 'MAT1',
    name: 'Matamoros',
    countryCode: 'MX',
    latitude: 25.7698994, longitude: -97.5252991,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMMA']
  },
  {
    zoneId: 'MEX1',
    name: 'Mexicali',
    countryCode: 'MX',
    latitude: 32.6306290, longitude: -115.2428050,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMML', 'MMSF']
  },
  {
    zoneId: 'NOG',
    name: 'Nogales',
    countryCode: 'MX',
    latitude: 31.2257560, longitude: -110.9769340,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMNG', 'MMCA', 'MMPE']
  },
  {
    zoneId: 'MAN2',
    name: 'Manzanillo',
    countryCode: 'MX',
    latitude: 19.1448000, longitude: -104.5589980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MMZO']
  },
  {
    zoneId: 'BLU',
    name: 'Bluefields',
    countryCode: 'NI',
    latitude: 11.9910000, longitude: -83.7741010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MNBL', 'MNCI', 'MNRT', 'MNSC', 'MNSI']
  },
  {
    zoneId: 'MAN3',
    name: 'Managua',
    countryCode: 'NI',
    latitude: 12.1415005, longitude: -86.1681976,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MNMG', 'MNCE']
  },
  {
    zoneId: 'PUE',
    name: 'Puerto Cabezas',
    countryCode: 'NI',
    latitude: 14.0472002, longitude: -83.3867035,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MNPC', 'MNBZ', 'MNWP']
  },
  {
    zoneId: 'DAV',
    name: 'David',
    countryCode: 'PA',
    latitude: 8.3889830, longitude: -82.4364250,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MPDA', 'MPBO', 'MPCH', 'MPSA']
  },
  {
    zoneId: 'CHI7',
    name: 'Chitré',
    countryCode: 'PA',
    latitude: 7.9878400, longitude: -80.4098370,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MPCE', 'MPPD']
  },
  {
    zoneId: 'LIB',
    name: 'Liberia',
    countryCode: 'CR',
    latitude: 10.5933000, longitude: -85.5444030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MRLB', 'MRNS', 'MRFL', 'MRTM']
  },
  {
    zoneId: 'COR5',
    name: 'Corredores',
    countryCode: 'CR',
    latitude: 8.6015600, longitude: -82.9687540,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MRCC', 'MRGF', 'MRPJ', 'MRDK', 'MRSV']
  },
  {
    zoneId: 'CAP3',
    name: 'Cap Haitien',
    countryCode: 'HT',
    latitude: 19.7255470, longitude: -72.2007100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MTCH', 'MTPP', 'MTJA', 'MTPX']
  },
  {
    zoneId: 'LES1',
    name: 'Les Cayes',
    countryCode: 'HT',
    latitude: 18.2710990, longitude: -73.7883000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MTCA', 'MTJE']
  },
  {
    zoneId: 'CAM2',
    name: 'Camaguey',
    countryCode: 'CU',
    latitude: 21.4199090, longitude: -77.8480390,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MUCM', 'MUHG', 'MUBY', 'MUCA', 'MUCC', 'MUMZ', 'MUVT', 'MUBR', 'MUMJ', 'MUSS']
  },
  {
    zoneId: 'SAN5',
    name: 'Santiago',
    countryCode: 'CU',
    latitude: 19.9747400, longitude: -75.8355040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MUCU', 'MUBA', 'MUGM', 'MUGT', 'MUMO', 'MUMA']
  },
  {
    zoneId: 'SAN6',
    name: 'Santa Clara',
    countryCode: 'CU',
    latitude: 22.4922150, longitude: -79.9431190,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MUSC', 'MUCF', 'MUCL', 'MUTD']
  },
  {
    zoneId: 'SAN7',
    name: 'Sandino',
    countryCode: 'CU',
    latitude: 22.1005250, longitude: -84.1573760,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MUSJ', 'MUSN']
  },
  {
    zoneId: 'FRE3',
    name: 'Freeport',
    countryCode: 'BS',
    latitude: 26.5579960, longitude: -78.6955830,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MYGF', 'MYAM', 'MYAT', 'MYBS', 'MYAW', 'MYCC', 'MYGW']
  },
  {
    zoneId: 'SAN8',
    name: 'San Salvador',
    countryCode: 'BS',
    latitude: 24.0630410, longitude: -74.5232330,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MYSM', 'MYAP', 'MYCA', 'MYCB', 'MYCI', 'MYEF', 'MYLD', 'MYLS', 'MYCP', 'MYRP']
  },
  {
    zoneId: 'MAT2',
    name: 'Matthew Town',
    countryCode: 'BS',
    latitude: 20.9750000, longitude: -73.6669010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MYIG', 'MYMM']
  },
  {
    zoneId: 'DUN',
    name: 'Duncan Town',
    countryCode: 'BS',
    latitude: 22.1818010, longitude: -75.7295000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['MYRD']
  },

  // --- SOUTH ASIA ---
  {
    zoneId: 'GUR2',
    name: 'Gurandani',
    countryCode: 'PK',
    latitude: 25.2967330, longitude: 62.4988220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OPGD', 'OPPI', 'OPTU', 'OPOR']
  },
  {
    zoneId: 'MUL',
    name: 'Multan',
    countryCode: 'PK',
    latitude: 30.2031990, longitude: 71.4190980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OPMT', 'OPBW', 'OPDG', 'OPDI', 'OPBR']
  },
  {
    zoneId: 'PES1',
    name: 'Peshawar',
    countryCode: 'PK',
    latitude: 33.9939000, longitude: 71.5146030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OPPS', 'OPCH', 'OPMI', 'OPBN', 'OPKT', 'OPPC']
  },
  {
    zoneId: 'QUE1',
    name: 'Quetta',
    countryCode: 'PK',
    latitude: 30.2514000, longitude: 66.9377980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OPQT', 'OPLL', 'OPSB']
  },
  {
    zoneId: 'SKA',
    name: 'Skardu',
    countryCode: 'PK',
    latitude: 35.3386600, longitude: 75.5386480,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OPSD', 'OPGT', 'OPCL']
  },
  {
    zoneId: 'JAC1',
    name: 'Jacobabad',
    countryCode: 'PK',
    latitude: 28.2842007, longitude: 68.4496994,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OPJA', 'OPMJ', 'OPRK', 'OPSK', 'OPSN', 'OPSU', 'OP10', 'OP17', 'OPKH', 'OPSW']
  },
  {
    zoneId: 'NAW',
    name: 'Nawabashah',
    countryCode: 'PK',
    latitude: 26.2194000, longitude: 68.3900990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OPNH', 'OPMP', 'OPTH']
  },
  {
    zoneId: 'PAN1',
    name: 'Panjgur',
    countryCode: 'PK',
    latitude: 26.9545000, longitude: 64.1325000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OPPG', 'OPDB']
  },
  {
    zoneId: 'SAR',
    name: 'Sargodha',
    countryCode: 'PK',
    latitude: 32.0485992, longitude: 72.6650009,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OPSR']
  },
  {
    zoneId: 'FOR9',
    name: 'Fort Sandeman',
    countryCode: 'PK',
    latitude: 31.3584003, longitude: 69.4636002,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OPZB', 'OPWN']
  },
  {
    zoneId: 'RAJ',
    name: 'Rajkot',
    countryCode: 'IN',
    latitude: 22.3788240, longitude: 71.0393910,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VAHS', 'VABJ', 'VABV', 'VAJM', 'VAKE', 'VAKS', 'VAPR', 'VARK', 'VA1P']
  },
  {
    zoneId: 'IND1',
    name: 'Indore',
    countryCode: 'IN',
    latitude: 22.7214040, longitude: 75.8005100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VAID', 'VABP', 'VAJL']
  },
  {
    zoneId: 'NAG',
    name: 'Nagpur',
    countryCode: 'IN',
    latitude: 21.0921990, longitude: 79.0472030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VANP', 'VA2C', 'VAAK']
  },
  {
    zoneId: 'SUR1',
    name: 'Surat',
    countryCode: 'IN',
    latitude: 21.1155310, longitude: 72.7432510,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VASU', 'VAOZ']
  },
  {
    zoneId: 'SIL2',
    name: 'Siliguri',
    countryCode: 'IN',
    latitude: 26.6812000, longitude: 88.3285980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VEBD', 'VEBG', 'VECO', 'VEMH', 'VERU']
  },
  {
    zoneId: 'VAR',
    name: 'Varanasi',
    countryCode: 'IN',
    latitude: 25.4521710, longitude: 82.8625490,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VEBN', 'VA1G', 'VEGK', 'VEKI', 'VIAL', 'VEAH', 'VECT']
  },
  {
    zoneId: 'BHU',
    name: 'Bhubaneswar',
    countryCode: 'IN',
    latitude: 20.2510210, longitude: 85.8147470,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VEBS']
  },
  {
    zoneId: 'GUW',
    name: 'Guwahati',
    countryCode: 'IN',
    latitude: 26.1066540, longitude: 91.5852260,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VEGT', 'VEBI', 'VEKR', 'VEKU', 'VEMR', 'VETZ', 'VEKM']
  },
  {
    zoneId: 'IMP',
    name: 'Imphal',
    countryCode: 'IN',
    latitude: 24.7600000, longitude: 93.8966980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VEIM', 'VEJT', 'VELP']
  },
  {
    zoneId: 'VIS',
    name: 'Visakhapatnam',
    countryCode: 'IN',
    latitude: 17.7235060, longitude: 83.2277290,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VEVZ', 'VORY', 'VEJP']
  },
  {
    zoneId: 'AMR',
    name: 'Amritsar',
    countryCode: 'IN',
    latitude: 31.7096000, longitude: 74.7973020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VIAR', 'VICG', 'VIBT', 'VIGG', 'VIJU', 'VILD', 'VIPK', 'VIAX']
  },
  {
    zoneId: 'LUC',
    name: 'Lucknow',
    countryCode: 'IN',
    latitude: 26.7605990, longitude: 80.8892970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VILK', 'VICX', 'VISV']
  },
  {
    zoneId: 'SRI',
    name: 'Srinagar',
    countryCode: 'IN',
    latitude: 33.9870990, longitude: 74.7742000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VISR']
  },
  {
    zoneId: 'VIJ',
    name: 'Vijayawada',
    countryCode: 'IN',
    latitude: 16.5300110, longitude: 80.8048880,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VOBZ']
  },
  {
    zoneId: 'KAN2',
    name: 'Kannur',
    countryCode: 'IN',
    latitude: 11.9163430, longitude: 75.5449790,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VOKN', 'VOML', 'VOMY']
  },
  {
    zoneId: 'POR7',
    name: 'Port Blair',
    countryCode: 'IN',
    latitude: 11.6401940, longitude: 92.7290200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VOPB']
  },
  {
    zoneId: 'TIR',
    name: 'Tiruchirappalli',
    countryCode: 'IN',
    latitude: 10.7629150, longitude: 78.7177410,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VOTR', 'VOMD', 'VOSM', 'VONV', 'VOTJ']
  },
  {
    zoneId: 'THI',
    name: 'Thiruvananthapuram',
    countryCode: 'IN',
    latitude: 8.4818890, longitude: 76.9200290,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VOTV', 'VOTK']
  },
  {
    zoneId: 'AUR1',
    name: 'Aurangabad',
    countryCode: 'IN',
    latitude: 19.8626995, longitude: 75.3981018,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VAAU', 'VALT', 'VAND']
  },
  {
    zoneId: 'JAB',
    name: 'Jabalpur',
    countryCode: 'IN',
    latitude: 23.1777990, longitude: 80.0520020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VAJB', 'VAKJ', 'VIST']
  },
  {
    zoneId: 'KOL1',
    name: 'Kolhapur',
    countryCode: 'IN',
    latitude: 16.6647000, longitude: 74.2893980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VAKP', 'VARG', 'VASL']
  },
  {
    zoneId: 'RAI',
    name: 'Raipur',
    countryCode: 'IN',
    latitude: 21.1804010, longitude: 81.7388000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VARP', 'VEBU']
  },
  {
    zoneId: 'UDA',
    name: 'Udaipur',
    countryCode: 'IN',
    latitude: 24.6177006, longitude: 73.8961029,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VAUD', 'VIJO', 'VIKO']
  },
  {
    zoneId: 'UNK8',
    name: 'Unknown',
    countryCode: 'IN',
    latitude: 28.1753006, longitude: 94.8020020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VEAN', 'VELR', 'VEMN', 'VEZO', 'VEDZ', 'VEPG', 'VETJ']
  },
  {
    zoneId: 'AGA1',
    name: 'Agartala',
    countryCode: 'IN',
    latitude: 23.8869990, longitude: 91.2404020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VEAT', 'VEKW']
  },
  {
    zoneId: 'UNK9',
    name: 'Unknown',
    countryCode: 'IN',
    latitude: 23.8340000, longitude: 86.4253010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VEDB', 'VEDG', 'VEGY', 'VEJS', 'VERC', 'VEDO']
  },
  {
    zoneId: 'DAR2',
    name: 'Darbhanga',
    countryCode: 'IN',
    latitude: 26.1928010, longitude: 85.9169010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VEDH', 'VEMZ', 'VEPT']
  },
  {
    zoneId: 'ROU',
    name: 'Rourkela',
    countryCode: 'IN',
    latitude: 22.2565710, longitude: 84.8151930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VERK', 'VEJH']
  },
  {
    zoneId: 'AGR',
    name: 'Agra',
    countryCode: 'IN',
    latitude: 27.1579750, longitude: 77.9610250,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VIAG', 'VIBY', 'VIGR', 'VIMB']
  },
  {
    zoneId: 'BIK',
    name: 'Bikaner',
    countryCode: 'IN',
    latitude: 28.0706010, longitude: 73.2071990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VIBK']
  },
  {
    zoneId: 'BHU1',
    name: 'Bhuntar',
    countryCode: 'IN',
    latitude: 31.8766990, longitude: 77.1544040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VIBR', 'VIDN', 'VISM', 'VISP']
  },
  {
    zoneId: 'UNK10',
    name: 'Unknown',
    countryCode: 'IN',
    latitude: 26.8887000, longitude: 70.8649980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VIJR']
  },
  {
    zoneId: 'LEH',
    name: 'Leh',
    countryCode: 'IN',
    latitude: 34.1358990, longitude: 77.5465010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VILH']
  },
  {
    zoneId: 'PAN2',
    name: 'Pantnagar',
    countryCode: 'IN',
    latitude: 29.0334000, longitude: 79.4737010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VIPT']
  },
  {
    zoneId: 'AGA2',
    name: 'Agatti',
    countryCode: 'IN',
    latitude: 10.8237000, longitude: 72.1760030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VOAT']
  },
  {
    zoneId: 'BEL4',
    name: 'Bellary',
    countryCode: 'IN',
    latitude: 15.1627998, longitude: 76.8827972,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VOBI', 'VOCP', 'VOKU', 'VOJV']
  },
  {
    zoneId: 'IAF',
    name: 'IAF Camp',
    countryCode: 'IN',
    latitude: 9.1530560, longitude: 92.8192730,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VOCX']
  },
  {
    zoneId: 'JAF',
    name: 'Jaffna',
    countryCode: 'LK',
    latitude: 9.7923300, longitude: 80.0700990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VCCJ', 'VCCH', 'VCCT']
  },
  {
    zoneId: 'MAT4',
    name: 'Mattala',
    countryCode: 'LK',
    latitude: 6.2838780, longitude: 81.1241630,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VCRI', 'VCCB', 'VCCG', 'VCCW']
  },
  {
    zoneId: 'CHA4',
    name: 'Chattogram (Chittagong)',
    countryCode: 'BD',
    latitude: 22.2495990, longitude: 91.8133010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VGEG', 'VGCB']
  },
  {
    zoneId: 'SYL1',
    name: 'Sylhet',
    countryCode: 'BD',
    latitude: 24.9630710, longitude: 91.8669030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VGSY', 'VGSH']
  },
  {
    zoneId: 'RAJ1',
    name: 'Rajshahi',
    countryCode: 'BD',
    latitude: 24.4372010, longitude: 88.6165010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VGRJ', 'VGSD', 'VGSG']
  },
  {
    zoneId: 'SID',
    name: 'Siddharthanagar (Bhairahawa)',
    countryCode: 'NP',
    latitude: 27.5045910, longitude: 83.4146180,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VNBW', 'VNNG', 'VNBL', 'VNDG', 'VNDP', 'VNJS', 'VNMA', 'VNRK', 'VNRP', 'VNSK']
  },
  {
    zoneId: 'TAP',
    name: 'Taplejung',
    countryCode: 'NP',
    latitude: 27.3509000, longitude: 87.6952500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VNTJ', 'VNVT', 'VNBJ', 'VNCG', 'VNRB', 'VNTR']
  },
  {
    zoneId: 'BAJ',
    name: 'Bajhang',
    countryCode: 'NP',
    latitude: 29.5390000, longitude: 81.1854020,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['VNBG', 'VNBR', 'VNBT', 'VNDH', 'VNDL', 'VNDT', 'VNJL', 'VNMN', 'VNSR', 'VNST', 'VNTP']
  },

  // --- SOUTHEAST ASIA ---
  {
    zoneId: 'LAO',
    name: 'Laoag City',
    countryCode: 'PH',
    latitude: 18.1750890, longitude: 120.5310060,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RPLI', 'RPLH', 'RPUB', 'RPUS', 'RPUT', 'RPUY']
  },
  {
    zoneId: 'DAV1',
    name: 'Davao',
    countryCode: 'PH',
    latitude: 7.1255200, longitude: 125.6460040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RPMD', 'RPMR', 'RPMA', 'RPMC', 'RPME', 'RPMF', 'RPMQ', 'RPMY', 'RPMI', 'RPMM']
  },
  {
    zoneId: 'PUE1',
    name: 'Puerto Princesa',
    countryCode: 'PH',
    latitude: 9.7420440, longitude: 118.7591100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RPVP', 'RPEN', 'RPSD', 'RPSV']
  },
  {
    zoneId: 'LEG',
    name: 'Legazpi',
    countryCode: 'PH',
    latitude: 13.1119150, longitude: 123.6768290,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPLK', 'RPUD', 'RPUN', 'RPUV', 'RPUW', 'RPVC', 'RPVF', 'RPVJ', 'RPVK', 'RPVR', 'RPVU']
  },
  {
    zoneId: 'DIP',
    name: 'Dipolog',
    countryCode: 'PH',
    latitude: 8.6019830, longitude: 123.3418750,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPMG', 'RPMO', 'RPMP', 'PRNO', 'RPMV']
  },
  {
    zoneId: 'JOL',
    name: 'Jolo',
    countryCode: 'PH',
    latitude: 6.0536700, longitude: 121.0110020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPMJ', 'RPMZ', 'RPMN']
  },
  {
    zoneId: 'SUR',
    name: 'Surigao City',
    countryCode: 'PH',
    latitude: 9.7558383, longitude: 125.4809475,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPMS', 'RPMW', 'RPVA', 'RPNS', 'RPVW']
  },
  {
    zoneId: 'SAN9',
    name: 'San Jose',
    countryCode: 'PH',
    latitude: 12.3614998, longitude: 121.0469971,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPUH', 'RPUM', 'RPVE', 'RPVS', 'RPVV', 'RPLO']
  },
  {
    zoneId: 'BAS2',
    name: 'Basco',
    countryCode: 'PH',
    latitude: 20.4513000, longitude: 121.9800030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPUO']
  },
  {
    zoneId: 'CAB1',
    name: 'Cabatuan',
    countryCode: 'PH',
    latitude: 10.8330170, longitude: 122.4933580,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RPVI']
  },
  {
    zoneId: 'PRE1',
    name: 'Preah Sihanouk',
    countryCode: 'KH',
    latitude: 10.5705570, longitude: 103.6320670,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VDSV', 'VDKK']
  },
  {
    zoneId: 'RAT',
    name: 'Ratanakiri',
    countryCode: 'KH',
    latitude: 13.7299995, longitude: 106.9869995,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VDRK', 'VDMK']
  },
  {
    zoneId: 'LUA',
    name: 'Luang Phabang',
    countryCode: 'LA',
    latitude: 19.9042730, longitude: 102.1671910,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VLLB', 'VLSN', 'VLHS', 'VLLN', 'VLOS', 'VLSB', 'VLXK', 'VLXL']
  },
  {
    zoneId: 'PAK',
    name: 'Pakse',
    countryCode: 'LA',
    latitude: 15.1339730, longitude: 105.7798710,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VLPS', 'VLSK', 'VLAP', 'VLSV']
  },
  {
    zoneId: 'CHI11',
    name: 'Chiang Mai',
    countryCode: 'TH',
    latitude: 18.7667999, longitude: 98.9626007,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VTCC', 'VTCH', 'VTCL', 'VTCN', 'VTCP', 'VTCT', 'VTPO', 'VTPT', 'VTCI']
  },
  {
    zoneId: 'NA',
    name: 'Na Thon (Ko Samui Island)',
    countryCode: 'TH',
    latitude: 9.5477900, longitude: 100.0619960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VTSM', 'VTSE', 'VTSF', 'VTSR']
  },
  {
    zoneId: 'UDO',
    name: 'Udon Thani',
    countryCode: 'TH',
    latitude: 17.3861860, longitude: 102.7885770,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VTUD', 'VTPB', 'VTUI', 'VTUK', 'VTUL', 'VTUV', 'VTUW']
  },
  {
    zoneId: 'LAE1',
    name: 'Laem Ngop',
    countryCode: 'TH',
    latitude: 12.2746000, longitude: 102.3190000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VTBO']
  },
  {
    zoneId: 'TAK',
    name: 'Takhli',
    countryCode: 'TH',
    latitude: 15.2773000, longitude: 100.2959980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VTPI', 'VTPP', 'VTUQ']
  },
  {
    zoneId: 'UNK11',
    name: 'Unknown',
    countryCode: 'TH',
    latitude: 16.6998997, longitude: 98.5450974,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VTPM']
  },
  {
    zoneId: 'UNK12',
    name: 'Unknown',
    countryCode: 'TH',
    latitude: 6.5199199, longitude: 101.7429962,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VTSC', 'VTSH', 'VTSK', 'VTSS']
  },
  {
    zoneId: 'TRA',
    name: 'Trang',
    countryCode: 'TH',
    latitude: 7.5087400, longitude: 99.6166000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VTST']
  },
  {
    zoneId: 'SUR2',
    name: 'Surin',
    countryCode: 'TH',
    latitude: 14.8683004, longitude: 103.4980011,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VTUJ', 'VTUO', 'VTUU']
  },
  {
    zoneId: 'NHA',
    name: 'Nha Trang/nha Trang aiurportCam Ranh',
    countryCode: 'VN',
    latitude: 11.9982000, longitude: 109.2190020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VVCR', 'VVBM', 'VVDL', 'VVPC', 'VVTH', 'VVPR']
  },
  {
    zoneId: 'DA',
    name: 'Da Nang',
    countryCode: 'VN',
    latitude: 16.0439000, longitude: 108.1989970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VVDN', 'VVPB', 'VVCA']
  },
  {
    zoneId: 'PHU',
    name: 'Phu Quoc Island',
    countryCode: 'VN',
    latitude: 10.1677590, longitude: 103.9954510,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VVPQ', 'VVCM', 'VVRG']
  },
  {
    zoneId: 'CON6',
    name: 'Con Dao',
    countryCode: 'VN',
    latitude: 8.7318300, longitude: 106.6330030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VVCS']
  },
  {
    zoneId: 'DIE',
    name: 'Dien Bien Phu',
    countryCode: 'VN',
    latitude: 21.3974991, longitude: 103.0080032,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VVDB', 'VVNS']
  },
  {
    zoneId: 'DON2',
    name: 'Dong Hoi',
    countryCode: 'VN',
    latitude: 17.5150000, longitude: 106.5905560,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VVDH', 'VVVH']
  },
  {
    zoneId: 'PLE',
    name: 'Pleiku',
    countryCode: 'VN',
    latitude: 14.0045004, longitude: 108.0169983,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VVPK']
  },
  {
    zoneId: 'VAN3',
    name: 'Van Don',
    countryCode: 'VN',
    latitude: 21.1206930, longitude: 107.4153900,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VVVD']
  },
  {
    zoneId: 'MAN7',
    name: 'Mandalay',
    countryCode: 'MM',
    latitude: 21.7021999, longitude: 95.9778976,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VYMD', 'VYMO', 'VYNS', 'VYBG', 'VYCZ', 'VYGG', 'VYHH', 'VYHN', 'VYKU', 'VYMW', 'VYMY', 'VYNU', 'VYPK', 'VYPU']
  },
  {
    zoneId: 'NAY',
    name: 'Naypyitaw',
    countryCode: 'MM',
    latitude: 19.6235010, longitude: 96.2009960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VYNT', 'VYLK', 'VYPP', 'VYPY']
  },
  {
    zoneId: 'DAW3',
    name: 'Dawei',
    countryCode: 'MM',
    latitude: 14.1039000, longitude: 98.2035980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VYDW', 'VYME', 'VYYE']
  },
  {
    zoneId: 'KEN',
    name: 'Kengtung',
    countryCode: 'MM',
    latitude: 21.3015995, longitude: 99.6360016,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VYKG', 'VYMS', 'VYTL', 'VYMT']
  },
  {
    zoneId: 'KYA',
    name: 'Kyaukpyu',
    countryCode: 'MM',
    latitude: 19.4263992, longitude: 93.5347977,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VYKP', 'VYSW', 'VYTD', 'VYAN', 'VYMN']
  },
  {
    zoneId: 'KAW',
    name: 'Kawthoung',
    countryCode: 'MM',
    latitude: 10.0493002, longitude: 98.5380020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VYKT', 'VYBP']
  },
  {
    zoneId: 'LAS1',
    name: 'Lashio',
    countryCode: 'MM',
    latitude: 22.9778996, longitude: 97.7521973,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VYLS', 'VYBM']
  },
  {
    zoneId: 'MYI',
    name: 'Myitkyina',
    countryCode: 'MM',
    latitude: 25.3836000, longitude: 97.3518980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VYMK', 'VYPT', 'VYKI']
  },
  {
    zoneId: 'MAK2',
    name: 'Makassar',
    countryCode: 'ID',
    latitude: -5.0755390, longitude: 119.5537020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WAAA', 'WAFB', 'WAWH', 'WAWN']
  },
  {
    zoneId: 'SEN',
    name: 'Sentani',
    countryCode: 'ID',
    latitude: -2.5796270, longitude: 140.5198570,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WAJJ', 'WAJG', 'WAJI', 'WAJL', 'WAJS']
  },
  {
    zoneId: 'BAL4',
    name: 'Balikpapan',
    countryCode: 'ID',
    latitude: -1.2683420, longitude: 116.8945200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WALL', 'WALS', 'WAON', 'WAGB', 'WALE', 'WRLA', 'WRLC', 'WRLH']
  },
  {
    zoneId: 'MAN8',
    name: 'Manado',
    countryCode: 'ID',
    latitude: 1.5485910, longitude: 124.9262500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WAMM', 'WAMI', 'WAMO']
  },
  {
    zoneId: 'AMB2',
    name: 'Ambon',
    countryCode: 'ID',
    latitude: -3.7102600, longitude: 128.0890050,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WAPP', 'WAPN', 'WAPA', 'WAPC', 'WAPG', 'WAPV']
  },
  {
    zoneId: 'YOG',
    name: 'Yogyakarta',
    countryCode: 'ID',
    latitude: -7.7881800, longitude: 110.4319990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WARJ', 'WARS', 'WAHI', 'WAHL', 'WARQ', 'WAHP', 'WAHU', 'WICN']
  },
  {
    zoneId: 'BAT',
    name: 'Batam',
    countryCode: 'ID',
    latitude: 1.1210300, longitude: 104.1190030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WIDD', 'WIDN', 'WIBS', 'WIBT', 'WIDS']
  },
  {
    zoneId: 'BER2',
    name: 'Beringin',
    countryCode: 'ID',
    latitude: 3.6378470, longitude: 98.8705660,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WIMM', 'WIMK', 'WIMU', 'WIMN', 'WIMP', 'WITA']
  },
  {
    zoneId: 'PON2',
    name: 'Pontianak',
    countryCode: 'ID',
    latitude: -0.1530230, longitude: 109.4047080,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WIOO', 'WIOK']
  },
  {
    zoneId: 'BIA1',
    name: 'Biak',
    countryCode: 'ID',
    latitude: -1.1900200, longitude: 136.1080020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WABB', 'WABO', 'WABF', 'WASC']
  },
  {
    zoneId: 'NAB',
    name: 'Nabire',
    countryCode: 'ID',
    latitude: -3.3979730, longitude: 135.3930710,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WABI', 'WABP', 'WASK', 'WABD', 'WABG', 'WABN', 'WABT', 'WASW']
  },
  {
    zoneId: 'TER2',
    name: 'Ternate',
    countryCode: 'ID',
    latitude: 0.8310120, longitude: 127.3816110,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAEE', 'WAEW', 'WAMA', 'WAME', 'WAMK', 'WAPH']
  },
  {
    zoneId: 'PAL2',
    name: 'Palu',
    countryCode: 'ID',
    latitude: -0.9164620, longitude: 119.9086470,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAFF', 'WAFP', 'WAFJ', 'WAFM', 'WAFU']
  },
  {
    zoneId: 'LUW',
    name: 'Luwok',
    countryCode: 'ID',
    latitude: -1.0358930, longitude: 122.7739340,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAFW', 'WAMG', 'WAMP', 'WAPT']
  },
  {
    zoneId: 'PAL3',
    name: 'Palangkaraya',
    countryCode: 'ID',
    latitude: -2.2271460, longitude: 113.9433880,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAGG', 'WAOO', 'WAGF', 'WAOS', 'WAOW']
  },
  {
    zoneId: 'OKS',
    name: 'Oksibil',
    countryCode: 'ID',
    latitude: -4.9071000, longitude: 140.6277000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAJO', 'WAKT', 'WAVV', 'WAKD', 'WAKQ']
  },
  {
    zoneId: 'MER',
    name: 'Merauke',
    countryCode: 'ID',
    latitude: -8.5238980, longitude: 140.4196930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAKK', 'WAKE', 'WAKO']
  },
  {
    zoneId: 'TAR3',
    name: 'Tarakan',
    countryCode: 'ID',
    latitude: 3.3251450, longitude: 117.5641690,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WALR', 'WAQT', 'WALG', 'WALV', 'WAQC', 'WAQM', 'WRLB', 'WRLF']
  },
  {
    zoneId: 'TAB2',
    name: 'Tabukan Utara, Sangihe Islands',
    countryCode: 'ID',
    latitude: 3.6847800, longitude: 125.5271620,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAMH', 'WAMN']
  },
  {
    zoneId: 'LAN',
    name: 'Langgur',
    countryCode: 'ID',
    latitude: -5.7602780, longitude: 132.7594440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAPF', 'WAPD', 'WAPK']
  },
  {
    zoneId: 'FAK',
    name: 'Fakfak',
    countryCode: 'ID',
    latitude: -2.9205080, longitude: 132.2670110,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WASF', 'WASO', 'WASA', 'WASB', 'WASI', 'WASM', 'WAST', 'WASU']
  },
  {
    zoneId: 'MAN9',
    name: 'Manokwari',
    countryCode: 'ID',
    latitude: -0.8918330, longitude: 134.0489960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WASR', 'WASE']
  },
  {
    zoneId: 'SOR1',
    name: 'Sorong',
    countryCode: 'ID',
    latitude: -0.8940000, longitude: 131.2870000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WASS', 'WASN']
  },
  {
    zoneId: 'WAN',
    name: 'Wangi-wangi Island',
    countryCode: 'ID',
    latitude: -5.2921230, longitude: 123.6362330,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAWD', 'WA44', 'WAWB', 'WAWR', 'WAWW']
  },
  {
    zoneId: 'KOL2',
    name: 'Kolaka',
    countryCode: 'ID',
    latitude: -4.3381580, longitude: 121.5240470,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WAWP', 'WAFD', 'WAWS']
  },
  {
    zoneId: 'PEK1',
    name: 'Pekanbaru',
    countryCode: 'ID',
    latitude: 0.4586470, longitude: 101.4443210,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WIBB', 'WIBD', 'WIBJ', 'WIPT', 'WIDE', 'WIMF']
  },
  {
    zoneId: 'KER3',
    name: 'Kertajati',
    countryCode: 'ID',
    latitude: -6.6473840, longitude: 108.1655610,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WICA', 'WICD', 'WICM']
  },
  {
    zoneId: 'BAN3',
    name: 'Bandar Lampung',
    countryCode: 'ID',
    latitude: -5.2468030, longitude: 105.1825310,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WILL', 'WILP']
  },
  {
    zoneId: 'GUN',
    name: 'Gunungsitoli',
    countryCode: 'ID',
    latitude: 1.1662800, longitude: 97.7043270,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WIMB', 'WIME', 'WIMS', 'WITG']
  },
  {
    zoneId: 'NAN1',
    name: 'Nanga Pinoh-Borneo Island',
    countryCode: 'ID',
    latitude: -0.3486400, longitude: 111.7461550,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WIOG', 'WIOP', 'WIOS']
  },
  {
    zoneId: 'RAN2',
    name: 'Ranai-Natuna Besar Island',
    countryCode: 'ID',
    latitude: 3.9087100, longitude: 108.3880000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WION']
  },
  {
    zoneId: 'PAN3',
    name: 'Pangkal Pinang',
    countryCode: 'ID',
    latitude: -2.1622000, longitude: 106.1390000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WIPK', 'WIPP', 'WIOD']
  },
  {
    zoneId: 'BEN2',
    name: 'Bengkulu',
    countryCode: 'ID',
    latitude: -3.8637000, longitude: 102.3389970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WIPL', 'WIPQ', 'WIGM', 'WIPB', 'WIPY']
  },
  {
    zoneId: 'KUA',
    name: 'Kuala Pesisir',
    countryCode: 'ID',
    latitude: 4.0409980, longitude: 96.2533120,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WITC', 'WITK', 'WITL', 'WITT', 'WIMA']
  },
  {
    zoneId: 'KAR2',
    name: 'Karubaga',
    countryCode: 'ID',
    latitude: -3.6846150, longitude: 138.4790180,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['WABK', 'WABL', 'WAJB', 'WAJC', 'WAJM']
  },
  {
    zoneId: 'PAL4',
    name: 'Palibelo, Bima',
    countryCode: 'ID',
    latitude: -8.5371840, longitude: 118.6850020,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['WADB', 'WADS', 'WADT', 'WADU', 'WADW', 'WATG', 'WATO']
  },
  {
    zoneId: 'ATA1',
    name: 'Atambua',
    countryCode: 'ID',
    latitude: -9.0748410, longitude: 124.9032850,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['WATA', 'WATM', 'WATT', 'WATW']
  },
  {
    zoneId: 'SOA',
    name: 'Soa, Ngada',
    countryCode: 'ID',
    latitude: -8.7077700, longitude: 121.0582430,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['WATB', 'WATC', 'WATE', 'WATL', 'WATS']
  },
  {
    zoneId: 'KUC',
    name: 'Kuching',
    countryCode: 'MY',
    latitude: 1.4873640, longitude: 110.3528590,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WBGG', 'WBGS', 'WBGN', 'WBTM']
  },
  {
    zoneId: 'KOT1',
    name: 'Kota Kinabalu',
    countryCode: 'MY',
    latitude: 5.9327430, longitude: 116.0493240,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WBKK', 'WBGJ', 'WBKL', 'WBGD', 'WBGU', 'WBGW', 'WBKE', 'WBKG', 'WBKN', 'WBKO', 'WBKP', 'WBKR', 'WBKT']
  },
  {
    zoneId: 'IPO',
    name: 'Ipoh',
    countryCode: 'MY',
    latitude: 4.5673300, longitude: 101.0916430,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WMKI', 'WMKP', 'WMKA', 'WMKB', 'WMKC', 'WMAN', 'WMBA', 'WMBI', 'WMPA']
  },
  {
    zoneId: 'JOH',
    name: 'Johor Bahru',
    countryCode: 'MY',
    latitude: 1.6413100, longitude: 103.6699980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WMKJ', 'WMBT', 'WMAU']
  },
  {
    zoneId: 'BIN',
    name: 'Bintulu',
    countryCode: 'MY',
    latitude: 3.1238501, longitude: 113.0199966,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WBGB', 'WBGK', 'WBGM', 'WBGR', 'WBGC', 'WBGL', 'WBGP']
  },
  {
    zoneId: 'BAR6',
    name: 'Bario',
    countryCode: 'MY',
    latitude: 3.7346480, longitude: 115.4785480,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WBGZ', 'WBMU', 'WBGF', 'WBGI', 'WBGQ']
  },
  {
    zoneId: 'LAH',
    name: 'Lahad Datu',
    countryCode: 'MY',
    latitude: 5.0324100, longitude: 118.3237600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WBKD', 'WBKS', 'WBKW', 'WBKA', 'WBKH', 'WBKM']
  },
  {
    zoneId: 'KUA1',
    name: 'Kuantan',
    countryCode: 'MY',
    latitude: 3.7753899, longitude: 103.2089996,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WMKD', 'WMKE', 'WMKN']
  },
  {
    zoneId: 'LAN1',
    name: 'Langkawi',
    countryCode: 'MY',
    latitude: 6.3297300, longitude: 99.7286987,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['WMKL']
  },
  {
    zoneId: 'BAN4',
    name: 'Bandar Seri Begawan',
    countryCode: 'BN',
    latitude: 4.9442000, longitude: 114.9280010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WBSB']
  },

  // --- EAST ASIA ---
  {
    zoneId: 'KAO',
    name: 'Kaohsiung (Xiaogang)',
    countryCode: 'TW',
    latitude: 22.5771010, longitude: 120.3499980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RCKH', 'RCNN', 'RCFN', 'RCKU', 'RCKW', 'RCLY', 'RCQC', 'RCSQ', 'RCCM', 'RCGI', 'RCWA']
  },
  {
    zoneId: 'SHA3',
    name: 'Shang-I',
    countryCode: 'TW',
    latitude: 24.4279000, longitude: 118.3590010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RCBS']
  },
  {
    zoneId: 'MAT3',
    name: 'Matsu (Nangan)',
    countryCode: 'TW',
    latitude: 26.1596560, longitude: 119.9583760,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RCFG', 'RCMT']
  },
  {
    zoneId: 'KAG',
    name: 'Kagoshima',
    countryCode: 'JP',
    latitude: 31.8034000, longitude: 130.7189940,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RJFK', 'RJFM', 'RJFC', 'RJFE', 'RJFG']
  },
  {
    zoneId: 'KAN1',
    name: 'Kanazawa',
    countryCode: 'JP',
    latitude: 36.3934070, longitude: 136.4068950,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RJNK', 'RJAF', 'RJNF', 'RJNT', 'RJNW']
  },
  {
    zoneId: 'HIR',
    name: 'Hiroshima',
    countryCode: 'JP',
    latitude: 34.4361000, longitude: 132.9190060,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RJOA', 'RJOK', 'RJOM', 'RJNO', 'RJOC', 'RJOH', 'RJOI', 'RJOR', 'RJOW']
  },
  {
    zoneId: 'AOM',
    name: 'Aomori',
    countryCode: 'JP',
    latitude: 40.7337770, longitude: 140.6894770,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RJSA', 'RJEO', 'RJSH', 'RJSI', 'RJSK', 'RJSM', 'RJSR']
  },
  {
    zoneId: 'NII',
    name: 'Niigata',
    countryCode: 'JP',
    latitude: 37.9541660, longitude: 139.1121890,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RJSN', 'RJSS', 'RJSC', 'RJSD', 'RJSF', 'RJSY']
  },
  {
    zoneId: 'OGA',
    name: 'Ogasawara',
    countryCode: 'JP',
    latitude: 24.7841530, longitude: 141.3226100,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RJAW']
  },
  {
    zoneId: 'OBI',
    name: 'Obihiro',
    countryCode: 'JP',
    latitude: 42.7332993, longitude: 143.2169952,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RJCB', 'RJCK', 'RJCM', 'RJCN', 'RJEB']
  },
  {
    zoneId: 'WAK',
    name: 'Wakkanai',
    countryCode: 'JP',
    latitude: 45.4042015, longitude: 141.8009949,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RJCW', 'RJER', 'RJCR']
  },
  {
    zoneId: 'AMA1',
    name: 'Amami',
    countryCode: 'JP',
    latitude: 28.4305992, longitude: 129.7129974,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RJKA', 'RJKB', 'RJKI', 'RJKN']
  },
  {
    zoneId: 'HAC',
    name: 'Hachijojima',
    countryCode: 'JP',
    latitude: 33.1148430, longitude: 139.7856450,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['RJTH', 'RJTQ']
  },
  {
    zoneId: 'ISH',
    name: 'Ishigaki',
    countryCode: 'JP',
    latitude: 24.3963890, longitude: 124.2450000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ROIG', 'ROMY', 'RORS', 'RORT', 'ROYN', 'RORH']
  },
  {
    zoneId: 'MIN1',
    name: 'Minamidaito',
    countryCode: 'JP',
    latitude: 25.8465000, longitude: 131.2630000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ROMD', 'RORK']
  },
  {
    zoneId: 'MUA1',
    name: 'Muan (Piseo-ri)',
    countryCode: 'KR',
    latitude: 34.9914060, longitude: 126.3828140,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RKJB', 'RKJJ', 'RKJK', 'RKJU']
  },
  {
    zoneId: 'GON',
    name: 'Gonghang-ro',
    countryCode: 'KR',
    latitude: 38.0604810, longitude: 128.6698220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['RKNY', 'RKNN', 'RKTY', 'RKTL']
  },
  {
    zoneId: 'DAT',
    name: 'Datong',
    countryCode: 'CN',
    latitude: 40.0613900, longitude: 113.4805090,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZBDT', 'ZBHH', 'ZBUC', 'ZBZJ', 'ZBSG', 'ZBXZ']
  },
  {
    zoneId: 'HAI',
    name: 'Hailar',
    countryCode: 'CN',
    latitude: 49.2086160, longitude: 119.8223010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZBLA', 'ZBES', 'ZBMZ']
  },
  {
    zoneId: 'BAO',
    name: 'Baotou',
    countryCode: 'CN',
    latitude: 40.5600010, longitude: 109.9970020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZBOW', 'ZBDS', 'ZBYZ']
  },
  {
    zoneId: 'SHI1',
    name: 'Shijiazhuang',
    countryCode: 'CN',
    latitude: 38.2807010, longitude: 114.6969990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZBSJ', 'ZBYN', 'ZBHD', 'ZBXT']
  },
  {
    zoneId: 'YUN',
    name: 'Yuncheng (Yanhu)',
    countryCode: 'CN',
    latitude: 35.1178230, longitude: 111.0340230,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZBYC', 'ZBLF', 'ZHLY', 'ZLYA']
  },
  {
    zoneId: 'GUI',
    name: 'Guilin (Lingui)',
    countryCode: 'CN',
    latitude: 25.2198280, longitude: 110.0395530,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZGKL', 'ZGLG', 'ZGSY', 'ZGZH', 'ZUNP', 'ZULB']
  },
  {
    zoneId: 'NAN2',
    name: 'Nanning (Jiangnan)',
    countryCode: 'CN',
    latitude: 22.5980710, longitude: 108.1819220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZGNN', 'ZGBH', 'ZGBS', 'ZGYL']
  },
  {
    zoneId: 'ZHE1',
    name: 'Zhengzhou',
    countryCode: 'CN',
    latitude: 34.5264970, longitude: 113.8491650,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZHCC', 'ZHXY', 'ZSHZ', 'ZBCZ', 'ZHAY', 'ZHNY', 'ZHQQ']
  },
  {
    zoneId: 'HAI1',
    name: 'Haikou (Meilan)',
    countryCode: 'CN',
    latitude: 19.9349000, longitude: 110.4590000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZJHK', 'ZJSY', 'ZGZJ', 'ZJQH']
  },
  {
    zoneId: 'DUN2',
    name: 'Dunhuang',
    countryCode: 'CN',
    latitude: 40.1640410, longitude: 94.8117220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZLDH']
  },
  {
    zoneId: 'JIA',
    name: 'Jiayuguan',
    countryCode: 'CN',
    latitude: 39.8590520, longitude: 98.3393440,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZLJQ']
  },
  {
    zoneId: 'LAN2',
    name: 'Lanzhou (Yongdeng)',
    countryCode: 'CN',
    latitude: 36.5152020, longitude: 103.6200030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZLLL', 'ZLXN', 'ZLXH', 'ZLZW']
  },
  {
    zoneId: 'NAN3',
    name: 'Nanchang',
    countryCode: 'CN',
    latitude: 28.8648150, longitude: 115.9027100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZSCN', 'ZSAQ', 'ZSJD', 'ZSSR', 'ZSJJ']
  },
  {
    zoneId: 'FUZ',
    name: 'Fuzhou (Changle)',
    countryCode: 'CN',
    latitude: 25.9292540, longitude: 119.6725240,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZSFZ', 'ZSSM']
  },
  {
    zoneId: 'JIN',
    name: 'Jinan (Licheng)',
    countryCode: 'CN',
    latitude: 36.8572010, longitude: 117.2160030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZSJN', 'ZSDY', 'ZSJG']
  },
  {
    zoneId: 'LIA',
    name: 'Lianyungang',
    countryCode: 'CN',
    latitude: 34.4140600, longitude: 119.1789900,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZSLG', 'ZSLY', 'ZSSH', 'ZSXZ', 'ZSYN']
  },
  {
    zoneId: 'WEN',
    name: 'Wenzhou (Longwan)',
    countryCode: 'CN',
    latitude: 27.9105720, longitude: 120.8534650,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZSWZ', 'ZSLQ']
  },
  {
    zoneId: 'YAN1',
    name: 'Yantai',
    countryCode: 'CN',
    latitude: 37.6597240, longitude: 120.9781240,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZSYT', 'ZSWH']
  },
  {
    zoneId: 'GUI1',
    name: 'Guiyang (Nanming)',
    countryCode: 'CN',
    latitude: 26.5418050, longitude: 106.8040200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZUGY', 'ZGHC', 'ZUAS', 'ZUBJ', 'ZUDJ', 'ZUKJ', 'ZUMT', 'ZUPS', 'ZUZY']
  },
  {
    zoneId: 'SHA4',
    name: 'Shannan (Gonggar)',
    countryCode: 'CN',
    latitude: 29.2980010, longitude: 90.9119510,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZULS', 'ZURK', 'ZUSH']
  },
  {
    zoneId: 'WWW',
    name: 'Ürümqi',
    countryCode: 'CN',
    latitude: 43.9126000, longitude: 87.4794720,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZWWW', 'ZWTL', 'ZWHZ']
  },
  {
    zoneId: 'CHA6',
    name: 'Changchun',
    countryCode: 'CN',
    latitude: 43.9962010, longitude: 125.6849980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZYCC', 'ZYSQ', 'ZYTN', 'ZYJL']
  },
  {
    zoneId: 'CHE5',
    name: 'Chengde',
    countryCode: 'CN',
    latitude: 41.1225000, longitude: 118.0738890,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBCD', 'ZBCF', 'ZBDH', 'ZYCY']
  },
  {
    zoneId: 'ERE',
    name: 'Erenhot',
    countryCode: 'CN',
    latitude: 43.4240790, longitude: 112.0910810,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBER']
  },
  {
    zoneId: 'HOL',
    name: 'Holingol',
    countryCode: 'CN',
    latitude: 45.4872220, longitude: 119.4072220,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBHZ', 'ZBUL']
  },
  {
    zoneId: 'LL',
    name: 'Lüliang',
    countryCode: 'CN',
    latitude: 37.6833330, longitude: 111.1427780,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBLL', 'ZLYL']
  },
  {
    zoneId: 'TON1',
    name: 'Tongliao',
    countryCode: 'CN',
    latitude: 43.5567020, longitude: 122.1999970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBTL']
  },
  {
    zoneId: 'XIL',
    name: 'Xilinhot',
    countryCode: 'CN',
    latitude: 43.9155998, longitude: 115.9639969,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBXH']
  },
  {
    zoneId: 'ZHA',
    name: 'Zhalantun',
    countryCode: 'CN',
    latitude: 47.8659420, longitude: 122.7686620,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZBZL', 'ZYQQ', 'ZYDQ']
  },
  {
    zoneId: 'CHA7',
    name: 'Changde (Dingcheng)',
    countryCode: 'CN',
    latitude: 28.9189000, longitude: 111.6399990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZGCD', 'ZHJZ', 'ZHYC', 'ZGDY', 'ZGXX']
  },
  {
    zoneId: 'HUA1',
    name: 'Huaihua',
    countryCode: 'CN',
    latitude: 27.4430870, longitude: 109.7046660,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZGCJ', 'ZUTR']
  },
  {
    zoneId: 'CHE6',
    name: 'Chenzhou',
    countryCode: 'CN',
    latitude: 25.7534190, longitude: 112.8454040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZGCZ', 'ZGHY', 'ZSGZ']
  },
  {
    zoneId: 'JIE',
    name: 'Jieyang (Rongcheng)',
    countryCode: 'CN',
    latitude: 23.5520000, longitude: 116.5033000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZGOW', 'ZGMX', 'ZGXN']
  },
  {
    zoneId: 'TAN1',
    name: 'Tangbu',
    countryCode: 'CN',
    latitude: 23.4031600, longitude: 111.0933100,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZGWZ']
  },
  {
    zoneId: 'ENS',
    name: 'Enshi (Enshi)',
    countryCode: 'CN',
    latitude: 30.3202990, longitude: 109.4850010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZHES', 'ZHSN', 'ZUDA', 'ZUQJ', 'ZUDX', 'ZULP', 'ZUWS', 'ZUWX']
  },
  {
    zoneId: 'XIA',
    name: 'Xiangyang (Laohekou)',
    countryCode: 'CN',
    latitude: 32.3886600, longitude: 111.6942500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZHGH', 'ZHSY', 'ZHXF']
  },
  {
    zoneId: 'GOL',
    name: 'Golog (Maqên)',
    countryCode: 'CN',
    latitude: 34.4180660, longitude: 100.3011440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLGL']
  },
  {
    zoneId: 'GOL1',
    name: 'Golmud',
    countryCode: 'CN',
    latitude: 36.4006000, longitude: 94.7861020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLGM']
  },
  {
    zoneId: 'GUY',
    name: 'Guyuan (Yuanzhou)',
    countryCode: 'CN',
    latitude: 36.0788890, longitude: 106.2169440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLGY', 'ZLQY', 'ZLTS']
  },
  {
    zoneId: 'MEN2',
    name: 'Mengnai',
    countryCode: 'CN',
    latitude: 38.2016450, longitude: 90.8378430,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLHX']
  },
  {
    zoneId: 'YIN',
    name: 'Yinchuan',
    countryCode: 'CN',
    latitude: 38.3227580, longitude: 106.3932140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLIC', 'ZBUH']
  },
  {
    zoneId: 'LON3',
    name: 'Longnan (Cheng)',
    countryCode: 'CN',
    latitude: 33.7899180, longitude: 105.7900140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLLN', 'ZUGU', 'ZUJZ', 'ZLHZ']
  },
  {
    zoneId: 'YUS',
    name: 'Yushu (Batang)',
    countryCode: 'CN',
    latitude: 32.8363890, longitude: 97.0363890,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLYS']
  },
  {
    zoneId: 'ZHA1',
    name: 'Zhangye (Ganzhou)',
    countryCode: 'CN',
    latitude: 38.8018990, longitude: 100.6750030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZLZY', 'ZLHB', 'ZLJC']
  },
  {
    zoneId: 'BAO1',
    name: 'Baoshan (Longyang)',
    countryCode: 'CN',
    latitude: 25.0533010, longitude: 99.1682970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZPBS', 'ZPCW', 'ZPDL', 'ZPLC', 'ZPLJ', 'ZPMS', 'ZUTC']
  },
  {
    zoneId: 'DIQ',
    name: 'Diqing (Shangri-La)',
    countryCode: 'CN',
    latitude: 27.7936000, longitude: 99.6772000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZPDQ', 'ZUDC']
  },
  {
    zoneId: 'JIN1',
    name: 'Jinghong (Gasa)',
    countryCode: 'CN',
    latitude: 21.9746480, longitude: 100.7622240,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZPJH', 'ZPJM', 'ZPSM']
  },
  {
    zoneId: 'BEN4',
    name: 'Bengbu',
    countryCode: 'CN',
    latitude: 32.8477330, longitude: 117.3202440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZSBB', 'ZSFY', 'ZSOF']
  },
  {
    zoneId: 'QUZ',
    name: 'Quzhou (Kezheng)',
    countryCode: 'CN',
    latitude: 28.9661300, longitude: 118.8987930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZSJU', 'ZSTX', 'ZSWY']
  },
  {
    zoneId: 'LON4',
    name: 'Longyan (Liancheng)',
    countryCode: 'CN',
    latitude: 25.6759200, longitude: 116.7459070,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZSLO']
  },
  {
    zoneId: 'RUG',
    name: 'Rugao (Nantong)',
    countryCode: 'CN',
    latitude: 32.2583410, longitude: 120.5011310,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZSRG']
  },
  {
    zoneId: 'SHI2',
    name: 'Shiquanhe',
    countryCode: 'CN',
    latitude: 32.0979400, longitude: 80.0539710,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUAL']
  },
  {
    zoneId: 'BAN5',
    name: 'Bangda',
    countryCode: 'CN',
    latitude: 30.5536003, longitude: 97.1082993,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUBD']
  },
  {
    zoneId: 'NGA',
    name: 'Ngawa (Hongyuan)',
    countryCode: 'CN',
    latitude: 32.5315400, longitude: 102.3522400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUHY']
  },
  {
    zoneId: 'GAR',
    name: 'Garzê (Kangding)',
    countryCode: 'CN',
    latitude: 30.1424640, longitude: 101.7387200,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUKD']
  },
  {
    zoneId: 'NYI',
    name: 'Nyingchi (Mainling)',
    countryCode: 'CN',
    latitude: 29.3033010, longitude: 94.3352970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUNZ']
  },
  {
    zoneId: 'LIA1',
    name: 'Liangshan (Xichang)',
    countryCode: 'CN',
    latitude: 27.9891000, longitude: 102.1839980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUXC', 'ZUZH']
  },
  {
    zoneId: 'YIB',
    name: 'Yibin (Cuiping)',
    countryCode: 'CN',
    latitude: 28.8584310, longitude: 104.5261570,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUYB']
  },
  {
    zoneId: 'XIN',
    name: 'Xingyi',
    countryCode: 'CN',
    latitude: 25.0834230, longitude: 104.9608040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZUYI', 'ZPWS']
  },
  {
    zoneId: 'AKS',
    name: 'Aksu (Onsu)',
    countryCode: 'CN',
    latitude: 41.2625010, longitude: 80.2917020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWAK', 'ZWAL', 'ZWKC']
  },
  {
    zoneId: 'ALT4',
    name: 'Altay',
    countryCode: 'CN',
    latitude: 47.7498860, longitude: 88.0858080,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWAT', 'ZWFY', 'ZWKN']
  },
  {
    zoneId: 'BOL',
    name: 'Bole',
    countryCode: 'CN',
    latitude: 44.8954610, longitude: 82.3000700,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWBL', 'ZWNL', 'ZWKM', 'ZWTC', 'ZWYN']
  },
  {
    zoneId: 'QIE',
    name: 'Qiemo',
    countryCode: 'CN',
    latitude: 38.2345160, longitude: 85.4654620,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWCM']
  },
  {
    zoneId: 'HAM2',
    name: 'Hami',
    countryCode: 'CN',
    latitude: 42.8414000, longitude: 93.6691970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWHM']
  },
  {
    zoneId: 'KOR1',
    name: 'Korla',
    countryCode: 'CN',
    latitude: 41.6149790, longitude: 86.1408170,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWKL']
  },
  {
    zoneId: 'RUO',
    name: 'Ruoqiang Town',
    countryCode: 'CN',
    latitude: 38.9747220, longitude: 88.0083330,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWRQ']
  },
  {
    zoneId: 'SHA5',
    name: 'Shache',
    countryCode: 'CN',
    latitude: 38.2454200, longitude: 77.0561490,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWSC', 'ZWSH']
  },
  {
    zoneId: 'SHA6',
    name: 'Shanshan',
    countryCode: 'CN',
    latitude: 42.9117010, longitude: 90.2474980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWSS']
  },
  {
    zoneId: 'HOT',
    name: 'Hotan',
    countryCode: 'CN',
    latitude: 37.0385017, longitude: 79.8648987,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZWTN', 'ZWYT']
  },
  {
    zoneId: 'BAI3',
    name: 'Baicheng',
    countryCode: 'CN',
    latitude: 45.5052780, longitude: 123.0197220,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYBA']
  },
  {
    zoneId: 'BAI4',
    name: 'Baishan',
    countryCode: 'CN',
    latitude: 42.0669440, longitude: 127.6022220,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYBS', 'ZYYJ']
  },
  {
    zoneId: 'DAN',
    name: 'Dandong (Zhenxing)',
    countryCode: 'CN',
    latitude: 40.0254530, longitude: 124.2866900,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYDD', 'ZYYK']
  },
  {
    zoneId: 'HEI',
    name: 'Heihe',
    countryCode: 'CN',
    latitude: 48.4410370, longitude: 126.1283740,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYDU', 'ZYHE']
  },
  {
    zoneId: 'FUY',
    name: 'Fuyuan',
    countryCode: 'CN',
    latitude: 48.1972190, longitude: 134.3629800,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYFY', 'ZYJS']
  },
  {
    zoneId: 'JIA1',
    name: 'Jiagedaqi',
    countryCode: 'CN',
    latitude: 50.3713890, longitude: 124.1175000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYJD']
  },
  {
    zoneId: 'JIA2',
    name: 'Jiamusi',
    countryCode: 'CN',
    latitude: 46.8433990, longitude: 130.4649960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYJM', 'ZYJX', 'ZYLD']
  },
  {
    zoneId: 'JIN2',
    name: 'Jinzhou (Linghai)',
    countryCode: 'CN',
    latitude: 40.9360320, longitude: 121.2771140,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYJZ', 'ZYXC']
  },
  {
    zoneId: 'MUD',
    name: 'Mudanjiang',
    countryCode: 'CN',
    latitude: 44.5251720, longitude: 129.5686340,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYMD', 'ZYSD']
  },
  {
    zoneId: 'MOH',
    name: 'Mohe',
    countryCode: 'CN',
    latitude: 52.9168710, longitude: 122.4227590,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZYMH']
  },

  // --- SOUTH AMERICA ---
  {
    zoneId: 'CAL',
    name: 'Cali',
    countryCode: 'CO',
    latitude: 3.5427170, longitude: -76.3818980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SKCL', 'SKAR', 'SKBU', 'SKGO', 'SKGP', 'SKNV', 'SKPE', 'SKPI', 'SKPP', 'SKUL', 'SKCD', 'SKHA', 'SKMB']
  },
  {
    zoneId: 'EL7',
    name: 'El Bagre',
    countryCode: 'CO',
    latitude: 7.5964700, longitude: -74.8089000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKEB', 'SKBC', 'SKBG', 'SKCU', 'SKEJ', 'SKLC', 'SKMR', 'SKOC', 'SKAG', 'SKCM', 'SKIG', 'SKML', 'SKMP', 'SKRU', 'SKSR']
  },
  {
    zoneId: 'PUE2',
    name: 'Puerto Asís',
    countryCode: 'CO',
    latitude: 0.5052280, longitude: -76.5008000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKAS', 'SKFL', 'SKIP', 'SKPS', 'SKTQ', 'SKLG', 'SKVG']
  },
  {
    zoneId: 'BAH2',
    name: 'Bahía Solano',
    countryCode: 'CO',
    latitude: 6.2029200, longitude: -77.3947000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKBS', 'SKCP', 'SKJU', 'SKNQ']
  },
  {
    zoneId: 'CC',
    name: 'Cúcuta',
    countryCode: 'CO',
    latitude: 7.9275700, longitude: -72.5115000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKCC', 'SKTM', 'SKUC', 'SKAT', 'SKHC', 'SKSA', 'SKTB']
  },
  {
    zoneId: 'TUM',
    name: 'Tumaco',
    countryCode: 'CO',
    latitude: 1.8144200, longitude: -78.7492000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKCO', 'SKEH']
  },
  {
    zoneId: 'LA3',
    name: 'La Mina-Maicao',
    countryCode: 'CO',
    latitude: 11.2325000, longitude: -72.4901000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKLM', 'SKRH', 'SKSM', 'SKVP']
  },
  {
    zoneId: 'LET1',
    name: 'Leticia',
    countryCode: 'CO',
    latitude: -4.1935500, longitude: -69.9432000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKLT', 'SKRA']
  },
  {
    zoneId: 'MIT',
    name: 'Mitú',
    countryCode: 'CO',
    latitude: 1.2536600, longitude: -70.2339000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKMU', 'SKCR', 'SKMF']
  },
  {
    zoneId: 'PUE3',
    name: 'Puerto Carreño',
    countryCode: 'CO',
    latitude: 6.1847200, longitude: -67.4932000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKPC']
  },
  {
    zoneId: 'PUE4',
    name: 'Puerto Inírida',
    countryCode: 'CO',
    latitude: 3.8535300, longitude: -67.9062000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKPD', 'SKBM']
  },
  {
    zoneId: 'PRO',
    name: 'Providencia',
    countryCode: 'CO',
    latitude: 13.3574610, longitude: -81.3579770,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKPV', 'SKSP']
  },
  {
    zoneId: 'PAZ',
    name: 'Paz De Ariporo',
    countryCode: 'CO',
    latitude: 5.8761500, longitude: -71.8866000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKPZ', 'SKYP', 'SKCI', 'SKCN', 'SKGA', 'SKIM', 'SKOE', 'SKPA', 'SKSL', 'SKSO', 'SKTA', 'SKTD']
  },
  {
    zoneId: 'SAN10',
    name: 'San José Del Guaviare',
    countryCode: 'CO',
    latitude: 2.5796900, longitude: -72.6394000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKSJ', 'SKNA', 'SKUB', 'SKYA']
  },
  {
    zoneId: 'SAN11',
    name: 'San Vicente Del Caguán',
    countryCode: 'CO',
    latitude: 2.1521700, longitude: -74.7663000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SKSV']
  },
  {
    zoneId: 'ACA1',
    name: 'Acandí',
    countryCode: 'CO',
    latitude: 8.4978470, longitude: -77.2741060,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SKAD', 'SKCA', 'SKNC']
  },
  {
    zoneId: 'ROS',
    name: 'Rosario',
    countryCode: 'AR',
    latitude: -32.9036000, longitude: -60.7850000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SAAR', 'SAAG', 'SAAP', 'SAAV', 'SAFR']
  },
  {
    zoneId: 'MEN1',
    name: 'Mendoza',
    countryCode: 'AR',
    latitude: -32.8316990, longitude: -68.7929000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SAME', 'SAMR', 'SANU']
  },
  {
    zoneId: 'COM',
    name: 'Comodoro Rivadavia',
    countryCode: 'AR',
    latitude: -45.7869410, longitude: -67.4633550,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SAVC', 'SAVH', 'SAVM', 'SAWM']
  },
  {
    zoneId: 'EL8',
    name: 'El Calafate',
    countryCode: 'AR',
    latitude: -50.2819970, longitude: -72.0539490,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SAWC', 'SAWR', 'SAWT']
  },
  {
    zoneId: 'RIO',
    name: 'Rio Gallegos',
    countryCode: 'AR',
    latitude: -51.6087910, longitude: -69.3089480,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SAWG', 'SAWU']
  },
  {
    zoneId: 'SAN12',
    name: 'San Carlos de Bariloche',
    countryCode: 'AR',
    latitude: -41.1511990, longitude: -71.1575010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SAZS', 'SAVB', 'SAVE', 'SAZY', 'SAVD', 'SAVJ', 'SAVQ']
  },
  {
    zoneId: 'CON1',
    name: 'Concordia',
    countryCode: 'AR',
    latitude: -31.2969000, longitude: -57.9966000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAAC', 'SARL', 'SARM', 'SATU']
  },
  {
    zoneId: 'RIN',
    name: 'Rincon de los Sauces',
    countryCode: 'AR',
    latitude: -37.3905980, longitude: -68.9041980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAHS', 'SAHZ', 'SAMM', 'SAZN', 'SAZW', 'SAHC', 'SAHE', 'SAHR']
  },
  {
    zoneId: 'CAT',
    name: 'Catamarca',
    countryCode: 'AR',
    latitude: -28.5931170, longitude: -65.7512000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SANC', 'SANE', 'SANL', 'SANR', 'SANT']
  },
  {
    zoneId: 'RIO1',
    name: 'Rio Cuarto',
    countryCode: 'AR',
    latitude: -33.0850980, longitude: -64.2612990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAOC', 'SAOR', 'SAOU']
  },
  {
    zoneId: 'COR6',
    name: 'Corrientes',
    countryCode: 'AR',
    latitude: -27.4455000, longitude: -58.7619000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SARC', 'SARE', 'SARF', 'SATG', 'SATR', 'SARS', 'SATM']
  },
  {
    zoneId: 'PUE5',
    name: 'Puerto Iguazu',
    countryCode: 'AR',
    latitude: -25.7373010, longitude: -54.4734000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SARI', 'SATD']
  },
  {
    zoneId: 'POS1',
    name: 'Posadas',
    countryCode: 'AR',
    latitude: -27.3858000, longitude: -55.9707000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SARP']
  },
  {
    zoneId: 'SAL4',
    name: 'Salta',
    countryCode: 'AR',
    latitude: -24.8560009, longitude: -65.4861984,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SASA', 'SASJ']
  },
  {
    zoneId: 'OR',
    name: 'Orán',
    countryCode: 'AR',
    latitude: -23.1528000, longitude: -64.3292010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SASO', 'SAST']
  },
  {
    zoneId: 'RAW',
    name: 'Rawson',
    countryCode: 'AR',
    latitude: -43.2105000, longitude: -65.2703000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAVT', 'SAVY', 'SAVS']
  },
  {
    zoneId: 'VIE1',
    name: 'Viedma / Carmen de Patagones',
    countryCode: 'AR',
    latitude: -40.8692000, longitude: -63.0004000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAVV', 'SAVN']
  },
  {
    zoneId: 'PUE6',
    name: 'Puerto Deseado',
    countryCode: 'AR',
    latitude: -47.7353000, longitude: -65.9041000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAWD']
  },
  {
    zoneId: 'RIO2',
    name: 'Rio Grande',
    countryCode: 'AR',
    latitude: -53.7777000, longitude: -67.7494000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAWE', 'SAWH']
  },
  {
    zoneId: 'SAN13',
    name: 'San Julian',
    countryCode: 'AR',
    latitude: -49.3068160, longitude: -67.8025960,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAWJ']
  },
  {
    zoneId: 'PER2',
    name: 'Perito Moreno',
    countryCode: 'AR',
    latitude: -46.5378990, longitude: -70.9786990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAWP', 'SAVR']
  },
  {
    zoneId: 'BAH3',
    name: 'Bahía Blanca',
    countryCode: 'AR',
    latitude: -38.7250000, longitude: -62.1693000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAZB', 'SAZH', 'SAZC']
  },
  {
    zoneId: 'GEN',
    name: 'General Pico',
    countryCode: 'AR',
    latitude: -35.6962010, longitude: -63.7583010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAZG', 'SAZP', 'SAZR']
  },
  {
    zoneId: 'SAN14',
    name: 'Santa Teresita',
    countryCode: 'AR',
    latitude: -36.5423000, longitude: -56.7218000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAZL', 'SAZM', 'SAZV', 'SA14']
  },
  {
    zoneId: 'NEC',
    name: 'Necochea',
    countryCode: 'AR',
    latitude: -38.4907460, longitude: -58.8163370,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SAZO', 'SAZT', 'SAZF']
  },
  {
    zoneId: 'ARA1',
    name: 'Aracaju',
    countryCode: 'BR',
    latitude: -10.9841290, longitude: -37.0717890,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBAR', 'SBMO', 'SBUF', 'SNAL']
  },
  {
    zoneId: 'BEL1',
    name: 'Belém',
    countryCode: 'BR',
    latitude: -1.3792790, longitude: -48.4762070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBBE', 'SNSM', 'SNSW', 'SNVS']
  },
  {
    zoneId: 'MAN4',
    name: 'Manaus',
    countryCode: 'BR',
    latitude: -3.0386100, longitude: -60.0497020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBEG', 'SBIC', 'SBMN', 'SWBR']
  },
  {
    zoneId: 'FLO',
    name: 'Florianópolis',
    countryCode: 'BR',
    latitude: -27.6702790, longitude: -48.5525020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBFL', 'SBCM', 'SBLJ', 'SBNF', 'SNCP', 'SBJA', 'SIJY', 'SSLN']
  },
  {
    zoneId: 'GOI1',
    name: 'Goiânia',
    countryCode: 'BR',
    latitude: -16.6320000, longitude: -49.2206990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBGO', 'SBCN', 'SBIT']
  },
  {
    zoneId: 'POR5',
    name: 'Porto Seguro',
    countryCode: 'BR',
    latitude: -16.4384260, longitude: -39.0805840,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBPS', 'SBCV', 'SBIL', 'SBTC', 'SD6P', 'SNAR', 'SNED', 'SNIP', 'SNMU', 'SNNU', 'SNRD', 'SNTF']
  },
  {
    zoneId: 'NAT2',
    name: 'Natal',
    countryCode: 'BR',
    latitude: -5.7685390, longitude: -35.3664190,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBSG', 'SNKN']
  },
  {
    zoneId: 'SO',
    name: 'São Luís',
    countryCode: 'BR',
    latitude: -2.5863860, longitude: -44.2350080,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBSL', 'SBRR', 'SNYE', 'SNYW']
  },
  {
    zoneId: 'VIT',
    name: 'Vitória',
    countryCode: 'BR',
    latitude: -20.2580000, longitude: -40.2850000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SBVT', 'SBCP', 'SNLN', 'SDUN', 'SNCX', 'SNGA', 'SNJM', 'SNKI', 'SNMX']
  },
  {
    zoneId: 'CON2',
    name: 'Conceição do Araguaia',
    countryCode: 'BR',
    latitude: -8.3483500, longitude: -49.3014980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBAA', 'SWGN', 'SNDC']
  },
  {
    zoneId: 'BAU2',
    name: 'Bauru',
    countryCode: 'BR',
    latitude: -22.1607550, longitude: -49.0703250,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBAE', 'SBAQ', 'SBAU', 'SBBT', 'SBLN', 'SBML', 'SBRP', 'SBSR', 'SBYS', 'SDOU', 'SDSC', 'SDVG', 'SNAX', 'SSCP']
  },
  {
    zoneId: 'ALT2',
    name: 'Alta Floresta',
    countryCode: 'BR',
    latitude: -9.8663890, longitude: -56.1062980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBAT', 'SWXM']
  },
  {
    zoneId: 'ARA2',
    name: 'Araxá',
    countryCode: 'BR',
    latitude: -19.5632000, longitude: -46.9604000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBAX', 'SBUL', 'SBUR', 'SIMK', 'SNOS', 'SNPD', 'SWKT']
  },
  {
    zoneId: 'BAG',
    name: 'Bagé',
    countryCode: 'BR',
    latitude: -31.3904990, longitude: -54.1122020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBBG', 'SBPK', 'SBSM', 'SJRG', 'SSKS', 'SSRU']
  },
  {
    zoneId: 'BOA',
    name: 'Boa Vista',
    countryCode: 'BR',
    latitude: 2.8458550, longitude: -60.6909440,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBBV']
  },
  {
    zoneId: 'BAR3',
    name: 'Barra do Garças',
    countryCode: 'BR',
    latitude: -15.8614170, longitude: -52.3890080,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBBW', 'SJVO', 'SWHP', 'SWXV']
  },
  {
    zoneId: 'CAS1',
    name: 'Cascavel',
    countryCode: 'BR',
    latitude: -25.0003230, longitude: -53.5012080,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCA', 'SBFI', 'SBGU', 'SBPO', 'SBTD', 'SSCT', 'SSFB', 'SSGY', 'SSKM', 'SSOE', 'SSUM']
  },
  {
    zoneId: 'CAM3',
    name: 'Campo Grande',
    countryCode: 'BR',
    latitude: -20.4699980, longitude: -54.6739880,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCG', 'SBDB', 'SBDO']
  },
  {
    zoneId: 'CHA3',
    name: 'Chapecó',
    countryCode: 'BR',
    latitude: -27.1341990, longitude: -52.6566010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCH', 'SBNM', 'SBPF', 'SBCD', 'SNEE', 'SSAK', 'SSCK', 'SSER', 'SSHZ', 'SSIJ', 'SSJA', 'SSUV', 'SSVI', 'SSXX', 'SSZR']
  },
  {
    zoneId: 'CAR2',
    name: 'Carolina',
    countryCode: 'BR',
    latitude: -7.3204400, longitude: -47.4586980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCI', 'SBIZ', 'SNBS']
  },
  {
    zoneId: 'PAR1',
    name: 'Parauapebas',
    countryCode: 'BR',
    latitude: -6.1178410, longitude: -50.0033720,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCJ', 'SBMA', 'SDOW']
  },
  {
    zoneId: 'COR7',
    name: 'Corumbá',
    countryCode: 'BR',
    latitude: -19.0119300, longitude: -57.6727720,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCR']
  },
  {
    zoneId: 'CUI',
    name: 'Cuiabá',
    countryCode: 'BR',
    latitude: -15.6529000, longitude: -56.1166990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCY', 'SBRD', 'SDNM', 'SWDM', 'SWKC', 'SWTS']
  },
  {
    zoneId: 'CRU',
    name: 'Cruzeiro Do Sul',
    countryCode: 'BR',
    latitude: -7.5999100, longitude: -72.7695010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBCZ']
  },
  {
    zoneId: 'PRE',
    name: 'Presidente Prudente',
    countryCode: 'BR',
    latitude: -22.1751000, longitude: -51.4245990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBDN', 'SBLO', 'SBMG', 'SBTG', 'SILT', 'SSAP', 'SSOG', 'SSPI']
  },
  {
    zoneId: 'JAC2',
    name: 'Jacareacanga',
    countryCode: 'BR',
    latitude: -6.2331600, longitude: -57.7769010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBEK']
  },
  {
    zoneId: 'FER',
    name: 'Fernando de Noronha',
    countryCode: 'BR',
    latitude: -3.8545340, longitude: -32.4230170,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBFN']
  },
  {
    zoneId: 'GUA2',
    name: 'Guajará-Mirim',
    countryCode: 'BR',
    latitude: -10.7864100, longitude: -65.2848600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBGM', 'SWCQ']
  },
  {
    zoneId: 'GOV',
    name: 'Governador Valadares',
    countryCode: 'BR',
    latitude: -18.8958820, longitude: -41.9828690,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBGV', 'SBIP', 'SNDT', 'SNTO', 'SWZL']
  },
  {
    zoneId: 'ALT3',
    name: 'Altamira',
    countryCode: 'BR',
    latitude: -3.2531440, longitude: -52.2539380,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBHT', 'SNMZ', 'SNYA']
  },
  {
    zoneId: 'ITA',
    name: 'Itaituba',
    countryCode: 'BR',
    latitude: -4.2421310, longitude: -56.0006510,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBIH', 'SWMW', 'SWPI']
  },
  {
    zoneId: 'CRU1',
    name: 'Cruz',
    countryCode: 'BR',
    latitude: -2.9064250, longitude: -40.3573380,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBJE', 'SBPB', 'SN6L', 'SNWC', 'SWBE']
  },
  {
    zoneId: 'BOM1',
    name: 'Bom Jesus da Lapa',
    countryCode: 'BR',
    latitude: -13.2621000, longitude: -43.4081000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBLP', 'SNBR', 'SNGI', 'SNQU', 'SSXH']
  },
  {
    zoneId: 'MIN2',
    name: 'Minaçu',
    countryCode: 'BR',
    latitude: -13.5491000, longitude: -48.1953010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBMC', 'SWNQ', 'SWUA']
  },
  {
    zoneId: 'ALM',
    name: 'Almeirim',
    countryCode: 'BR',
    latitude: -0.8898390, longitude: -52.6022000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBMD', 'SBMQ', 'SNMA']
  },
  {
    zoneId: 'MAC',
    name: 'Macaé',
    countryCode: 'BR',
    latitude: -22.3430000, longitude: -41.7659990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBME']
  },
  {
    zoneId: 'MON',
    name: 'Montes Claros',
    countryCode: 'BR',
    latitude: -16.7069190, longitude: -43.8189010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBMK', 'SNJN', 'SNPX', 'SNUI']
  },
  {
    zoneId: 'MOS1',
    name: 'Mossoró',
    countryCode: 'BR',
    latitude: -5.2019200, longitude: -37.3643000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBMS', 'SNTS']
  },
  {
    zoneId: 'MAN5',
    name: 'Manicoré',
    countryCode: 'BR',
    latitude: -5.8113800, longitude: -61.2783010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBMY', 'SWNA', 'SWYN']
  },
  {
    zoneId: 'OIA',
    name: 'Oiapoque',
    countryCode: 'BR',
    latitude: 3.8541200, longitude: -51.7970560,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBOI']
  },
  {
    zoneId: 'PO',
    name: 'Poços De Caldas',
    countryCode: 'BR',
    latitude: -21.8425290, longitude: -46.5697680,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBPC', 'SBVG', 'SNLO', 'SSOL']
  },
  {
    zoneId: 'PAL1',
    name: 'Palmas',
    countryCode: 'BR',
    latitude: -10.2915000, longitude: -48.3569980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBPJ', 'SBPN', 'SWDN', 'SWGI']
  },
  {
    zoneId: 'PET',
    name: 'Petrolina',
    countryCode: 'BR',
    latitude: -9.3624220, longitude: -40.5690980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBPL', 'SNAB', 'SNJB']
  },
  {
    zoneId: 'PON1',
    name: 'Ponta Porã',
    countryCode: 'BR',
    latitude: -22.5496010, longitude: -55.7025990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBPP']
  },
  {
    zoneId: 'POR6',
    name: 'Porto Velho',
    countryCode: 'BR',
    latitude: -8.7078540, longitude: -63.9024200,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBPV', 'SJOG', 'SWHT', 'SWLB']
  },
  {
    zoneId: 'RIO3',
    name: 'Rio Branco',
    countryCode: 'BR',
    latitude: -9.8690310, longitude: -67.8939840,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBRB', 'SWNK']
  },
  {
    zoneId: 'SAN15',
    name: 'Santarém',
    countryCode: 'BR',
    latitude: -2.4224230, longitude: -54.7930600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBSN', 'SBTB', 'SJOH', 'SNOX', 'SNTI']
  },
  {
    zoneId: 'TER',
    name: 'Teresina',
    countryCode: 'BR',
    latitude: -5.0602500, longitude: -42.8237120,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBTE', 'SNGD', 'SNQG']
  },
  {
    zoneId: 'TEF',
    name: 'Tefé',
    countryCode: 'BR',
    latitude: -3.3829400, longitude: -64.7240980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBTF', 'SBUY', 'SWKO', 'SWOB']
  },
  {
    zoneId: 'TAR1',
    name: 'Tarauacá',
    countryCode: 'BR',
    latitude: -8.1555340, longitude: -70.7829850,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBTK', 'SNOU', 'SWEI']
  },
  {
    zoneId: 'TEL',
    name: 'Telêmaco Borba',
    countryCode: 'BR',
    latitude: -24.3178010, longitude: -50.6516000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBTL']
  },
  {
    zoneId: 'TAB1',
    name: 'Tabatinga',
    countryCode: 'BR',
    latitude: -4.2556700, longitude: -69.9357990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBTT', 'SDCG', 'SWII']
  },
  {
    zoneId: 'TUC',
    name: 'Tucuruí',
    countryCode: 'BR',
    latitude: -3.7860100, longitude: -49.7202990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBTU']
  },
  {
    zoneId: 'SO1',
    name: 'São Gabriel da Cachoeira',
    countryCode: 'BR',
    latitude: -0.1483500, longitude: -66.9855000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBUA']
  },
  {
    zoneId: 'URU',
    name: 'Uruguaiana',
    countryCode: 'BR',
    latitude: -29.7822000, longitude: -57.0382000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBUG', 'SSIQ', 'SSLT', 'SSSB']
  },
  {
    zoneId: 'VIL',
    name: 'Vilhena',
    countryCode: 'BR',
    latitude: -12.6944000, longitude: -60.0983010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SBVH', 'SSKW', 'SWJN', 'SWPM', 'SWTU']
  },
  {
    zoneId: 'JUA',
    name: 'Juazeiro do Norte',
    countryCode: 'BR',
    latitude: -7.2193200, longitude: -39.2690960,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SBJU', 'SDZG', 'SNHS', 'SNIG']
  },
  {
    zoneId: 'LEN',
    name: 'Lençóis',
    countryCode: 'BR',
    latitude: -12.4823000, longitude: -41.2770000,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SBLE', 'SNIC', 'SNJK']
  },
  {
    zoneId: 'SIN1',
    name: 'Sinop',
    countryCode: 'BR',
    latitude: -11.8850010, longitude: -55.5861090,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SBSI', 'SBSO', 'SILC']
  },
  {
    zoneId: 'JAL',
    name: 'Jales',
    countryCode: 'BR',
    latitude: -20.2922960, longitude: -50.5455460,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SDJL', 'SSCL', 'SSPN']
  },
  {
    zoneId: 'CON3',
    name: 'Confresa',
    countryCode: 'BR',
    latitude: -10.6332960, longitude: -51.5658360,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SJHG', 'SWFX', 'SWIY', 'SWPQ', 'SWVC']
  },
  {
    zoneId: 'PUN',
    name: 'Punta Arenas',
    countryCode: 'CL',
    latitude: -53.0026020, longitude: -70.8545990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SCCI', 'SCFM', 'SCNT', 'SCBI', 'SCSB']
  },
  {
    zoneId: 'ANT1',
    name: 'Antofagasta',
    countryCode: 'CL',
    latitude: -23.4452740, longitude: -70.4452320,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SCFA', 'SCBE', 'SCCF']
  },
  {
    zoneId: 'CON4',
    name: 'Concepcion',
    countryCode: 'CL',
    latitude: -36.7723500, longitude: -73.0628280,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SCIE', 'SCCH', 'SCTL', 'SCTO', 'SCGE', 'SCLN']
  },
  {
    zoneId: 'ISL1',
    name: 'Isla De Pascua',
    countryCode: 'CL',
    latitude: -27.1654110, longitude: -109.4210270,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SCIP']
  },
  {
    zoneId: 'PUE7',
    name: 'Puerto Montt',
    countryCode: 'CL',
    latitude: -41.4430930, longitude: -73.0940650,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SCTE', 'SCJO', 'SCTN', 'SCVD', 'SCAC', 'SCEV', 'SCFT', 'SCPQ', 'SCPV', 'SCST']
  },
  {
    zoneId: 'ARI',
    name: 'Arica',
    countryCode: 'CL',
    latitude: -18.3484990, longitude: -70.3386990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCAR']
  },
  {
    zoneId: 'COP',
    name: 'Copiapo',
    countryCode: 'CL',
    latitude: -27.2612000, longitude: -70.7791977,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCAT', 'SCES', 'SCLL', 'SCRA', 'SCTT']
  },
  {
    zoneId: 'BAL2',
    name: 'Balmaceda',
    countryCode: 'CL',
    latitude: -45.9159680, longitude: -71.6894990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCBA', 'SCCC', 'SCCY', 'SCHR', 'SCAS']
  },
  {
    zoneId: 'IQU',
    name: 'Iquique',
    countryCode: 'CL',
    latitude: -20.5352000, longitude: -70.1812970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCDA', 'SCKP']
  },
  {
    zoneId: 'PUE8',
    name: 'Puerto Williams',
    countryCode: 'CL',
    latitude: -54.9310990, longitude: -67.6262970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCGZ']
  },
  {
    zoneId: 'TEM',
    name: 'Temuco',
    countryCode: 'CL',
    latitude: -38.9259000, longitude: -72.6515000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCQP', 'SCTC', 'SCPC']
  },
  {
    zoneId: 'LA4',
    name: 'La Serena-Coquimbo',
    countryCode: 'CL',
    latitude: -29.9162010, longitude: -71.1995010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SCSE', 'SCCQ', 'SCOV']
  },
  {
    zoneId: 'TAC',
    name: 'Tachina',
    countryCode: 'EC',
    latitude: 0.9785190, longitude: -79.6266020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SETN', 'SESV']
  },
  {
    zoneId: 'COC1',
    name: 'Coca',
    countryCode: 'EC',
    latitude: -0.4628860, longitude: -76.9868010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SECO', 'SETR', 'SENL', 'SEPT', 'SESM', 'SETH', 'SETI']
  },
  {
    zoneId: 'ISL2',
    name: 'Isla Baltra',
    countryCode: 'EC',
    latitude: -0.4537580, longitude: -90.2659000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SEGS', 'SEII', 'SEST']
  },
  {
    zoneId: 'MAC1',
    name: 'Macará',
    countryCode: 'EC',
    latitude: -4.3782301, longitude: -79.9410019,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SEMA', 'SETM']
  },
  {
    zoneId: 'MAC2',
    name: 'Macas',
    countryCode: 'EC',
    latitude: -2.2991700, longitude: -78.1207962,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SEMC', 'SESC']
  },
  {
    zoneId: 'MAN6',
    name: 'Manta',
    countryCode: 'EC',
    latitude: -0.9460780, longitude: -80.6788025,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SEMT', 'SEJI']
  },
  {
    zoneId: 'ENC',
    name: 'Encarnación',
    countryCode: 'PY',
    latitude: -27.2275370, longitude: -55.8375840,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SGEN', 'SGES', 'SGAY']
  },
  {
    zoneId: 'MAR3',
    name: 'Mariscal Estigarribia',
    countryCode: 'PY',
    latitude: -22.0464990, longitude: -60.6217000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SGME', 'SGFI']
  },
  {
    zoneId: 'CON5',
    name: 'Concepción',
    countryCode: 'PY',
    latitude: -23.4416090, longitude: -57.4270390,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SGCO', 'SGPJ']
  },
  {
    zoneId: 'PIL',
    name: 'Pilar',
    countryCode: 'PY',
    latitude: -26.8819810, longitude: -58.3190670,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SGPI']
  },
  {
    zoneId: 'SUC',
    name: 'Sucre',
    countryCode: 'BO',
    latitude: -19.2468350, longitude: -65.1496110,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SLAL', 'SLPO', 'SLAG', 'SLCA', 'SLVG']
  },
  {
    zoneId: 'COC2',
    name: 'Cochabamba',
    countryCode: 'BO',
    latitude: -17.4211050, longitude: -66.1771020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SLCB', 'SLOR', 'SLHI']
  },
  {
    zoneId: 'LA5',
    name: 'La Paz / El Alto',
    countryCode: 'BO',
    latitude: -16.5102720, longitude: -68.1894160,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SLLP', 'SLAP']
  },
  {
    zoneId: 'SAN16',
    name: 'Santa Cruz',
    countryCode: 'BO',
    latitude: -17.6448000, longitude: -63.1353990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SLVR', 'SLET', 'SLAS', 'SLCP', 'SLJV']
  },
  {
    zoneId: 'BER1',
    name: 'Bermejo',
    countryCode: 'BO',
    latitude: -22.7733002, longitude: -64.3128967,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SLBJ', 'SLTJ', 'SLVM', 'SLYA']
  },
  {
    zoneId: 'COB',
    name: 'Cobija',
    countryCode: 'BO',
    latitude: -11.0391090, longitude: -68.7827740,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SLCO', 'SLPR']
  },
  {
    zoneId: 'GUA3',
    name: 'Guayaramerín',
    countryCode: 'BO',
    latitude: -10.8885600, longitude: -65.3809550,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SLGM', 'SLRI']
  },
  {
    zoneId: 'PUE9',
    name: 'Puerto Suárez',
    countryCode: 'BO',
    latitude: -18.9753010, longitude: -57.8205990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SLPS', 'SLRB']
  },
  {
    zoneId: 'SAN17',
    name: 'Santa Ana del Yacuma',
    countryCode: 'BO',
    latitude: -13.7622004, longitude: -65.4352036,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SLSA', 'SLTR', 'SLHJ', 'SLJO', 'SLMG', 'SLRA', 'SLRY', 'SLSB', 'SLSM', 'SLSR']
  },
  {
    zoneId: 'PUC',
    name: 'Pucallpa',
    countryCode: 'PE',
    latitude: -8.3780640, longitude: -74.5744950,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SPCL', 'SPGM', 'SPIZ']
  },
  {
    zoneId: 'CHI8',
    name: 'Chiclayo',
    countryCode: 'PE',
    latitude: -6.7892230, longitude: -79.8282540,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SPHI', 'SPRU', 'SPJE', 'SPJR', 'SPUR']
  },
  {
    zoneId: 'JUL',
    name: 'Juliaca',
    countryCode: 'PE',
    latitude: -15.4676890, longitude: -70.1565300,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SPJL', 'SPQU']
  },
  {
    zoneId: 'IQU1',
    name: 'Iquitos',
    countryCode: 'PE',
    latitude: -3.7847400, longitude: -73.3088000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SPQT', 'SPDR']
  },
  {
    zoneId: 'CUS',
    name: 'Cusco',
    countryCode: 'PE',
    latitude: -13.5356998, longitude: -71.9387970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SPZO', 'SPHY', 'SPIL']
  },
  {
    zoneId: 'ATA',
    name: 'Atalaya',
    countryCode: 'PE',
    latitude: -10.7291000, longitude: -73.7665020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPAY', 'SPJJ', 'SPMF']
  },
  {
    zoneId: 'IBE',
    name: 'Iberia',
    countryCode: 'PE',
    latitude: -11.4116000, longitude: -69.4887010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPBR', 'SPTU', 'SPAR', 'SPSY']
  },
  {
    zoneId: 'CHI9',
    name: 'Chimbote',
    countryCode: 'PE',
    latitude: -9.1496100, longitude: -78.5238040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPEO', 'SPHZ', 'SPGL']
  },
  {
    zoneId: 'AYA',
    name: 'Ayacucho',
    countryCode: 'PE',
    latitude: -13.1548000, longitude: -74.2043990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPHO', 'SPZA']
  },
  {
    zoneId: 'RIO4',
    name: 'Rioja',
    countryCode: 'PE',
    latitude: -6.0678600, longitude: -77.1600040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPJA', 'SPJI', 'SPMS', 'SPPY', 'SPST', 'SPBB', 'SPLN', 'SPOA']
  },
  {
    zoneId: 'ILO1',
    name: 'Ilo',
    countryCode: 'PE',
    latitude: -17.6950000, longitude: -71.3440020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPLO', 'SPTN']
  },
  {
    zoneId: 'TUM1',
    name: 'Tumbes',
    countryCode: 'PE',
    latitude: -3.5520740, longitude: -80.3810860,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPME', 'SPYL']
  },
  {
    zoneId: 'HU',
    name: 'Huánuco',
    countryCode: 'PE',
    latitude: -9.8788099, longitude: -76.2048035,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPNC']
  },
  {
    zoneId: 'PIS',
    name: 'Pisco',
    countryCode: 'PE',
    latitude: -13.7449000, longitude: -76.2202990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SPSO', 'SPJN']
  },
  {
    zoneId: 'DUR2',
    name: 'Durazno',
    countryCode: 'UY',
    latitude: -33.3588980, longitude: -56.4991990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SUDU', 'SUPU', 'SUCA', 'SUTB', 'SUTR']
  },
  {
    zoneId: 'SAL5',
    name: 'Salto',
    countryCode: 'UY',
    latitude: -31.4384990, longitude: -57.9852980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SUSO', 'SUAG', 'SUBU']
  },
  {
    zoneId: 'MEL3',
    name: 'Melo',
    countryCode: 'UY',
    latitude: -32.3378980, longitude: -54.2167020,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['SUMO', 'SURV', 'SUVO']
  },
  {
    zoneId: 'BAR4',
    name: 'Barcelona',
    countryCode: 'VE',
    latitude: 10.1111110, longitude: -64.6922220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SVBC', 'SVAN', 'SVCP', 'SVCU', 'SVMG', 'SVMT', 'SVST', 'SVVP', 'SVIE']
  },
  {
    zoneId: 'MAR4',
    name: 'Maracaibo',
    countryCode: 'VE',
    latitude: 10.5575420, longitude: -71.7293070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SVMC', 'SVJC', 'SVSZ', 'SVVG', 'SVVL', 'SVCG', 'SVON']
  },
  {
    zoneId: 'ACA2',
    name: 'Acarigua',
    countryCode: 'VE',
    latitude: 9.5533750, longitude: -69.2378690,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVAC', 'SVBI', 'SVBM', 'SVCL', 'SVCR', 'SVGU', 'SVSP']
  },
  {
    zoneId: 'CIU3',
    name: 'Ciudad Bolivar',
    countryCode: 'VE',
    latitude: 8.1221610, longitude: -63.5369570,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVCB', 'SVPR', 'SVTC']
  },
  {
    zoneId: 'UNK3',
    name: 'Unknown',
    countryCode: 'VE',
    latitude: 7.6255100, longitude: -66.1628040,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVCD', 'SVSR', 'SVAS', 'SVDZ']
  },
  {
    zoneId: 'CAN1',
    name: 'Canaima',
    countryCode: 'VE',
    latitude: 6.2319890, longitude: -62.8548500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVCN', 'SVED', 'SVTM', 'SVKA', 'SVKM', 'SVUM', 'SVUQ']
  },
  {
    zoneId: 'UNK4',
    name: 'Unknown',
    countryCode: 'VE',
    latitude: 7.0596770, longitude: -69.4967000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVEZ', 'SVGD', 'SVPT', 'SVSB']
  },
  {
    zoneId: 'UNK5',
    name: 'Unknown',
    countryCode: 'VE',
    latitude: 10.5740776, longitude: -62.3126678,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVGI', 'SVPE']
  },
  {
    zoneId: 'UNK6',
    name: 'Unknown',
    countryCode: 'VE',
    latitude: 8.2391670, longitude: -72.2710270,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVLF', 'SVMD', 'SVPM', 'SVSA', 'SVSO']
  },
  {
    zoneId: 'PUE10',
    name: 'Puerto Ayacucho',
    countryCode: 'VE',
    latitude: 5.6199900, longitude: -67.6061020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVPA']
  },
  {
    zoneId: 'SAN18',
    name: 'Santa Elena de Uairén',
    countryCode: 'VE',
    latitude: 4.5546990, longitude: -61.1452340,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SVSE', 'SVIC', 'SVPH']
  },

  // --- CENTRAL ASIA ---
  {
    zoneId: 'ALM1',
    name: 'Almaty',
    countryCode: 'KZ',
    latitude: 43.3542670, longitude: 77.0428280,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAAA', 'UAAR']
  },
  {
    zoneId: 'AST',
    name: 'Astana',
    countryCode: 'KZ',
    latitude: 51.0270350, longitude: 71.4670940,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UACC', 'UAKK']
  },
  {
    zoneId: 'KOK1',
    name: 'Kokshetau',
    countryCode: 'KZ',
    latitude: 53.3291020, longitude: 69.5945970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UACK', 'UACP']
  },
  {
    zoneId: 'TAR2',
    name: 'Taraz',
    countryCode: 'KZ',
    latitude: 42.8536000, longitude: 71.3035960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UADD', 'UAII']
  },
  {
    zoneId: 'TUR',
    name: 'Turkıstan',
    countryCode: 'KZ',
    latitude: 43.3117420, longitude: 68.5501850,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAIT']
  },
  {
    zoneId: 'ZHE',
    name: 'Zhezkazgan',
    countryCode: 'KZ',
    latitude: 47.7089530, longitude: 67.7380940,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAKD']
  },
  {
    zoneId: 'BAI2',
    name: 'Baikonur',
    countryCode: 'KZ',
    latitude: 45.6219940, longitude: 63.2107730,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAOL', 'UAOO']
  },
  {
    zoneId: 'URA',
    name: 'Uralsk',
    countryCode: 'KZ',
    latitude: 51.1519760, longitude: 51.5436520,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UARR']
  },
  {
    zoneId: 'UST',
    name: 'Ust-Kamenogorsk (Oskemen)',
    countryCode: 'KZ',
    latitude: 50.0350330, longitude: 82.4960570,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UASK', 'UASS']
  },
  {
    zoneId: 'PAV',
    name: 'Pavlodar',
    countryCode: 'KZ',
    latitude: 52.1949820, longitude: 77.0730880,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UASP', 'UASB']
  },
  {
    zoneId: 'AKT',
    name: 'Aktau',
    countryCode: 'KZ',
    latitude: 43.8600930, longitude: 51.0908600,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UATE']
  },
  {
    zoneId: 'ATY',
    name: 'Atyrau',
    countryCode: 'KZ',
    latitude: 47.1213180, longitude: 51.8203430,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UATG']
  },
  {
    zoneId: 'AKT1',
    name: 'Aktobe',
    countryCode: 'KZ',
    latitude: 50.2481160, longitude: 57.2041440,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UATT']
  },
  {
    zoneId: 'KOS',
    name: 'Kostanay',
    countryCode: 'KZ',
    latitude: 53.2069020, longitude: 63.5503010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAUU']
  },
  {
    zoneId: 'BAL3',
    name: 'Balkhash',
    countryCode: 'KZ',
    latitude: 46.8942460, longitude: 75.0045330,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UAAH']
  },
  {
    zoneId: 'TAL',
    name: 'Taldykorgan',
    countryCode: 'KZ',
    latitude: 45.1225500, longitude: 78.4427580,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UAAT', 'UAAL']
  },
  {
    zoneId: 'NAM1',
    name: 'Namangan',
    countryCode: 'UZ',
    latitude: 40.9846220, longitude: 71.5578000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UTFN', 'UTTT', 'UTKA', 'UTKF', 'UTKK']
  },
  {
    zoneId: 'NUK',
    name: 'Nukus',
    countryCode: 'UZ',
    latitude: 42.4884000, longitude: 59.6232990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UTNN', 'UTNU', 'UTNM']
  },
  {
    zoneId: 'NAV',
    name: 'Navoi',
    countryCode: 'UZ',
    latitude: 40.1175990, longitude: 65.1726580,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UTSA', 'UTSB', 'UTSS', 'UTSK', 'UTSN']
  },
  {
    zoneId: 'TER1',
    name: 'Termez',
    countryCode: 'UZ',
    latitude: 37.2872610, longitude: 67.3118690,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UTST']
  },
  {
    zoneId: 'ZAA',
    name: 'Zaamin',
    countryCode: 'UZ',
    latitude: 40.0140200, longitude: 68.4110300,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UTTZ']
  },

  // --- EUROPE & CENTRAL ASIA ---
  {
    zoneId: 'BAK2',
    name: 'Baku',
    countryCode: 'AZ',
    latitude: 40.4674988, longitude: 50.0466995,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UBBB', 'UBBQ', 'UBBL']
  },
  {
    zoneId: 'GAN',
    name: 'Ganja',
    countryCode: 'AZ',
    latitude: 40.7386920, longitude: 46.3203830,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UBBG', 'UBBN', 'UBBY', 'UBBF', 'UBBZ', 'UBEE']
  },
  {
    zoneId: 'GYU',
    name: 'Gyumri',
    countryCode: 'AM',
    latitude: 40.7504010, longitude: 43.8592990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UDSG', 'UDYZ']
  },
  {
    zoneId: 'KOP',
    name: 'Kopitnari',
    countryCode: 'GE',
    latitude: 42.1774480, longitude: 42.4853530,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UGKO', 'UGSB', 'UGTB', 'UGSS']
  },

  // --- RUSSIA ---
  {
    zoneId: 'YAK2',
    name: 'Yakutsk',
    countryCode: 'RU',
    latitude: 62.0933000, longitude: 129.7709960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UEEE', 'UEMM']
  },
  {
    zoneId: 'PET1',
    name: 'Petropavlovsk-Kamchatsky',
    countryCode: 'RU',
    latitude: 53.1687160, longitude: 158.4510680,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UHPP']
  },
  {
    zoneId: 'ART',
    name: 'Artyom',
    countryCode: 'RU',
    latitude: 43.3962560, longitude: 132.1481550,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UHWW', 'UIKP']
  },
  {
    zoneId: 'CHI10',
    name: 'Chita',
    countryCode: 'RU',
    latitude: 52.0248410, longitude: 113.3058390,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UIAA']
  },
  {
    zoneId: 'IRK',
    name: 'Irkutsk',
    countryCode: 'RU',
    latitude: 52.2667070, longitude: 104.3955630,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UIII', 'UIUU']
  },
  {
    zoneId: 'MUR',
    name: 'Murmansk',
    countryCode: 'RU',
    latitude: 68.7817000, longitude: 32.7508010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ULMM']
  },
  {
    zoneId: 'PSK',
    name: 'Pskov',
    countryCode: 'RU',
    latitude: 57.7813160, longitude: 28.3938400,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ULOO']
  },
  {
    zoneId: 'KAL2',
    name: 'Kaliningrad',
    countryCode: 'RU',
    latitude: 54.8898820, longitude: 20.5982160,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UMKK']
  },
  {
    zoneId: 'ABA1',
    name: 'Abakan',
    countryCode: 'RU',
    latitude: 53.7400020, longitude: 91.3850020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UNAA']
  },
  {
    zoneId: 'BAR5',
    name: 'Barnaul',
    countryCode: 'RU',
    latitude: 53.3612850, longitude: 83.5397010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UNBB', 'UNNT', 'UNBG']
  },
  {
    zoneId: 'KEM',
    name: 'Kemerovo',
    countryCode: 'RU',
    latitude: 55.2701000, longitude: 86.1072010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UNEE', 'UNTT', 'UNWW']
  },
  {
    zoneId: 'KRA',
    name: 'Krasnoyarsk',
    countryCode: 'RU',
    latitude: 56.1757430, longitude: 92.4857880,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UNKL', 'UNKM', 'UNKS']
  },
  {
    zoneId: 'OMS',
    name: 'Omsk',
    countryCode: 'RU',
    latitude: 54.9631240, longitude: 73.3124180,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UNOO']
  },
  {
    zoneId: 'NOR3',
    name: 'Norilsk',
    countryCode: 'RU',
    latitude: 69.3079510, longitude: 87.3259060,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UOOO', 'UOII']
  },
  {
    zoneId: 'KRA1',
    name: 'Krasnodar',
    countryCode: 'RU',
    latitude: 45.0344650, longitude: 39.1742150,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['URKK', 'URSS', 'URKA', 'URKG']
  },
  {
    zoneId: 'MAK1',
    name: 'Makhachkala',
    countryCode: 'RU',
    latitude: 42.8167990, longitude: 47.6523020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['URML', 'URMG', 'URMS']
  },
  {
    zoneId: 'MIN3',
    name: 'Mineralnyye Vody',
    countryCode: 'RU',
    latitude: 44.2251010, longitude: 43.0819020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['URMM', 'URMN', 'URMO', 'URMT']
  },
  {
    zoneId: 'ROS1',
    name: 'Rostov-on-Don',
    countryCode: 'RU',
    latitude: 47.4938880, longitude: 39.9247220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['URRP', 'URRT']
  },
  {
    zoneId: 'AST1',
    name: 'Astrakhan',
    countryCode: 'RU',
    latitude: 46.2828430, longitude: 48.0105110,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['URWA']
  },
  {
    zoneId: 'VOL',
    name: 'Volgograd',
    countryCode: 'RU',
    latitude: 48.7813400, longitude: 44.3391940,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['URWW']
  },
  {
    zoneId: 'CHE1',
    name: 'Chelyabinsk',
    countryCode: 'RU',
    latitude: 55.3031410, longitude: 61.5049270,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['USCC', 'USSS']
  },
  {
    zoneId: 'MAG',
    name: 'Magnitogorsk',
    countryCode: 'RU',
    latitude: 53.3919910, longitude: 58.7552350,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['USCM', 'UWUB']
  },
  {
    zoneId: 'NIZ',
    name: 'Nizhnevartovsk',
    countryCode: 'RU',
    latitude: 60.9492990, longitude: 76.4835970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['USNN', 'USRR', 'UNSS', 'USRK', 'USRN']
  },
  {
    zoneId: 'PER3',
    name: 'Perm',
    countryCode: 'RU',
    latitude: 57.9145010, longitude: 56.0211980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['USPP', 'USII']
  },
  {
    zoneId: 'TYU',
    name: 'Tyumen',
    countryCode: 'RU',
    latitude: 57.1789840, longitude: 65.3276960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['USTR', 'USTJ', 'USUU', 'USTO']
  },
  {
    zoneId: 'TUN1',
    name: 'Tunoshna',
    countryCode: 'RU',
    latitude: 57.5606990, longitude: 40.1573980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UUDL', 'ULWW', 'UUBA', 'UUBI', 'UUBK']
  },
  {
    zoneId: 'VOR',
    name: 'Voronezh',
    countryCode: 'RU',
    latitude: 51.8136830, longitude: 39.2317110,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UUOO', 'UUOK', 'UUOL', 'UUOT']
  },
  {
    zoneId: 'NIZ1',
    name: 'Nizhny Novgorod',
    countryCode: 'RU',
    latitude: 56.2273510, longitude: 43.7851520,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UWGG']
  },
  {
    zoneId: 'ULY',
    name: 'Ulyanovsk',
    countryCode: 'RU',
    latitude: 54.2682990, longitude: 48.2267000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UWLL', 'UWPS', 'UWWW']
  },
  {
    zoneId: 'SAR1',
    name: 'Saratov',
    countryCode: 'RU',
    latitude: 51.7127780, longitude: 46.1711110,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UWSG', 'UWPP', 'UWSB']
  },
  {
    zoneId: 'UFA',
    name: 'Ufa',
    countryCode: 'RU',
    latitude: 54.5574989, longitude: 55.8744011,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UWUU', 'UWKB', 'UWUK']
  },
  {
    zoneId: 'NER',
    name: 'Neryungri',
    countryCode: 'RU',
    latitude: 56.9138985, longitude: 124.9140015,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UELL', 'UEEA', 'UHBW']
  },
  {
    zoneId: 'KHO',
    name: 'Khonuu',
    countryCode: 'RU',
    latitude: 66.4508610, longitude: 143.2615510,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UEMA', 'UEMT']
  },
  {
    zoneId: 'OLY',
    name: 'Olyokminsk',
    countryCode: 'RU',
    latitude: 60.4018330, longitude: 120.4760940,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UEMO']
  },
  {
    zoneId: 'VIL1',
    name: 'Vilyuisk',
    countryCode: 'RU',
    latitude: 63.7566680, longitude: 121.6933360,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UENW', 'UENI', 'UENN']
  },
  {
    zoneId: 'LEN1',
    name: 'Lensk',
    countryCode: 'RU',
    latitude: 60.7206001, longitude: 114.8259964,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UERL', 'UERR', 'UENS']
  },
  {
    zoneId: 'YAK3',
    name: 'Yakutia',
    countryCode: 'RU',
    latitude: 66.4003980, longitude: 112.0299990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UERP']
  },
  {
    zoneId: 'SAS1',
    name: 'Saskylakh',
    countryCode: 'RU',
    latitude: 71.9279020, longitude: 114.0800020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UERS']
  },
  {
    zoneId: 'BEL2',
    name: 'Belaya Gora',
    countryCode: 'RU',
    latitude: 68.5562270, longitude: 146.2278400,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UESG']
  },
  {
    zoneId: 'SRE',
    name: 'Srednekolymsk',
    countryCode: 'RU',
    latitude: 67.4805000, longitude: 153.7364000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UESK']
  },
  {
    zoneId: 'CHO',
    name: 'Chokurdah',
    countryCode: 'RU',
    latitude: 70.6231000, longitude: 147.9019930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UESO']
  },
  {
    zoneId: 'CHE2',
    name: 'Cherskiy',
    countryCode: 'RU',
    latitude: 68.7406006, longitude: 161.3379974,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UESS', 'UHMK']
  },
  {
    zoneId: 'TIK',
    name: 'Tiksi',
    countryCode: 'RU',
    latitude: 71.6977005, longitude: 128.9029999,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UEST']
  },
  {
    zoneId: 'ZYR',
    name: 'Zyryanka',
    countryCode: 'RU',
    latitude: 65.7485000, longitude: 150.8889000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UESU']
  },
  {
    zoneId: 'ZHI',
    name: 'Zhigansk',
    countryCode: 'RU',
    latitude: 66.7965012, longitude: 123.3610001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UEVV']
  },
  {
    zoneId: 'BLA',
    name: 'Blagoveschensk',
    countryCode: 'RU',
    latitude: 50.4253998, longitude: 127.4120026,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHBB']
  },
  {
    zoneId: 'KHA1',
    name: 'Khabarovsk',
    countryCode: 'RU',
    latitude: 48.5283380, longitude: 135.1885880,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHHH']
  },
  {
    zoneId: 'KOM',
    name: 'Komsomolsk-on-Amur',
    countryCode: 'RU',
    latitude: 50.4090004, longitude: 136.9340057,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHKK']
  },
  {
    zoneId: 'SOV',
    name: 'Sovetskaya Gavan',
    countryCode: 'RU',
    latitude: 48.9250670, longitude: 140.0353480,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHKM', 'UHSK', 'UHWE']
  },
  {
    zoneId: 'ANA2',
    name: 'Anadyr',
    countryCode: 'RU',
    latitude: 64.7349020, longitude: 177.7409970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHMA']
  },
  {
    zoneId: 'CHU1',
    name: 'Chukotka',
    countryCode: 'RU',
    latitude: 64.3780975, longitude: -173.2429962,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHMD']
  },
  {
    zoneId: 'MAG1',
    name: 'Magadan',
    countryCode: 'RU',
    latitude: 59.9109993, longitude: 150.7200012,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHMM']
  },
  {
    zoneId: 'APA',
    name: 'Apapelgino',
    countryCode: 'RU',
    latitude: 69.7833020, longitude: 170.5970000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHMP']
  },
  {
    zoneId: 'EVE',
    name: 'Evensk',
    countryCode: 'RU',
    latitude: 61.9217860, longitude: 159.2290590,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHMW']
  },
  {
    zoneId: 'NIK',
    name: 'Nikolayevsk-na-Amure Airport',
    countryCode: 'RU',
    latitude: 53.1549990, longitude: 140.6499940,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHNN', 'UHNB', 'UHSH']
  },
  {
    zoneId: 'OKH',
    name: 'Okhotsk',
    countryCode: 'RU',
    latitude: 59.4100650, longitude: 143.0565030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHOO']
  },
  {
    zoneId: 'YUZ',
    name: 'Yuzhno-Sakhalinsk',
    countryCode: 'RU',
    latitude: 46.8854610, longitude: 142.7174660,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UHSS']
  },
  {
    zoneId: 'BRA2',
    name: 'Bratsk',
    countryCode: 'RU',
    latitude: 56.3706017, longitude: 101.6979980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UIBB', 'UIBS']
  },
  {
    zoneId: 'UST1',
    name: 'Ust-Kut',
    countryCode: 'RU',
    latitude: 56.8567010, longitude: 105.7300030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UITT', 'UIKK']
  },
  {
    zoneId: 'ARC2',
    name: 'Archangelsk',
    countryCode: 'RU',
    latitude: 64.6003036, longitude: 40.7167015,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ULAA', 'ULAH']
  },
  {
    zoneId: 'NAR',
    name: 'Naryan Mar',
    countryCode: 'RU',
    latitude: 67.6399990, longitude: 53.1218990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ULAM']
  },
  {
    zoneId: 'AMD1',
    name: 'Amderma',
    countryCode: 'RU',
    latitude: 69.7632980, longitude: 61.5564003,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ULDD', 'ULDW']
  },
  {
    zoneId: 'KOT',
    name: 'Kotlas',
    countryCode: 'RU',
    latitude: 61.2358017, longitude: 46.6974983,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ULKK', 'ULWU']
  },
  {
    zoneId: 'PET2',
    name: 'Petrozavodsk',
    countryCode: 'RU',
    latitude: 61.8852010, longitude: 34.1547010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ULPB']
  },
  {
    zoneId: 'CHE3',
    name: 'Cherepovets',
    countryCode: 'RU',
    latitude: 59.2736015, longitude: 38.0158005,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ULWC']
  },
  {
    zoneId: 'BAY',
    name: 'Baykit',
    countryCode: 'RU',
    latitude: 61.6767010, longitude: 96.3550030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UNIB']
  },
  {
    zoneId: 'YEN',
    name: 'Yeniseysk',
    countryCode: 'RU',
    latitude: 58.4742010, longitude: 92.1125030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UNII', 'UNIS']
  },
  {
    zoneId: 'BOR',
    name: 'Bor',
    countryCode: 'RU',
    latitude: 61.5896990, longitude: 89.9940030,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UNIP', 'UNIJ']
  },
  {
    zoneId: 'VAN2',
    name: 'Vanavara',
    countryCode: 'RU',
    latitude: 60.3562290, longitude: 102.3096410,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UNIW']
  },
  {
    zoneId: 'KYZ',
    name: 'Kyzyl',
    countryCode: 'RU',
    latitude: 51.6693990, longitude: 94.4005970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UNKY']
  },
  {
    zoneId: 'DIK',
    name: 'Dikson',
    countryCode: 'RU',
    latitude: 73.5178070, longitude: 80.3796690,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UODD']
  },
  {
    zoneId: 'KHA2',
    name: 'Khatanga',
    countryCode: 'RU',
    latitude: 71.9781036, longitude: 102.4909973,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UOHH']
  },
  {
    zoneId: 'SVE',
    name: 'Svetlogorsk',
    countryCode: 'RU',
    latitude: 66.8399960, longitude: 88.4033360,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UOIG', 'UOTT']
  },
  {
    zoneId: 'ELI1',
    name: 'Elista',
    countryCode: 'RU',
    latitude: 46.3739014, longitude: 44.3308983,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['URWI']
  },
  {
    zoneId: 'SAB1',
    name: 'Sabetta',
    countryCode: 'RU',
    latitude: 71.2191670, longitude: 72.0522220,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USDA', 'USDB']
  },
  {
    zoneId: 'SAL6',
    name: 'Salekhard',
    countryCode: 'RU',
    latitude: 66.5907974, longitude: 66.6110001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USDD', 'UUYW']
  },
  {
    zoneId: 'UNK7',
    name: 'Unknown',
    countryCode: 'RU',
    latitude: 63.9210014, longitude: 65.0305023,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USHB', 'USHN', 'USHQ', 'USHI']
  },
  {
    zoneId: 'KHA3',
    name: 'Khanty-Mansiysk',
    countryCode: 'RU',
    latitude: 61.0285000, longitude: 69.0860980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USHH', 'USHK']
  },
  {
    zoneId: 'SOV1',
    name: 'Sovetskiy',
    countryCode: 'RU',
    latitude: 61.3266220, longitude: 63.6019135,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USHS', 'USHU']
  },
  {
    zoneId: 'KIR2',
    name: 'Kirov',
    countryCode: 'RU',
    latitude: 58.5038830, longitude: 49.3478310,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USKK']
  },
  {
    zoneId: 'NAD',
    name: 'Nadym',
    countryCode: 'RU',
    latitude: 65.4809036, longitude: 72.6988983,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USMM', 'USMU']
  },
  {
    zoneId: 'NOY',
    name: 'Noyabrsk',
    countryCode: 'RU',
    latitude: 63.1833000, longitude: 75.2699966,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['USRO']
  },
  {
    zoneId: 'KAL3',
    name: 'Kaluga',
    countryCode: 'RU',
    latitude: 54.5499992, longitude: 36.3666687,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UUBC', 'UUBP']
  },
  {
    zoneId: 'BEL3',
    name: 'Belgorod',
    countryCode: 'RU',
    latitude: 50.6437988, longitude: 36.5900993,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UUOB']
  },
  {
    zoneId: 'UKH',
    name: 'Ukhta',
    countryCode: 'RU',
    latitude: 63.5668980, longitude: 53.8046990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UUYH', 'UUYX']
  },
  {
    zoneId: 'INT',
    name: 'Inta',
    countryCode: 'RU',
    latitude: 66.0533720, longitude: 60.1057860,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UUYI', 'UUYP', 'UUYS']
  },
  {
    zoneId: 'SYK',
    name: 'Syktyvkar',
    countryCode: 'RU',
    latitude: 61.6469994, longitude: 50.8451004,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UUYY']
  },
  {
    zoneId: 'NIZ2',
    name: 'Nizhnekamsk',
    countryCode: 'RU',
    latitude: 55.5647010, longitude: 52.0924990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UWKE']
  },
  {
    zoneId: 'ORE',
    name: 'Orenburg',
    countryCode: 'RU',
    latitude: 51.7926680, longitude: 55.4572290,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UWOO']
  },
  {
    zoneId: 'ORS',
    name: 'Orsk',
    countryCode: 'RU',
    latitude: 51.0724980, longitude: 58.5956000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UWOR']
  },
  {
    zoneId: 'KUR2',
    name: 'Kurilsk',
    countryCode: 'RU',
    latitude: 44.9199980, longitude: 147.6219940,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['UHSB', 'UHSI', 'UHSM']
  },
  {
    zoneId: 'AMG',
    name: 'Amgu',
    countryCode: 'RU',
    latitude: 45.8412600, longitude: 137.6735680,
    population: { 1950: 30, 1960: 50, 1970: 70, 1980: 100, 1990: 140, 2000: 190, 2010: 250, 2020: 300 },
    airports: ['UHTG', 'UHTQ', 'UHWP', 'UHWT']
  },


  // --- Additional zones (island nations, territories, smaller countries) ---
  {
    zoneId: 'HON', name: 'Honiara',
    countryCode: 'SB', latitude: -9.4280000, longitude: 160.0549930,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['AGGH', 'AGAF', 'AGAR', 'AGAT', 'AGGB', 'AGGF', 'AGGI', 'AGGJ', 'AGGP', 'AGGU', 'AGGY', 'AGKW', 'AGOB', 'AGOK', 'AGGA']
  },
  {
    zoneId: 'MUN', name: 'Munda',
    countryCode: 'SB', latitude: -8.3279700, longitude: 157.2630000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AGGM', 'AGBA', 'AGBT', 'AGEV', 'AGGC', 'AGGE', 'AGGN', 'AGGO', 'AGGS', 'AGGV', 'AGKG', 'AGKU', 'AGRC', 'AGRM']
  },
  {
    zoneId: 'KIR3', name: 'Kirakira',
    countryCode: 'SB', latitude: -10.4497004, longitude: 161.8979950,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['AGGK', 'AGGT', 'AGNA']
  },
  {
    zoneId: 'YAR1', name: 'Yaren District',
    countryCode: 'NR', latitude: -0.5478930, longitude: 166.9195250,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ANYN']
  },
  {
    zoneId: 'NAR1', name: 'Narsarsuaq',
    countryCode: 'GL', latitude: 61.1605000, longitude: -45.4259990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['BGBW']
  },
  {
    zoneId: 'NUU', name: 'Nuuk',
    countryCode: 'GL', latitude: 64.1910660, longitude: -51.6791400,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['BGGH', 'BGMQ']
  },
  {
    zoneId: 'KAN3', name: 'Kangerlussuaq',
    countryCode: 'GL', latitude: 67.0104460, longitude: -50.7152940,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['BGSF', 'BGAA', 'BGSS']
  },
  {
    zoneId: 'PIT1', name: 'Pituffik',
    countryCode: 'GL', latitude: 76.5306300, longitude: -68.7005410,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['BGTL', 'BGQQ']
  },
  {
    zoneId: 'NEE', name: 'Neerlerit Inaat',
    countryCode: 'GL', latitude: 70.7431030, longitude: -22.6504990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['BGCO']
  },
  {
    zoneId: 'ILU', name: 'Ilulissat',
    countryCode: 'GL', latitude: 69.2432020, longitude: -51.0570980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['BGJN', 'BGUQ']
  },
  {
    zoneId: 'KUL1', name: 'Kulusuk',
    countryCode: 'GL', latitude: 65.5736010, longitude: -37.1236000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['BGKK']
  },
  {
    zoneId: 'PRI2', name: 'Prishtina',
    countryCode: 'XK', latitude: 42.5728000, longitude: 21.0358010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['BKPR']
  },
  {
    zoneId: 'COT', name: 'Cotonou',
    countryCode: 'BJ', latitude: 6.3572300, longitude: 2.3843500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DBBB', 'DBBS']
  },
  {
    zoneId: 'DJO', name: 'Djougou',
    countryCode: 'BJ', latitude: 9.6920833, longitude: 1.6377778,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DBBD', 'DBBK', 'DBBN', 'DBBP']
  },
  {
    zoneId: 'OUA', name: 'Ouagadougou',
    countryCode: 'BF', latitude: 12.3532000, longitude: -1.5124200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DFFD', 'DFCA', 'DFCC', 'DFCJ', 'DFCL', 'DFCP', 'DFEA', 'DFEB', 'DFEF', 'DFET', 'DFEZ', 'DFOD', 'DFOT', 'DFOY']
  },
  {
    zoneId: 'BOB', name: 'Bobo Dioulasso',
    countryCode: 'BF', latitude: 11.1601000, longitude: -4.3309700,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DFOO', 'DFOB', 'DFOG', 'DFON', 'DFOU']
  },
  {
    zoneId: 'DIA', name: 'Diapaga',
    countryCode: 'BF', latitude: 12.0603240, longitude: 1.7846310,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DFED', 'DFEL', 'DFEP', 'DFER', 'DFES']
  },
  {
    zoneId: 'DOR', name: 'Dori',
    countryCode: 'BF', latitude: 14.0216380, longitude: -0.0682070,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DFEE', 'DFEG', 'DFEM']
  },
  {
    zoneId: 'NIA', name: 'Niamey',
    countryCode: 'NE', latitude: 13.4815000, longitude: 2.1836100,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['DRRN']
  },
  {
    zoneId: 'MAR6', name: 'Maradi',
    countryCode: 'NE', latitude: 13.5025000, longitude: 7.1267500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DRRM', 'DRZR']
  },
  {
    zoneId: 'TAH', name: 'Tahoua',
    countryCode: 'NE', latitude: 14.8757000, longitude: 5.2653600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DRRT']
  },
  {
    zoneId: 'AGA3', name: 'Agadez',
    countryCode: 'NE', latitude: 16.9660000, longitude: 8.0001100,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['DRZA', 'DRZL']
  },
  {
    zoneId: 'CAS2', name: 'Castletown',
    countryCode: 'IM', latitude: 54.0830810, longitude: -4.6238710,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EGNS']
  },
  {
    zoneId: 'MOU1', name: 'Mount Pleasant',
    countryCode: 'FK', latitude: -51.8226420, longitude: -58.4457770,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EGYP', 'SFAL']
  },
  {
    zoneId: 'VG', name: 'Vágar',
    countryCode: 'FO', latitude: 62.0632560, longitude: -7.2757820,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['EKVG']
  },
  {
    zoneId: 'BRA3', name: 'Brazzaville',
    countryCode: 'CG', latitude: -4.2517000, longitude: 15.2530000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FCBB', 'FCBD', 'FCBK', 'FCBL', 'FCBM', 'FCBS', 'FCBY']
  },
  {
    zoneId: 'OYO', name: 'Oyo',
    countryCode: 'CG', latitude: -1.2266660, longitude: 15.9100000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FCOD', 'FCOO', 'FCOB', 'FCOE', 'FCOG', 'FCOK', 'FCOM']
  },
  {
    zoneId: 'UNK40', name: 'Unknown',
    countryCode: 'CG', latitude: 1.6159900, longitude: 16.0379010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FCOU', 'FCOS']
  },
  {
    zoneId: 'DOL', name: 'Dolisie',
    countryCode: 'CG', latitude: -4.2063500, longitude: 12.6599000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FCPL', 'FCPP', 'FCBZ', 'FCMM', 'FCPA']
  },
  {
    zoneId: 'MAN10', name: 'Manzini',
    countryCode: 'SZ', latitude: -26.5289190, longitude: 31.3075770,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FDMS', 'FDSK']
  },
  {
    zoneId: 'BAN6', name: 'Bangui',
    countryCode: 'CF', latitude: 4.3984800, longitude: 18.5188010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FEFF']
  },
  {
    zoneId: 'BER3', name: 'Berbérati',
    countryCode: 'CF', latitude: 4.2215800, longitude: 15.7863998,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FEFT', 'FEFC', 'FEFO']
  },
  {
    zoneId: 'BAN7', name: 'Bangassou',
    countryCode: 'CF', latitude: 4.7849998, longitude: 22.7810001,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FEFG', 'FEFR', 'FEFY', 'FEGM', 'FEGR']
  },
  {
    zoneId: 'BIR1', name: 'Birao',
    countryCode: 'CF', latitude: 10.2363997, longitude: 22.7168999,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FEFI', 'FEGL', 'FEGO']
  },
  {
    zoneId: 'BOS1', name: 'Bossangoa',
    countryCode: 'CF', latitude: 6.4920001, longitude: 17.4290009,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FEFS', 'FEGF', 'FEGU', 'FEGZ']
  },
  {
    zoneId: 'BAT2', name: 'Bata',
    countryCode: 'GQ', latitude: 1.9054700, longitude: 9.8056800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FGBT', 'FGMY']
  },
  {
    zoneId: 'MAL3', name: 'Malabo',
    countryCode: 'GQ', latitude: 3.7552700, longitude: 8.7087200,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FGSL']
  },
  {
    zoneId: 'LIV', name: 'Livingstone',
    countryCode: 'ZM', latitude: -17.8215240, longitude: 25.8196420,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FLLI', 'FLNA', 'FLSS']
  },
  {
    zoneId: 'LUS', name: 'Lusaka',
    countryCode: 'ZM', latitude: -15.3308330, longitude: 28.4527220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FLLS', 'FLJK', 'FLRZ']
  },
  {
    zoneId: 'CHI13', name: 'Chingola',
    countryCode: 'ZM', latitude: -12.5728000, longitude: 27.8939000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FLKE', 'FLSK', 'FLSO', 'FLMA', 'FLSW']
  },
  {
    zoneId: 'MFU', name: 'Mfuwe',
    countryCode: 'ZM', latitude: -13.2588997, longitude: 31.9365997,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FLMF', 'FLCP']
  },
  {
    zoneId: 'MON1', name: 'Mongu',
    countryCode: 'ZM', latitude: -15.2545000, longitude: 23.1623000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FLMG', 'FLKL', 'FLKO', 'FLLK', 'FLSN', 'FLZB']
  },
  {
    zoneId: 'MBA2', name: 'Mbala',
    countryCode: 'ZM', latitude: -8.8591700, longitude: 31.3363990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FLBA', 'FLKS', 'FLKY']
  },
  {
    zoneId: 'MOR1', name: 'Moroni',
    countryCode: 'KM', latitude: -11.5337000, longitude: 43.2719000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FMCH', 'FMCI', 'FMCV']
  },
  {
    zoneId: 'DZA', name: 'Dzaoudzi',
    countryCode: 'YT', latitude: -12.8093190, longitude: 45.2818150,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FMCZ']
  },
  {
    zoneId: 'SAI1', name: 'Sainte-Marie',
    countryCode: 'RE', latitude: -20.8900870, longitude: 55.5188940,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FMEE', 'FMEP']
  },
  {
    zoneId: 'POR9', name: 'Port Gentil',
    countryCode: 'GA', latitude: -0.7117390, longitude: 8.7543800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FOOG', 'FOOL', 'FOGR', 'FOOH', 'FOGF', 'FOGW', 'FOOI']
  },
  {
    zoneId: 'FRA2', name: 'Franceville',
    countryCode: 'GA', latitude: -1.6561600, longitude: 13.4380000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FOON', 'FOGK', 'FOGQ', 'FOGA', 'FOGG', 'FOOD', 'FOOR']
  },
  {
    zoneId: 'MOU2', name: 'Mouila',
    countryCode: 'GA', latitude: -1.8451400, longitude: 11.0567000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FOGM', 'FOGB', 'FOGE', 'FOGI', 'FOGJ', 'FOOT', 'FOOY']
  },
  {
    zoneId: 'OYE', name: 'Oyem',
    countryCode: 'GA', latitude: 1.5431100, longitude: 11.5813999,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FOGO', 'FOOB', 'FOOK', 'FOGV', 'FOOM']
  },
  {
    zoneId: 'SO2', name: 'São Tomé',
    countryCode: 'ST', latitude: 0.3781750, longitude: 6.7121500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FPST', 'FPPR']
  },
  {
    zoneId: 'VIC1', name: 'Victoria',
    countryCode: 'SC', latitude: -4.6743400, longitude: 55.5218010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FSIA', 'FSPP', 'FSSB', 'FSSD', 'FSSF']
  },
  {
    zoneId: 'ND', name: 'N\'Djamena',
    countryCode: 'TD', latitude: 12.1337000, longitude: 15.0340000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FTTJ', 'FTTB', 'FTTL']
  },
  {
    zoneId: 'ABE1', name: 'Abeche',
    countryCode: 'TD', latitude: 13.8470000, longitude: 20.8442990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FTTC']
  },
  {
    zoneId: 'MOU3', name: 'Moundou',
    countryCode: 'TD', latitude: 8.6285030, longitude: 16.0742410,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FTTD', 'FTTH', 'FTTP', 'FTTS']
  },
  {
    zoneId: 'FAY', name: 'Faya-Largeau',
    countryCode: 'TD', latitude: 17.9171010, longitude: 19.1110990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FTTY']
  },
  {
    zoneId: 'ATI', name: 'Ati',
    countryCode: 'TD', latitude: 13.2397780, longitude: 18.3158930,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FTTI', 'FTTK', 'FTTM']
  },
  {
    zoneId: 'BLA1', name: 'Blantyre',
    countryCode: 'MW', latitude: -15.6771890, longitude: 34.9723190,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FWCL', 'FWCM', 'FWMY', 'FWSM']
  },
  {
    zoneId: 'LUM', name: 'Lumbadzi',
    countryCode: 'MW', latitude: -13.7894000, longitude: 33.7809980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FWKI', 'FWDW', 'FWKG', 'FWLK']
  },
  {
    zoneId: 'KAR3', name: 'Karonga',
    countryCode: 'MW', latitude: -9.9535710, longitude: 33.8932640,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FWKA', 'FWUU', 'FWCD']
  },
  {
    zoneId: 'MAS2', name: 'Maseru(Mazenod)',
    countryCode: 'LS', latitude: -29.4562770, longitude: 27.5544560,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FXMM', 'FXLK', 'FXLR', 'FXLS', 'FXMA', 'FXMF', 'FXMK', 'FXNK', 'FXPG', 'FXQG', 'FXQN', 'FXSH', 'FXSK', 'FXSM', 'FXSS', 'FXTA', 'FXTK']
  },
  {
    zoneId: 'WAL', name: 'Walvis Bay(Rooikop)',
    countryCode: 'NA', latitude: -22.9793320, longitude: 14.6471020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FYWB', 'FYAR', 'FYSM', 'FYSS']
  },
  {
    zoneId: 'WIN2', name: 'Windhoek',
    countryCode: 'NA', latitude: -22.4799000, longitude: 17.4709000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['FYWH', 'FYWE', 'FYGB', 'FYME', 'FYMG']
  },
  {
    zoneId: 'GRO2', name: 'Grootfontein',
    countryCode: 'NA', latitude: -19.6022000, longitude: 18.1227000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYGF', 'FYTM', 'FYHI', 'FYMO', 'FYNA', 'FYOW']
  },
  {
    zoneId: 'MPA', name: 'Mpacha',
    countryCode: 'NA', latitude: -17.6342580, longitude: 24.1766880,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYKM', 'FYLS', 'FYOE']
  },
  {
    zoneId: 'KEE', name: 'Keetmanshoop',
    countryCode: 'NA', latitude: -26.5398010, longitude: 18.1114010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYKT', 'FYAA', 'FYKB', 'FYSA']
  },
  {
    zoneId: 'LUD', name: 'Luderitz',
    countryCode: 'NA', latitude: -26.6874008, longitude: 15.2428999,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYLZ']
  },
  {
    zoneId: 'OND', name: 'Ondangwa',
    countryCode: 'NA', latitude: -17.8782010, longitude: 15.9526000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYOA', 'FYNG', 'FYOO', 'FYOS']
  },
  {
    zoneId: 'ORA', name: 'Oranjemund',
    countryCode: 'NA', latitude: -28.5847000, longitude: 16.4466990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYOG']
  },
  {
    zoneId: 'RUN', name: 'Rundu',
    countryCode: 'NA', latitude: -17.9564990, longitude: 19.7194000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['FYRU']
  },
  {
    zoneId: 'BAM1', name: 'Bamako',
    countryCode: 'ML', latitude: 12.5335000, longitude: -7.9499400,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GABS']
  },
  {
    zoneId: 'TIM1', name: 'Timbuktu',
    countryCode: 'ML', latitude: 16.7304990, longitude: -3.0075800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GATB', 'GAGM']
  },
  {
    zoneId: 'GAO', name: 'Gao',
    countryCode: 'ML', latitude: 16.2484660, longitude: -0.0053890,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GAGO']
  },
  {
    zoneId: 'KAY', name: 'Kayes',
    countryCode: 'ML', latitude: 14.4825210, longitude: -11.3993350,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GAKY', 'GAKA', 'GANR', 'GAYE']
  },
  {
    zoneId: 'SV', name: 'Sévaré',
    countryCode: 'ML', latitude: 14.5128000, longitude: -4.0795600,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GAMB']
  },
  {
    zoneId: 'YUN1', name: 'Yundum',
    countryCode: 'GM', latitude: 13.3380000, longitude: -16.6522010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GBYD']
  },
  {
    zoneId: 'FRE4', name: 'Freetown (Lungi-Town)',
    countryCode: 'SL', latitude: 8.6164400, longitude: -13.1955000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GFLL', 'GFBO', 'GFGK', 'GFHA', 'GFKB']
  },
  {
    zoneId: 'KEN1', name: 'Kenema',
    countryCode: 'SL', latitude: 7.8963640, longitude: -11.1741260,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GFKE', 'GFYE']
  },
  {
    zoneId: 'BIS', name: 'Bissau',
    countryCode: 'GW', latitude: 11.8942620, longitude: -15.6535960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GGOV', 'GGBU']
  },
  {
    zoneId: 'MON2', name: 'Monrovia',
    countryCode: 'LR', latitude: 6.2337900, longitude: -10.3623000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GLRB', 'GLMR', 'GLBU', 'GLGE']
  },
  {
    zoneId: 'HAR2', name: 'Harper',
    countryCode: 'LR', latitude: 4.3790202, longitude: -7.6969500,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GLCP', 'GLST', 'GLTN']
  },
  {
    zoneId: 'DAK', name: 'Dakhla',
    countryCode: 'EH', latitude: 23.7183000, longitude: -15.9320000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GMMH']
  },
  {
    zoneId: 'EL9', name: 'El Aaiún',
    countryCode: 'EH', latitude: 27.1424670, longitude: -13.2249470,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GMML', 'GMMA']
  },
  {
    zoneId: 'NOU', name: 'Nouakchott',
    countryCode: 'MR', latitude: 18.3100000, longitude: -15.9697220,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GQNO', 'GQNB']
  },
  {
    zoneId: 'ATA2', name: 'Atar',
    countryCode: 'MR', latitude: 20.5058230, longitude: -13.0437440,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GQPA', 'GQNJ']
  },
  {
    zoneId: 'NOU1', name: 'Nouadhibou',
    countryCode: 'MR', latitude: 20.9324040, longitude: -17.0301990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GQPP']
  },
  {
    zoneId: 'AIO', name: 'Aioun El Atrouss',
    countryCode: 'MR', latitude: 16.7112999, longitude: -9.6378803,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GQNA', 'GQNC', 'GQNF', 'GQNH', 'GQNT']
  },
  {
    zoneId: 'CON7', name: 'Conakry',
    countryCode: 'GN', latitude: 9.5768900, longitude: -13.6120000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['GUCY', 'GUFA', 'GUOK']
  },
  {
    zoneId: 'FAR1', name: 'Faranah',
    countryCode: 'GN', latitude: 10.0354996, longitude: -10.7698002,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['GUFH', 'GUKU', 'GULB', 'GUMA', 'GXUD']
  },
  {
    zoneId: 'BUJ', name: 'Bujumbura',
    countryCode: 'BI', latitude: -3.3240200, longitude: 29.3185010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HBBA', 'HBBE', 'HBBO']
  },
  {
    zoneId: 'HAR3', name: 'Hargeisa',
    countryCode: 'SO', latitude: 9.5140820, longitude: 44.0834690,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HCMH', 'HCMI', 'HCMV']
  },
  {
    zoneId: 'MOG', name: 'Mogadishu',
    countryCode: 'SO', latitude: 2.0144400, longitude: 45.3046990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HCMM', 'HCMB']
  },
  {
    zoneId: 'KIS2', name: 'Kismayo',
    countryCode: 'SO', latitude: -0.3773530, longitude: 42.4592020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HCMK']
  },
  {
    zoneId: 'ALU', name: 'Alula',
    countryCode: 'SO', latitude: 11.9582000, longitude: 50.7480000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HCMA', 'HCMC', 'HCMF', 'HCMS']
  },
  {
    zoneId: 'EYL', name: 'Eyl',
    countryCode: 'SO', latitude: 8.1040000, longitude: 49.8200000,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HCME', 'HCMG', 'HCMW']
  },
  {
    zoneId: 'DJI', name: 'Djibouti City',
    countryCode: 'DJ', latitude: 11.5473000, longitude: 43.1595000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HDAM', 'HDAS', 'HDMO', 'HDOB', 'HDTJ']
  },
  {
    zoneId: 'ASM', name: 'Asmara',
    countryCode: 'ER', latitude: 15.2919000, longitude: 38.9107020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HHAS', 'HHMS']
  },
  {
    zoneId: 'ASS', name: 'Assab',
    countryCode: 'ER', latitude: 13.0718000, longitude: 42.6450000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HHSB']
  },
  {
    zoneId: 'JUB', name: 'Juba',
    countryCode: 'SS', latitude: 4.8720100, longitude: 31.6011010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HJJJ']
  },
  {
    zoneId: 'WAU', name: 'Wau',
    countryCode: 'SS', latitude: 7.7258300, longitude: 27.9750000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HSWW', 'HSMK']
  },
  {
    zoneId: 'MAL4', name: 'Malakal',
    countryCode: 'SS', latitude: 9.5587390, longitude: 31.6519370,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['HSSM']
  },
  {
    zoneId: 'KIG', name: 'Kigali',
    countryCode: 'RW', latitude: -1.9686300, longitude: 30.1395000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['HRYR', 'HRYG', 'HRZA', 'HRYI', 'HRYU']
  },
  {
    zoneId: 'SAI2', name: 'Saint-Pierre',
    countryCode: 'PM', latitude: 46.7626510, longitude: -56.1749900,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LFVP', 'LFVM']
  },
  {
    zoneId: 'GIB', name: 'Gibraltar',
    countryCode: 'GI', latitude: 36.1516790, longitude: -5.3497800,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['LXGB']
  },
  {
    zoneId: 'PRO1', name: 'Providenciales',
    countryCode: 'TC', latitude: 21.7736970, longitude: -72.2683210,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MBPV', 'MBGT', 'MBNC', 'MBSC', 'MBMC', 'MBPI', 'MBSY']
  },
  {
    zoneId: 'MAJ', name: 'Majuro Atoll',
    countryCode: 'MH', latitude: 7.0651100, longitude: 171.2716560,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PKMJ', 'MLIP']
  },
  {
    zoneId: 'KWA', name: 'Kwajalein',
    countryCode: 'MH', latitude: 8.7201204, longitude: 167.7319946,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PKWA']
  },
  {
    zoneId: 'GEO1', name: 'George Town',
    countryCode: 'KY', latitude: 19.2928010, longitude: -81.3576970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MWCR', 'MWCB', 'MWCL']
  },
  {
    zoneId: 'BEL5', name: 'Belize City',
    countryCode: 'BZ', latitude: 17.5399510, longitude: -88.3035560,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['MZBZ', 'MZPL', 'MZMF']
  },
  {
    zoneId: 'AVA', name: 'Avarua',
    countryCode: 'CK', latitude: -21.2027000, longitude: -159.8060000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NCRG', 'NCMG']
  },
  {
    zoneId: 'NUK1', name: 'Nuku\'alofa',
    countryCode: 'TO', latitude: -21.2414380, longitude: -175.1491640,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NFTF', 'NFTL', 'NFTE']
  },
  {
    zoneId: 'VAV', name: 'Vava\'u Island',
    countryCode: 'TO', latitude: -18.5853000, longitude: -173.9620060,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NFTV']
  },
  {
    zoneId: 'SOU', name: 'South Tarawa',
    countryCode: 'KI', latitude: 1.3816400, longitude: 173.1470030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NGTA', 'NGAB', 'NGKT', 'NGMA', 'NGMK', 'NGTB', 'NGTU', 'NGUK']
  },
  {
    zoneId: 'KIR4', name: 'Kiritimati',
    countryCode: 'KI', latitude: 1.9862780, longitude: -157.3500110,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PLCH']
  },
  {
    zoneId: 'UNK41', name: 'Unknown',
    countryCode: 'KI', latitude: -1.2244700, longitude: 174.7760010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NGTE', 'NGBR', 'NGNU', 'NGON', 'NGTM', 'NGTO', 'NGTS']
  },
  {
    zoneId: 'ABA2', name: 'Abariringa',
    countryCode: 'KI', latitude: -2.7681201, longitude: -171.7100067,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PCIS']
  },
  {
    zoneId: 'FUN1', name: 'Funafuti',
    countryCode: 'TV', latitude: -8.5238850, longitude: 179.1969760,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NGFU']
  },
  {
    zoneId: 'WAL1', name: 'Wallis Island',
    countryCode: 'WF', latitude: -13.2394450, longitude: -176.1986500,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NLWW']
  },
  {
    zoneId: 'PAG', name: 'Pago Pago',
    countryCode: 'AS', latitude: -14.3310000, longitude: -170.7100070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NSTU', 'NSAS', 'NSFQ']
  },
  {
    zoneId: 'API', name: 'Apia',
    countryCode: 'WS', latitude: -13.8300000, longitude: -172.0079960,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NSFA', 'NSAU', 'NSFI', 'NSMA']
  },
  {
    zoneId: 'POR10', name: 'Port Vila',
    countryCode: 'VU', latitude: -17.6993010, longitude: 168.3200070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NVVV', 'NVVW', 'NVSE', 'NVSF', 'NVSI', 'NVSL', 'NVSM', 'NVSO', 'NVSP', 'NVST', 'NVSU', 'NVSV', 'NVSX', 'NVVB', 'NVVD', 'NVVI']
  },
  {
    zoneId: 'GAU', name: 'Gaua Island',
    countryCode: 'VU', latitude: -14.2181000, longitude: 167.5870060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NVSQ', 'NVSS', 'NVSA', 'NVSC', 'NVSD', 'NVSG', 'NVSH', 'NVSN', 'NVSR', 'NVSW', 'NVSZ']
  },
  {
    zoneId: 'NOU2', name: 'Nouméa (La Tontouta)',
    countryCode: 'NC', latitude: -22.0146010, longitude: 166.2129970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['NWWW', 'NWWA', 'NWWD', 'NWWE', 'NWWL', 'NWWM', 'NWWR', 'NWWU', 'NWWV', 'NWWQ']
  },
  {
    zoneId: 'WAA', name: 'Waala',
    countryCode: 'NC', latitude: -19.7205210, longitude: 163.6610770,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['NWWC', 'NWWK', 'NWWP']
  },
  {
    zoneId: 'GUZ', name: 'Guzara',
    countryCode: 'AF', latitude: 34.2099990, longitude: 62.2282980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OAHR', 'OAFR', 'OAQN', 'OASD']
  },
  {
    zoneId: 'KAB', name: 'Kabul',
    countryCode: 'AF', latitude: 34.5658990, longitude: 69.2123030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OAKB', 'OAIX', 'OAJL', 'OAKS', 'OABN', 'OADS', 'OAGN', 'OAGZ', 'OAOG', 'OARZ', 'OASA', 'OASH', 'OASL']
  },
  {
    zoneId: 'KHV', name: 'Khvoshab',
    countryCode: 'AF', latitude: 31.5057690, longitude: 65.8479630,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OAKN', 'OABT', 'OADY', 'OARG', 'OATN', 'OAZI']
  },
  {
    zoneId: 'MAZ', name: 'Mazar-i-Sharif',
    countryCode: 'AF', latitude: 36.7041200, longitude: 67.2104590,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OAMS', 'OAUZ', 'OATQ']
  },
  {
    zoneId: 'MAY', name: 'Maymana',
    countryCode: 'AF', latitude: 35.9308010, longitude: 64.7609020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OAMN', 'OACC']
  },
  {
    zoneId: 'DAR4', name: 'Darwaz',
    countryCode: 'AF', latitude: 38.4617980, longitude: 70.8816060,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OADZ', 'OAFZ', 'OAHN', 'OASN']
  },
  {
    zoneId: 'ALE4', name: 'Aleppo',
    countryCode: 'SY', latitude: 36.1812620, longitude: 37.2268690,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OSAP', 'OSLK', 'OSPR']
  },
  {
    zoneId: 'DAM', name: 'Damascus',
    countryCode: 'SY', latitude: 33.4114990, longitude: 36.5155983,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OSDI']
  },
  {
    zoneId: 'DEI', name: 'Deir ez-Zor',
    countryCode: 'SY', latitude: 35.2854000, longitude: 40.1759990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OSDZ', 'OSKL']
  },
  {
    zoneId: 'ADE', name: 'Aden',
    countryCode: 'YE', latitude: 12.8295640, longitude: 45.0299760,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OYAA', 'OYTZ', 'OYBI', 'OYMS']
  },
  {
    zoneId: 'MUK', name: 'Mukalla(Riyan)',
    countryCode: 'YE', latitude: 14.6622410, longitude: 49.3752890,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OYRN', 'OYSY']
  },
  {
    zoneId: 'SAN19', name: 'Sanaa',
    countryCode: 'YE', latitude: 15.4763000, longitude: 44.2197000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['OYSN', 'OYAB', 'OYBN', 'OYBQ', 'OYKM', 'OYMB', 'OYSH']
  },
  {
    zoneId: 'ATA3', name: 'Ataq',
    countryCode: 'YE', latitude: 14.5513000, longitude: 46.8261990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OYAT']
  },
  {
    zoneId: 'AL2', name: 'Al Ghaydah',
    countryCode: 'YE', latitude: 16.1933410, longitude: 52.1741860,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OYGD', 'OYQN']
  },
  {
    zoneId: 'MOR2', name: 'Mori',
    countryCode: 'YE', latitude: 12.6320930, longitude: 53.9061730,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['OYSQ']
  },
  {
    zoneId: 'ROT', name: 'Rota Island',
    countryCode: 'MP', latitude: 14.1732670, longitude: 145.2411030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PGRO', 'PGSN', 'PGWT']
  },
  {
    zoneId: 'WEN1', name: 'Weno Island',
    countryCode: 'FM', latitude: 7.4618700, longitude: 151.8430020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PTKK']
  },
  {
    zoneId: 'OKA1', name: 'Okat',
    countryCode: 'FM', latitude: 5.3569800, longitude: 162.9579930,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PTSA']
  },
  {
    zoneId: 'YAP', name: 'Yap Island',
    countryCode: 'FM', latitude: 9.4989100, longitude: 138.0829930,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PTYA']
  },
  {
    zoneId: 'POH', name: 'Pohnpei Island',
    countryCode: 'FM', latitude: 6.9850820, longitude: 158.2099200,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['PTPN']
  },
  {
    zoneId: 'BAB', name: 'Babelthuap Island',
    countryCode: 'PW', latitude: 7.3669650, longitude: 134.5440850,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['PTRO']
  },
  {
    zoneId: 'ZAN', name: 'Zandery',
    countryCode: 'SR', latitude: 5.4528300, longitude: -55.1878010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SMJP', 'SMBN', 'SMCA', 'SMCO', 'SMDA', 'SMDO', 'SMMO', 'SMNI', 'SMST', 'SMWA', 'SMZO']
  },
  {
    zoneId: 'MAT5', name: 'Matoury',
    countryCode: 'GF', latitude: 4.8199640, longitude: -52.3613260,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SOCA', 'SOOG', 'SOOM', 'SOOR', 'SOOS']
  },
  {
    zoneId: 'GEO2', name: 'Georgetown',
    countryCode: 'GY', latitude: 6.4985500, longitude: -58.2541010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['SYCJ', 'SYGO', 'SYKA', 'SYBT', 'SYKZ', 'SYMD', 'SYNA', 'SYSK']
  },
  {
    zoneId: 'LET2', name: 'Lethem',
    countryCode: 'GY', latitude: 3.3727600, longitude: -59.7893980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SYLT', 'SYAH', 'SYAN', 'SYKR', 'SYKS', 'SYKT', 'SYLP', 'SYMK', 'SYMM', 'SYOR', 'SYPM', 'SYSC']
  },
  {
    zoneId: 'BAR8', name: 'Baramita',
    countryCode: 'GY', latitude: 7.3701200, longitude: -60.4879990,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['SYBR', 'SYIB', 'SYKM', 'SYMB', 'SYMR', 'SYPK', 'SYPR']
  },
  {
    zoneId: 'OSB', name: 'Osbourn',
    countryCode: 'AG', latitude: 17.1367000, longitude: -61.7927020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TAPA', 'TAPH']
  },
  {
    zoneId: 'MAR7', name: 'Marigot',
    countryCode: 'DM', latitude: 15.5463620, longitude: -61.3004760,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TDPD', 'TDCF']
  },
  {
    zoneId: 'POI1', name: 'Pointe-à-Pitre',
    countryCode: 'GP', latitude: 16.2654430, longitude: -61.5327540,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TFFR', 'TFFM', 'TFFA', 'TFFB', 'TFFC', 'TFFS']
  },
  {
    zoneId: 'FOR10', name: 'Fort-de-France',
    countryCode: 'MQ', latitude: 14.5910000, longitude: -61.0032010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TFFF']
  },
  {
    zoneId: 'SAI3', name: 'Saint George\'s',
    countryCode: 'GD', latitude: 12.0039960, longitude: -61.7853020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TGPY', 'TGPZ']
  },
  {
    zoneId: 'CHA8', name: 'Charlotte Amalie',
    countryCode: 'VI', latitude: 18.3370910, longitude: -64.9772510,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TIST', 'TISX']
  },
  {
    zoneId: 'BAS3', name: 'Basseterre',
    countryCode: 'KN', latitude: 17.3108450, longitude: -62.7191170,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TKPK', 'TKPN']
  },
  {
    zoneId: 'VIE2', name: 'Vieux Fort',
    countryCode: 'LC', latitude: 13.7332000, longitude: -60.9525990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TLPL', 'TLPC']
  },
  {
    zoneId: 'ORA1', name: 'Oranjestad',
    countryCode: 'AW', latitude: 12.5010560, longitude: -70.0142810,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TNCA']
  },
  {
    zoneId: 'KRA2', name: 'Kralendijk',
    countryCode: 'BQ', latitude: 12.1310000, longitude: -68.2685010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TNCB']
  },
  {
    zoneId: 'ORA2', name: 'Oranjestad',
    countryCode: 'BQ', latitude: 17.4965000, longitude: -62.9794010,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['TNCE', 'TNCS']
  },
  {
    zoneId: 'WIL2', name: 'Willemstad',
    countryCode: 'CW', latitude: 12.1889000, longitude: -68.9598010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TNCC']
  },
  {
    zoneId: 'SIN2', name: 'Sint Maarten',
    countryCode: 'SX', latitude: 18.0410000, longitude: -63.1088980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TNCM']
  },
  {
    zoneId: 'THE1', name: 'The Valley',
    countryCode: 'AI', latitude: 18.2047730, longitude: -63.0538300,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TQPF']
  },
  {
    zoneId: 'GER1', name: 'Gerald\'s Park',
    countryCode: 'MS', latitude: 16.7918350, longitude: -62.1932040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TRPG']
  },
  {
    zoneId: 'BEE', name: 'Beef Island',
    countryCode: 'VG', latitude: 18.4454920, longitude: -64.5417070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TUPJ', 'TUPW', 'TUPA']
  },
  {
    zoneId: 'KIN6', name: 'Kingstown',
    countryCode: 'VC', latitude: 13.1597250, longitude: -61.1488010,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TVSA', 'TVSB', 'TVSC', 'TVSM', 'TVSU']
  },
  {
    zoneId: 'HAM3', name: 'Hamilton',
    countryCode: 'BM', latitude: 32.3638020, longitude: -64.6782400,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['TXKF']
  },
  {
    zoneId: 'BIS1', name: 'Bishkek',
    countryCode: 'KG', latitude: 43.0612980, longitude: 74.4776000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAFM', 'UCFL']
  },
  {
    zoneId: 'OSH', name: 'Osh',
    countryCode: 'KG', latitude: 40.6090010, longitude: 72.7932970,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UAFO']
  },
  {
    zoneId: 'ASH', name: 'Ashgabat',
    countryCode: 'TM', latitude: 37.9868010, longitude: 58.3610000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UTAA']
  },
  {
    zoneId: 'TR', name: 'Türkmenabat',
    countryCode: 'TM', latitude: 38.9306620, longitude: 63.5639820,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UTAV', 'UTAM', 'UTAE']
  },
  {
    zoneId: 'TUR1', name: 'Turkmenbashi',
    countryCode: 'TM', latitude: 40.0633010, longitude: 53.0071980,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UTAK', 'UT1H']
  },
  {
    zoneId: 'DA1', name: 'Daşoguz',
    countryCode: 'TM', latitude: 41.7598530, longitude: 59.8361490,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UTAT']
  },
  {
    zoneId: 'KHU', name: 'Khujand',
    countryCode: 'TJ', latitude: 40.2154010, longitude: 69.6947020,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['UTDL', 'UTDD']
  },
  {
    zoneId: 'KUL2', name: 'Kulyab',
    countryCode: 'TJ', latitude: 37.9880981, longitude: 69.8050003,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['UTDK', 'UTDT']
  },
  {
    zoneId: 'PAR2', name: 'Paro',
    countryCode: 'BT', latitude: 27.4032000, longitude: 89.4245990,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VQPR', 'VQGP', 'VQBT', 'VQTY']
  },
  {
    zoneId: 'NOO', name: 'Noonu Atoll',
    countryCode: 'MV', latitude: 5.8174070, longitude: 73.4684040,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VRDA', 'VRMH', 'VRMM', 'VRAH', 'VRBK', 'VREI', 'VRMD']
  },
  {
    zoneId: 'GAN1', name: 'Gan',
    countryCode: 'MV', latitude: -0.6929750, longitude: 73.1526270,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['VRMG', 'VRMT', 'VRMF', 'VRMO', 'VRQM']
  },
  {
    zoneId: 'KAD1', name: 'Kadhdhoo',
    countryCode: 'MV', latitude: 1.8591700, longitude: 73.5218964,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['VRMK', 'VRMV', 'VRMU', 'VRNT']
  },
  {
    zoneId: 'DIL1', name: 'Dili',
    countryCode: 'TL', latitude: -8.5465620, longitude: 125.5245070,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['WPDL', 'WPEC', 'WPOC', 'WPDB', 'WPAT', 'WPMN', 'WPVQ']
  },
  {
    zoneId: 'WES2', name: 'West Island',
    countryCode: 'CC', latitude: -12.1922180, longitude: 96.8341030,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['YPCC']
  },
  {
    zoneId: 'FLY', name: 'Flying Fish Cove',
    countryCode: 'CX', latitude: -10.4503870, longitude: 105.6911000,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['YPXM']
  },
  {
    zoneId: 'PYO', name: 'Pyongyang',
    countryCode: 'KP', latitude: 39.2240980, longitude: 125.6699980,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZKPY', 'ZKSD', 'ZKWS', 'ZKUJ']
  },
  {
    zoneId: 'HOE', name: 'Hoemun-ri',
    countryCode: 'KP', latitude: 41.4285380, longitude: 129.6475550,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZKHM', 'ZKSE']
  },
  {
    zoneId: 'ULA', name: 'Ulaanbaatar (Sergelen)',
    countryCode: 'MN', latitude: 47.6469160, longitude: 106.8198330,
    population: { 1950: 300, 1960: 400, 1970: 550, 1980: 700, 1990: 900, 2000: 1100, 2010: 1400, 2020: 1600 },
    airports: ['ZMCK', 'ZMUB', 'ZMMG']
  },
  {
    zoneId: 'ARV', name: 'Arvaikheer',
    countryCode: 'MN', latitude: 46.2503014, longitude: 102.8020020,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMAH', 'ZMBH', 'ZMHH', 'ZMHU', 'ZMTG']
  },
  {
    zoneId: 'ALT5', name: 'Altai',
    countryCode: 'MN', latitude: 46.3764000, longitude: 96.2210999,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMAT', 'ZMDN']
  },
  {
    zoneId: 'BUL1', name: 'Bulgan',
    countryCode: 'MN', latitude: 48.8549995, longitude: 103.4759979,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMBN']
  },
  {
    zoneId: 'UNK42', name: 'Unknown',
    countryCode: 'MN', latitude: 46.6603012, longitude: 113.2850037,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMBU', 'ZMCD', 'ZMUH']
  },
  {
    zoneId: 'DAL1', name: 'Dalanzadgad',
    countryCode: 'MN', latitude: 43.6086280, longitude: 104.3677340,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMDZ', 'ZMBR']
  },
  {
    zoneId: 'KHO1', name: 'Khovd',
    countryCode: 'MN', latitude: 47.9541020, longitude: 91.6281970,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMKD', 'ZMUL', 'ZMBS']
  },
  {
    zoneId: 'MR', name: 'Mörön',
    countryCode: 'MN', latitude: 49.6636770, longitude: 100.1000280,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMMN', 'ZMHG', 'ZMTL']
  },
  {
    zoneId: 'ULA1', name: 'Ulaangom',
    countryCode: 'MN', latitude: 50.0665880, longitude: 91.9382730,
    population: { 1950: 100, 1960: 150, 1970: 200, 1980: 280, 1990: 370, 2000: 480, 2010: 600, 2020: 700 },
    airports: ['ZMUG']
  },

];
