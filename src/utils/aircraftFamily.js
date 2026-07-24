/**
 * Aircraft family normalisation — single source of truth for what counts as
 * "one fleet family" (shared type rating / crew & maintenance commonality).
 *
 * Used by BOTH the weekly fleet-commonality overhead (worldTimeService
 * recordWeeklyOverheads) and AI fleet-building preferences
 * (aiDecisionService), so the AI optimises exactly what players are charged.
 *
 * Rules:
 *  • Airbus A318/A319/A320/A321 (incl. neo/LR/XLR variants, which are DB
 *    variants of these models) are ONE family — the A320 family, one type
 *    rating, like real airlines operating dozens across the sub-types.
 *  • Some DB models carry a baked-in dash variant ("727-100", "747-200",
 *    "707-320C") — these normalise to their numeric root (727, 747, 707) so
 *    they group with their siblings and match the large-widebody surcharge
 *    list ('747', 'A380', '777').
 *  • Everything else: manufacturer + model as-is (models are already
 *    family-shaped: 737, A330, DC-6…; variants live in a separate column).
 */

function normalizeFamilyModel(model) {
  let m = String(model || '').trim();
  if (/^A3(18|19|20|21)$/i.test(m)) return 'A320';
  const dash = m.match(/^(\d{3})-/);
  if (dash) return dash[1];
  return m;
}

function aircraftFamilyKey(manufacturer, model) {
  return `${String(manufacturer || '').trim()} ${normalizeFamilyModel(model)}`;
}

module.exports = { aircraftFamilyKey, normalizeFamilyModel };
