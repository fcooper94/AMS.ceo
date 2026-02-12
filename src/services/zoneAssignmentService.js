/**
 * Zone Assignment Service
 *
 * Assigns airports to metro zones and computes demand shares within each zone.
 * Uses explicit mappings from metroZones data, with proximity fallback for unmapped airports.
 */

const gravityModelService = require('./gravityModelService');

class ZoneAssignmentService {

  /**
   * Build a lookup from ICAO code to zone ID using the metroZones data
   *
   * @param {Array} metroZones - Metro zone definitions from data file
   * @returns {Object} - { 'EGLL': 'LON', 'KJFK': 'NYC', ... }
   */
  buildIcaoToZoneMap(metroZones) {
    const map = {};
    for (const zone of metroZones) {
      if (zone.airports) {
        for (const icao of zone.airports) {
          map[icao] = zone.zoneId;
        }
      }
    }
    return map;
  }

  /**
   * Find the nearest zone for an airport not explicitly mapped
   * Only considers zones in the same country, within 150km (~81nm)
   *
   * @param {Object} airport - Airport with latitude, longitude, country
   * @param {Array} metroZones - All zone definitions
   * @param {string} airportCountryCode - 2-letter country code for the airport
   * @returns {Object|null} - Matching zone or null
   */
  findNearestZone(airport, metroZones, airportCountryCode) {
    const MAX_DISTANCE_NM = 81; // ~150km
    let nearestZone = null;
    let nearestDist = Infinity;

    for (const zone of metroZones) {
      if (zone.countryCode !== airportCountryCode) continue;

      const dist = gravityModelService.calculateDistance(
        airport.latitude, airport.longitude,
        zone.latitude, zone.longitude
      );

      if (dist < nearestDist && dist < MAX_DISTANCE_NM) {
        nearestDist = dist;
        nearestZone = zone;
      }
    }

    return nearestZone;
  }

  /**
   * Map a country name to ISO 2-letter code
   * Uses a comprehensive mapping for countries in the airport database
   */
  countryNameToCode(countryName) {
    const mapping = {
      'United States': 'US', 'United Kingdom': 'GB', 'Canada': 'CA', 'Australia': 'AU',
      'New Zealand': 'NZ', 'France': 'FR', 'Germany': 'DE', 'Italy': 'IT', 'Spain': 'ES',
      'Netherlands': 'NL', 'Belgium': 'BE', 'Austria': 'AT', 'Switzerland': 'CH',
      'Ireland': 'IE', 'Portugal': 'PT', 'Sweden': 'SE', 'Norway': 'NO', 'Denmark': 'DK',
      'Finland': 'FI', 'Iceland': 'IS', 'Greece': 'GR', 'Turkey': 'TR', 'Poland': 'PL',
      'Czech Republic': 'CZ', 'Czechia': 'CZ', 'Hungary': 'HU', 'Romania': 'RO',
      'Bulgaria': 'BG', 'Croatia': 'HR', 'Serbia': 'RS', 'Slovakia': 'SK', 'Slovenia': 'SI',
      'Ukraine': 'UA', 'Belarus': 'BY', 'Russia': 'RU', 'Russian Federation': 'RU',
      'Kazakhstan': 'KZ', 'Uzbekistan': 'UZ', 'Georgia': 'GE', 'Azerbaijan': 'AZ',
      'Armenia': 'AM', 'Estonia': 'EE', 'Latvia': 'LV', 'Lithuania': 'LT',
      'Bosnia and Herzegovina': 'BA', 'North Macedonia': 'MK', 'Albania': 'AL',
      'Montenegro': 'ME', 'Moldova': 'MD', 'Luxembourg': 'LU', 'Malta': 'MT', 'Cyprus': 'CY',
      'Japan': 'JP', 'China': 'CN', 'South Korea': 'KR', 'Korea, Republic of': 'KR',
      'Taiwan': 'TW', 'Hong Kong': 'HK', 'Macau': 'MO',
      'India': 'IN', 'Pakistan': 'PK', 'Bangladesh': 'BD', 'Sri Lanka': 'LK', 'Nepal': 'NP',
      'Singapore': 'SG', 'Malaysia': 'MY', 'Thailand': 'TH', 'Indonesia': 'ID',
      'Philippines': 'PH', 'Vietnam': 'VN', 'Myanmar': 'MM', 'Cambodia': 'KH',
      'Laos': 'LA', 'Brunei': 'BN',
      'United Arab Emirates': 'AE', 'Saudi Arabia': 'SA', 'Qatar': 'QA', 'Kuwait': 'KW',
      'Oman': 'OM', 'Bahrain': 'BH', 'Israel': 'IL', 'Jordan': 'JO', 'Lebanon': 'LB',
      'Iraq': 'IQ', 'Iran': 'IR',
      'Egypt': 'EG', 'Morocco': 'MA', 'Tunisia': 'TN', 'Algeria': 'DZ', 'Libya': 'LY',
      'South Africa': 'ZA', 'Nigeria': 'NG', 'Kenya': 'KE', 'Ethiopia': 'ET',
      'Ghana': 'GH', 'Tanzania': 'TZ', 'Uganda': 'UG', 'Senegal': 'SN',
      "Côte d'Ivoire": 'CI', 'Ivory Coast': 'CI', 'Mozambique': 'MZ', 'Mauritius': 'MU',
      'Botswana': 'BW', 'Zimbabwe': 'ZW', 'Cameroon': 'CM', 'Angola': 'AO',
      'Democratic Republic of the Congo': 'CD', 'Congo (Kinshasa)': 'CD',
      'Sudan': 'SD', 'Madagascar': 'MG',
      'Brazil': 'BR', 'Argentina': 'AR', 'Chile': 'CL', 'Colombia': 'CO', 'Peru': 'PE',
      'Venezuela': 'VE', 'Ecuador': 'EC', 'Uruguay': 'UY', 'Bolivia': 'BO', 'Paraguay': 'PY',
      'Mexico': 'MX', 'Panama': 'PA', 'Costa Rica': 'CR', 'Cuba': 'CU',
      'Dominican Republic': 'DO', 'Jamaica': 'JM', 'Trinidad and Tobago': 'TT',
      'Guatemala': 'GT', 'Honduras': 'HN', 'El Salvador': 'SV', 'Nicaragua': 'NI',
      'Bahamas': 'BS', 'Barbados': 'BB', 'Haiti': 'HT', 'Puerto Rico': 'PR',
      'Fiji': 'FJ', 'Papua New Guinea': 'PG'
    };
    return mapping[countryName] || null;
  }

  /**
   * Compute demand shares for airports within a zone
   * Uses airportGrowthService historical pax data or trafficDemand as fallback
   *
   * @param {Array} airports - Airports in the zone [{id, icaoCode, trafficDemand}, ...]
   * @param {Object} historicalPaxData - From airportGrowthService (keyed by ICAO)
   * @param {number} year - Year for the share calculation
   * @returns {Array} - [{airportId, icaoCode, demandShare}, ...]
   */
  computeDemandShares(airports, historicalPaxData, year) {
    if (airports.length === 0) return [];
    if (airports.length === 1) {
      return [{ airportId: airports[0].id, icaoCode: airports[0].icaoCode, demandShare: 1.0 }];
    }

    // Calculate weight for each airport
    const weights = airports.map(airport => {
      // Try historical passenger data first
      const paxData = historicalPaxData[airport.icaoCode];
      if (paxData) {
        const pax = this.interpolatePaxData(paxData, year);
        if (pax > 0) return { airport, weight: pax };
      }

      // Fallback: use airport type as proxy for passenger volume
      // This matters because trafficDemand values are often identical (all 10)
      const typeWeights = {
        'International Hub': 5.0,    // ~5M pax equivalent
        'Regional Hub': 2.0,         // ~2M pax
        'Regional': 0.5,             // ~0.5M pax
        'Major': 0.3,                // Often military/GA, minimal commercial
        'Domestic': 0.2,
        'Small': 0.05,
        'Closed': 0.01
      };
      const scaledPax = typeWeights[airport.type] || 0.1;
      return { airport, weight: scaledPax };
    });

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

    return weights.map(w => ({
      airportId: w.airport.id,
      icaoCode: w.airport.icaoCode,
      demandShare: Math.round((w.weight / totalWeight) * 10000) / 10000 // 4 decimal places
    }));
  }

  /**
   * Interpolate passenger data for a specific year
   */
  interpolatePaxData(paxData, year) {
    const years = Object.keys(paxData).map(Number).sort((a, b) => a - b);
    if (years.length === 0) return 0;

    if (year <= years[0]) return paxData[years[0]];
    if (year >= years[years.length - 1]) return paxData[years[years.length - 1]];

    for (let i = 0; i < years.length - 1; i++) {
      if (year >= years[i] && year < years[i + 1]) {
        const fraction = (year - years[i]) / (years[i + 1] - years[i]);
        return paxData[years[i]] + fraction * (paxData[years[i + 1]] - paxData[years[i]]);
      }
    }

    return paxData[years[years.length - 1]];
  }
}

const zoneAssignmentService = new ZoneAssignmentService();
module.exports = zoneAssignmentService;
