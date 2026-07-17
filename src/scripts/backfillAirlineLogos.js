/**
 * Backfill airline branding for any WorldMembership that has no logo yet
 * (AI airlines created before branding existed, and pre-branding human airlines).
 * Deterministic by airline name, so re-running is idempotent.
 *
 *   node src/scripts/backfillAirlineLogos.js
 */
require('dotenv').config();
const { Op } = require('sequelize');
const { WorldMembership } = require('../models');
const { pickAirlineBranding } = require('../../public/js/airline-logo.js');

(async () => {
  const missing = await WorldMembership.findAll({
    where: { [Op.or]: [{ logoSvg: null }, { logoSvg: '' }] },
    attributes: ['id', 'airlineName']
  });
  console.log(`Airlines without a logo: ${missing.length}`);

  let done = 0;
  for (const m of missing) {
    const branding = pickAirlineBranding(m.airlineName || 'Airline');
    await WorldMembership.update(branding, { where: { id: m.id } });
    if (++done % 200 === 0) console.log(`  ${done}/${missing.length}`);
  }
  console.log(`Done. Backfilled ${done} airline logos.`);
  process.exit(0);
})().catch(e => { console.error('Backfill failed:', e); process.exit(1); });
