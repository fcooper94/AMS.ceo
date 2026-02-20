/**
 * Shared cargo type definitions — single source of truth (backend)
 */

const CARGO_TYPES = {
  // Core types
  general:    { key: 'general',    label: 'General Cargo',   code: 'GEN', category: 'core',    cargoOnly: false, autoFill: true,  stepKg: 500,  defaultRate: 80,  baseDemand: 0.85 },
  express:    { key: 'express',    label: 'Express Cargo',   code: 'EXP', category: 'core',    cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 150, baseDemand: 0.65 },
  heavy:      { key: 'heavy',      label: 'Heavy/Dense',     code: 'HVY', category: 'core',    cargoOnly: false, autoFill: false, stepKg: 1000, defaultRate: 200, baseDemand: 0.55 },
  oversized:  { key: 'oversized',  label: 'Oversized Cargo', code: 'OVR', category: 'core',    cargoOnly: true,  autoFill: false, stepKg: 1000, defaultRate: 350, baseDemand: 0.30 },
  // Special types
  perishable: { key: 'perishable', label: 'Perishables',     code: 'PER', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 180, baseDemand: 0.70 },
  dangerous:  { key: 'dangerous',  label: 'Dangerous Goods', code: 'DGR', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 250, baseDemand: 0.40 },
  liveAnimal: { key: 'liveAnimal', label: 'Live Animals',    code: 'AVI', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 220, baseDemand: 0.35 },
  highValue:  { key: 'highValue',  label: 'High-Value',      code: 'VAL', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 300, baseDemand: 0.45 },
};

const CARGO_TYPE_KEYS = Object.keys(CARGO_TYPES);
const CORE_TYPES = CARGO_TYPE_KEYS.filter(k => CARGO_TYPES[k].category === 'core');
const SPECIAL_TYPES = CARGO_TYPE_KEYS.filter(k => CARGO_TYPES[k].category === 'special');

/** Get available cargo type keys for a given aircraft type */
function getAvailableCargoTypes(aircraftType) {
  return CARGO_TYPE_KEYS.filter(k => {
    if (CARGO_TYPES[k].cargoOnly && aircraftType !== 'Cargo') return false;
    return true;
  });
}

/** Build an empty cargo config object (all 0s) */
function emptyCargoConfig() {
  const cfg = {};
  CARGO_TYPE_KEYS.forEach(k => cfg[k] = 0);
  return cfg;
}

/** Build default rates object scaled by era multiplier */
function defaultCargoRates(eraMultiplier = 1.0) {
  const rates = {};
  CARGO_TYPE_KEYS.forEach(k => {
    rates[k] = Math.round(CARGO_TYPES[k].defaultRate * eraMultiplier);
  });
  return rates;
}

/** Migrate old 3-type kg allocation to 8-type JSON */
function migrateOldConfig(cargoLightKg, cargoStandardKg, cargoHeavyKg) {
  const cfg = emptyCargoConfig();
  cfg.general = parseInt(cargoLightKg) || 0;
  cfg.express = parseInt(cargoStandardKg) || 0;
  cfg.heavy = parseInt(cargoHeavyKg) || 0;
  return cfg;
}

/** Migrate old 3-type rates to 8-type JSON */
function migrateOldRates(cargoLightRate, cargoStandardRate, cargoHeavyRate) {
  const rates = emptyCargoConfig();
  rates.general = parseFloat(cargoLightRate) || 0;
  rates.express = parseFloat(cargoStandardRate) || 0;
  rates.heavy = parseFloat(cargoHeavyRate) || 0;
  return rates;
}

module.exports = {
  CARGO_TYPES,
  CARGO_TYPE_KEYS,
  CORE_TYPES,
  SPECIAL_TYPES,
  getAvailableCargoTypes,
  emptyCargoConfig,
  defaultCargoRates,
  migrateOldConfig,
  migrateOldRates,
};
