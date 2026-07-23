/**
 * Seed lightweight LOCAL dev worlds for testing: singleplayer worlds in 1950,
 * 1980 and 2010, plus a multiplayer world — each with a test airline that owns
 * era-appropriate aircraft, has routes and financial history. No production
 * data or full db:pull world data needed.
 *
 * SAFETY: refuses to run unless DATABASE_URL points at localhost/127.0.0.1.
 * Prereq: reference data (airports + aircraft types) must exist — run
 * `npm run db:pull` once on good WiFi to get schema + reference tables.
 *
 * Usage:
 *   npm run db:seed-dev              # create any missing dev worlds
 *   npm run db:seed-dev -- --fresh   # destroy + recreate all dev worlds
 *
 * Login afterwards (Dev Access on the landing page):
 *   email: dev@local.test   password: devpass
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const { User, World, WorldMembership, Airport, Aircraft, UserAircraft, Route, WeeklyFinancial, ScheduledFlight, RecurringMaintenance, Loan, Notification } = require('../models');
const eraEconomicService = require('../services/eraEconomicService');

const DEV_EMAIL = 'dev@local.test';
const DEV_PASSWORD = 'devpass';
const FRESH = process.argv.includes('--fresh');

const DEV_WORLDS = [
  { name: 'Dev SP 1950', year: 1950, type: 'singleplayer' },
  { name: 'Dev SP 1980', year: 1980, type: 'singleplayer' },
  { name: 'Dev SP 2010', year: 2010, type: 'singleplayer' },
  { name: 'Dev MP 1950', year: 1950, type: 'multiplayer' }
];

function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

async function destroyWorld(world) {
  const memberships = await WorldMembership.findAll({ where: { worldId: world.id }, attributes: ['id'] });
  const mIds = memberships.map(m => m.id);
  if (mIds.length > 0) {
    const routes = await Route.findAll({ where: { worldMembershipId: mIds }, attributes: ['id'] });
    if (routes.length > 0) await ScheduledFlight.destroy({ where: { routeId: routes.map(r => r.id) } });
    const aircraft = await UserAircraft.findAll({ where: { worldMembershipId: mIds }, attributes: ['id'] });
    if (aircraft.length > 0) await RecurringMaintenance.destroy({ where: { aircraftId: aircraft.map(a => a.id) } });
    await Route.destroy({ where: { worldMembershipId: mIds } });
    await UserAircraft.destroy({ where: { worldMembershipId: mIds } });
    await WeeklyFinancial.destroy({ where: { worldMembershipId: mIds } });
    await Loan.destroy({ where: { worldMembershipId: mIds } });
    await Notification.destroy({ where: { worldMembershipId: mIds } });
    await WorldMembership.destroy({ where: { worldId: world.id } });
  }
  await world.destroy();
}

async function seedWorld(spec, user, branding) {
  const { name, year, type } = spec;
  const start = new Date(Date.UTC(year, 3, 1, 8, 0, 0)); // 1 April, 08:00 game time

  const world = await World.create({
    name,
    description: `Seeded local development world (${type}, ${year}) — not for production`,
    startDate: start,
    currentTime: start,
    timeAcceleration: 60,
    era: year,
    status: 'active',
    isPaused: false,
    lastTickAt: new Date(),
    maxPlayers: type === 'multiplayer' ? 25 : 5,
    worldType: type,
    ownerUserId: type === 'singleplayer' ? user.id : null
  });

  const base = await Airport.findOne({ where: { icaoCode: 'KPHX' } }) || await Airport.findOne({ where: { icaoCode: 'EGLL' } });
  if (!base) throw new Error('Neither KPHX nor EGLL found in airports table');

  const balance = eraEconomicService.getStartingCapital(year) * 10;
  const membership = await WorldMembership.create({
    worldId: world.id,
    userId: user.id,
    airlineName: 'Dev Airways',
    airlineCode: 'DEV',
    iataCode: 'DV',
    region: base.country,
    baseAirportId: base.id,
    balance,
    reputation: 60,
    isAI: false,
    backgroundColor: branding.backgroundColor,
    primaryColor: branding.primaryColor,
    secondaryColor: branding.secondaryColor,
    logoTemplate: branding.logoTemplate,
    logoSvg: branding.logoSvg
  });

  // Fleet: 3 era-available passenger types — small / mid / larger
  const types = await Aircraft.findAll({
    where: {
      isActive: true,
      passengerCapacity: { [Op.gt]: 0 },
      type: { [Op.ne]: 'Cargo' },
      [Op.and]: [
        { [Op.or]: [{ availableFrom: null }, { availableFrom: { [Op.lte]: year } }] },
        { [Op.or]: [{ availableUntil: null }, { availableUntil: { [Op.gte]: year } }] }
      ]
    },
    order: [['passengerCapacity', 'ASC']]
  });
  if (types.length === 0) throw new Error(`No aircraft types available in ${year}`);
  const picks = [
    types[0],
    types[Math.floor(types.length / 2)],
    types[Math.max(0, types.length - 2)]
  ].filter((t, i, arr) => arr.findIndex(x => x.id === t.id) === i);

  const eraMult = eraEconomicService.getEraMultiplier(year);
  const fleet = [];
  for (let i = 0; i < picks.length; i++) {
    const t = picks[i];
    const ua = await UserAircraft.create({
      worldMembershipId: membership.id,
      aircraftId: t.id,
      registration: `N-DEV${i + 1}`,
      acquisitionType: 'purchase',
      purchasePrice: Math.round((parseFloat(t.purchasePrice) || 10000000) * eraMult),
      status: 'active',
      condition: 'New',
      conditionPercentage: 100,
      ageYears: 0,
      totalFlightHours: 0,
      currentAirport: base.icaoCode,
      orderDate: world.currentTime,
      acquiredAt: new Date()
    });
    fleet.push({ ua, t });
  }

  // Routes: base → two nearby large airports, one per aircraft
  const destIcaos = base.icaoCode === 'KPHX' ? ['KLAS', 'KSFO'] : ['EGCC', 'EHAM'];
  let routeNum = 101;
  let routesMade = 0;
  for (let i = 0; i < destIcaos.length && i < fleet.length; i++) {
    const dest = await Airport.findOne({ where: { icaoCode: destIcaos[i] } });
    if (!dest) continue;
    const dist = haversineNm(parseFloat(base.latitude), parseFloat(base.longitude), parseFloat(dest.latitude), parseFloat(dest.longitude));
    const speed = Math.max(parseInt(fleet[i].t.cruiseSpeed) || 250, 80);
    const flightMin = Math.round((dist / speed) * 60) + 30;
    await Route.create({
      worldMembershipId: membership.id,
      routeNumber: `DV${routeNum}`,
      returnRouteNumber: `DV${routeNum + 1}`,
      departureAirportId: base.id,
      arrivalAirportId: dest.id,
      distance: dist,
      scheduledDepartureTime: '09:00:00',
      turnaroundTime: 45,
      flightTimeMinutes: flightMin,
      daysOfWeek: [1, 2, 3, 4, 5],
      frequency: 'daily',
      isActive: true,
      assignedAircraftId: fleet[i].ua.id,
      ticketPrice: eraEconomicService.calculateTicketPrice(dist, year, 'economy')
    });
    routeNum += 2;
    routesMade++;
  }

  // Financial history: 8 plausible weeks before world start
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  for (let w = 8; w >= 1; w--) {
    const weekStart = new Date(start.getTime() - w * WEEK_MS);
    const wobble = 0.85 + Math.random() * 0.3;
    await WeeklyFinancial.create({
      worldMembershipId: membership.id,
      weekStart: weekStart.toISOString().split('T')[0],
      flightRevenue: Math.round(250000 * eraMult * wobble),
      fuelCosts: Math.round(28000 * eraMult * wobble),
      crewCosts: Math.round(42000 * eraMult * wobble),
      maintenanceCosts: Math.round(35000 * eraMult * wobble),
      airportFees: Math.round(22000 * eraMult * wobble),
      staffCosts: Math.round(26000 * eraMult * wobble)
    });
  }

  const fleetDesc = fleet.map(f => `${f.t.manufacturer} ${f.t.model}`).join(', ');
  console.log(`✓ ${name}: Dev Airways @ ${base.icaoCode}, $${Math.round(balance).toLocaleString()}, fleet [${fleetDesc}], ${routesMade} routes, 8wk financials`);
}

(async () => {
  try {
    // ── Safety: local DB only ────────────────────────────────────────────────
    const dbUrl = process.env.DATABASE_URL || '';
    if (!/localhost|127\.0\.0\.1/.test(dbUrl)) {
      console.error('✗ DATABASE_URL does not point at localhost — refusing to seed a non-local DB.');
      console.error('  Switch to the local DB first (npm run go → Local), then re-run.');
      process.exit(1);
    }

    await sequelize.authenticate();

    // ── Prereq: reference data ───────────────────────────────────────────────
    const [airportCount, aircraftCount] = await Promise.all([Airport.count(), Aircraft.count()]);
    if (airportCount < 500 || aircraftCount < 20) {
      console.error(`✗ Reference data missing (airports: ${airportCount}, aircraft types: ${aircraftCount}).`);
      console.error('  Run `npm run db:pull` once (good WiFi) to load schema + reference tables, then re-run this.');
      process.exit(1);
    }

    // ── Dev user (shared across all dev worlds) ──────────────────────────────
    // The user's actual local login is the support account — attach the dev
    // worlds to it when present so they show up after a normal login.
    // Falls back to creating dev@local.test on a DB without it.
    let user = await User.findOne({ where: { email: 'support@ams.ceo', authMethod: 'local' } });
    if (user) {
      console.log('✓ Attaching dev worlds to support@ams.ceo');
    } else {
      user = await User.findOne({ where: { email: DEV_EMAIL, authMethod: 'local' } });
    }
    if (!user) {
      user = await User.create({
        vatsimId: 'LOCAL-DEV-SEED',
        firstName: 'Dev',
        lastName: 'Pilot',
        email: DEV_EMAIL,
        passwordHash: await bcrypt.hash(DEV_PASSWORD, 10),
        authMethod: 'local',
        isAdmin: true,
        lastLogin: new Date()
      });
      console.log(`✓ Created dev user ${DEV_EMAIL} (password: ${DEV_PASSWORD}, admin)`);
    }

    let branding = {};
    try {
      const { pickAirlineBranding } = require('../../public/js/airline-logo.js');
      branding = pickAirlineBranding('Dev Airways') || {};
    } catch (_) { /* branding optional */ }

    // ── Seed each dev world ──────────────────────────────────────────────────
    for (const spec of DEV_WORLDS) {
      const existing = await World.findOne({ where: { name: spec.name } });
      if (existing && !FRESH) {
        console.log(`- ${spec.name}: already exists (use --fresh to recreate)`);
        continue;
      }
      if (existing && FRESH) {
        console.log(`  Destroying existing ${spec.name}...`);
        await destroyWorld(existing);
      }
      await seedWorld(spec, user, branding);
    }

    console.log('\n════════════════════════════════════════');
    console.log('Done. Start the server (npm run dev), answer "y" to the simulation');
    console.log('prompt (dev worlds tick locally), and log in via Dev Access:');
    console.log(`  ${DEV_EMAIL} / ${DEV_PASSWORD}`);
    console.log('════════════════════════════════════════');
    process.exit(0);
  } catch (err) {
    console.error('✗ Seed failed:', err.message);
    if (err.stack) console.error(err.stack.split('\n').slice(0, 5).join('\n'));
    process.exit(1);
  }
})();
