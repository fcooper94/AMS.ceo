const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { World, WorldMembership, User, UserAircraft, Route, Aircraft, ScheduledFlight } = require('../models');
const worldTimeService = require('../services/worldTimeService');
const eraEconomicService = require('../services/eraEconomicService');
const { computeStaffRoster, DEPARTMENTS } = require('../data/staffConfig');
const { getContractor } = require('../data/contractorConfig');

/**
 * GET / — Compute and return staff roster for the current airline
 */
router.get('/', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) return res.status(404).json({ error: 'No active world' });

    const world = await World.findByPk(activeWorldId);
    if (!world) return res.status(404).json({ error: 'World not found' });

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });
    if (!membership) return res.status(404).json({ error: 'No membership found' });

    // Get current game time (in-memory or fallback to DB)
    const currentTime = worldTimeService.getCurrentTime(activeWorldId) || world.currentTime;
    const gameYear = currentTime.getFullYear();

    // Count active fleet
    const fleetCount = await UserAircraft.count({
      where: {
        worldMembershipId: membership.id,
        status: { [Op.notIn]: ['sold'] }
      }
    });

    // Compute crew requirements from routes with scheduled flights × aircraft type crew needs
    const routes = await Route.findAll({
      where: { worldMembershipId: membership.id, isActive: true },
      include: [
        {
          model: UserAircraft,
          as: 'assignedAircraft',
          where: { status: 'active' },
          required: true,
          include: [{ model: Aircraft, as: 'aircraft', attributes: ['id', 'manufacturer', 'model', 'variant', 'requiredPilots', 'requiredCabinCrew'] }]
        },
        {
          model: ScheduledFlight,
          as: 'scheduledFlights',
          where: { isActive: true },
          required: true,
          attributes: ['id']
        }
      ]
    });

    // Group pilots by aircraft type (pilots are type-rated), pool cabin crew
    const pilotsByType = {};
    let routeCabinCrew = 0;
    for (const route of routes) {
      if (route.assignedAircraft?.aircraft) {
        const ac = route.assignedAircraft.aircraft;
        const typeKey = ac.id;
        const sep = (!ac.variant || ac.model.endsWith('-') || ac.variant.startsWith('-')) ? '' : '-';
        const typeName = `${ac.manufacturer} ${ac.model}${ac.variant ? sep + ac.variant : ''}`;
        if (!pilotsByType[typeKey]) {
          pilotsByType[typeKey] = { typeName, routePilots: 0, requiredPerAc: ac.requiredPilots || 2, routes: 0 };
        }
        pilotsByType[typeKey].routePilots += ac.requiredPilots || 0;
        pilotsByType[typeKey].routes += 1;
        routeCabinCrew += ac.requiredCabinCrew || 0;
      }
    }

    // Build per-type pilot breakdown with 20% spare each
    const pilotTypeBreakdown = Object.values(pilotsByType).map(t => ({
      typeName: t.typeName,
      routes: t.routes,
      totalPilots: Math.ceil(t.routePilots * 1.2)
    }));
    const totalCabinCrewNeeded = Math.ceil(routeCabinCrew * 1.2);

    // Compute roster
    const modifiers = membership.staffSalaryModifiers || {};
    const roster = computeStaffRoster(fleetCount, gameYear, modifiers, {
      pilotsByType: pilotTypeBreakdown,
      totalCabinCrew: totalCabinCrewNeeded
    });

    // Era-scale all salaries
    const eraMultiplier = eraEconomicService.getEraMultiplier(gameYear);
    for (const dept of roster.departments) {
      for (const role of dept.roles) {
        role.baseSalary = Math.round(role.baseSalary * eraMultiplier);
        role.adjustedSalary = Math.round(role.adjustedSalary * eraMultiplier);
        role.totalCost = role.adjustedSalary * role.count;
      }
      dept.totalMonthlyCost = dept.roles.reduce((s, r) => s + r.totalCost, 0);
    }
    roster.summary.totalMonthlyCost = roster.departments.reduce((s, d) => s + d.totalMonthlyCost, 0);

    // Build contractor info for outsourced departments
    const contractors = {};
    const contractorMap = {
      ground: { key: 'ground', tier: membership.groundContractor || 'standard' },
      engineering: { key: 'engineering', tier: membership.engineeringContractor || 'standard' }
    };
    for (const [dept, { key, tier }] of Object.entries(contractorMap)) {
      const c = getContractor(key, tier);
      if (c) {
        contractors[dept] = {
          tier,
          name: c.name,
          shortName: c.shortName,
          monthlyCost: Math.round(c.monthlyCost2024 * eraMultiplier)
        };
      }
    }

    res.json({
      ...roster,
      salaryModifiers: modifiers,
      contractors,
      gameYear,
      eraMultiplier,
      membershipId: membership.id,
      ceoName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You'
    });
  } catch (error) {
    console.error('Error fetching staff roster:', error);
    res.status(500).json({ error: 'Failed to load staff data' });
  }
});

/**
 * POST /salary — Update salary modifier for a department or globally
 * Body: { department: 'flight_ops' | 'global', modifier: 1.05 }
 */
router.post('/salary', async (req, res) => {
  try {
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) return res.status(404).json({ error: 'No active world' });

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });
    if (!membership) return res.status(404).json({ error: 'No membership found' });

    const { department, modifier } = req.body;
    if (!department || typeof modifier !== 'number') {
      return res.status(400).json({ error: 'department and modifier (number) required' });
    }

    // Validate department key
    const validKeys = ['global', ...DEPARTMENTS.map(d => d.key)];
    if (!validKeys.includes(department)) {
      return res.status(400).json({ error: 'Invalid department key' });
    }

    // Clamp modifier to 0.5 — 2.0 (50% — 200%)
    const clampedMod = Math.max(0.5, Math.min(2.0, modifier));

    const mods = { ...(membership.staffSalaryModifiers || {}) };
    mods[department] = Math.round(clampedMod * 100) / 100; // 2 decimal places
    await membership.update({ staffSalaryModifiers: mods });

    res.json({ success: true, salaryModifiers: mods });
  } catch (error) {
    console.error('Error updating salary modifier:', error);
    res.status(500).json({ error: 'Failed to update salary' });
  }
});

module.exports = router;
