const express = require('express');
const router = express.Router();
const { Route, WorldMembership, Airport, UserAircraft, Aircraft, User, AirspaceRestriction } = require('../models');
const { Op } = require('sequelize');
const airportSlotService = require('../services/airportSlotService');

/**
 * Get all routes for the current user's airline
 */
router.get('/', async (req, res) => {
  try {
    // Get active world from session
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    // Get user's membership
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Fetch all routes for this airline
    const routes = await Route.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        {
          model: Airport,
          as: 'departureAirport',
          attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'latitude', 'longitude']
        },
        {
          model: Airport,
          as: 'arrivalAirport',
          attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'latitude', 'longitude']
        },
        {
          model: Airport,
          as: 'techStopAirport',
          required: false,
          attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'latitude', 'longitude']
        },
        {
          model: UserAircraft,
          as: 'assignedAircraft',
          required: false,
          include: [{
            model: Aircraft,
            as: 'aircraft',
            attributes: ['id', 'manufacturer', 'model', 'variant', 'type', 'cruiseSpeed']
          }]
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Calculate performance metrics for each route
    const routesWithMetrics = routes.map(route => {
      const profit = parseFloat(route.totalRevenue) - parseFloat(route.totalCosts);
      const profitMargin = route.totalRevenue > 0
        ? ((profit / parseFloat(route.totalRevenue)) * 100).toFixed(2)
        : 0;

      return {
        id: route.id,
        routeNumber: route.routeNumber,
        returnRouteNumber: route.returnRouteNumber,
        departureAirport: route.departureAirport,
        arrivalAirport: route.arrivalAirport,
        techStopAirport: route.techStopAirport || null,
        assignedAircraftId: route.assignedAircraftId,
        // Aircraft TYPE ID for matching routes to any aircraft of same type
        assignedAircraftTypeId: route.assignedAircraft?.aircraft?.id || null,
        assignedAircraft: route.assignedAircraft ? {
          id: route.assignedAircraft.id,
          registration: route.assignedAircraft.registration,
          aircraft: route.assignedAircraft.aircraft
        } : null,
        distance: parseFloat(route.distance),
        scheduledDepartureTime: route.scheduledDepartureTime,
        turnaroundTime: route.turnaroundTime,
        frequency: route.frequency,
        daysOfWeek: route.daysOfWeek,
        ticketPrice: parseFloat(route.ticketPrice),
        demand: route.demand,
        isActive: route.isActive,
        // Performance metrics
        totalFlights: route.totalFlights,
        totalRevenue: parseFloat(route.totalRevenue),
        totalCosts: parseFloat(route.totalCosts),
        profit: profit,
        profitMargin: parseFloat(profitMargin),
        totalPassengers: route.totalPassengers,
        averageLoadFactor: parseFloat(route.averageLoadFactor),
        createdAt: route.createdAt
      };
    });

    res.json(routesWithMetrics);
  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({ error: 'Failed to fetch routes' });
  }
});

/**
 * Get route performance summary (best and worst routes)
 */
router.get('/summary', async (req, res) => {
  try {
    // Get active world from session
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    // Get user's membership
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Fetch routes with at least 1 flight for meaningful comparison
    const routes = await Route.findAll({
      where: {
        worldMembershipId: membership.id,
        totalFlights: { [Op.gt]: 0 }
      },
      include: [
        {
          model: Airport,
          as: 'departureAirport',
          attributes: ['icaoCode', 'iataCode', 'name', 'city']
        },
        {
          model: Airport,
          as: 'arrivalAirport',
          attributes: ['icaoCode', 'iataCode', 'name', 'city']
        }
      ]
    });

    if (routes.length === 0) {
      return res.json({
        bestRoutes: [],
        worstRoutes: [],
        totalRoutes: 0,
        totalActiveRoutes: 0
      });
    }

    // Calculate profit for each route
    const routesWithProfit = routes.map(route => {
      const profit = parseFloat(route.totalRevenue) - parseFloat(route.totalCosts);
      const profitMargin = route.totalRevenue > 0
        ? ((profit / parseFloat(route.totalRevenue)) * 100)
        : 0;

      return {
        id: route.id,
        routeNumber: route.routeNumber,
        departureAirport: route.departureAirport,
        arrivalAirport: route.arrivalAirport,
        totalFlights: route.totalFlights,
        totalRevenue: parseFloat(route.totalRevenue),
        totalCosts: parseFloat(route.totalCosts),
        profit: profit,
        profitMargin: profitMargin,
        averageLoadFactor: parseFloat(route.averageLoadFactor),
        totalPassengers: route.totalPassengers,
        isActive: route.isActive
      };
    });

    // Sort by profit
    const sortedByProfit = [...routesWithProfit].sort((a, b) => b.profit - a.profit);

    // Get best 3 and worst 3
    const bestRoutes = sortedByProfit.slice(0, 3);
    const worstRoutes = sortedByProfit.slice(-3).reverse();

    // Count total and active routes
    const totalActiveRoutes = await Route.count({
      where: {
        worldMembershipId: membership.id,
        isActive: true
      }
    });

    const totalRoutes = await Route.count({
      where: { worldMembershipId: membership.id }
    });

    res.json({
      bestRoutes,
      worstRoutes,
      totalRoutes,
      totalActiveRoutes
    });
  } catch (error) {
    console.error('Error fetching route summary:', error);
    res.status(500).json({ error: 'Failed to fetch route summary' });
  }
});

/**
 * Resolve a raw ATC route string to waypoint coordinates.
 * Input: "KEA UN132 LAPSO GUDIS KAVOS ..." → extracts fix names, looks up lat/lng.
 * Also checks if the route crosses any restricted airspace.
 */
router.post('/resolve-atc-route', async (req, res) => {
  try {
    const { atcRouteString } = req.body;
    if (!atcRouteString || typeof atcRouteString !== 'string') {
      return res.status(400).json({ error: 'atcRouteString is required' });
    }

    const airwayService = require('../services/airwayService');
    if (!airwayService.isReady()) {
      return res.status(503).json({ error: 'Airway data is still loading. Please try again shortly.' });
    }

    // Parse the ATC route string: split by whitespace, separate fixes from airways
    // Airways match patterns like: UN132, L560, B411, Y415, N318, UL607, UT140, etc.
    const airwayPattern = /^[A-Z]{1,3}\d{1,4}$/;
    const tokens = atcRouteString.trim().toUpperCase().split(/\s+/);

    const fixes = [];
    const airways = [];
    for (const token of tokens) {
      if (airwayPattern.test(token)) {
        airways.push(token);
      } else {
        fixes.push(token);
      }
    }

    // Resolve each fix name to coordinates
    const resolved = [];
    const unresolved = [];
    for (const fixName of fixes) {
      const coords = airwayService.fixes.get(fixName);
      if (coords) {
        resolved.push({ name: fixName, lat: coords.lat, lng: coords.lng });
      } else {
        unresolved.push(fixName);
      }
    }

    // Check airspace restrictions
    let restrictionWarnings = [];
    try {
      const activeWorldId = req.session?.activeWorldId;
      if (activeWorldId && req.user) {
        const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
        if (user) {
          const membership = await WorldMembership.findOne({
            where: { userId: user.id, worldId: activeWorldId }
          });
          if (membership) {
            const restrictions = await AirspaceRestriction.findAll({
              where: { worldMembershipId: membership.id, isActive: true }
            });
            if (restrictions.length > 0 && resolved.length > 0) {
              const { isPointInFir } = require('../services/geoService');
              for (const restriction of restrictions) {
                for (const wp of resolved) {
                  if (isPointInFir(wp.lat, wp.lng, restriction.firCode)) {
                    restrictionWarnings.push({
                      firCode: restriction.firCode,
                      firName: restriction.firName,
                      waypointName: wp.name
                    });
                    break; // One warning per FIR is enough
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      // Non-critical
    }

    res.json({
      rawRoute: atcRouteString,
      tokens,
      airways,
      fixes: fixes,
      resolved,
      unresolved,
      waypointCount: resolved.length,
      restrictionWarnings
    });
  } catch (error) {
    console.error('Error resolving ATC route:', error);
    res.status(500).json({ error: 'Failed to resolve ATC route' });
  }
});

/**
 * Create a new route
 */
router.post('/', async (req, res) => {
  try {
    const {
      routeNumber,
      returnRouteNumber,
      departureAirportId,
      arrivalAirportId,
      techStopAirportId,
      assignedAircraftId,
      distance,
      scheduledDepartureTime,
      turnaroundTime,
      frequency,
      daysOfWeek,
      ticketPrice,
      demand,
      economyPrice,
      economyPlusPrice,
      businessPrice,
      firstPrice,
      cargoLightRate,
      cargoStandardRate,
      cargoHeavyRate,
      transportType,
      customWaypoints
    } = req.body;

    // Get active world from session
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    // Get user's membership
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // ✅ HARD SLOT VALIDATION
    const slotCheck = await airportSlotService.canCreateRoute(
      departureAirportId,
      arrivalAirportId,
      activeWorldId
    );

    if (!slotCheck.allowed) {
      return res.status(400).json({
        error: 'Insufficient airport slots',
        reason: slotCheck.reason,
        message: slotCheck.message,
        slotsAvailable: slotCheck.slotsAvailable,
        departureSlots: slotCheck.departureSlots,
        arrivalSlots: slotCheck.arrivalSlots
      });
    }

    // Validate tech stop airport exists if provided
    if (techStopAirportId) {
      const techStopAirport = await Airport.findByPk(techStopAirportId);
      if (!techStopAirport) {
        return res.status(404).json({ error: 'Tech stop airport not found' });
      }
    }

    // Check for route number conflicts on same operating days
    const requestedDays = daysOfWeek || [0, 1, 2, 3, 4, 5, 6];
    const { Op } = require('sequelize');

    const conflictingRoutes = await Route.findAll({
      where: {
        worldMembershipId: membership.id,
        [Op.or]: [
          { routeNumber: routeNumber },
          { returnRouteNumber: routeNumber },
          { routeNumber: returnRouteNumber },
          { returnRouteNumber: returnRouteNumber }
        ]
      }
    });

    // Check if any conflicting route operates on the same days
    for (const existingRoute of conflictingRoutes) {
      const existingDays = existingRoute.daysOfWeek || [];
      const hasOverlap = requestedDays.some(day => existingDays.includes(day));

      if (hasOverlap) {
        const conflictingNumber =
          existingRoute.routeNumber === routeNumber || existingRoute.returnRouteNumber === routeNumber
            ? routeNumber
            : returnRouteNumber;

        return res.status(400).json({
          error: `Route number ${conflictingNumber} already operates on one or more of the selected days`
        });
      }
    }

    // Auto-calculate ticket prices if not provided
    let finalEconomyPrice = parseFloat(economyPrice) || 0;
    let finalEconomyPlusPrice = parseFloat(economyPlusPrice) || 0;
    let finalBusinessPrice = parseFloat(businessPrice) || 0;
    let finalFirstPrice = parseFloat(firstPrice) || 0;

    if (!finalEconomyPrice && distance) {
      const eraEconomicService = require('../services/eraEconomicService');
      const World = require('../models/World');
      const world = await World.findByPk(activeWorldId, { attributes: ['currentTime'] });
      const worldYear = world?.currentTime ? new Date(world.currentTime).getFullYear() : new Date().getFullYear();
      const routeDistance = parseFloat(distance) || 500;

      finalEconomyPrice = eraEconomicService.calculateTicketPrice(routeDistance, worldYear, 'economy');
      finalEconomyPlusPrice = Math.round(finalEconomyPrice * 1.3);
      finalBusinessPrice = Math.round(finalEconomyPrice * 2.5);
      finalFirstPrice = Math.round(finalEconomyPrice * 4);
    }

    // Create the route
    const route = await Route.create({
      worldMembershipId: membership.id,
      routeNumber,
      returnRouteNumber,
      departureAirportId,
      arrivalAirportId,
      techStopAirportId: techStopAirportId || null,
      assignedAircraftId: assignedAircraftId || null,
      distance,
      scheduledDepartureTime,
      turnaroundTime: turnaroundTime || 45,
      frequency: frequency || 'daily',
      daysOfWeek: daysOfWeek || [0, 1, 2, 3, 4, 5, 6],
      ticketPrice: ticketPrice || finalEconomyPrice,
      demand: demand || 0,
      economyPrice: finalEconomyPrice,
      economyPlusPrice: finalEconomyPlusPrice || Math.round(finalEconomyPrice * 1.3),
      businessPrice: finalBusinessPrice || Math.round(finalEconomyPrice * 2.5),
      firstPrice: finalFirstPrice || Math.round(finalEconomyPrice * 4),
      cargoLightRate: cargoLightRate || 0,
      cargoStandardRate: cargoStandardRate || 0,
      cargoHeavyRate: cargoHeavyRate || 0,
      transportType: transportType || 'both'
    });

    // Apply custom waypoints or compute automatically
    try {
      if (customWaypoints && Array.isArray(customWaypoints) && customWaypoints.length > 0) {
        // Use user-provided custom ATC route waypoints
        await route.update({ waypoints: customWaypoints });
      } else {
        // Compute airway waypoints automatically (non-blocking, best-effort)
        const airwayService = require('../services/airwayService');
        if (airwayService.isReady()) {
          const [depApt, arrApt] = await Promise.all([
            Airport.findByPk(departureAirportId, { attributes: ['latitude', 'longitude'] }),
            Airport.findByPk(arrivalAirportId, { attributes: ['latitude', 'longitude'] })
          ]);
          if (depApt && arrApt) {
            const waypoints = airwayService.computeRoute(
              parseFloat(depApt.latitude), parseFloat(depApt.longitude),
              parseFloat(arrApt.latitude), parseFloat(arrApt.longitude)
            );
            if (waypoints) {
              await route.update({ waypoints });
            }
          }
        }
      }
    } catch (wpErr) {
      console.error('[Routes] Waypoint computation failed (non-critical):', wpErr.message);
    }

    // Check airspace restrictions (non-blocking, best-effort)
    try {
      const restrictions = await AirspaceRestriction.findAll({
        where: { worldMembershipId: membership.id, isActive: true }
      });
      if (restrictions.length > 0) {
        const { isPointInFir, doesRouteCrossFir, doesGreatCircleCrossFir } = require('../services/geoService');
        const [depApt, arrApt] = await Promise.all([
          Airport.findByPk(departureAirportId, { attributes: ['latitude', 'longitude'] }),
          Airport.findByPk(arrivalAirportId, { attributes: ['latitude', 'longitude'] })
        ]);
        if (depApt && arrApt) {
          const updatedRoute = await Route.findByPk(route.id, { attributes: ['id', 'waypoints'] });
          const waypoints = updatedRoute?.waypoints;
          for (const restriction of restrictions) {
            const fir = restriction.firCode;
            // Check airports
            if (isPointInFir(parseFloat(depApt.latitude), parseFloat(depApt.longitude), fir) ||
                isPointInFir(parseFloat(arrApt.latitude), parseFloat(arrApt.longitude), fir)) {
              await route.update({ isActive: false });
              break;
            }
            // Check waypoints or great circle
            if (waypoints && waypoints.length > 0) {
              if (doesRouteCrossFir(waypoints, fir)) {
                await route.update({ isActive: false });
                break;
              }
            } else {
              if (doesGreatCircleCrossFir(
                parseFloat(depApt.latitude), parseFloat(depApt.longitude),
                parseFloat(arrApt.latitude), parseFloat(arrApt.longitude), fir
              )) {
                await route.update({ isActive: false });
                break;
              }
            }
          }
        }
      }
    } catch (restrictErr) {
      console.error('[Routes] Airspace restriction check failed (non-critical):', restrictErr.message);
    }

    // Fetch the created route with associations
    const createdRoute = await Route.findByPk(route.id, {
      include: [
        {
          model: Airport,
          as: 'departureAirport',
          attributes: ['icaoCode', 'iataCode', 'name', 'city', 'country']
        },
        {
          model: Airport,
          as: 'arrivalAirport',
          attributes: ['icaoCode', 'iataCode', 'name', 'city', 'country']
        },
        {
          model: Airport,
          as: 'techStopAirport',
          required: false,
          attributes: ['icaoCode', 'iataCode', 'name', 'city', 'country']
        },
        {
          model: UserAircraft,
          as: 'assignedAircraft',
          required: false,
          attributes: ['id', 'registration', 'aircraftId'],
          include: [{
            model: Aircraft,
            as: 'aircraft',
            attributes: ['id', 'manufacturer', 'model', 'variant', 'type', 'cruiseSpeed']
          }]
        }
      ]
    });

    res.status(201).json(createdRoute);
  } catch (error) {
    console.error('Error creating route:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    if (error.original) {
      console.error('Original error:', error.original);
    }
    if (error.sql) {
      console.error('SQL:', error.sql);
    }
    console.error('Request body:', JSON.stringify(req.body, null, 2));
    res.status(500).json({ error: 'Failed to create route', details: error.message });
  }
});

/**
 * Update a route
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Get user's membership to verify ownership
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Find the route and verify ownership
    const route = await Route.findOne({
      where: { id, worldMembershipId: membership.id }
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Update the route
    await route.update(updateData);

    // Fetch updated route with associations
    const updatedRoute = await Route.findByPk(id, {
      include: [
        {
          model: Airport,
          as: 'departureAirport',
          attributes: ['icaoCode', 'iataCode', 'name', 'city', 'country']
        },
        {
          model: Airport,
          as: 'arrivalAirport',
          attributes: ['icaoCode', 'iataCode', 'name', 'city', 'country']
        },
        {
          model: UserAircraft,
          as: 'assignedAircraft',
          required: false,
          attributes: ['id', 'registration', 'aircraftId'],
          include: [{
            model: Aircraft,
            as: 'aircraft',
            attributes: ['id', 'manufacturer', 'model', 'variant', 'type', 'cruiseSpeed']
          }]
        }
      ]
    });

    res.json(updatedRoute);
  } catch (error) {
    console.error('Error updating route:', error);
    res.status(500).json({ error: 'Failed to update route' });
  }
});

/**
 * Bulk delete routes
 */
router.delete('/bulk', async (req, res) => {
  try {
    const { routeIds } = req.body;

    if (!Array.isArray(routeIds) || routeIds.length === 0) {
      return res.status(400).json({ error: 'No route IDs provided' });
    }

    // Get user's membership to verify ownership
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Find all routes that belong to the user and match the provided IDs
    const routes = await Route.findAll({
      where: {
        id: routeIds,
        worldMembershipId: membership.id
      }
    });

    if (routes.length === 0) {
      return res.status(404).json({ error: 'No routes found to delete' });
    }

    // Delete all matching routes
    const deletedCount = await Route.destroy({
      where: {
        id: routes.map(r => r.id),
        worldMembershipId: membership.id
      }
    });

    res.json({ message: `${deletedCount} route(s) deleted successfully`, deletedCount });
  } catch (error) {
    console.error('Error bulk deleting routes:', error);
    res.status(500).json({ error: 'Failed to delete routes' });
  }
});

/**
 * Delete a route
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Get user's membership to verify ownership
    const activeWorldId = req.session?.activeWorldId;
    if (!activeWorldId) {
      return res.status(404).json({ error: 'No active world selected' });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
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

    // Find the route and verify ownership
    const route = await Route.findOne({
      where: { id, worldMembershipId: membership.id }
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Delete the route
    await route.destroy();

    res.json({ message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    res.status(500).json({ error: 'Failed to delete route' });
  }
});

module.exports = router;
