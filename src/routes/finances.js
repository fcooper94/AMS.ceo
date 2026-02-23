const express = require('express');
const router = express.Router();
const { WorldMembership, UserAircraft, User, World, Route, Airport, Aircraft, WeeklyFinancial } = require('../models');
const eraEconomicService = require('../services/eraEconomicService');
const { computeStaffRoster } = require('../data/staffConfig');
const { getContractor } = require('../data/contractorConfig');

/**
 * GET / — Financial overview with weekly progression
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(400).json({ error: 'No active world selected' });
    }

    const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const membership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });
    if (!membership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    const world = await World.findByPk(activeWorldId);
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }

    const gameYear = world.currentTime ? new Date(world.currentTime).getFullYear() : 2024;
    const eraMultiplier = eraEconomicService.getEraMultiplier(gameYear);

    // ── 1. Weekly financial records (all weeks) ──────────────────────────────
    const weeklyRecords = await WeeklyFinancial.findAll({
      where: { worldMembershipId: membership.id },
      order: [['week_start', 'DESC']]
    });

    const weeks = weeklyRecords.map(w => {
      const rev = parseFloat(w.flightRevenue) || 0;
      const fuel = parseFloat(w.fuelCosts) || 0;
      const crew = parseFloat(w.crewCosts) || 0;
      const maint = parseFloat(w.maintenanceCosts) || 0;
      const fees = parseFloat(w.airportFees) || 0;
      const staff = parseFloat(w.staffCosts) || 0;
      const leases = parseFloat(w.leaseCosts) || 0;
      const contractors = parseFloat(w.contractorCosts) || 0;
      const commonality = parseFloat(w.fleetCommonalityCosts) || 0;
      const loanPay = parseFloat(w.loanPayments) || 0;
      const marketing = parseFloat(w.marketingCosts) || 0;
      const opCosts = fuel + crew + maint + fees;
      const overheads = staff + leases + contractors + commonality + loanPay + marketing;
      const totalCosts = opCosts + overheads;
      const netProfit = rev - totalCosts;

      return {
        weekStart: w.weekStart,
        flightRevenue: Math.round(rev),
        fuelCosts: Math.round(fuel),
        crewCosts: Math.round(crew),
        maintenanceCosts: Math.round(maint),
        airportFees: Math.round(fees),
        operatingCosts: Math.round(opCosts),
        staffCosts: Math.round(staff),
        leaseCosts: Math.round(leases),
        contractorCosts: Math.round(contractors),
        fleetCommonalityCosts: Math.round(commonality),
        loanPayments: Math.round(loanPay),
        marketingCosts: Math.round(marketing),
        overheads: Math.round(overheads),
        totalCosts: Math.round(totalCosts),
        netProfit: Math.round(netProfit),
        flights: w.flights || 0,
        passengers: w.passengers || 0,
        passengerRevenueBreakdown: w.passengerRevenueBreakdown || {},
        cargoRevenueBreakdown: w.cargoRevenueBreakdown || {}
      };
    });

    // ── 2. All-time route performance ────────────────────────────────────────
    const routes = await Route.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['icaoCode', 'iataCode', 'city'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['icaoCode', 'iataCode', 'city'] }
      ]
    });

    let totalRevenue = 0;
    let totalCosts = 0;
    let totalFlights = 0;
    let totalPassengers = 0;

    const routeDetails = routes.map(r => {
      const rev = parseFloat(r.totalRevenue) || 0;
      const costs = parseFloat(r.totalCosts) || 0;
      const flights = r.totalFlights || 0;
      const pax = r.totalPassengers || 0;
      const lf = parseFloat(r.averageLoadFactor) || 0;
      const profit = rev - costs;

      totalRevenue += rev;
      totalCosts += costs;
      totalFlights += flights;
      totalPassengers += pax;

      const dep = r.departureAirport;
      const arr = r.arrivalAirport;

      return {
        routeNumber: r.routeNumber,
        departure: dep ? (dep.iataCode || dep.icaoCode) : '??',
        arrival: arr ? (arr.iataCode || arr.icaoCode) : '??',
        isActive: r.isActive,
        totalRevenue: Math.round(rev),
        totalCosts: Math.round(costs),
        profit: Math.round(profit),
        profitMargin: rev > 0 ? parseFloat(((profit / rev) * 100).toFixed(1)) : 0,
        totalFlights: flights,
        totalPassengers: pax,
        averageLoadFactor: lf,
        revenuePerFlight: flights > 0 ? Math.round(rev / flights) : 0
      };
    });

    // ── 3. Current weekly overheads (for info panel) ─────────────────────────
    const fleet = await UserAircraft.findAll({
      where: { worldMembershipId: membership.id },
      include: [{ model: Aircraft, as: 'aircraft', attributes: ['manufacturer', 'model', 'type'] }]
    });
    const activeFleet = fleet.filter(a => a.status === 'active');
    const leasedAircraft = fleet.filter(a => a.acquisitionType === 'lease' && a.status === 'active');
    const weeklyLeases = leasedAircraft.reduce((sum, a) => sum + (parseFloat(a.leaseWeeklyPayment) || 0), 0);

    // Staff
    const pilotsByType = {};
    let routeCabinCrew = 0;
    for (const route of routes) {
      if (route.assignedAircraft?.aircraft) {
        const ac = route.assignedAircraft.aircraft;
        if (!pilotsByType[ac.id]) pilotsByType[ac.id] = { typeName: ac.model, routePilots: 0, routes: 0 };
        pilotsByType[ac.id].routePilots += ac.requiredPilots || 0;
        pilotsByType[ac.id].routes += 1;
        routeCabinCrew += ac.requiredCabinCrew || 0;
      }
    }
    const roster = computeStaffRoster(activeFleet.length, gameYear, membership.staffSalaryModifiers || {}, {
      pilotsByType: Object.values(pilotsByType).map(t => ({ typeName: t.typeName, routes: t.routes, totalPilots: Math.ceil(t.routePilots * 1.2) })),
      totalCabinCrew: Math.ceil(routeCabinCrew * 1.2)
    });
    let weeklyStaff = 0;
    for (const dept of roster.departments) {
      for (const role of dept.roles) {
        weeklyStaff += Math.round(role.adjustedSalary * eraMultiplier) * role.count;
      }
    }

    // Contractors
    const cleaningCost = Math.round((getContractor('cleaning', membership.cleaningContractor || 'standard')?.weeklyCost2024 || 0) * eraMultiplier);
    const groundCost = Math.round((getContractor('ground', membership.groundContractor || 'standard')?.weeklyCost2024 || 0) * eraMultiplier);
    const engineeringCost = Math.round((getContractor('engineering', membership.engineeringContractor || 'standard')?.weeklyCost2024 || 0) * eraMultiplier);
    const weeklyContractors = cleaningCost + groundCost + engineeringCost;

    // Fleet commonality — fixed weekly cost per unique type family
    const TYPE_FAMILY_WEEKLY_COST = { 'Regional': 5800, 'Narrowbody': 9250, 'Widebody': 15000, 'Cargo': 15000 };
    const LARGE_WIDEBODY_MODELS = ['747', 'A380', '777'];
    const typeFamilies = new Map();
    for (const ac of activeFleet) {
      if (!ac.aircraft) continue;
      const familyKey = `${ac.aircraft.manufacturer} ${ac.aircraft.model}`;
      if (!typeFamilies.has(familyKey)) {
        typeFamilies.set(familyKey, { type: ac.aircraft.type, model: ac.aircraft.model });
      }
    }
    let weeklyCommonality = 0;
    for (const [, info] of typeFamilies) {
      const isLargeWidebody = LARGE_WIDEBODY_MODELS.includes(info.model);
      const cost = isLargeWidebody ? 19650 : (TYPE_FAMILY_WEEKLY_COST[info.type] || 9250);
      weeklyCommonality += Math.round(cost * eraMultiplier);
    }

    const weeklyOverheads = weeklyStaff + Math.round(weeklyLeases) + weeklyContractors + weeklyCommonality;

    // ── 4. All-time totals from weekly data (includes overheads + loans) ────
    let allTimeRevenue = 0;
    let allTimeCosts = 0;
    let allTimeFlights = 0;
    let allTimePassengers = 0;
    for (const w of weeks) {
      allTimeRevenue += w.flightRevenue;
      allTimeCosts += w.totalCosts;
      allTimeFlights += w.flights;
      allTimePassengers += w.passengers;
    }

    // ── Build response ───────────────────────────────────────────────────────
    res.json({
      balance: parseFloat(membership.balance) || 0,
      weeks,
      routes: routeDetails,
      allTime: {
        totalRevenue: Math.round(allTimeRevenue),
        totalCosts: Math.round(allTimeCosts),
        totalFlights: allTimeFlights,
        totalPassengers: allTimePassengers
      },
      weeklyOverheads: {
        staff: Math.round(weeklyStaff),
        leases: Math.round(weeklyLeases),
        contractors: weeklyContractors,
        fleetCommonality: weeklyCommonality,
        total: Math.round(weeklyOverheads)
      }
    });
  } catch (error) {
    console.error('Error fetching financial data:', error);
    res.status(500).json({ error: 'Failed to fetch financial data' });
  }
});

module.exports = router;
