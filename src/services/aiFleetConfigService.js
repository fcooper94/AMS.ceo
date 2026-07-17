/**
 * AI Fleet Config Service
 *
 * Generates sensible CABIN (seat mix) and CARGO (kg allocation) configurations
 * for AI aircraft, matched to the route the aircraft is being assigned to.
 *
 * Design decisions (2026-07):
 *   • Cabin class mix is derived from cabinClassService.computeClassMix() — the
 *     same era + distance + endpoint-GDP + hub-type aware model the demand engine
 *     uses — so AI seat installs track real premium demand rather than guesswork.
 *     A 1960s regional hop → all economy; a modern hub-to-hub long-haul → a real
 *     business/first share.
 *   • Seat counts respect the SAME cabin-space constraint players face
 *     (public/js/cabin-configurator.js) — premium seats cost more space via both
 *     fewer-per-row and a higher pitch. There is no backend validation of seat
 *     totals, so we mirror that math here.
 *   • Passenger aircraft also fill their belly with a general-cargo-heavy split;
 *     freighters fill their full deck capacity with a commodity mix.
 *   • Set ONCE, when the aircraft is first assigned to a route — no ongoing refits.
 *
 * Why this exists: before this, AI aircraft had NO cabin/cargo config, so the
 * revenue engine treated every cabin as all-economy (no premium yield) and AI
 * cargo revenue was always $0 — including freighters flying cargo-only routes.
 */

const cabinClassService = require('./cabinClassService');
const gravityModelService = require('./gravityModelService');
const zoneAssignmentService = require('./zoneAssignmentService');
const countryEconomics = require('../data/countryEconomics');
const {
  CARGO_TYPES,
  CARGO_TYPE_KEYS,
  getAvailableCargoTypes,
  emptyCargoConfig,
} = require('../config/cargoTypes');

const NM_TO_KM = 1.852;

// Seats per row ("abreast") by cabin body type — sums of the per-class layouts in
// public/js/cabin-configurator.js SEAT_LAYOUTS.
const SEATS_PER_ROW = {
  Widebody:   { economy: 9, economyPlus: 7, business: 4, first: 4 },
  Narrowbody: { economy: 6, economyPlus: 5, business: 4, first: 2 },
  Regional:   { economy: 4, economyPlus: 4, business: 3, first: 2 },
};
// Row-height multiplier relative to economy — mirrors cabin-configurator.js PITCH.
const PITCH = { economy: 1.0, economyPlus: 1.15, business: 1.7, first: 2.5 };

// Premium may occupy at most this fraction of cabin SPACE — keeps economy the
// clear majority even on premium-heavy routes (a secondary guard on top of the
// ~40% premium-demand cap in cabinClassService). Kept conservative because the
// revenue engine weights fares by seat fraction on full passengerCapacity, so a
// premium-heavy config already lifts yield.
const MAX_PREMIUM_SPACE_FRAC = 0.45;

// Gentle per-archetype premium bias — gives AI airlines a bit of brand character
// on top of the route-economics-driven class mix.
const ARCHETYPE_PREMIUM_BIAS = {
  fullService: 1.15,
  longHaul: 1.05,
  shortHaul: 1.0,
  domestic: 1.0,
  regional: 1.0,
  cargo: 1.0,
};

// How full AI aircraft pack their cargo capacity (leaves realistic slack).
const BELLY_FILL = 0.85;      // passenger/combi belly cargo
const FREIGHTER_FILL = 0.95;  // dedicated freighter decks

// Commodity split (fraction of the fill amount) — `general` auto-fills the rest.
const PAX_BELLY_SPLIT = {
  express: 0.12, heavy: 0.10, perishable: 0.10,
  highValue: 0.03, dangerous: 0.03, liveAnimal: 0.02,
};
const FREIGHTER_SPLIT = {
  heavy: 0.28, oversized: 0.12, express: 0.15, perishable: 0.10,
  highValue: 0.05, dangerous: 0.04, liveAnimal: 0.02,
};

function _getGdp(countryCode, year) {
  if (!countryCode || !countryEconomics[countryCode] || !countryEconomics[countryCode].gdpPerCapita) {
    return 5000; // neutral default — matches routeIndicatorService._getGdp
  }
  return gravityModelService.interpolateDecadeValue(countryEconomics[countryCode].gdpPerCapita, year);
}

/**
 * Convert a class-mix (percentages) into a concrete seat configuration that
 * respects the cabin-space constraint. Returns whole-row cabins.
 *
 * @param {object} ac        - Aircraft model (type, passengerCapacity, hasBusiness…)
 * @param {object} classMix  - { economy, premiumEconomy, business, first } as 0-100 %
 * @returns {{economySeats,economyPlusSeats,businessSeats,firstSeats,toilets}}
 */
function configureCabin(ac, classMix) {
  const paxCap = parseInt(ac.passengerCapacity) || 0;
  const result = { economySeats: 0, economyPlusSeats: 0, businessSeats: 0, firstSeats: 0, toilets: 0 };
  if (paxCap <= 0) return result; // freighter / no passengers

  const body = SEATS_PER_ROW[ac.type] ? ac.type : 'Narrowbody';
  const layout = SEATS_PER_ROW[body];
  const econPerRow = layout.economy;
  const totalSpace = paxCap / econPerRow;           // whole cabin in economy-equivalent rows
  const isRegional = body === 'Regional';           // RJs/turboprops: economy-only
  const maxPremiumSpace = totalSpace * MAX_PREMIUM_SPACE_FRAC;

  // Premium availability — respect the aircraft's advertised classes.
  const canFirst = ac.hasFirst !== false && !isRegional;
  const canBusiness = ac.hasBusiness !== false && !isRegional;
  const canEcoPlus = ac.hasEconomyPlus !== false && !isRegional;

  let premiumSpace = 0;

  const install = (cls, pct, allowed) => {
    if (!allowed || pct <= 0) return;
    const seatsPerRow = layout[cls];
    // Target seats from demand share, snapped to whole rows; any real demand → ≥1 row.
    let rows = Math.round((paxCap * pct / 100) / seatsPerRow);
    if (rows < 1) rows = 1;
    let space = rows * PITCH[cls];
    // Trim to the premium space budget.
    while (rows > 0 && premiumSpace + space > maxPremiumSpace) {
      rows -= 1;
      space = rows * PITCH[cls];
    }
    if (rows <= 0) return;
    premiumSpace += space;
    result[cls + 'Seats'] = rows * seatsPerRow;
  };

  // Install premium cabins in priority order, then economy fills the remainder.
  install('first', classMix.first || 0, canFirst);
  install('business', classMix.business || 0, canBusiness);
  install('economyPlus', classMix.premiumEconomy || 0, canEcoPlus);

  // Reserve a little space for galleys/lavatories so totals stay realistic.
  const galleyRows = Math.max(1, Math.round(totalSpace * 0.04));
  const remainingSpace = Math.max(0, totalSpace - premiumSpace - galleyRows);
  result.economySeats = Math.floor(remainingSpace) * econPerRow;
  result.toilets = Math.max(1, Math.round(paxCap / 50));

  // Safety net: never leave a passenger aircraft with zero seats (which would
  // re-trigger the all-economy revenue fallback).
  const totalSeats = result.economySeats + result.economyPlusSeats + result.businessSeats + result.firstSeats;
  if (totalSeats <= 0) result.economySeats = paxCap;

  return result;
}

/**
 * Allocate cargo (kg per type) up to the aircraft's cargo capacity.
 *
 * @param {object} ac - Aircraft model (type, cargoCapacityKg, mainDeck/holdCapacityKg)
 * @returns {{cargoConfig, mainDeckCargoConfig, cargoHoldCargoConfig}|null}
 */
function configureCargo(ac) {
  const isFreighter = ac.type === 'Cargo';
  let totalKg = parseInt(ac.cargoCapacityKg) || 0;
  if (!totalKg && isFreighter) {
    totalKg = (parseInt(ac.mainDeckCapacityKg) || 0) + (parseInt(ac.cargoHoldCapacityKg) || 0);
  }
  if (totalKg <= 0) return null; // no cargo capability (e.g. some regional pax types)

  const available = new Set(getAvailableCargoTypes(ac.type));
  const fillKg = Math.round(totalKg * (isFreighter ? FREIGHTER_FILL : BELLY_FILL));
  const split = isFreighter ? FREIGHTER_SPLIT : PAX_BELLY_SPLIT;

  const cargoConfig = emptyCargoConfig();
  let used = 0;
  for (const [type, frac] of Object.entries(split)) {
    if (!available.has(type)) continue;
    const step = CARGO_TYPES[type].stepKg || 500;
    let kg = Math.floor((fillKg * frac) / step) * step; // snap down to a whole step
    if (kg + used > fillKg) kg = Math.floor((fillKg - used) / step) * step;
    if (kg <= 0) continue;
    cargoConfig[type] = kg;
    used += kg;
  }
  // `general` auto-fills the remainder (it always exists and autoFills).
  cargoConfig.general = Math.max(0, fillKg - used);

  const out = { cargoConfig };

  // Freighters: also split across main deck / hold for the dual-deck UI view.
  // (Revenue reads cargoConfig only, so this is display consistency.)
  if (isFreighter) {
    const mainCap = parseInt(ac.mainDeckCapacityKg) || 0;
    const holdCap = parseInt(ac.cargoHoldCapacityKg) || 0;
    if (mainCap > 0 || holdCap > 0) {
      const main = emptyCargoConfig();
      const hold = emptyCargoConfig();
      // Bulky/heavy on the main deck; smaller/special in the hold.
      const mainTypes = new Set(['general', 'heavy', 'oversized']);
      let mainUsed = 0, holdUsed = 0;
      for (const key of CARGO_TYPE_KEYS) {
        const kg = cargoConfig[key];
        if (kg <= 0) continue;
        if (mainTypes.has(key) && mainUsed + kg <= mainCap) { main[key] = kg; mainUsed += kg; }
        else if (holdUsed + kg <= holdCap) { hold[key] = kg; holdUsed += kg; }
        else if (mainUsed + kg <= mainCap) { main[key] = kg; mainUsed += kg; }
      }
      out.mainDeckCargoConfig = main;
      out.cargoHoldCargoConfig = hold;
    }
  }

  return out;
}

/**
 * Build an 8-type cargo rate table ($/ton) for an AI route, scaled by distance
 * and each type's relative premium. AI routes otherwise only set the legacy
 * light/standard/heavy rates, so specialty cargo (perishable, high-value, …)
 * would earn nothing. Anchored on the AI legacy general rate (distance × 0.5).
 */
function buildRouteCargoRates(distanceNm) {
  const base = (parseFloat(distanceNm) || 0) * 0.5;
  const genDefault = CARGO_TYPES.general.defaultRate || 80;
  const rates = {};
  for (const key of CARGO_TYPE_KEYS) {
    const premium = (CARGO_TYPES[key].defaultRate || genDefault) / genDefault;
    rates[key] = Math.round(base * premium);
  }
  return rates;
}

/**
 * Compute the full config (cabin + cargo + route rates) for an aircraft being
 * assigned to a route. Pure — returns the field bags; caller persists them.
 *
 * @param {object} ctx - { aircraft (Aircraft model), baseAirport, destAirport,
 *                          distanceNm, worldYear, archetype }
 */
function buildConfig({ aircraft, baseAirport, destAirport, distanceNm, worldYear, archetype }) {
  const distKm = (parseFloat(distanceNm) || 0) * NM_TO_KM;

  // Endpoint economics for the class-mix model.
  const originGdp = _getGdp(zoneAssignmentService.countryNameToCode(baseAirport?.country), worldYear);
  const destGdp = _getGdp(zoneAssignmentService.countryNameToCode(destAirport?.country), worldYear);

  let classMix = cabinClassService.computeClassMix(
    originGdp, destGdp, distKm, baseAirport?.type, destAirport?.type, worldYear
  );

  // Apply a gentle archetype premium bias, then renormalise economy.
  const bias = ARCHETYPE_PREMIUM_BIAS[archetype] || 1.0;
  if (bias !== 1.0) {
    const first = (classMix.first || 0) * bias;
    const business = (classMix.business || 0) * bias;
    const premEco = (classMix.premiumEconomy || 0) * bias;
    const economy = Math.max(0, 100 - first - business - premEco);
    classMix = { economy, premiumEconomy: premEco, business, first };
  }

  const cabin = configureCabin(aircraft, classMix);
  const cargo = configureCargo(aircraft);
  const cargoRates = buildRouteCargoRates(distanceNm);

  return { cabin, cargo, cargoRates, classMix };
}

/**
 * Configure an AI aircraft's cabin + cargo to fit the route it's being assigned
 * to, and set the route's cargo rate table. Persists to the DB.
 *
 * @param {object} route       - Route Sequelize instance (just created)
 * @param {object} userAircraft- UserAircraft Sequelize instance (with .aircraft)
 * @param {object} ctx         - { baseAirport, destAirport, distanceNm, worldYear, archetype }
 */
async function applyRouteConfig(route, userAircraft, ctx) {
  const aircraft = userAircraft.aircraft;
  if (!aircraft) return;

  const { cabin, cargo, cargoRates } = buildConfig({
    aircraft,
    baseAirport: ctx.baseAirport,
    destAirport: ctx.destAirport,
    distanceNm: ctx.distanceNm,
    worldYear: ctx.worldYear,
    archetype: ctx.archetype,
  });

  const acUpdate = {
    economySeats: cabin.economySeats,
    economyPlusSeats: cabin.economyPlusSeats,
    businessSeats: cabin.businessSeats,
    firstSeats: cabin.firstSeats,
    toilets: cabin.toilets,
  };
  if (cargo) {
    acUpdate.cargoConfig = cargo.cargoConfig;
    if (cargo.mainDeckCargoConfig) acUpdate.mainDeckCargoConfig = cargo.mainDeckCargoConfig;
    if (cargo.cargoHoldCargoConfig) acUpdate.cargoHoldCargoConfig = cargo.cargoHoldCargoConfig;
  }

  await userAircraft.update(acUpdate);
  if (cargo) await route.update({ cargoRates });
}

module.exports = {
  configureCabin,
  configureCargo,
  buildRouteCargoRates,
  buildConfig,
  applyRouteConfig,
};
