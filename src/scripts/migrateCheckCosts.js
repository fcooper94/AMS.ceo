/**
 * Migration: Populate maintenance check costs for all aircraft
 * Calculates costs based on purchase price and aircraft type.
 * Safe to run multiple times (updates all records).
 *
 * Typical real-world ratios (% of new purchase price):
 *   Daily:  ~0.01-0.02%
 *   Weekly: ~0.04-0.08%
 *   A:      ~0.05-0.15%
 *   C:      ~0.4-1.0%
 *   D:      ~2-5%
 */
require('dotenv').config();
const sequelize = require('../config/database');
const { Aircraft } = require('../models');

// Multipliers by aircraft type (applied to purchase price)
const CHECK_COST_RATIOS = {
  Regional: {
    daily:  0.00015,
    weekly: 0.0006,
    a:      0.001,
    c:      0.006,
    d:      0.035
  },
  Narrowbody: {
    daily:  0.00012,
    weekly: 0.0005,
    a:      0.0008,
    c:      0.005,
    d:      0.03
  },
  Widebody: {
    daily:  0.0001,
    weekly: 0.00045,
    a:      0.0007,
    c:      0.004,
    d:      0.025
  },
  Cargo: {
    daily:  0.00012,
    weekly: 0.0005,
    a:      0.0008,
    c:      0.005,
    d:      0.03
  }
};

async function migrateCheckCosts() {
  try {
    console.log('=== Migrating Aircraft Check Costs ===\n');

    // Add columns via raw SQL (sync({ alter }) can fail due to FK constraints)
    const columns = [
      ['daily_check_cost', 'DECIMAL(12,2)'],
      ['weekly_check_cost', 'DECIMAL(12,2)'],
      ['a_check_cost', 'DECIMAL(12,2)'],
      ['c_check_cost', 'DECIMAL(12,2)'],
      ['d_check_cost', 'DECIMAL(12,2)']
    ];
    for (const [col, type] of columns) {
      try {
        await sequelize.query(`ALTER TABLE aircraft ADD COLUMN ${col} ${type}`);
        console.log(`  Added column ${col}`);
      } catch (e) {
        if (e.original && e.original.code === '42701') {
          console.log(`  Column ${col} already exists`);
        } else {
          throw e;
        }
      }
    }
    console.log('Database schema updated.\n');

    const aircraft = await Aircraft.findAll();
    console.log(`Found ${aircraft.length} aircraft to update.\n`);

    let updated = 0;
    for (const ac of aircraft) {
      const price = parseFloat(ac.purchasePrice) || 0;
      if (price === 0) {
        console.log(`  SKIP ${ac.manufacturer} ${ac.model} - no purchase price`);
        continue;
      }

      const ratios = CHECK_COST_RATIOS[ac.type] || CHECK_COST_RATIOS.Narrowbody;

      const dailyCheckCost  = Math.round(price * ratios.daily);
      const weeklyCheckCost = Math.round(price * ratios.weekly);
      const aCheckCost      = Math.round(price * ratios.a);
      const cCheckCost      = Math.round(price * ratios.c);
      const dCheckCost      = Math.round(price * ratios.d);

      await ac.update({
        dailyCheckCost,
        weeklyCheckCost,
        aCheckCost,
        cCheckCost,
        dCheckCost
      });

      console.log(`  ✓ ${ac.manufacturer} ${ac.model}${ac.variant ? ' ' + ac.variant : ''} (${ac.type}) - D: $${(dailyCheckCost).toLocaleString()}, W: $${(weeklyCheckCost).toLocaleString()}, A: $${(aCheckCost).toLocaleString()}, C: $${(cCheckCost).toLocaleString()}, D-check: $${(dCheckCost).toLocaleString()}`);
      updated++;
    }

    console.log(`\n✓ Updated ${updated} aircraft with check costs.`);
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

migrateCheckCosts();
