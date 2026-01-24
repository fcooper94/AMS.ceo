require('dotenv').config();
const sequelize = require('../config/database');
const World = require('../models/World');

async function createWorld() {
  try {
    console.log('Creating new game world...\n');

    // Configuration
    const worldConfig = {
      name: process.argv[2] || 'World Alpha',
      description: 'A persistent airline operations world',
      startDate: new Date('1995-01-01T00:00:00Z'),
      currentTime: new Date('1995-01-01T00:00:00Z'),
      timeAcceleration: parseFloat(process.env.WORLD_TIME_ACCELERATION) || 60.0,
      era: parseInt(process.env.WORLD_ERA) || 1995,
      status: 'active',
      isPaused: false,
      lastTickAt: new Date(),
      maxPlayers: 100,
      // Optional: Set operating hours (24/7 by default)
      // operatingHoursStart: '00:00:00',
      // operatingHoursEnd: '23:59:59'
    };

    // Check if world already exists
    const existing = await World.findOne({ where: { name: worldConfig.name } });

    if (existing) {
      console.log(`⚠ World "${worldConfig.name}" already exists.`);
      console.log('Use a different name or delete the existing world first.\n');
      process.exit(1);
    }

    // Create the world
    const world = await World.create(worldConfig);

    console.log('✓ World created successfully!\n');
    console.log('World Details:');
    console.log('─────────────────────────────────────────');
    console.log(`  ID:                ${world.id}`);
    console.log(`  Name:              ${world.name}`);
    console.log(`  Start Date:        ${world.startDate.toISOString()}`);
    console.log(`  Current Time:      ${world.currentTime.toISOString()}`);
    console.log(`  Time Acceleration: ${world.timeAcceleration}x`);
    console.log(`  Era:               ${world.era}`);
    console.log(`  Status:            ${world.status}`);
    console.log(`  Max Players:       ${world.maxPlayers}`);
    console.log('─────────────────────────────────────────\n');

    console.log('Notes:');
    console.log(`  • 1 real second = ${world.timeAcceleration / 60} game minutes`);
    console.log(`  • 1 real minute = ${world.timeAcceleration} game hours`);
    console.log(`  • 1 real day = ${(world.timeAcceleration * 60 * 24) / 60 / 24} game days`);
    console.log('\nStart the server with "npm run dev" to begin world progression.\n');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('✗ Failed to create world:', error);
    process.exit(1);
  }
}

createWorld();
