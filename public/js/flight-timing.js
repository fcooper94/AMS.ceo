/**
 * Shared Flight Timing Calculations
 * Used by both route creation and scheduling pages for consistent timings.
 * All durations are in minutes.
 */

// Wind adjustment for realistic flight times
// Jet stream flows west to east at mid-latitudes, making eastbound flights faster
const WIND_ADJUSTMENT_FACTOR = 0.13;
const ROUTE_VARIATION_FACTOR = 0.035;
const DAILY_CHECK_DURATION = 30;

// === WIND & FLIGHT TIME ===

function getWindMultiplier(depLng, arrLng, depLat = 0, arrLat = 0) {
  let lngDiff = arrLng - depLng;
  if (lngDiff > 180) lngDiff -= 360;
  else if (lngDiff < -180) lngDiff += 360;

  const avgLat = Math.abs((depLat + arrLat) / 2);
  let latitudeScale = 1.0;
  if (avgLat < 20) latitudeScale = 0.2;
  else if (avgLat < 30) latitudeScale = 0.5;
  else if (avgLat > 60) latitudeScale = 0.6;

  if (Math.abs(lngDiff) < 10) return 1.0;

  const direction = lngDiff > 0 ? -1 : 1;
  const eastWestRatio = Math.min(1, Math.abs(lngDiff) / 90);
  return 1 + (direction * WIND_ADJUSTMENT_FACTOR * latitudeScale * eastWestRatio);
}

function getRouteVariation(depLat, depLng, arrLat, arrLng) {
  const coordSum = (depLat * 7.3) + (depLng * 11.7) + (arrLat * 13.1) + (arrLng * 17.9);
  const hash = Math.sin(coordSum) * 10000;
  const normalized = hash - Math.floor(hash);
  const variation = (normalized - 0.5) * 2 * ROUTE_VARIATION_FACTOR;
  return 1 + variation;
}

function calculateFlightMinutes(distanceNm, cruiseSpeed, depLng, arrLng, depLat, arrLat) {
  const baseMinutes = (distanceNm / cruiseSpeed) * 60;
  const windMultiplier = getWindMultiplier(depLng, arrLng, depLat, arrLat);
  const routeVariation = getRouteVariation(depLat, depLng, arrLat, arrLng);
  return Math.round(baseMinutes * windMultiplier * routeVariation / 5) * 5;
}

// === INDIVIDUAL GROUND DURATIONS ===

function calculateCateringDuration(paxCapacity, acType) {
  if (acType === 'Cargo' || paxCapacity < 50) return 0;
  if (paxCapacity < 100) return 5;
  if (paxCapacity < 200) return 10;
  return 15;
}

function calculateBoardingDuration(paxCapacity, acType) {
  if (acType === 'Cargo') return 0;
  if (paxCapacity < 50) return 10;
  if (paxCapacity < 100) return 15;
  if (paxCapacity < 200) return 20;
  if (paxCapacity < 300) return 25;
  return 35;
}

function calculateFuellingDuration(distanceNM) {
  if (distanceNM < 500) return 10;
  if (distanceNM < 1500) return 15;
  if (distanceNM < 3000) return 20;
  return 25;
}

function calculateDeboardingDuration(paxCapacity, acType) {
  if (acType === 'Cargo') return 0;
  if (paxCapacity < 50) return 5;
  if (paxCapacity < 100) return 8;
  if (paxCapacity < 200) return 12;
  if (paxCapacity < 300) return 15;
  return 20;
}

function calculateCleaningDuration(paxCapacity) {
  if (paxCapacity < 50) return 5;
  if (paxCapacity < 100) return 10;
  if (paxCapacity < 200) return 15;
  if (paxCapacity < 300) return 20;
  return 25;
}

// === COMPOSITE CALCULATIONS ===

function calculatePreFlightTotal(distanceNM, paxCapacity, acType) {
  const fuelling = calculateFuellingDuration(distanceNM);
  const catering = calculateCateringDuration(paxCapacity, acType);
  const boarding = calculateBoardingDuration(paxCapacity, acType);
  const total = Math.max(catering + boarding, fuelling);
  return { fuelling, catering, boarding, total };
}

function calculatePostFlightTotal(paxCapacity, acType) {
  const deboarding = calculateDeboardingDuration(paxCapacity, acType);
  const cleaning = calculateCleaningDuration(paxCapacity);
  const total = deboarding + cleaning;
  return { deboarding, cleaning, total };
}

function calculateTurnaroundBreakdown(distanceNM, paxCapacity, acType) {
  const fuelling = calculateFuellingDuration(distanceNM);
  const deboarding = calculateDeboardingDuration(paxCapacity, acType);
  const catering = calculateCateringDuration(paxCapacity, acType);
  const cleaning = calculateCleaningDuration(paxCapacity);
  const boarding = calculateBoardingDuration(paxCapacity, acType);

  const parallelCateringCleaning = Math.max(catering, cleaning);
  const sequentialPath = deboarding + parallelCateringCleaning + boarding;
  const groundOps = Math.max(fuelling, sequentialPath);

  // Always include daily check in minimum turnaround so timings
  // are consistent whether a daily check is needed or not
  const total = groundOps + DAILY_CHECK_DURATION;

  return {
    fuelling, deboarding, catering, cleaning, boarding,
    parallelCateringCleaning, sequentialPath, groundOps,
    dailyCheck: DAILY_CHECK_DURATION,
    total
  };
}

function calculateMinTurnaround(distanceNM, paxCapacity, acType) {
  return calculateTurnaroundBreakdown(distanceNM, paxCapacity, acType).total;
}

/**
 * Apply contractor modifiers to a turnaround breakdown.
 * modifiers = { cleaningMult, boardingMult, deboardingMult, fuellingMult }
 * Returns a new breakdown object with adjusted durations.
 */
function applyContractorModifiers(breakdown, modifiers) {
  if (!modifiers) return breakdown;
  const m = { cleaningMult: 1, boardingMult: 1, deboardingMult: 1, fuellingMult: 1, ...modifiers };
  const cleaning = Math.round(breakdown.cleaning * m.cleaningMult);
  const boarding = Math.round(breakdown.boarding * m.boardingMult);
  const deboarding = Math.round(breakdown.deboarding * m.deboardingMult);
  const fuelling = Math.round(breakdown.fuelling * m.fuellingMult);
  const catering = breakdown.catering;

  // Parallel catering+cleaning = max of catering and modified cleaning
  const parallelCateringCleaning = Math.max(catering, cleaning);
  // Sequential path = deboarding + parallel block + boarding
  const sequentialPath = deboarding + parallelCateringCleaning + boarding;
  // Ground ops = max of (fuelling, sequential path)
  const groundOps = Math.max(fuelling, sequentialPath);
  const total = groundOps + breakdown.dailyCheck;

  return {
    fuelling, deboarding, catering, cleaning, boarding,
    parallelCateringCleaning, sequentialPath, groundOps,
    dailyCheck: breakdown.dailyCheck,
    total
  };
}
