// Set varied maintenance check dates for testing all scenarios
// Creates a mix of: valid, expired, due soon, and never-performed checks
require('dotenv').config();
const sequelize = require('../src/config/database');

async function setVariedCheckDates() {
  try {
    // Get current game time from world
    const [worlds] = await sequelize.query(`SELECT current_time FROM worlds LIMIT 1`);
    let gameDate;
    if (worlds.length > 0 && worlds[0].current_time) {
      const ct = worlds[0].current_time;
      // Handle different date formats
      if (ct instanceof Date) {
        gameDate = ct;
      } else if (typeof ct === 'string') {
        gameDate = new Date(ct);
      } else {
        gameDate = new Date('2014-03-15T12:00:00Z');
      }
    } else {
      gameDate = new Date('2014-03-15T12:00:00Z');
    }

    if (isNaN(gameDate.getTime())) {
      gameDate = new Date('2014-03-15T12:00:00Z');
    }
    console.log(`Game date: ${gameDate.toISOString()}\n`);

    // Get all aircraft
    const [aircraft] = await sequelize.query(`
      SELECT id, registration, total_flight_hours,
             a_check_interval_hours, c_check_interval_days, d_check_interval_days
      FROM user_aircraft
      ORDER BY registration
    `);

    console.log(`Found ${aircraft.length} aircraft to update\n`);

    // Define different scenarios for variety
    const scenarios = [
      {
        name: 'All Valid',
        daily: { daysAgo: 0.5 },           // Valid (within 2 days)
        weekly: { daysAgo: 3 },            // Valid (within 8 days)
        A: { hoursAgo: 200 },              // Valid (within 800-1000 hrs)
        C: { daysAgo: 100 },               // Valid (within 730 days)
        D: { daysAgo: 500 }                // Valid (within 1825-2555 days)
      },
      {
        name: 'Daily Expired Only',
        daily: { daysAgo: 3 },             // EXPIRED (>2 days)
        weekly: { daysAgo: 4 },            // Valid
        A: { hoursAgo: 300 },              // Valid
        C: { daysAgo: 200 },               // Valid
        D: { daysAgo: 800 }                // Valid
      },
      {
        name: 'Weekly Expired (covers daily)',
        daily: { daysAgo: 5 },             // Expired but covered by weekly
        weekly: { daysAgo: 10 },           // EXPIRED (>8 days)
        A: { hoursAgo: 150 },              // Valid
        C: { daysAgo: 300 },               // Valid
        D: { daysAgo: 1000 }               // Valid
      },
      {
        name: 'A Check Expired',
        daily: { daysAgo: 4 },             // Expired
        weekly: { daysAgo: 12 },           // Expired
        A: { hoursAgo: 900 },              // EXPIRED (past interval)
        C: { daysAgo: 400 },               // Valid
        D: { daysAgo: 1200 }               // Valid
      },
      {
        name: 'C Check Due Soon',
        daily: { daysAgo: 1 },             // Valid
        weekly: { daysAgo: 5 },            // Valid
        A: { hoursAgo: 100 },              // Valid
        C: { daysAgo: 700 },               // DUE SOON (close to 730)
        D: { daysAgo: 1500 }               // Valid
      },
      {
        name: 'D Check Never Done',
        daily: { daysAgo: 0.5 },           // Valid
        weekly: { daysAgo: 2 },            // Valid
        A: { hoursAgo: 50 },               // Valid
        C: { daysAgo: 150 },               // Valid
        D: null                            // NEVER DONE
      },
      {
        name: 'All Never Done (new aircraft)',
        daily: null,
        weekly: null,
        A: null,
        C: null,
        D: null
      },
      {
        name: 'Multiple Due Soon',
        daily: { daysAgo: 1.8 },           // Due soon (close to 2 days)
        weekly: { daysAgo: 7 },            // Due soon (close to 8 days)
        A: { hoursAgo: 750 },              // Due soon (close to 800)
        C: { daysAgo: 500 },               // Valid
        D: { daysAgo: 1800 }               // Due soon (close to 1825)
      }
    ];

    for (let i = 0; i < aircraft.length; i++) {
      const ac = aircraft[i];
      const scenario = scenarios[i % scenarios.length];
      const flightHours = parseFloat(ac.total_flight_hours) || Math.floor(Math.random() * 5000) + 500;
      const aCheckInterval = ac.a_check_interval_hours || 900;

      // Calculate dates based on scenario
      let dailyDate = null, weeklyDate = null, aCheckDate = null, cCheckDate = null, dCheckDate = null;
      let lastACheckHours = 0;

      if (scenario.daily) {
        const d = new Date(gameDate);
        d.setDate(d.getDate() - scenario.daily.daysAgo);
        dailyDate = d.toISOString().split('T')[0];
      }

      if (scenario.weekly) {
        const d = new Date(gameDate);
        d.setDate(d.getDate() - scenario.weekly.daysAgo);
        weeklyDate = d.toISOString().split('T')[0];
      }

      if (scenario.A) {
        lastACheckHours = Math.max(0, flightHours - scenario.A.hoursAgo);
        const daysAgo = Math.floor(scenario.A.hoursAgo / 8); // Estimate ~8 flight hours per day
        const d = new Date(gameDate);
        d.setDate(d.getDate() - daysAgo);
        aCheckDate = d.toISOString().split('T')[0];
      }

      if (scenario.C) {
        const d = new Date(gameDate);
        d.setDate(d.getDate() - scenario.C.daysAgo);
        cCheckDate = d.toISOString().split('T')[0];
      }

      if (scenario.D) {
        const d = new Date(gameDate);
        d.setDate(d.getDate() - scenario.D.daysAgo);
        dCheckDate = d.toISOString().split('T')[0];
      }

      // Update the aircraft
      await sequelize.query(`
        UPDATE user_aircraft
        SET
          last_daily_check_date = :dailyDate,
          last_weekly_check_date = :weeklyDate,
          last_a_check_date = :aCheckDate,
          last_a_check_hours = :lastACheckHours,
          last_c_check_date = :cCheckDate,
          last_d_check_date = :dCheckDate,
          total_flight_hours = :flightHours,
          auto_schedule_daily = false,
          auto_schedule_weekly = false,
          auto_schedule_a = false,
          auto_schedule_c = false,
          auto_schedule_d = false
      WHERE id = :id
      `, {
        replacements: {
          id: ac.id,
          dailyDate,
          weeklyDate,
          aCheckDate,
          lastACheckHours: lastACheckHours.toFixed(2),
          cCheckDate,
          dCheckDate,
          flightHours: flightHours.toFixed(2)
        }
      });

      // Log status
      console.log(`${ac.registration}: ${scenario.name}`);
      console.log(`  Flight Hours: ${flightHours.toFixed(0)}`);
      console.log(`  Daily:  ${dailyDate || 'NEVER'}`);
      console.log(`  Weekly: ${weeklyDate || 'NEVER'}`);
      console.log(`  A:      ${aCheckDate || 'NEVER'} @ ${lastACheckHours.toFixed(0)} hrs`);
      console.log(`  C:      ${cCheckDate || 'NEVER'}`);
      console.log(`  D:      ${dCheckDate || 'NEVER'}`);
      console.log('');
    }

    console.log('\nDone! Aircraft check dates have been set with variety.');
    console.log('\nScenarios applied:');
    scenarios.forEach((s, i) => console.log(`  ${i + 1}. ${s.name}`));

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setVariedCheckDates();
