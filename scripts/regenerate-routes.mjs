/**
 * Regenerate ATC route waypoints for existing routes.
 * Run: node scripts/regenerate-routes.mjs [--limit N] [--all]
 *
 *   --limit N   Process at most N routes (default: all)
 *   --all       Regenerate ALL routes (including those that already have waypoints)
 *
 * By default only processes routes missing waypoints.
 * Requires the server's database config (.env) and airwayService navdata files.
 */

// Load .env so database config is available
import 'dotenv/config';

// Parse args
const args = process.argv.slice(2);
const limitIdx = args.indexOf('--limit');
const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : null;
const processAll = args.includes('--all');

// Use dynamic import for CommonJS modules
const { default: sequelize } = await import('../src/config/database.js');
const { default: Route } = await import('../src/models/Route.js');
const { default: Airport } = await import('../src/models/Airport.js');

// Set up associations needed for includes
Route.belongsTo(Airport, { foreignKey: 'departure_airport_id', as: 'departureAirport' });
Route.belongsTo(Airport, { foreignKey: 'arrival_airport_id', as: 'arrivalAirport' });

const { default: airwayService } = await import('../src/services/airwayService.js');

// Trigger initialization and wait for it to complete
console.log('Initializing airway service...');
airwayService.initialize();
await new Promise(resolve => {
  const check = () => {
    if (airwayService.isReady()) return resolve();
    setTimeout(check, 200);
  };
  check();
});
console.log('Airway service ready.\n');

// Fetch routes with their airports
const queryOpts = {
  include: [
    { model: Airport, as: 'departureAirport', attributes: ['latitude', 'longitude', 'icaoCode'] },
    { model: Airport, as: 'arrivalAirport', attributes: ['latitude', 'longitude', 'icaoCode'] }
  ],
  attributes: ['id', 'routeNumber', 'returnRouteNumber'],
  where: { isActive: true }
};

if (!processAll) {
  queryOpts.where.waypoints = null;
}
if (limit) {
  queryOpts.limit = limit;
}

const routes = await Route.findAll(queryOpts);

const mode = processAll ? 'all routes' : 'routes missing waypoints';
console.log(`Found ${routes.length} ${mode} to regenerate${limit ? ` (limit ${limit})` : ''}.\n`);

let updated = 0;
let skipped = 0;
let failed = 0;

for (const route of routes) {
  const dep = route.departureAirport;
  const arr = route.arrivalAirport;

  if (!dep || !arr) {
    skipped++;
    continue;
  }

  try {
    // Clear the in-memory cache so each route gets a fresh computation
    // (routes with same airport pair would otherwise share cached result)
    const cacheKey1 = dep.icaoCode && arr.icaoCode
      ? `${dep.icaoCode}-${arr.icaoCode}` : null;

    const waypoints = airwayService.computeRoute(
      parseFloat(dep.latitude), parseFloat(dep.longitude),
      parseFloat(arr.latitude), parseFloat(arr.longitude),
      dep.icaoCode, arr.icaoCode
    );

    await route.update({ waypoints: waypoints || null });
    updated++;

    const wpCount = waypoints ? waypoints.length : 0;
    const label = `${route.routeNumber}/${route.returnRouteNumber}`;
    const pair = `${dep.icaoCode || '????'}-${arr.icaoCode || '????'}`;
    process.stdout.write(`\r  ${updated}/${routes.length} updated | ${pair} ${label} → ${wpCount} waypoints`);
  } catch (err) {
    failed++;
    console.error(`\n  ERROR ${route.routeNumber}: ${err.message}`);
  }
}

console.log(`\n\nDone! ${updated} updated, ${skipped} skipped (missing airport), ${failed} failed.`);
await sequelize.close();
process.exit(0);
