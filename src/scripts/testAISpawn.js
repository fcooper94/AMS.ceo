/**
 * Diagnostic script to test AI airline spawning at scale
 * Run: node src/scripts/testAISpawn.js
 * Add --clean flag to remove existing AI airlines first
 */
require('dotenv').config();
const sequelize = require('../config/database');

async function testSpawn() {
  try {
    const { World, WorldMembership, Airport, UserAircraft, Route, ScheduledFlight } = require('../models');
    const { Op } = require('sequelize');

    const shouldClean = process.argv.includes('--clean');

    console.log('=== AI Spawning Diagnostic ===\n');

    // Find the SP world
    const world = await World.findOne({ where: { worldType: 'singleplayer' } });
    if (!world) {
      console.log('No single-player world found. Create one first.');
      process.exit(0);
    }
    console.log(`World: "${world.name}" (${world.id})`);
    console.log(`  Era: ${world.era}, Difficulty: ${world.difficulty}`);

    // Check existing memberships
    const existingAI = await WorldMembership.findAll({
      where: { worldId: world.id, isAI: true }
    });
    console.log(`\nExisting AI airlines: ${existingAI.length}`);

    // Clean existing AI if requested
    if (shouldClean && existingAI.length > 0) {
      console.log('\n--- Cleaning existing AI airlines ---');
      const aiIds = existingAI.map(m => m.id);
      // Delete scheduled flights for AI routes first (FK constraint)
      const aiRoutes = await Route.findAll({
        where: { worldMembershipId: { [Op.in]: aiIds } },
        attributes: ['id']
      });
      if (aiRoutes.length > 0) {
        const routeIds = aiRoutes.map(r => r.id);
        const deletedFlights = await ScheduledFlight.destroy({
          where: { routeId: { [Op.in]: routeIds } }
        });
        console.log(`  Deleted ${deletedFlights} AI scheduled flights`);
      }
      const deletedRoutes = await Route.destroy({
        where: { worldMembershipId: { [Op.in]: aiIds } }
      });
      console.log(`  Deleted ${deletedRoutes} AI routes`);
      const deletedAircraft = await UserAircraft.destroy({
        where: { worldMembershipId: { [Op.in]: aiIds } }
      });
      console.log(`  Deleted ${deletedAircraft} AI aircraft`);
      const deletedMembers = await WorldMembership.destroy({
        where: { id: { [Op.in]: aiIds } }
      });
      console.log(`  Deleted ${deletedMembers} AI memberships`);
    }

    // Get human player's base airport
    const humanMember = await WorldMembership.findOne({
      where: { worldId: world.id, isAI: false }
    });
    const baseAirport = await Airport.findByPk(humanMember.baseAirportId);
    console.log(`\nHuman base: ${baseAirport.icaoCode} (${baseAirport.name})`);

    // Expected count
    const { getAICount } = require('../data/aiDifficultyConfig');
    console.log(`Expected AI count for "${world.difficulty}": ~${getAICount(world.difficulty)}`);

    // Spawn
    console.log('\n=== Starting AI Spawn ===');
    const startTime = Date.now();

    const aiSpawningService = require('../services/aiSpawningService');
    await aiSpawningService.spawnAIAirlines(world, world.difficulty, baseAirport);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\nSpawn completed in ${elapsed}s`);

    // Check results
    const afterAI = await WorldMembership.count({
      where: { worldId: world.id, isAI: true }
    });
    const afterFleet = await UserAircraft.count({
      include: [{
        model: WorldMembership,
        as: 'membership',
        where: { worldId: world.id, isAI: true },
        attributes: []
      }]
    });
    const afterRoutes = await Route.count({
      include: [{
        model: WorldMembership,
        as: 'membership',
        where: { worldId: world.id, isAI: true },
        attributes: []
      }]
    });
    const afterFlights = await ScheduledFlight.count({
      include: [{
        model: Route,
        as: 'route',
        include: [{
          model: WorldMembership,
          as: 'membership',
          where: { worldId: world.id, isAI: true },
          attributes: []
        }]
      }]
    });
    console.log(`\n=== Results ===`);
    console.log(`  AI airlines: ${afterAI}`);
    console.log(`  AI aircraft: ${afterFleet}`);
    console.log(`  AI routes: ${afterRoutes}`);
    console.log(`  AI flights: ${afterFlights}`);
    console.log(`  Avg fleet size: ${(afterFleet / afterAI).toFixed(1)}`);
    console.log(`  Avg routes/airline: ${(afterRoutes / afterAI).toFixed(1)}`);
    console.log(`  Avg flights/route: ${afterRoutes > 0 ? (afterFlights / afterRoutes).toFixed(1) : 0}`);

  } catch (error) {
    console.error('\n=== ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    if (error.original) {
      console.error('Original DB error:', error.original.message);
      console.error('Detail:', error.original.detail);
    }
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

testSpawn();
