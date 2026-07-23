/**
 * One-off fix: era-scale all active lease rates and reimburse overpayments.
 *
 * Lease rates were calculated from 2024-dollar purchase prices without
 * applying the era multiplier. This script:
 *   1. Recalculates each lease at the correct era-scaled rate
 *   2. Credits the airline's balance with the total overpayment
 *   3. Updates the leaseWeeklyPayment going forward
 *
 * Usage: node src/scripts/fixLeaseRates.js [--dry-run]
 *
 * --dry-run: show what would change without writing to DB
 */
require('dotenv').config();
const { WorldMembership, UserAircraft, Aircraft, World } = require('../models');
const { Op } = require('sequelize');
const eraEconomicService = require('../services/eraEconomicService');

const DRY_RUN = process.argv.includes('--dry-run');

(async () => {
  try {
    if (DRY_RUN) console.log('=== DRY RUN — no changes will be written ===\n');

    // Get all active worlds with their current time
    const worlds = await World.findAll({ where: { status: 'active' } });
    console.log(`Found ${worlds.length} active world(s)\n`);

    let totalAdjusted = 0;
    let totalReimbursed = 0;

    for (const world of worlds) {
      const worldYear = world.currentTime ? new Date(world.currentTime).getFullYear() : 2010;
      const eraMult = eraEconomicService.getEraMultiplier(worldYear);
      const worldTime = new Date(world.currentTime);

      console.log(`── ${world.name} (${worldYear}, eraMult=${eraMult}) ──`);

      if (eraMult >= 1.0) {
        console.log('  Era multiplier is 1.0 (contemporary) — no adjustment needed\n');
        continue;
      }

      // Get all memberships in this world
      const memberships = await WorldMembership.findAll({
        where: { worldId: world.id, isActive: true },
        attributes: ['id', 'airlineName', 'balance', 'isAI']
      });

      for (const membership of memberships) {
        // Find all actively leased aircraft
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

          // Calculate what the rate should be with era scaling
          // The old rate was based on unscaled price. The correct rate is oldRate * eraMult.
          const newRate = Math.round(oldRate * eraMult);
          const weeklyOverpayment = oldRate - newRate;

          if (weeklyOverpayment <= 0) continue; // already correct or underpaying

          // Calculate weeks the lease has been active
          const leaseStart = ua.leaseStartDate ? new Date(ua.leaseStartDate) : null;
          let weeksActive = 0;
          if (leaseStart) {
            const msActive = worldTime.getTime() - leaseStart.getTime();
            weeksActive = Math.max(0, Math.floor(msActive / (7 * 24 * 60 * 60 * 1000)));
          }

          const totalOverpayment = Math.round(weeklyOverpayment * weeksActive);
          membershipReimbursement += totalOverpayment;

          console.log(`  ${ua.registration} (${ua.aircraft?.manufacturer} ${ua.aircraft?.model})`);
          console.log(`    Old rate: $${oldRate.toLocaleString()}/wk → New rate: $${newRate.toLocaleString()}/wk (${Math.round((1 - eraMult) * 100)}% reduction)`);
          console.log(`    Active ${weeksActive} weeks → Reimbursement: $${totalOverpayment.toLocaleString()}`);

          if (!DRY_RUN) {
            await ua.update({ leaseWeeklyPayment: newRate });
          }
          totalAdjusted++;
        }

        if (membershipReimbursement > 0) {
          const oldBalance = parseFloat(membership.balance) || 0;
          const newBalance = oldBalance + membershipReimbursement;
          const label = membership.isAI ? 'AI' : 'PLAYER';
          console.log(`  ➜ [${label}] ${membership.airlineName}: +$${membershipReimbursement.toLocaleString()} reimbursed (balance: $${Math.round(oldBalance).toLocaleString()} → $${Math.round(newBalance).toLocaleString()})`);

          if (!DRY_RUN) {
            await membership.update({ balance: newBalance });
          }
          totalReimbursed += membershipReimbursement;
        }
      }
      console.log('');
    }

    console.log('════════════════════════════════');
    console.log(`Leases adjusted: ${totalAdjusted}`);
    console.log(`Total reimbursed: $${totalReimbursed.toLocaleString()}`);
    if (DRY_RUN) console.log('\n(Dry run — no changes written. Remove --dry-run to apply.)');

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
