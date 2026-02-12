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
    airports: ['KJFK', 'KEWR', 'KLGA']
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
    airports: ['KLAX', 'KONT', 'KSNA', 'KBUR', 'KLGB']
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
    airports: ['KORD', 'KMDW']
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
    airports: ['KDFW', 'KDAL']
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
    airports: ['KIAH', 'KHOU']
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
    airports: ['KIAD', 'KDCA', 'KBWI']
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
    airports: ['KMIA', 'KFLL', 'KPBI']
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
    airports: ['KATL']
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
    airports: ['KSFO', 'KOAK', 'KSJC']
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
    airports: ['KPHX', 'KIWA']
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
    airports: ['KBOS']
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
    airports: ['KSEA']
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
    airports: ['KMSP']
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
    airports: ['KDEN']
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
    airports: ['KDTW']
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
    airports: ['KPHL']
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
    airports: ['KCLT']
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
    airports: ['KMCO', 'KSFB']
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
    airports: ['KTPA', 'KPIE']
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
    airports: ['KSTL']
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
    airports: ['KSLC']
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
    airports: ['KSAN']
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
    airports: ['KPIT']
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
    airports: ['KPDX']
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
    airports: ['KLAS']
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
    airports: ['KAUS']
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
    airports: ['KBNA']
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
    airports: ['KRDU']
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
    airports: ['KIND']
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
    airports: ['KCLE']
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
    airports: ['KCMH']
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
    airports: ['KMKE']
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
    airports: ['KJAX']
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
    airports: ['KMCI']
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
    airports: ['KSAT']
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
    airports: ['KMEM']
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
    airports: ['KCVG']
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
    airports: ['KMSY']
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
    airports: ['KBUF']
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
    airports: ['PHNL']
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
    airports: ['PANC']
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
    airports: ['KRNO']
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
    airports: ['KOKC']
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
    airports: ['KRIC']
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
    airports: ['KABQ']
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
    airports: ['KTUL']
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
    airports: ['KBHM']
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
    airports: ['KELP']
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
    airports: ['KRSW']
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
    airports: ['KSDF']
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
    airports: ['KSMF']
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
    airports: ['KTUS']
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
    airports: ['KOMA']
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
    airports: ['KDSM']
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
    airports: ['KHSV']
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
    airports: ['KGSP']
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
    airports: ['KBOI']
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
    airports: ['KCHS']
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
    airports: ['EGLL', 'EGKK', 'EGSS', 'EGLC', 'EGMC', 'EGGW']
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
    airports: ['EGBB']
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
    airports: ['EGPH']
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
    airports: ['EGPF', 'EGPK']
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
    airports: ['EGGD']
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
    airports: ['EGAA', 'EGAC']
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
    airports: ['EGNM']
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
    airports: ['EGNT']
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
    airports: ['EGGP']
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
    airports: ['FAOR', 'FAKN']
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
    airports: ['KORF']
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
    airports: ['KPVD']
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
    airports: ['KBDL']
  },

];

