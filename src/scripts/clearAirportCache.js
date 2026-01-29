require('dotenv').config();
const airportCacheService = require('../services/airportCacheService');

/**
 * Simple script to clear the airport cache
 * Run this after database updates to ensure fresh data is loaded
 */

async function clearCache() {
  console.log('Clearing airport cache...');
  const clearedCount = airportCacheService.clearAll();
  console.log(`✓ Cleared ${clearedCount} cache entries`);
  console.log('Cache is now empty. Next API request will fetch fresh data from database.');
}

if (require.main === module) {
  clearCache();
}

module.exports = clearCache;
