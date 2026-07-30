// One-off: stamp lastDailyCheckDate to current game time for all player aircraft
// with expired daily checks, so the fleet starts clean after the maintenance fixes.
require('dotenv').config();
const sequelize = require('../src/config/database');

async function fixExpiredDailies() {
  try {
    await sequelize.authenticate();
    console.log('Connected to database.\n');

    // Get current game time per world
    const [worlds] = await sequelize.query(`
      SELECT id, name, "current_time" AS game_time FROM worlds WHERE status = 'active'
    `);

    for (const world of worlds) {
      const gameTime = new Date(world.game_time);
      if (!gameTime || isNaN(gameTime.getTime()) || gameTime.getFullYear() < 1950) {
        console.log(`Skipping world "${world.name}" — invalid game time`);
        continue;
      }

      // Update expired dailies for player aircraft only
      const [results] = await sequelize.query(`
        UPDATE user_aircraft ua
        SET last_daily_check_date = :gameTime
        FROM world_memberships wm
        WHERE ua.world_membership_id = wm.id
          AND wm.world_id = :worldId
          AND wm.is_active = true
          AND wm.is_ai = false
          AND ua.status NOT IN ('on_order', 'sold', 'listed_sale')
          AND (
            ua.last_daily_check_date IS NULL
            OR ua.last_daily_check_date < (:gameTime::timestamp - INTERVAL '2 days')
          )
        RETURNING ua.registration, ua.last_daily_check_date
      `, { replacements: { worldId: world.id, gameTime: gameTime.toISOString() } });

      if (results.length > 0) {
        console.log(`World "${world.name}" (${gameTime.toISOString().split('T')[0]}): fixed ${results.length} aircraft`);
        results.forEach(r => console.log(`  ${r.registration}`));
      } else {
        console.log(`World "${world.name}": no expired dailies`);
      }
    }

    console.log('\nDone.');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

fixExpiredDailies();
