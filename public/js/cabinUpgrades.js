/**
 * Cabin Upgrade / Amenity Definitions
 *
 * Each upgrade is era-gated, class-restricted, and priced per-seat (2024 USD,
 * era-scaled at install time). Upgrades boost ticket yield and/or load factor.
 *
 * Dual-env: works in Node (CommonJS) and browser (<script> tag).
 */

const CABIN_UPGRADES = {
  // ─── Per-seat upgrades (applied per class) ─────────────────────────
  // Each has classOverrides for class-specific name, description, cost, bonuses.
  // getUpgradeForClass() resolves the effective values.
  reclinerSeats: {
    name: 'Recliner Seats', category: 'comfort', scope: 'seat',
    eraStart: 1960, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    costPerSeat2024: 300, yieldPct: 1.5, loadFactorPct: 1,
    classOverrides: {
      economy:     { name: 'Slim Recline',          description: '5° additional recline with headrest adjustment',    costPerSeat2024: 300,  yieldPct: 1.5, loadFactorPct: 1 },
      economyPlus: { name: 'Comfort Recline',       description: '12° recline with adjustable lumbar support',        costPerSeat2024: 500,  yieldPct: 2,   loadFactorPct: 1.5 },
      business:    { name: 'Executive Recline',      description: '40° deep recline with leg rest and winged headrest', costPerSeat2024: 900, yieldPct: 3,   loadFactorPct: 2 },
      first:       { name: 'Sleeper Recline',        description: 'Near-flat 60° recline with ottoman and privacy shell', costPerSeat2024: 1800, yieldPct: 4, loadFactorPct: 2.5 }
    }
  },
  extraLegroom: {
    name: 'Extra Legroom', category: 'comfort', scope: 'seat',
    eraStart: 1965, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    costPerSeat2024: 200, yieldPct: 1, loadFactorPct: 1,
    classOverrides: {
      economy:     { name: 'Extra Legroom',           description: '+2" seat pitch (31" → 33") for more knee room',     costPerSeat2024: 200,  yieldPct: 1,   loadFactorPct: 1 },
      economyPlus: { name: 'Generous Pitch',          description: '+3" seat pitch (34" → 37") with wider armrests',    costPerSeat2024: 350,  yieldPct: 1.5, loadFactorPct: 1.5 },
      business:    { name: 'Extended Suite Space',     description: '+4" pitch (38" → 42") with personal storage',      costPerSeat2024: 600,  yieldPct: 2,   loadFactorPct: 1.5 },
      first:       { name: 'Private Suite Expansion',  description: '+6" suite depth with walk-up aisle space',         costPerSeat2024: 1200, yieldPct: 2.5, loadFactorPct: 2 }
    }
  },
  personalIFE: {
    name: 'Personal IFE', category: 'entertainment', scope: 'seat',
    eraStart: 1992, eraStartEconomy: 1997,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    costPerSeat2024: 800, yieldPct: 3, loadFactorPct: 1.5,
    replaces: 'overheadVideo',
    classOverrides: {
      economy:     { name: '7" Seatback Screen',       description: '7-inch touchscreen with movies, TV and flight map', costPerSeat2024: 800,  yieldPct: 3,   loadFactorPct: 1.5 },
      economyPlus: { name: '9" HD Screen',             description: '9-inch HD display with noise-cancelling headphone jack', costPerSeat2024: 1100, yieldPct: 3.5, loadFactorPct: 2 },
      business:    { name: '15" HD Swivel Display',    description: '15-inch adjustable HD display with Bluetooth audio', costPerSeat2024: 2200, yieldPct: 5,   loadFactorPct: 2.5 },
      first:       { name: '24" 4K Personal Cinema',   description: '24-inch 4K display with surround sound and handset', costPerSeat2024: 4500, yieldPct: 6,   loadFactorPct: 3 }
    }
  },
  laptopPower: {
    name: 'Laptop Power', category: 'power', scope: 'seat',
    eraStart: 1998, eraObsolete: 2010,
    classes: ['business', 'first'],
    costPerSeat2024: 300, yieldPct: 2, loadFactorPct: 0.5,
    classOverrides: {
      business: { name: 'EmPower Outlet',       description: 'In-seat EmPower socket for laptop charging',    costPerSeat2024: 300, yieldPct: 2, loadFactorPct: 0.5 },
      first:    { name: 'Multi-Power Console',   description: 'EmPower + universal AC in personal console',   costPerSeat2024: 600, yieldPct: 3, loadFactorPct: 1 }
    }
  },
  acPower: {
    name: 'AC Power', category: 'power', scope: 'seat',
    eraStart: 2004, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    costPerSeat2024: 200, yieldPct: 1, loadFactorPct: 0.5,
    replaces: 'laptopPower',
    classOverrides: {
      economy:     { name: 'Shared AC Outlet',        description: 'AC outlet shared between two seats',         costPerSeat2024: 150,  yieldPct: 1,   loadFactorPct: 0.5 },
      economyPlus: { name: 'Personal AC Outlet',      description: 'Individual AC outlet per seat',              costPerSeat2024: 250,  yieldPct: 1.5, loadFactorPct: 0.5 },
      business:    { name: 'Suite Power Panel',        description: 'Dual AC outlets with integrated cable tidy', costPerSeat2024: 400,  yieldPct: 2,   loadFactorPct: 1 },
      first:       { name: 'Full Power Console',       description: 'Multiple AC outlets + wireless charging pad', costPerSeat2024: 700, yieldPct: 2.5, loadFactorPct: 1 }
    }
  },
  usbCharging: {
    name: 'USB-A Charging', category: 'power', scope: 'seat',
    eraStart: 2012, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    costPerSeat2024: 60, yieldPct: 0.5, loadFactorPct: 0.5,
    classOverrides: {
      economy:     { name: 'USB-A Port',              description: 'Single USB-A charging port',                  costPerSeat2024: 60,  yieldPct: 0.5, loadFactorPct: 0.5 },
      economyPlus: { name: 'Dual USB-A Ports',        description: 'Two USB-A ports in armrest console',          costPerSeat2024: 90,  yieldPct: 1,   loadFactorPct: 0.5 },
      business:    { name: 'USB Power Hub',            description: 'Multiple USB-A ports in suite console',      costPerSeat2024: 120, yieldPct: 1,   loadFactorPct: 0.5 },
      first:       { name: 'Premium USB Hub',          description: 'Multiple USB-A ports with fast-charge',      costPerSeat2024: 150, yieldPct: 1,   loadFactorPct: 0.5 }
    }
  },
  usbC: {
    name: 'USB-C Charging', category: 'power', scope: 'seat',
    eraStart: 2021, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    costPerSeat2024: 50, yieldPct: 0.5, loadFactorPct: 0.5,
    replaces: 'usbCharging',
    classOverrides: {
      economy:     { name: 'USB-C Port',              description: 'Single USB-C fast-charge port',               costPerSeat2024: 50,  yieldPct: 0.5, loadFactorPct: 0.5 },
      economyPlus: { name: 'Dual USB-C Ports',        description: 'Two USB-C ports with Power Delivery',         costPerSeat2024: 80,  yieldPct: 1,   loadFactorPct: 0.5 },
      business:    { name: 'USB-C Power Hub',          description: 'USB-C PD hub with wireless charging pad',    costPerSeat2024: 140, yieldPct: 1,   loadFactorPct: 0.5 },
      first:       { name: 'Premium Charging Suite',   description: 'USB-C PD + wireless Qi charging surface',    costPerSeat2024: 200, yieldPct: 1.5, loadFactorPct: 0.5 }
    }
  },
  seatbackPhone: {
    name: 'Seatback Telephone', category: 'connectivity', scope: 'seat',
    eraStart: 1989, eraObsolete: 2005,
    classes: ['business', 'first'],
    costPerSeat2024: 400, yieldPct: 1.5, loadFactorPct: 0.5,
    classOverrides: {
      business: { name: 'Seat Telephone',           description: 'In-seat satellite telephone handset',        costPerSeat2024: 400,  yieldPct: 1.5, loadFactorPct: 0.5 },
      first:    { name: 'Private Suite Telephone',   description: 'Personal satellite phone with privacy hood', costPerSeat2024: 800, yieldPct: 3,   loadFactorPct: 1 }
    }
  },

  // ─── Aircraft-wide upgrades (apply to whole cabin) ────────────────
  improvedDecor: {
    name: 'Improved Cabin Decor',
    description: 'Better lighting, colours, overhead bins and trim',
    category: 'comfort', scope: 'aircraft',
    eraStart: 1965, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 25000, yieldPct: 1, loadFactorPct: 0.5
  },
  moodLighting: {
    name: 'Mood LED Lighting',
    description: 'Programmable ambient cabin lighting (787/A380 generation)',
    category: 'comfort', scope: 'aircraft',
    eraStart: 2008, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 35000, yieldPct: 1, loadFactorPct: 0.5
  },
  audioEntertainment: {
    name: 'Audio Entertainment',
    description: 'Pneumatic headsets with multi-channel music',
    category: 'entertainment', scope: 'aircraft',
    eraStart: 1970, eraObsolete: 2005,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 15000, yieldPct: 1, loadFactorPct: 1
  },
  overheadVideo: {
    name: 'Overhead Video Screens',
    description: 'Shared CRT/LCD screens showing in-flight movies',
    category: 'entertainment', scope: 'aircraft',
    eraStart: 1985, eraObsolete: 2015,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 45000, yieldPct: 2, loadFactorPct: 1
  },
  bluetoothAudio: {
    name: 'Bluetooth Audio',
    description: 'Passengers pair their own wireless headphones',
    category: 'entertainment', scope: 'aircraft',
    eraStart: 2022, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 20000, yieldPct: 1, loadFactorPct: 0.5
  },
  wifi: {
    name: 'Wi-Fi',
    description: 'Basic satellite internet connectivity',
    category: 'connectivity', scope: 'aircraft',
    eraStart: 2008, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 120000, yieldPct: 3, loadFactorPct: 1.5
  },
  highSpeedWifi: {
    name: 'High-Speed Wi-Fi',
    description: 'Ka/Ku-band high-throughput satellite internet',
    category: 'connectivity', scope: 'aircraft',
    eraStart: 2016, eraObsolete: null,
    classes: ['economy', 'economyPlus', 'business', 'first'],
    lumpCost2024: 180000, yieldPct: 4, loadFactorPct: 1.5,
    replaces: 'wifi'
  },

  // ─── Premium ──────────────────────────────────────────────────────
  cocktailBar: {
    name: 'Lounge / Cocktail Bar',
    description: 'Onboard bar area with standing room and drinks service',
    category: 'premium', scope: 'aircraft',
    eraStart: 1958, eraObsolete: null,
    classes: ['first', 'business'],
    widebodyOnly: true,
    costPerSeat2024: 0, // lump-sum, not per-seat
    lumpCost2024: 85000,
    yieldPct: 8,
    loadFactorPct: 2,
    seatReduction: { first: 2, business: 3 } // rows consumed
  }
};

// Category display order
const UPGRADE_CATEGORIES = [
  { key: 'comfort', label: 'Comfort', color: '#34d399' },
  { key: 'entertainment', label: 'Entertainment', color: '#60a5fa' },
  { key: 'power', label: 'Power', color: '#fbbf24' },
  { key: 'connectivity', label: 'Connectivity', color: '#a78bfa' },
  { key: 'premium', label: 'Premium', color: '#f472b6' }
];

/**
 * Resolve class-specific values for an upgrade.
 * Returns a merged object with classOverrides applied on top of the base def.
 */
function getUpgradeForClass(def, cls) {
  if (!def.classOverrides || !def.classOverrides[cls]) return def;
  return { ...def, ...def.classOverrides[cls] };
}

/**
 * Get available upgrades for a class in a given year.
 * @param {string} cls - 'economy' | 'economyPlus' | 'business' | 'first'
 * @param {number} year - Current game year
 * @param {string} acType - Aircraft type ('Widebody', 'Narrowbody', etc.)
 * @returns {Array<{key, ...def}>} Available upgrade definitions with class-specific values
 */
function getAvailableUpgrades(cls, year, acType, scopeFilter) {
  const result = [];
  for (const [key, def] of Object.entries(CABIN_UPGRADES)) {
    if (scopeFilter && def.scope !== scopeFilter) continue;
    if (!def.classes.includes(cls)) continue;
    const startYear = (cls === 'economy' || cls === 'economyPlus') && def.eraStartEconomy
      ? def.eraStartEconomy : def.eraStart;
    if (year < startYear) continue;
    if (def.widebodyOnly && acType !== 'Widebody') continue;
    result.push({ key, ...getUpgradeForClass(def, cls) });
  }
  return result;
}

/**
 * Calculate total yield multiplier and LF boost from installed upgrades.
 * @param {Object} cabinUpgrades - { economy: ['key',...], business: [...], ... }
 * @param {Object} seatCounts - { economy, economyPlus, business, first }
 * @param {number} worldYear - Current game year
 * @returns {{ yieldMult: number, lfBoost: number }}
 */
function computeUpgradeBonuses(cabinUpgrades, seatCounts, worldYear) {
  if (!cabinUpgrades) return { yieldMult: 1, lfBoost: 0 };
  const totalSeats = (seatCounts.economy || 0) + (seatCounts.economyPlus || 0)
    + (seatCounts.business || 0) + (seatCounts.first || 0);
  if (totalSeats === 0) return { yieldMult: 1, lfBoost: 0 };

  let yieldSum = 0;
  let lfSum = 0;
  for (const [cls, keys] of Object.entries(cabinUpgrades)) {
    if (!Array.isArray(keys)) continue;
    // Aircraft-wide upgrades apply at full strength (not weighted by class)
    const isAircraftWide = cls === '_aircraft';
    const classFrac = isAircraftWide ? 1.0 : ((seatCounts[cls] || 0) / totalSeats);
    for (const key of keys) {
      const baseDef = CABIN_UPGRADES[key];
      if (!baseDef) continue;
      // Resolve class-specific bonuses for per-seat upgrades
      const def = isAircraftWide ? baseDef : getUpgradeForClass(baseDef, cls);
      const obsolete = def.eraObsolete && worldYear > def.eraObsolete;
      const effectiveness = obsolete ? 0.3 : 1.0;
      yieldSum += (def.yieldPct / 100) * classFrac * effectiveness;
      lfSum += (def.loadFactorPct / 100) * classFrac * effectiveness;
    }
  }
  return { yieldMult: 1 + yieldSum, lfBoost: lfSum };
}

/**
 * Calculate install cost for upgrades (only newly added ones).
 * @param {Object} newUpgrades - { economy: ['key',...], ... }
 * @param {Object} oldUpgrades - Previous cabin upgrades (or null)
 * @param {Object} seatCounts - { economy, economyPlus, business, first }
 * @param {number} eraMultiplier - From eraEconomicService
 * @returns {number} Total install cost
 */
function computeUpgradeInstallCost(newUpgrades, oldUpgrades, seatCounts, eraMultiplier) {
  if (!newUpgrades) return 0;
  let total = 0;
  for (const [cls, keys] of Object.entries(newUpgrades)) {
    if (!Array.isArray(keys)) continue;
    const oldKeys = new Set(oldUpgrades?.[cls] || []);
    const seats = seatCounts[cls] || 0;
    for (const key of keys) {
      if (oldKeys.has(key)) continue; // already installed
      const def = CABIN_UPGRADES[key];
      if (!def) continue;
      if (def.lumpCost2024) {
        total += def.lumpCost2024 * eraMultiplier;
      } else {
        total += (def.costPerSeat2024 || 0) * seats * eraMultiplier;
      }
    }
  }
  return Math.round(total);
}

// Dual-env export
if (typeof window !== 'undefined') {
  window.CABIN_UPGRADES = CABIN_UPGRADES;
  window.UPGRADE_CATEGORIES = UPGRADE_CATEGORIES;
  window.getAvailableUpgrades = getAvailableUpgrades;
  window.getUpgradeForClass = getUpgradeForClass;
  window.computeUpgradeBonuses = computeUpgradeBonuses;
  window.computeUpgradeInstallCost = computeUpgradeInstallCost;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    CABIN_UPGRADES,
    UPGRADE_CATEGORIES,
    getAvailableUpgrades,
    computeUpgradeBonuses,
    computeUpgradeInstallCost
  };
}
