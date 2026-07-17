/**
 * One-time re-pricing of existing AI airline "for sale" listings.
 *
 * Existing UserAircraft with status 'listed_sale' owned by AI airlines were
 * priced with the old flat "50% of new price x condition" formula, which
 * ignored age depreciation and the era multiplier (producing inflated prices).
 * This recomputes each using estimateTypeAverageSalePrice() + condition/wear
 * adjustment — the same logic the AI now uses for new listings.
 *
 * Usage:
 *   node src/scripts/repriceAiListings.js            (dry run — shows changes)
 *   node src/scripts/repriceAiListings.js --commit    (applies the updates)
 */
require('dotenv').config();
const { UserAircraft, WorldMembership, World, Aircraft } = require('../models');
const { estimateTypeAverageSalePrice } = require('../services/aiDecisionService');

const COMMIT = process.argv.includes('--commit');
const fmt = n => '$' + Math.round(n).toLocaleString();

function computeNewPrice(ua, acType, worldYear) {
  const condition = parseFloat(ua.conditionPercentage) || 50;
  const typeAvg = estimateTypeAverageSalePrice(acType, worldYear);
  if (typeAvg) {
    const wearRatio = Math.max(0.4, Math.min(1.5, condition / typeAvg.refCondition));
    return Math.round(typeAvg.avg * wearRatio);
  }
  return Math.round((parseFloat(acType.purchasePrice) || 10000000) * 0.5 * (condition / 100));
}

(async () => {
  const listings = await UserAircraft.findAll({
    where: { status: 'listed_sale' },
    include: [
      { model: Aircraft, as: 'aircraft' },
      {
        model: WorldMembership, as: 'membership',
        where: { isAI: true },
        include: [{ model: World, as: 'world' }]
      }
    ]
  });

  console.log(`\nFound ${listings.length} AI 'listed_sale' aircraft\n`);
  if (listings.length === 0) { process.exit(0); }

  console.log(
    'Airline'.padEnd(22),
    'Type'.padEnd(10),
    'Cond'.padStart(5),
    'Old price'.padStart(14),
    'New price'.padStart(14),
    '  Change'
  );
  console.log('-'.repeat(90));

  const updates = [];
  let skipped = 0;
  for (const ua of listings) {
    const acType = ua.aircraft;
    const membership = ua.membership;
    if (!acType || !membership) { skipped++; continue; }
    const world = membership.world;
    const worldYear = world?.currentTime ? new Date(world.currentTime).getFullYear() : 2010;

    const oldPrice = parseFloat(ua.listingPrice) || 0;
    const newPrice = computeNewPrice(ua, acType, worldYear);
    const cond = parseFloat(ua.conditionPercentage) || 50;
    const pct = oldPrice > 0 ? Math.round((newPrice - oldPrice) / oldPrice * 100) : 0;

    console.log(
      (membership.airlineName || '—').slice(0, 21).padEnd(22),
      (acType.icaoCode || acType.model || '—').slice(0, 9).padEnd(10),
      `${cond}%`.padStart(5),
      fmt(oldPrice).padStart(14),
      fmt(newPrice).padStart(14),
      `  ${pct > 0 ? '+' : ''}${pct}%`
    );

    if (newPrice !== oldPrice) updates.push({ id: ua.id, newPrice });
  }

  console.log('-'.repeat(90));
  console.log(`${updates.length} would change, ${skipped} skipped (missing type/membership)\n`);

  if (!COMMIT) {
    console.log('DRY RUN — no changes written. Re-run with --commit to apply.\n');
    process.exit(0);
  }

  console.log('Applying updates...');
  let applied = 0;
  for (const u of updates) {
    await UserAircraft.update({ listingPrice: u.newPrice }, { where: { id: u.id } });
    applied++;
  }
  console.log(`Done. Updated ${applied} listings.\n`);
  process.exit(0);
})().catch(e => { console.error('FATAL:', e); process.exit(1); });
