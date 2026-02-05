// Set random valid maintenance check dates for all aircraft
// Most will be valid, a couple will be "due soon" for testing
require('dotenv').config();
const sequelize = require('../src/config/database');

async function setRandomCheckDates() {
  try {
    // Game time is around March 2014
    const gameDate = new Date('2014-03-06T12:00:00Z');

    // Get all aircraft
    const [aircraft] = await sequelize.query(`
      SELECT id, registration, total_flight_hours,
             a_check_interval_hours, c_check_interval_days, d_check_interval_days
      FROM user_aircraft
      ORDER BY registration
    `);

    console.log(`Found ${aircraft.length} aircraft to update\n`);

    for (let i = 0; i < aircraft.length; i++) {
      const ac = aircraft[i];
      const flightHours = parseFloat(ac.total_flight_hours) || 0;
      const aCheckInterval = ac.a_check_interval_hours || 900;
      const cCheckInterval = ac.c_check_interval_days || 730;
      const dCheckInterval = ac.d_check_interval_days || 2190;

      // Determine if this aircraft should have "due soon" checks
      // Make aircraft at index 1 and 3 have some due soon checks
      const isDueSoonDaily = (i === 1);
      const isDueSoonWeekly = (i === 3);
      const isDueSoonA = (i === 2);

      // Daily check: valid for 2 days
      // Valid: 0-1 days ago | Due soon: would be ~1.5 days ago (close to expiring)
      const dailyDaysAgo = isDueSoonDaily ? 1.8 : Math.random() * 1;
      const dailyDate = new Date(gameDate);
      dailyDate.setDate(dailyDate.getDate() - dailyDaysAgo);
      const dailyDateStr = dailyDate.toISOString().split('T')[0];

      // Weekly check: valid for 8 days
      // Valid: 2-6 days ago | Due soon: ~7 days ago
      const weeklyDaysAgo = isDueSoonWeekly ? 7.2 : 2 + Math.random() * 4;
      const weeklyDate = new Date(gameDate);
      weeklyDate.setDate(weeklyDate.getDate() - weeklyDaysAgo);
      const weeklyDateStr = weeklyDate.toISOString().split('T')[0];

      // A check: based on flight hours (interval typically 800-1000 hours)
      // Valid: 100-700 hours since last check | Due soon: ~750-850 hours since last check
      const hoursSinceACheck = isDueSoonA
        ? aCheckInterval - 100 - Math.random() * 50  // Due soon: 50-100 hours remaining
        : 100 + Math.random() * 500;  // Valid: plenty of hours remaining
      const lastACheckHours = Math.max(0, flightHours - hoursSinceACheck);
      // A check date doesn't matter much for expiry (it's hours-based) but set it reasonably
      const aCheckDaysAgo = Math.floor(hoursSinceACheck / 8); // Assume ~8 flight hours per day
      const aCheckDate = new Date(gameDate);
      aCheckDate.setDate(aCheckDate.getDate() - aCheckDaysAgo);
      const aCheckDateStr = aCheckDate.toISOString().split('T')[0];

      // C check: valid for ~2 years (730 days)
      // Valid: 100-500 days ago
      const cCheckDaysAgo = 100 + Math.random() * 400;
      const cCheckDate = new Date(gameDate);
      cCheckDate.setDate(cCheckDate.getDate() - cCheckDaysAgo);
      const cCheckDateStr = cCheckDate.toISOString().split('T')[0];

      // D check: valid for 5-7 years (1825-2555 days)
      // Valid: 200-1500 days ago
      const dCheckDaysAgo = 200 + Math.random() * 1300;
      const dCheckDate = new Date(gameDate);
      dCheckDate.setDate(dCheckDate.getDate() - dCheckDaysAgo);
      const dCheckDateStr = dCheckDate.toISOString().split('T')[0];

      // Update the aircraft
      await sequelize.query(`
        UPDATE user_aircraft
        SET
          last_daily_check_date = :dailyDate,
          last_weekly_check_date = :weeklyDate,
          last_a_check_date = :aCheckDate,
          last_a_check_hours = :lastACheckHours,
          last_c_check_date = :cCheckDate,
          last_d_check_date = :dCheckDate
        WHERE id = :id
      `, {
        replacements: {
          id: ac.id,
          dailyDate: dailyDateStr,
          weeklyDate: weeklyDateStr,
          aCheckDate: aCheckDateStr,
          lastACheckHours: lastACheckHours.toFixed(2),
          cCheckDate: cCheckDateStr,
          dCheckDate: dCheckDateStr
        }
      });

      // Log status
      const dailyStatus = isDueSoonDaily ? 'DUE SOON' : 'valid';
      const weeklyStatus = isDueSoonWeekly ? 'DUE SOON' : 'valid';
      const aStatus = isDueSoonA ? 'DUE SOON' : 'valid';

      console.log(`${ac.registration}:`);
      console.log(`  Daily:  ${dailyDateStr} (${dailyStatus})`);
      console.log(`  Weekly: ${weeklyDateStr} (${weeklyStatus})`);
      console.log(`  A:      ${aCheckDateStr} @ ${lastACheckHours.toFixed(0)} hrs (${aStatus}) - interval: ${aCheckInterval} hrs`);
      console.log(`  C:      ${cCheckDateStr} (valid)`);
      console.log(`  D:      ${dCheckDateStr} (valid)`);
      console.log('');
    }

    console.log('Done! All aircraft check dates have been set.');
    console.log('\nSummary:');
    console.log('- Aircraft #2: Daily check DUE SOON');
    console.log('- Aircraft #3: A check DUE SOON');
    console.log('- Aircraft #4: Weekly check DUE SOON');
    console.log('- All others: All checks valid');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

setRandomCheckDates();
