/**
 * Cabin outfitting costs — single source of truth (dual-environment).
 *
 * Loaded as a browser global on marketplace/fleet pages AND require()d by the
 * server (src/routes/fleet.js), same pattern as name-filter.js. Keep it
 * dependency-free.
 *
 * Interiors are a real, significant line item: an economy seat ~$10k, premium
 * economy ~$25k, lie-flat business ~$150k, a First suite ~$400k (2024 USD).
 * Costs are era-scaled by the caller via eraEconomicService.getEraMultiplier
 * (server) / the world-info eraMultiplier (client) — do not bake era in here.
 *
 * Charged: on purchase/order/lease (full chosen config) and on cabin refit
 * (DELTA-UP per class: you pay for seats added in each class, no credit for
 * seats removed — so buy-cheap-then-refit costs the same as configuring at
 * purchase, and small downsizing tweaks are free).
 */

// Per-seat outfitting cost by cabin class, 2024 USD.
const CABIN_SEAT_COSTS_2024 = {
  economy: 10000,
  economyPlus: 25000,
  business: 150000,
  first: 400000,
};

/**
 * Full outfitting cost for a cabin config.
 * @param {object} seats - { economySeats, economyPlusSeats, businessSeats, firstSeats }
 * @param {number} eraMultiplier - era price scaling (1950 ≈ 0.10, 2024 = 1.0)
 * @returns {number} rounded cost
 */
function cabinOutfittingCost(seats, eraMultiplier) {
  const mult = eraMultiplier || 1.0;
  const s = seats || {};
  const raw =
    (parseInt(s.economySeats) || 0) * CABIN_SEAT_COSTS_2024.economy +
    (parseInt(s.economyPlusSeats) || 0) * CABIN_SEAT_COSTS_2024.economyPlus +
    (parseInt(s.businessSeats) || 0) * CABIN_SEAT_COSTS_2024.business +
    (parseInt(s.firstSeats) || 0) * CABIN_SEAT_COSTS_2024.first;
  return Math.round(raw * mult);
}

/**
 * Refit cost: pay only for seats ADDED in each class (delta-up, no credit for
 * removals). newSeats/oldSeats: { economySeats, economyPlusSeats, businessSeats, firstSeats }.
 */
function cabinRefitCost(newSeats, oldSeats, eraMultiplier) {
  const n = newSeats || {}, o = oldSeats || {};
  const up = (field) => ({
    [field]: Math.max(0, (parseInt(n[field]) || 0) - (parseInt(o[field]) || 0)),
  });
  return cabinOutfittingCost(
    Object.assign({}, up('economySeats'), up('economyPlusSeats'), up('businessSeats'), up('firstSeats')),
    eraMultiplier
  );
}

// Dual-environment export (browser global + Node module)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CABIN_SEAT_COSTS_2024, cabinOutfittingCost, cabinRefitCost };
}
