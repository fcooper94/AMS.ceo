/**
 * Storage Airports - Real-world aircraft boneyards/storage facilities
 * Shared between backend (CommonJS) and frontend (browser global)
 */
const STORAGE_AIRPORTS = [
  { icao: 'LETV', name: 'Teruel Airport', city: 'Teruel', country: 'Spain', lat: 40.4033, lon: -1.2183, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 2013 },
  { icao: 'LFBT', name: 'Tarbes-Lourdes-Pyrénées', city: 'Tarbes', country: 'France', lat: 43.1787, lon: -0.0006, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 2007 },
  { icao: 'RPLL', name: 'Ninoy Aquino Intl', city: 'Manila', country: 'Philippines', lat: 14.5086, lon: 121.0197, costTier: 'Cheap', weeklyRatePercent: 0.05, annualConditionLoss: 3, availableFrom: 1960 },
  { icao: 'EGBP', name: 'Cotswold Airport', city: 'Kemble', country: 'United Kingdom', lat: 51.6681, lon: -2.0569, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 2001 },
  { icao: 'EHTW', name: 'Twente Airport', city: 'Enschede', country: 'Netherlands', lat: 52.2756, lon: 6.8892, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 2008 },
  { icao: 'KVCV', name: 'Southern California Logistics', city: 'Victorville', country: 'United States', lat: 34.5975, lon: -117.3831, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 1992 },
  { icao: 'YBAS', name: 'Alice Springs Airport', city: 'Alice Springs', country: 'Australia', lat: -23.8067, lon: 133.9028, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 2006 },
  { icao: 'KMHV', name: 'Mojave Air & Space Port', city: 'Mojave', country: 'United States', lat: 35.0594, lon: -118.1519, costTier: 'Expensive', weeklyRatePercent: 0.12, annualConditionLoss: 1, availableFrom: 1972 },
  { icao: 'OMSJ', name: 'Sharjah Intl', city: 'Sharjah', country: 'UAE', lat: 25.3286, lon: 55.5172, costTier: 'Middle', weeklyRatePercent: 0.08, annualConditionLoss: 1, availableFrom: 1977 },
  { icao: 'OIII', name: 'Mehrabad Intl', city: 'Tehran', country: 'Iran', lat: 35.6892, lon: 51.3136, costTier: 'Very Cheap', weeklyRatePercent: 0.02, annualConditionLoss: 5, availableFrom: 1938 },
  { icao: 'UUMT', name: 'Migalovo Airfield', city: 'Tver', country: 'Russia', lat: 56.8244, lon: 35.7658, costTier: 'Cheap', weeklyRatePercent: 0.05, annualConditionLoss: 3, availableFrom: 1960 },
  { icao: 'UCFM', name: 'Manas Intl', city: 'Bishkek', country: 'Kyrgyzstan', lat: 43.0613, lon: 74.4776, costTier: 'Cheap', weeklyRatePercent: 0.05, annualConditionLoss: 3, availableFrom: 1975 },
  { icao: 'CYXE', name: 'Saskatoon J.G. Diefenbaker', city: 'Saskatoon', country: 'Canada', lat: 52.1708, lon: -106.6997, costTier: 'Mid-Expensive', weeklyRatePercent: 0.09, annualConditionLoss: 2, availableFrom: 1940 }
];

function calculateStorageDistanceNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function calculateRecallDays(distanceNm) {
  const MAX_DISTANCE = 10800;
  const MIN_DAYS = 3;
  const MAX_DAYS = 10;
  const clamped = Math.min(distanceNm, MAX_DISTANCE);
  return Math.round(MIN_DAYS + (MAX_DAYS - MIN_DAYS) * (clamped / MAX_DISTANCE));
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { STORAGE_AIRPORTS, calculateStorageDistanceNm, calculateRecallDays };
} else if (typeof window !== 'undefined') {
  window.STORAGE_AIRPORTS = STORAGE_AIRPORTS;
  window.calculateStorageDistanceNm = calculateStorageDistanceNm;
  window.calculateRecallDays = calculateRecallDays;
}
