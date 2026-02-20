/**
 * Shared cargo type definitions — single source of truth (frontend)
 * Loaded as browser globals before cargo-configurator.js, routes-create.js, pricing.js, etc.
 */

/* eslint-disable no-unused-vars */
const CARGO_TYPES = {
  // Core types
  general:    { key: 'general',    label: 'General Cargo',   code: 'GEN', category: 'core',    cargoOnly: false, autoFill: true,  stepKg: 500,  defaultRate: 80,  baseDemand: 0.85, color: '#3B82F6', border: '#2563EB' },
  express:    { key: 'express',    label: 'Express Cargo',   code: 'EXP', category: 'core',    cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 150, baseDemand: 0.65, color: '#10B981', border: '#059669' },
  heavy:      { key: 'heavy',      label: 'Heavy/Dense',     code: 'HVY', category: 'core',    cargoOnly: false, autoFill: false, stepKg: 1000, defaultRate: 200, baseDemand: 0.55, color: '#F59E0B', border: '#D97706' },
  oversized:  { key: 'oversized',  label: 'Oversized Cargo', code: 'OVR', category: 'core',    cargoOnly: true,  autoFill: false, stepKg: 1000, defaultRate: 350, baseDemand: 0.30, color: '#EF4444', border: '#DC2626' },
  // Special types
  perishable: { key: 'perishable', label: 'Perishables',     code: 'PER', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 180, baseDemand: 0.70, color: '#06B6D4', border: '#0891B2' },
  dangerous:  { key: 'dangerous',  label: 'Dangerous Goods', code: 'DGR', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 250, baseDemand: 0.40, color: '#DC2626', border: '#B91C1C' },
  liveAnimal: { key: 'liveAnimal', label: 'Live Animals',    code: 'AVI', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 220, baseDemand: 0.35, color: '#84CC16', border: '#65A30D' },
  highValue:  { key: 'highValue',  label: 'High-Value',      code: 'VAL', category: 'special', cargoOnly: false, autoFill: false, stepKg: 500,  defaultRate: 300, baseDemand: 0.45, color: '#A855F7', border: '#7C3AED' },
};

const CARGO_TYPE_KEYS = Object.keys(CARGO_TYPES);
const CORE_TYPE_KEYS = CARGO_TYPE_KEYS.filter(k => CARGO_TYPES[k].category === 'core');
const SPECIAL_TYPE_KEYS = CARGO_TYPE_KEYS.filter(k => CARGO_TYPES[k].category === 'special');

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

/** Build a cargo config summary string from a config object */
function cargoConfigSummary(cfg) {
  if (!cfg) return 'Not configured';
  // Support both new JSON format and old format
  const config = cfg.cargoConfig || cfg;
  const parts = [];
  CARGO_TYPE_KEYS.forEach(k => {
    const val = config[k] || 0;
    if (val > 0) {
      parts.push((val / 1000).toFixed(1) + 't ' + CARGO_TYPES[k].code);
    }
  });
  return parts.length > 0 ? parts.join(' / ') : 'Not configured';
}

/** Migrate old 3-field config to new JSON format */
function migrateOldCargoConfig(cargoLightKg, cargoStandardKg, cargoHeavyKg) {
  const cfg = emptyCargoConfig();
  cfg.general = parseInt(cargoLightKg) || 0;
  cfg.express = parseInt(cargoStandardKg) || 0;
  cfg.heavy = parseInt(cargoHeavyKg) || 0;
  return cfg;
}
