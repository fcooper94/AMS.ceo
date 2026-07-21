/**
 * Era Economic Service
 *
 * Handles financial scaling across different aviation eras (1950-2025)
 * Converts 2024 USD prices to era-appropriate values for display and gameplay balance
 */

class EraEconomicService {
  /**
   * Get the economic multiplier for a given year
   * All prices in database are 2024 USD; multiply by this to get era-appropriate display value
   *
   * @param {number} year - The year (e.g., 1955, 2020)
   * @returns {number} - Multiplier (0.10 to 1.00)
   */
  getEraMultiplier(year) {
    if (year < 1958) return 0.10;  // Propeller era
    if (year < 1970) return 0.15;  // Early jet era
    if (year < 1980) return 0.25;  // Widebody era
    if (year < 1990) return 0.40;  // Deregulation era
    if (year < 2000) return 0.65;  // Modern era
    if (year < 2010) return 0.85;  // Next-gen era
    return 1.00;                   // Contemporary era (2010+)
  }

  /**
   * Get era name for display
   * @param {number} year
   * @returns {string}
   */
  getEraName(year) {
    if (year < 1958) return 'Propeller Era';
    if (year < 1970) return 'Early Jet Era';
    if (year < 1980) return 'Widebody Era';
    if (year < 1990) return 'Deregulation Era';
    if (year < 2000) return 'Modern Era';
    if (year < 2010) return 'Next-Gen Era';
    return 'Contemporary Era';
  }

  /**
   * Convert a 2024 USD price to era-appropriate display value
   *
   * @param {number} price2024USD - Price in 2024 dollars
   * @param {number} year - Year to convert to
   * @returns {number} - Era-appropriate price
   *
   * @example
   * // DC-3 costs $8.5M in 2024 USD
   * convertToEraPrice(8500000, 1950) // Returns $850,000 (1950 dollars)
   * convertToEraPrice(8500000, 2024) // Returns $8,500,000 (2024 dollars)
   */
  convertToEraPrice(price2024USD, year) {
    return Math.round(price2024USD * this.getEraMultiplier(year));
  }

  /**
   * Get starting capital based on world year
   * All players start with the same capital, scaled by era
   *
   * @param {number} year - World start year
   * @returns {number} - Starting capital in era-appropriate dollars
   *
   * @example
   * getStartingCapital(1950)    // Returns $3,750,000 (Propeller Era)
   * getStartingCapital(1970)    // Returns $9,375,000 (Widebody Era)
   * getStartingCapital(2020)    // Returns $37,500,000 (Contemporary)
   */
  getStartingCapital(year) {
    // Base capital in 2024 USD - scaled down by 75% from original design
    const baseCapital2024 = 37500000; // $37.5M base (was $150M, then $75M)

    return Math.round(baseCapital2024 * this.getEraMultiplier(year));
  }

  /**
   * Get starting capital info for display
   * @param {number} year
   * @returns {object}
   */
  getStartingCapitalInfo(year) {
    const capital = this.getStartingCapital(year);
    const multiplier = this.getEraMultiplier(year);

    return {
      capital,
      displayCapital: this.formatCurrency(capital, year),
      eraName: this.getEraName(year),
      multiplier,
      affordableAircraft: this.getAffordableAircraftCount(capital, year)
    };
  }

  /**
   * Estimate how many entry-level aircraft can be afforded
   * @private
   */
  getAffordableAircraftCount(capital, year) {
    // Assume entry aircraft costs 30-50% of capital
    return Math.floor(capital / (capital * 0.4));
  }

  /**
   * Get fuel cost multiplier for a given year
   * Fuel prices have varied dramatically over time
   *
   * @param {number} year
   * @returns {number} - Multiplier for fuel costs
   */
  getFuelCostMultiplier(year) {
    if (year < 1958) return 0.08;  // Very cheap fuel ($0.15/gal)
    if (year < 1970) return 0.12;  // Cheap fuel
    if (year < 1980) return 0.35;  // Oil crisis ($0.85/gal)
    if (year < 1990) return 0.30;  // Moderate prices
    if (year < 2000) return 0.75;  // Rising prices
    if (year < 2010) return 0.95;  // High prices
    return 1.00;                   // Current prices ($2.80/gal)
  }

  /**
   * Calculate fuel cost per hour for an aircraft in a given year
   *
   * @param {number} fuelBurnPerHour - Liters per hour (from aircraft data)
   * @param {number} year - Year to calculate for
   * @returns {number} - Fuel cost per hour
   */
  calculateFuelCost(fuelBurnPerHour, year) {
    const baseFuelCostPerLiter = 0.75; // 2024 USD per liter (~$2.80/gal)
    const eraMultiplier = this.getFuelCostMultiplier(year);

    return Math.round(fuelBurnPerHour * baseFuelCostPerLiter * eraMultiplier);
  }

  /**
   * Get labor cost multiplier
   * Pilot and crew salaries have increased with inflation
   *
   * @param {number} year
   * @returns {number}
   */
  getLaborCostMultiplier(year) {
    // Labor costs follow general era multiplier
    return this.getEraMultiplier(year);
  }

  /**
   * Calculate annual pilot salary
   * @param {number} year
   * @returns {number}
   */
  getPilotSalary(year) {
    const baseSalary2024 = 150000; // $150k/year in 2024
    return Math.round(baseSalary2024 * this.getLaborCostMultiplier(year));
  }

  /**
   * Calculate annual crew member salary
   * @param {number} year
   * @returns {number}
   */
  getCrewSalary(year) {
    const baseSalary2024 = 65000; // $65k/year in 2024
    return Math.round(baseSalary2024 * this.getLaborCostMultiplier(year));
  }

  /**
   * Get ticket price per nautical mile
   *
   * @param {number} routeDistance - Distance in nautical miles
   * @param {number} year - Year
   * @param {string} cabinClass - 'economy', 'business', 'first'
   * @returns {number} - Price per nautical mile
   */
  getTicketPricePerMile(routeDistance, year, cabinClass = 'economy') {
    // Base 2024 prices per mile
    const basePrices = {
      economy: 0.18,
      business: 0.45,
      first: 0.90
    };

    const basePrice = basePrices[cabinClass] || basePrices.economy;

    // Fare premium for early eras: air travel was a luxury, fares were high
    // relative to general price levels. This tapers to 1.0 by the modern era
    // (deregulation + competition drove real fares down). Applied ON TOP of
    // eraMult so that ticket prices are proportionally higher than costs —
    // matching the real economics where airlines were profitable despite
    // inefficient aircraft, because fares were premium-priced.
    const farePremium = year < 1958 ? 3.5   // Propeller era: flying is exclusive luxury
                      : year < 1970 ? 2.8   // Early jets: still expensive, growing market
                      : year < 1980 ? 2.0   // Widebody era: fares dropping as capacity grows
                      : year < 1990 ? 1.5   // Deregulation: fare wars begin
                      : year < 2000 ? 1.15  // Modern: competitive market emerging
                      : 1.0;                // 2000+: fully competitive, no premium

    // Distance discount: longer routes = cheaper per mile
    // Max 50% discount at 10,000nm
    const distanceDiscount = Math.min(0.5, routeDistance / 20000);
    const distanceMultiplier = 1 - distanceDiscount;

    return basePrice * distanceMultiplier * this.getEraMultiplier(year) * farePremium;
  }

  /**
   * Calculate ticket price for a route.
   * Short-haul routes carry a per-departure premium (fixed costs amortised over
   * fewer miles). Long-haul routes face yield pressure from indirect alternatives.
   * The 1000nm economy price is unchanged (~$171 in 2010) — the benchmark.
   *
   * @param {number} routeDistance - Distance in nautical miles
   * @param {number} year - Year
   * @param {string} cabinClass - Cabin class
   * @returns {number} - Total ticket price
   */
  calculateTicketPrice(routeDistance, year, cabinClass = 'economy') {
    const pricePerMile = this.getTicketPricePerMile(routeDistance, year, cabinClass);
    let price = pricePerMile * routeDistance;

    // Short-haul premium (< 800nm): fixed per-departure costs (check-in,
    // boarding, airport handling) amortised over fewer miles push up fares.
    // Fades to zero by 800nm so domestic trunk routes (700nm+) aren't inflated.
    if (routeDistance < 800) {
      const classScale = cabinClass === 'first' ? 4 : cabinClass === 'business' ? 2.5
                       : cabinClass === 'economyPlus' ? 1.3 : 1;
      price += 120 * (1 - routeDistance / 800) * classScale * this.getEraMultiplier(year);
    }

    // Long-haul yield discount (> 1500nm): passengers have indirect routing
    // alternatives via connecting hubs, fare sensitivity increases with distance.
    // Starts gently at 1500nm, up to 22% at extreme range.
    if (routeDistance > 1500) {
      const discount = Math.min(0.22, (routeDistance - 1500) / 14000);
      price *= (1 - discount);
    }

    return Math.round(price);
  }

  /**
   * Get passenger demand multiplier
   * More people fly in later eras
   *
   * @param {number} year
   * @returns {number} - Demand multiplier (1.0 = 2024 levels)
   */
  getPassengerDemandMultiplier(year) {
    if (year < 1958) return 0.05;  // Very few passengers (50M/year globally)
    if (year < 1970) return 0.15;  // Growing (150M/year)
    if (year < 1980) return 0.30;  // Expanding (300M/year)
    if (year < 1990) return 0.50;  // Deregulation boost (500M/year)
    if (year < 2000) return 0.70;  // Globalization (1.5B/year)
    if (year < 2010) return 0.85;  // Pre-crisis levels (2B/year)
    return 1.00;                   // Current levels (4.5B/year)
  }

  /**
   * Get expected load factor for era
   * @param {number} year
   * @returns {number} - Load factor percentage (0-100)
   */
  getExpectedLoadFactor(year) {
    if (year < 1958) return 65;
    if (year < 1970) return 68;
    if (year < 1980) return 70;
    if (year < 1990) return 72;
    if (year < 2000) return 75;
    if (year < 2010) return 78;
    if (year < 2020) return 82;
    return 84;
  }

  /**
   * Format currency for display
   *
   * @param {number} amount - Amount to format
   * @param {number} year - Year (for determining currency symbol)
   * @param {boolean} showEquivalent - Show 2024 equivalent in tooltip
   * @returns {string} - Formatted currency string
   */
  formatCurrency(amount, year, showEquivalent = false) {
    // TODO: Could add support for different currencies based on airline region
    // For now, always use USD

    const formatted = `$${Math.round(amount).toLocaleString()}`;

    if (showEquivalent && year < 2024) {
      const equivalent2024 = amount / this.getEraMultiplier(year);
      return `${formatted} (2024: $${Math.round(equivalent2024).toLocaleString()})`;
    }

    return formatted;
  }

  // ── Tuning constants for flight cost model ──────────────────────────
  // All rates are 2024 USD; eraMult scales non-fuel costs to era currency.
  // Fuel uses fuelMult ONLY (era-specific fuel prices, no double scaling).
  static COST = {
    FUEL_PRICE_PER_LITER:     0.75,   // base jet fuel $/L (~$2.84/gal, 2024)
    FUEL_CONTINGENCY:         1.12,   // +12% for taxi, reserves, ATC holds
    PILOT_HOURLY:             250,    // $/hr per pilot (salary+benefits+training)
    CABIN_CREW_HOURLY:        60,     // $/hr per flight attendant
    MAINT_VARIABLE_FRAC:      0.45,   // fraction of maintenanceCostPerHour for per-flight-hour variable costs
    MAINT_CYCLE_FRAC:         0.30,   // fraction for per-cycle wear (landing/takeoff)
    NAV_PER_NM:               0.10,   // $/nm ATC / navigation charges
    CATERING_BASE_PER_PAX:    2.00,   // $/pax short-haul base catering
    CATERING_PER_PAX_PER_HR:  0.50,   // additional $/pax per flight hour
    DISTRIBUTION_RATE:        0.03,   // 3% of ticket revenue for sales/distribution
    LONG_HAUL_CREW_HOURS:     6,      // one-way hours triggering +1 relief pilot
    ULTRA_LONG_CREW_HOURS:    12,     // one-way hours triggering +2 relief pilots
    // Ground handling per-departure by contractor tier
    GROUND_HANDLING: {
      budget:   { base: 200, perSeat: 1.5 },
      standard: { base: 350, perSeat: 3.0 },
      premium:  { base: 600, perSeat: 5.0 }
    }
  };

  /**
   * Calculate flight operating costs using aircraft-specific data when available,
   * falling back to seat-based estimation for AI cost estimators.
   *
   * @param {number}  totalNm     - Total nautical miles (round-trip for routes, full loop for tours)
   * @param {number}  seats       - Passenger capacity
   * @param {number}  year        - World year
   * @param {number}  [passengers]- Actual passengers. Omit for ~75% estimate.
   * @param {object}  [opts]      - Aircraft-specific data + options
   * @param {number}  [opts.fuelBurnPerHour]        - L/hr from Aircraft model
   * @param {number}  [opts.maintenanceCostPerHour]  - $/hr from Aircraft model (2024 USD)
   * @param {number}  [opts.cruiseSpeed]             - knots
   * @param {number}  [opts.requiredPilots]           - count
   * @param {number}  [opts.requiredCabinCrew]        - count
   * @param {string}  [opts.groundTier]               - 'budget'|'standard'|'premium'
   * @param {number}  [opts.ticketRevenue]             - for distribution commission calc
   * @returns {{ fuelCost, crewCost, maintenanceCost, airportFees, groundHandling,
   *             paxServiceCost, navCharges, cateringCost, distributionCost, totalCosts }}
   */
  calculateFlightCosts(totalNm, seats, year, passengers, opts) {
    const C = EraEconomicService.COST;
    const fuelMult = this.getFuelCostMultiplier(year);
    const eraMult  = this.getEraMultiplier(year);
    const pax = passengers != null ? passengers : Math.round(seats * 0.75);

    let fuelCost, crewCost, maintenanceCost, flightHours;

    if (opts && opts.fuelBurnPerHour && opts.cruiseSpeed) {
      // ── Aircraft-specific path ─────────────────────────────────────
      const speed = Math.max(opts.cruiseSpeed, 80);
      flightHours = totalNm / speed;
      const oneWayHours = flightHours / 2;

      // Fuel: actual burn × time × fuel price, era-scaled.
      // fuelMult adjusts for era-specific fuel price variation ON TOP of eraMult.
      const fuelPrice = C.FUEL_PRICE_PER_LITER * fuelMult * eraMult;
      fuelCost = Math.round(opts.fuelBurnPerHour * flightHours * fuelPrice * C.FUEL_CONTINGENCY);

      // Crew: actual crew counts × hourly rates, with long-haul augmentation
      let pilots = opts.requiredPilots || 2;
      let cabinCrew = opts.requiredCabinCrew || 0;
      if (oneWayHours > C.ULTRA_LONG_CREW_HOURS) {
        pilots += 2; cabinCrew = Math.ceil(cabinCrew * 1.5);
      } else if (oneWayHours > C.LONG_HAUL_CREW_HOURS) {
        pilots += 1; cabinCrew = Math.ceil(cabinCrew * 1.3);
      }
      crewCost = Math.round((pilots * C.PILOT_HOURLY + cabinCrew * C.CABIN_CREW_HOURLY) * flightHours * eraMult);

      // Maintenance: per-flight-hour variable + per-cycle fixed
      const maintHr = opts.maintenanceCostPerHour || 1000;
      maintenanceCost = Math.round(
        (maintHr * C.MAINT_VARIABLE_FRAC * flightHours + maintHr * C.MAINT_CYCLE_FRAC) * eraMult
      );
    } else {
      // ── Fallback: seat-based estimation (AI cost estimators) ───────
      const sizeScale = Math.sqrt(Math.max(seats, 30) / 150);
      const estSpeed = seats > 200 ? 480 : seats > 80 ? 460 : 300;
      flightHours = totalNm / estSpeed;
      // Fuel: era-scaled with fuel-specific multiplier (consistent with aircraft path)
      fuelCost        = Math.round(totalNm * 5.5  * sizeScale * fuelMult * eraMult * C.FUEL_CONTINGENCY);
      crewCost        = Math.round(totalNm * 0.90 * sizeScale * eraMult);
      maintenanceCost = Math.round(totalNm * 0.65 * sizeScale * eraMult);
    }

    // ── Common costs (both paths) ────────────────────────────────────
    // Airport fees: landing + terminal + handling. Scales with aircraft size —
    // small regionals at small airports pay much less than widebodies at major hubs.
    const airportFees = Math.round(seats * 15 * eraMult);

    // Ground handling: per-departure cost by contractor tier
    const tier = (opts && opts.groundTier) || 'standard';
    const gh = C.GROUND_HANDLING[tier] || C.GROUND_HANDLING.standard;
    const groundHandling = Math.round((gh.base + seats * gh.perSeat) * eraMult);

    // Per-passenger service costs (check-in, boarding, compensation reserve)
    const paxServiceCost = Math.round(pax * 3 * eraMult);

    // Navigation / ATC charges
    const navCharges = Math.round(totalNm * C.NAV_PER_NM * eraMult);

    // Catering: scales with flight duration
    const cateringCost = Math.round(pax * (C.CATERING_BASE_PER_PAX + (flightHours / 2) * C.CATERING_PER_PAX_PER_HR) * eraMult);

    // Distribution / sales commission (3% of ticket revenue when known)
    const distributionCost = (opts && opts.ticketRevenue) ? Math.round(opts.ticketRevenue * C.DISTRIBUTION_RATE) : 0;

    const totalCosts = fuelCost + crewCost + maintenanceCost + airportFees +
                       groundHandling + paxServiceCost + navCharges + cateringCost + distributionCost;

    return {
      fuelCost, crewCost, maintenanceCost, airportFees, groundHandling,
      paxServiceCost, navCharges, cateringCost, distributionCost, totalCosts
    };
  }

  /**
   * Get all economic parameters for a given year
   * Useful for debugging and display
   *
   * @param {number} year
   * @returns {object}
   */
  getEconomicSnapshot(year) {
    return {
      year,
      eraName: this.getEraName(year),
      eraMultiplier: this.getEraMultiplier(year),
      fuelMultiplier: this.getFuelCostMultiplier(year),
      laborMultiplier: this.getLaborCostMultiplier(year),
      demandMultiplier: this.getPassengerDemandMultiplier(year),
      expectedLoadFactor: this.getExpectedLoadFactor(year),
      pilotSalaryAnnual: this.getPilotSalary(year),
      crewSalaryAnnual: this.getCrewSalary(year),
      startingCapital: this.getStartingCapital(year),
      exampleTicketPrices: {
        shortHaul: this.calculateTicketPrice(500, year, 'economy'),
        mediumHaul: this.calculateTicketPrice(2000, year, 'economy'),
        longHaul: this.calculateTicketPrice(5000, year, 'economy')
      }
    };
  }
}

// Singleton instance
const eraEconomicService = new EraEconomicService();

module.exports = eraEconomicService;
