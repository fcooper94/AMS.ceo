/**
 * One-off fix: reprice all active lease contracts to the historical lease
 * rate curve (eraEconomicService.getWeeklyLeaseRate) and reimburse
 * overpayments.
 *
 * Context: leasing is now hard-gated before 1970 and priced from a single
 * curve (1.8%/mo of value in 1970 → 0.7%/mo from 2010). Existing contracts
 * are honoured — including in pre-1970 worlds, which are repriced at the
 * 1970 anchor rate (the curve's earliest point) rather than cancelled.
 *
 * For each actively leased aircraft:
 *   1. Compute the aircraft's current era-scaled depreciated value
 *      (same age/condition formula as the used marketplace)
 *   2. Target rate = getWeeklyLeaseRate(value, max(worldYear, 1970))
 *   3. If the current payment is higher: lower it and reimburse the
 *      overpayment for the weeks the lease has been active
 *   4. Never raises a rate — cheap legacy contracts are left alone,
 *      which also makes the script idempotent (safe to re-run)
 *
 * Usage: node src/scripts/repriceLeasesToCurve.js [--dry-run]
 */
require('dotenv').config();
const { WorldMembership, UserAircraft, Aircraft, World } = require('../models');
const { Op } = require('sequelize');
const eraEconomicService = require('../services/eraEconomicService');

const DRY_RUN = process.argv.includes('--dry-run');

// Same depreciation-by-age formula as the used marketplace (aircraft.js)
function depreciationFactor(age, conditionPct) {
  let dep;
  if (age <= 5) dep = 0.70 - (age * 0.05);
  else if (age <= 10) dep = 0.45 - ((age - 5) * 0.04);
  else if (age <= 15) dep = 0.25 - ((age - 10) * 0.03);
  else dep = Math.max(0.10 - ((age - 15) * 0.01), 0.05);
  dep *= (conditionPct / 100);
  return Math.max(dep, 0.03);
}

(async () => {
  try {
    if (DRY_RUN) console.log('=== DRY RUN — no changes will be written ===\n');

    const worlds = await World.findAll({ where: { status: 'active' } });
    console.log(`Found ${worlds.length} active world(s)\n`);

    let totalAdjusted = 0;
    let totalReimbursed = 0;

    for (const world of worlds) {
      const worldYear = world.currentTime ? new Date(world.currentTime).getFullYear() : 2010;
      const worldTime = new Date(world.currentTime);
      // Pre-1970 contracts are honoured at the curve's 1970 anchor rate
      const effectiveYear = Math.max(worldYear, 1970);
      const eraMult = eraEconomicService.getEraMultiplier(worldYear);
      const monthlyPct = eraEconomicService.getLeaseMonthlyRatePct(effectiveYear);

      console.log(`── ${world.name} (${worldYear}${effectiveYear !== worldYear ? `, honoured at ${effectiveYear} rates` : ''}, ${monthlyPct.toFixed(2)}%/month) ──`);

      const memberships = await WorldMembership.findAll({
        where: { worldId: world.id, isActive: true },
        attributes: ['id', 'airlineName', 'balance', 'isAI']
      });

      for (const membership of memberships) {
        const leasedAircraft = await UserAircraft.findAll({
          where: {
            worldMembershipId: membership.id,
            acquisitionType: 'lease',
            status: { [Op.notIn]: ['sold'] }
          },
          include: [{ model: Aircraft, as: 'aircraft', attributes: ['purchasePrice', 'manufacturer', 'model'] }]
        });

        if (leasedAircraft.length === 0) continue;

        let membershipReimbursement = 0;

        for (const ua of leasedAircraft) {
          const oldRate = parseFloat(ua.leaseWeeklyPayment) || 0;
          if (oldRate <= 0) continue;

          const basePrice = parseFloat(ua.aircraft?.purchasePrice) || 0;
          if (basePrice <= 0) continue;

          const age = ua.ageYears || 0;
          const conditionPct = ua.conditionPercentage || 70;
          const value = basePrice * eraMult * depreciationFactor(age, conditionPct);
          const newRate = eraEconomicService.getWeeklyLeaseRate(value, effectiveYear);
          if (!newRate) continue;

          const weeklyOverpayment = oldRate - newRate;
          if (weeklyOverpayment <= 0) continue; // already at or below curve — leave it

          const leaseStart = ua.leaseStartDate ? new Date(ua.leaseStartDate) : null;
          let weeksActive = 0;
          if (leaseStart) {
            const msActive = worldTime.getTime() - leaseStart.getTime();
            weeksActive = Math.max(0, Math.floor(msActive / (7 * 24 * 60 * 60 * 1000)));
          }

          const totalOverpayment = Math.round(weeklyOverpayment * weeksActive);
          membershipReimbursement += totalOverpayment;

          console.log(`  ${ua.registration} (${ua.aircraft?.manufacturer} ${ua.aircraft?.model}, ${age}y ${conditionPct}%)`);
          console.log(`    $${oldRate.toLocaleString()}/wk → $${newRate.toLocaleString()}/wk (value $${Math.round(value).toLocaleString()}) · ${weeksActive} wks active → reimburse $${totalOverpayment.toLocaleString()}`);

          if (!DRY_RUN) {
            await ua.update({ leaseWeeklyPayment: newRate });
          }
          totalAdjusted++;
        }

        if (membershipReimbursement > 0) {
          const oldBalance = parseFloat(membership.balance) || 0;
          const newBalance = oldBalance + membershipReimbursement;
          const label = membership.isAI ? 'AI' : 'PLAYER';
          console.log(`  ➜ [${label}] ${membership.airlineName}: +$${membershipReimbursement.toLocaleString()} (balance $${Math.round(oldBalance).toLocaleString()} → $${Math.round(newBalance).toLocaleString()})`);

          if (!DRY_RUN) {
            await membership.update({ balance: newBalance });
          }
          totalReimbursed += membershipReimbursement;
        }
      }
      console.log('');
    }

    console.log('════════════════════════════════');
    console.log(`Leases repriced: ${totalAdjusted}`);
    console.log(`Total reimbursed: $${totalReimbursed.toLocaleString()}`);
    if (DRY_RUN) console.log('\n(Dry run — no changes written. Remove --dry-run to apply.)');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
