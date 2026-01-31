/**
 * Flight Calculation Utilities
 * Handles flight time calculations including wind adjustments
 */

// Default cruise speed in knots
const DEFAULT_CRUISE_SPEED = 450;

// Wind adjustment factor (13% variation for jet stream effect)
// Eastbound flights are ~13% faster, westbound ~13% slower
const WIND_ADJUSTMENT_FACTOR = 0.13;

// Route-specific variation (±3.5% based on coordinates for natural-looking times)
const ROUTE_VARIATION_FACTOR = 0.035;

/**
 * Generate a deterministic pseudo-random variation based on coordinates.
 * This creates natural-looking flight times that differ between routes
 * but remain consistent for the same route.
 *
 * @param {number} depLat - Departure latitude
 * @param {number} depLng - Departure longitude
 * @param {number} arrLat - Arrival latitude
 * @param {number} arrLng - Arrival longitude
 * @returns {number} - Variation multiplier (0.965 to 1.035)
 */
function getRouteVariation(depLat, depLng, arrLat, arrLng) {
  // Create a deterministic hash from coordinates
  // Uses sin to create a pseudo-random but consistent value
  const coordSum = (depLat * 7.3) + (depLng * 11.7) + (arrLat * 13.1) + (arrLng * 17.9);
  const hash = Math.sin(coordSum) * 10000;
  const normalized = (hash - Math.floor(hash)); // 0 to 1

  // Convert to range: -ROUTE_VARIATION_FACTOR to +ROUTE_VARIATION_FACTOR
  const variation = (normalized - 0.5) * 2 * ROUTE_VARIATION_FACTOR;

  return 1 + variation;
}

/**
 * Calculate the wind adjustment multiplier based on flight direction.
 *
 * The jet stream flows west to east at mid-latitudes (30-60° N and S),
 * making eastbound flights faster and westbound flights slower.
 *
 * @param {number} depLng - Departure longitude
 * @param {number} arrLng - Arrival longitude
 * @param {number} depLat - Departure latitude (optional, for latitude-based adjustment)
 * @param {number} arrLat - Arrival latitude (optional)
 * @returns {number} - Multiplier for flight time (< 1 = faster, > 1 = slower)
 */
function getWindAdjustmentMultiplier(depLng, arrLng, depLat = 0, arrLat = 0) {
  // Calculate longitude difference (handling date line crossing)
  let lngDiff = arrLng - depLng;

  // Handle date line crossing (-180 to 180)
  if (lngDiff > 180) {
    lngDiff -= 360;
  } else if (lngDiff < -180) {
    lngDiff += 360;
  }

  // Calculate average latitude to determine jet stream strength
  // Jet stream is strongest at mid-latitudes (30-60°)
  const avgLat = Math.abs((depLat + arrLat) / 2);

  // Scale the wind effect based on latitude
  // Maximum effect at 45° latitude, reduced at equator and poles
  let latitudeScale = 1.0;
  if (avgLat < 20) {
    // Near equator: minimal jet stream effect
    latitudeScale = 0.2;
  } else if (avgLat < 30) {
    // Transitional zone
    latitudeScale = 0.5;
  } else if (avgLat > 60) {
    // High latitudes: reduced effect
    latitudeScale = 0.6;
  }
  // 30-60° gets full effect (latitudeScale = 1.0)

  // Determine if flying east (with jet stream) or west (against)
  // Normalize the effect based on how much east/west travel vs north/south
  const totalLngTravel = Math.abs(lngDiff);

  // Only apply wind effect if there's significant east-west travel
  if (totalLngTravel < 10) {
    // Mostly north-south flight, minimal wind effect
    return 1.0;
  }

  // Calculate wind effect
  // Positive lngDiff = eastbound (faster), negative = westbound (slower)
  const direction = lngDiff > 0 ? -1 : 1; // -1 = faster (eastbound), +1 = slower (westbound)

  // Scale effect by how "east-west" the flight is (vs diagonal)
  // Max effect when flying purely east or west
  const eastWestRatio = Math.min(1, totalLngTravel / 90); // Normalize to max of 1

  const adjustment = direction * WIND_ADJUSTMENT_FACTOR * latitudeScale * eastWestRatio;

  return 1 + adjustment;
}

/**
 * Calculate flight duration in hours with wind adjustment
 *
 * @param {number} distanceNm - Distance in nautical miles
 * @param {number} depLng - Departure longitude
 * @param {number} arrLng - Arrival longitude
 * @param {number} depLat - Departure latitude
 * @param {number} arrLat - Arrival latitude
 * @param {number} cruiseSpeed - Cruise speed in knots (default 450)
 * @returns {number} - Flight duration in hours
 */
function calculateFlightDuration(distanceNm, depLng, arrLng, depLat = 0, arrLat = 0, cruiseSpeed = DEFAULT_CRUISE_SPEED) {
  const baseHours = distanceNm / cruiseSpeed;
  const windMultiplier = getWindAdjustmentMultiplier(depLng, arrLng, depLat, arrLat);
  const routeVariation = getRouteVariation(depLat, depLng, arrLat, arrLng);
  return baseHours * windMultiplier * routeVariation;
}

/**
 * Calculate flight duration in milliseconds with wind adjustment
 *
 * @param {number} distanceNm - Distance in nautical miles
 * @param {number} depLng - Departure longitude
 * @param {number} arrLng - Arrival longitude
 * @param {number} depLat - Departure latitude
 * @param {number} arrLat - Arrival latitude
 * @param {number} cruiseSpeed - Cruise speed in knots (default 450)
 * @returns {number} - Flight duration in milliseconds
 */
function calculateFlightDurationMs(distanceNm, depLng, arrLng, depLat = 0, arrLat = 0, cruiseSpeed = DEFAULT_CRUISE_SPEED) {
  const hours = calculateFlightDuration(distanceNm, depLng, arrLng, depLat, arrLat, cruiseSpeed);
  return hours * 60 * 60 * 1000;
}

module.exports = {
  DEFAULT_CRUISE_SPEED,
  WIND_ADJUSTMENT_FACTOR,
  getWindAdjustmentMultiplier,
  calculateFlightDuration,
  calculateFlightDurationMs
};
