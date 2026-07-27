/**
 * Single source of truth for maintenance check timing.
 *
 * Durations scale with aircraft size via the aircraft `type` tier — a Cessna
 * Caravan (Regional) is checked far faster than an A380 (Widebody). Base
 * durations are the Narrowbody baseline (multiplier 1.0).
 */

// Base check durations in MINUTES (Narrowbody baseline).
const CHECK_BASE_DURATIONS = {
  daily: 60,      // 1 hour
  weekly: 135,    // 2.25 hours
  A: 540,         // 9 hours
  C: 30240,       // 21 days
  D: 108000       // 75 days
};

// Per-aircraft-type duration multiplier (aircraft.type ENUM).
const TYPE_DURATION_MULTIPLIER = {
  Regional: 0.4,
  Narrowbody: 1.0,
  Widebody: 1.8,
  Cargo: 1.2,
  Airship: 0.5
};

// Default check intervals (how long a check stays valid). A is flight-hours
// based; others are calendar days. Per-aircraft overrides exist on UserAircraft.
const CHECK_INTERVALS = {
  daily: 2,       // days
  weekly: 8,      // days
  A: 112,         // days-equivalent fallback only; real A is hours-based
  C: 730,         // days (~2 years)
  D: 2190         // days (~6 years)
};

// Safety margin (days) — a check must COMPLETE this many days before expiry.
const CHECK_MARGINS = {
  daily: 1,
  weekly: 1,
  A: 5,
  C: 10,
  D: 10
};

// Heaviest → lightest. A heavier check satisfies lighter ones.
const CHECK_HIERARCHY = ['D', 'C', 'A', 'weekly', 'daily'];

function getTypeMultiplier(aircraftType) {
  return TYPE_DURATION_MULTIPLIER[aircraftType] || 1.0;
}

/** Size-scaled check duration in minutes for a given aircraft type. */
function getCheckDurationMinutes(checkType, aircraftType) {
  const base = CHECK_BASE_DURATIONS[checkType];
  if (base == null) return 60;
  return Math.round(base * getTypeMultiplier(aircraftType));
}

/** Size-scaled check duration in whole days (rounded up). */
function getCheckDurationDays(checkType, aircraftType) {
  return Math.ceil(getCheckDurationMinutes(checkType, aircraftType) / 1440);
}

/**
 * Lead time (days) before expiry at which a check must START so it COMPLETES
 * margin days before expiry: duration + margin.
 */
function getCheckLeadDays(checkType, aircraftType) {
  return getCheckDurationDays(checkType, aircraftType) + (CHECK_MARGINS[checkType] || 1);
}

/**
 * Semi-randomised duration for when a check is actually performed.
 * Applies ±20% noise to the base duration, rounded to the nearest 5 min
 * (light checks: daily/weekly/A) or nearest 30 min (heavy: C/D).
 * Use this when STAMPING a check — not for lead-time or conflict calculations.
 */
function getRandomisedCheckDuration(checkType, aircraftType) {
  const base = getCheckDurationMinutes(checkType, aircraftType);
  const factor = 0.8 + Math.random() * 0.4; // 0.80–1.20
  const raw = base * factor;
  const snap = ['C', 'D'].includes(checkType) ? 30 : 5;
  return Math.max(snap, Math.round(raw / snap) * snap);
}

module.exports = {
  CHECK_BASE_DURATIONS,
  TYPE_DURATION_MULTIPLIER,
  CHECK_INTERVALS,
  CHECK_MARGINS,
  CHECK_HIERARCHY,
  getTypeMultiplier,
  getCheckDurationMinutes,
  getCheckDurationDays,
  getCheckLeadDays,
  getRandomisedCheckDuration
};
