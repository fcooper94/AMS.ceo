/**
 * One-off cleanup: remove all AI-owned airships and their sightseeing tours
 * from existing worlds. Player airships are left untouched.
 *
 * Usage: node src/scripts/removeAIAirships.js
 */
require('dotenv').config();
const { WorldMembership, UserAircraft, Aircraft } = require('../models');
const { Op } = require('sequelize');

(async () => {
  try {
    // Find all airship aircraft type IDs
    const airshipTypes = await Aircraft.findAll({ where: { type: 'Airship' }, attributes: ['id'] });
    const airshipTypeIds = airshipTypes.map(a => a.id);
    if (airshipTypeIds.length === 0) { console.log('No airship types found in aircraft table.'); process.exit(0); }
    console.log(`Found ${airshipTypeIds.length} airship type(s) in aircraft catalogue.`);

    // Find AI memberships
    const aiMemberships = await WorldMembership.findAll({ where: { isAI: true }, attributes: ['id', 'airlineName'] });
    const aiIds = aiMemberships.map(m => m.id);
    if (aiIds.length === 0) { console.log('No AI airlines found.'); process.exit(0); }

    // Find AI-owned airships
    const aiAirships = await UserAircraft.findAll({
      where: { worldMembershipId: { [Op.in]: aiIds }, aircraftId: { [Op.in]: airshipTypeIds } },
      include: [{ model: Aircraft, as: 'aircraft', attributes: ['manufacturer', 'model'] }]
    });

    if (aiAirships.length === 0) {
      console.log('No AI-owned airships found. Nothing to clean up.');
      process.exit(0);
    }

    console.log(`Found ${aiAirships.length} AI-owned airship(s) to remove:`);
    const airshipIds = [];
    for (const ua of aiAirships) {
      const membership = aiMemberships.find(m => m.id === ua.worldMembershipId);
      console.log(`  - ${ua.registration} (${ua.aircraft?.manufacturer} ${ua.aircraft?.model}) owned by ${membership?.airlineName || ua.worldMembershipId}`);
      airshipIds.push(ua.id);
    }

    // Remove sightseeing tours assigned to these aircraft
    const SightseeingTour = require('../models/SightseeingTour');
    const deletedTours = await SightseeingTour.destroy({
      where: { assignedAircraftId: { [Op.in]: airshipIds } }
    });
    if (deletedTours > 0) console.log(`Deleted ${deletedTours} sightseeing tour(s) assigned to AI airships.`);

    // Unassign from any routes (shouldn't be any, but safety)
    const Route = require('../models/Route');
    const unassigned = await Route.update(
      { assignedAircraftId: null, isActive: false },
      { where: { assignedAircraftId: { [Op.in]: airshipIds } } }
    );
    if (unassigned[0] > 0) console.log(`Unassigned ${unassigned[0]} route(s) from AI airships.`);

    // Delete the aircraft
    const deleted = await UserAircraft.destroy({ where: { id: { [Op.in]: airshipIds } } });
    console.log(`Removed ${deleted} AI-owned airship(s). Done.`);

    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
})();
