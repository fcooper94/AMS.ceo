/**
 * Gravity Model Service
 *
 * Pure calculation engine for zone-based demand computation.
 * Implements the gravity model: LatentOD(i,j,t) = K_t * AirMass_i^α * AirMass_j^α * Dist_ij^(-γ)
 * where AirMass = Pop * FlyRate, and FlyRate is income-gated.
 */

const calibration = require('../data/gravityCalibration');
const culturalTies = require('../data/culturalTies');

class GravityModelService {

  /**
   * Interpolate a value from a decade-keyed object for a specific year
   * @param {Object} decadeData - e.g. { 1950: 100, 1960: 200, ... }
   * @param {number} year - Target year
   * @returns {number}
   */
  interpolateDecadeValue(decadeData, year) {
    const decades = Object.keys(decadeData).map(Number).sort((a, b) => a - b);
    if (decades.length === 0) return 0;

    // Clamp to available range
    if (year <= decades[0]) return decadeData[decades[0]];
    if (year >= decades[decades.length - 1]) return decadeData[decades[decades.length - 1]];

    // Find bracketing decades
    let lower = decades[0];
    let upper = decades[decades.length - 1];
    for (let i = 0; i < decades.length - 1; i++) {
      if (year >= decades[i] && year < decades[i + 1]) {
        lower = decades[i];
        upper = decades[i + 1];
        break;
      }
    }

    const fraction = (year - lower) / (upper - lower);
    return decadeData[lower] + fraction * (decadeData[upper] - decadeData[lower]);
  }

  /**
   * Compute the flying rate for a country in a given year
   * FlyRate = clamp(A_t * (GDPpc / Ref)^eta, 0, MaxRate_t)
   *
   * @param {number} gdpPerCapita - GDP per capita in 2024 USD
   * @param {number} year - Target year
   * @returns {number} - Flying rate (0 to ~1.0)
   */
  computeFlyRate(gdpPerCapita, year) {
    const At = this.interpolateDecadeValue(calibration.flyPropensity, year);
    const maxRate = this.interpolateDecadeValue(calibration.maxFlyRate, year);
    const ratio = gdpPerCapita / calibration.referenceGDPpc;
    const flyRate = At * Math.pow(Math.max(ratio, 0.001), calibration.eta);
    return Math.max(0, Math.min(maxRate, flyRate));
  }

  /**
   * Compute AirMass for a zone: Pop * FlyRate
   *
   * @param {number} population - Zone population (in thousands)
   * @param {number} gdpPerCapita - Zone's country GDP per capita
   * @param {number} year - Target year
   * @returns {number} - AirMass (effective flying population in thousands)
   */
  computeAirMass(population, gdpPerCapita, year) {
    const flyRate = this.computeFlyRate(gdpPerCapita, year);
    return population * flyRate;
  }

  /**
   * Calculate great circle distance between two points (nautical miles)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Get cultural tie multiplier between two country codes
   * Checks language groups, commonwealth, regional blocs, and bilateral links.
   * Returns the MAXIMUM multiplier found (not cumulative to avoid over-boosting).
   *
   * @param {string} countryA - ISO 2-letter code
   * @param {string} countryB - ISO 2-letter code
   * @returns {number} - Multiplier (1.0 = no tie)
   */
  getCulturalMultiplier(countryA, countryB) {
    if (countryA === countryB) {
      return culturalTies.domesticMultiplier;
    }

    let maxMultiplier = 1.0;

    // Check language groups
    for (const group of culturalTies.languageGroups) {
      if (group.members.includes(countryA) && group.members.includes(countryB)) {
        maxMultiplier = Math.max(maxMultiplier, group.multiplier);
      }
    }

    // Check commonwealth
    if (culturalTies.commonwealth.members.includes(countryA) &&
        culturalTies.commonwealth.members.includes(countryB)) {
      maxMultiplier = Math.max(maxMultiplier, culturalTies.commonwealth.multiplier);
    }

    // Check regional blocs
    for (const bloc of culturalTies.regionalBlocs) {
      if (bloc.members.includes(countryA) && bloc.members.includes(countryB)) {
        maxMultiplier = Math.max(maxMultiplier, bloc.multiplier);
      }
    }

    // Check bilateral links (directional - check both ways)
    for (const link of culturalTies.bilateral) {
      if ((link.from === countryA && link.to === countryB) ||
          (link.from === countryB && link.to === countryA)) {
        maxMultiplier = Math.max(maxMultiplier, link.multiplier);
      }
    }

    return maxMultiplier;
  }

  /**
   * Compute raw (uncalibrated) latent OD demand between two zones
   *
   * LatentOD = AirMass_i^α * AirMass_j^α * Dist^(-γ) * CulturalMultiplier
   *
   * @param {Object} zoneA - Zone object with population, countryCode, lat/lon
   * @param {Object} zoneB - Zone object with population, countryCode, lat/lon
   * @param {number} gdpA - GDP per capita for zone A's country
   * @param {number} gdpB - GDP per capita for zone B's country
   * @param {number} distance - Pre-computed distance in nautical miles
   * @param {number} year - Target year
   * @returns {number} - Raw demand value (unscaled)
   */
  computeRawZoneDemand(zoneA, zoneB, gdpA, gdpB, distance, year) {
    // Skip very short or very long routes
    if (distance < calibration.minDistanceNm || distance > calibration.maxDistanceNm) {
      return 0;
    }

    const popA = this.interpolateDecadeValue(zoneA.population, year);
    const popB = this.interpolateDecadeValue(zoneB.population, year);

    const airMassA = this.computeAirMass(popA, gdpA, year);
    const airMassB = this.computeAirMass(popB, gdpB, year);

    // Both zones need some flying population
    if (airMassA < 0.01 || airMassB < 0.01) return 0;

    const alpha = calibration.alpha;
    const gamma = calibration.gamma;

    const culturalMult = this.getCulturalMultiplier(zoneA.countryCode, zoneB.countryCode);

    // Clamp distance to a floor so ultra-short routes don't dominate normalization
    const effectiveDistance = Math.max(distance, calibration.minEffectiveDistanceNm || 300);

    const demand = Math.pow(airMassA, alpha) *
                   Math.pow(airMassB, alpha) *
                   Math.pow(effectiveDistance, -gamma) *
                   culturalMult;

    return demand;
  }

  /**
   * Calibrate K_t so that the sum of all zone-pair demands matches the historical target
   *
   * @param {Array} zones - All zone objects
   * @param {Object} countryEconomics - Country economic data
   * @param {Object} distanceMatrix - Pre-computed distances keyed by "zoneA_zoneB"
   * @param {number} year - Target year
   * @returns {number} - K_t calibration factor
   */
  calibrateKt(zones, countryEconomics, distanceMatrix, year) {
    const targetPassengers = this.interpolateDecadeValue(calibration.worldPassengers, year);
    let totalRawDemand = 0;

    for (let i = 0; i < zones.length; i++) {
      const gdpA = this.getGdpForZone(zones[i], countryEconomics, year);
      for (let j = i + 1; j < zones.length; j++) {
        const key = `${zones[i].zoneId}_${zones[j].zoneId}`;
        const distance = distanceMatrix[key];
        if (!distance || distance < calibration.minDistanceNm) continue;

        const gdpB = this.getGdpForZone(zones[j], countryEconomics, year);
        const rawDemand = this.computeRawZoneDemand(
          zones[i], zones[j], gdpA, gdpB, distance, year
        );
        totalRawDemand += rawDemand * 2; // Both directions
      }
    }

    if (totalRawDemand === 0) return 1;
    return (targetPassengers * 1000000) / totalRawDemand; // Target is in millions, raw is in thousands
  }

  /**
   * Get GDP per capita for a zone's country at a given year
   */
  getGdpForZone(zone, countryEconomics, year) {
    const countryData = countryEconomics[zone.countryCode];
    if (!countryData || !countryData.gdpPerCapita) return 1000; // Fallback low GDP
    return this.interpolateDecadeValue(countryData.gdpPerCapita, year);
  }

  /**
   * Compute the full distance matrix between all zones
   *
   * @param {Array} zones - All zone objects
   * @returns {Object} - Keyed by "zoneA_zoneB", value is distance in nm
   */
  computeDistanceMatrix(zones) {
    const matrix = {};
    for (let i = 0; i < zones.length; i++) {
      for (let j = i + 1; j < zones.length; j++) {
        const dist = this.calculateDistance(
          zones[i].latitude, zones[i].longitude,
          zones[j].latitude, zones[j].longitude
        );
        const key1 = `${zones[i].zoneId}_${zones[j].zoneId}`;
        const key2 = `${zones[j].zoneId}_${zones[i].zoneId}`;
        matrix[key1] = dist;
        matrix[key2] = dist;
      }
    }
    return matrix;
  }

  /**
   * Allocate zone-pair demand to airport pairs based on demand shares
   *
   * @param {number} zoneDemand - Demand between the two zones (0-100 scale)
   * @param {Array} fromAirports - [{airportId, icaoCode, demandShare}, ...]
   * @param {Array} toAirports - [{airportId, icaoCode, demandShare}, ...]
   * @returns {Array} - [{fromAirportId, toAirportId, demand}, ...]
   */
  allocateToAirports(zoneDemand, fromAirports, toAirports) {
    const pairs = [];
    for (const from of fromAirports) {
      for (const to of toAirports) {
        if (from.airportId === to.airportId) continue; // Skip same airport
        const demand = zoneDemand * from.demandShare * to.demandShare;
        if (demand >= 0.5) { // Only include if it rounds to at least 1
          pairs.push({
            fromAirportId: from.airportId,
            toAirportId: to.airportId,
            demand: Math.round(demand)
          });
        }
      }
    }
    return pairs;
  }

  /**
   * Determine route type based on airport types and distance
   */
  determineRouteType(fromAirportType, toAirportType, distance, fromCountry, toCountry) {
    const isHub = (type) => type === 'International Hub' || type === 'Major';

    if (isHub(fromAirportType) && isHub(toAirportType) && distance < 3000) {
      return 'business';
    }
    if (fromCountry === toCountry && distance < 1500) {
      return 'regional';
    }
    if (distance > 5000) {
      return 'mixed'; // Long-haul tends to be mixed
    }
    return 'mixed';
  }

  /**
   * Get demand category from demand score
   */
  getDemandCategory(demand) {
    if (demand >= 80) return 'very_high';
    if (demand >= 60) return 'high';
    if (demand >= 40) return 'medium';
    if (demand >= 20) return 'low';
    return 'very_low';
  }
}

const gravityModelService = new GravityModelService();
module.exports = gravityModelService;
