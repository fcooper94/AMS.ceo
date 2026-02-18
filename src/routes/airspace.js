const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { WorldMembership, User, Route, Airport, AirspaceRestriction, Notification, World } = require('../models');
const { isPointInFir, doesRouteCrossFir, doesGreatCircleCrossFir } = require('../services/geoService');

// ── Helpers ──────────────────────────────────────────────────────────────────

async function getMembership(req) {
  if (!req.user) return null;
  const activeWorldId = req.session?.activeWorldId;
  if (!activeWorldId) return null;
  const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
  if (!user) return null;
  return WorldMembership.findOne({ where: { userId: user.id, worldId: activeWorldId } });
}

/**
 * Check if a route is affected by a given FIR restriction.
 * Returns { affected: boolean, reason: 'departure'|'arrival'|'transit'|null }
 */
function checkRouteAgainstFir(route, firCode) {
  const depAirport = route.departureAirport;
  const arrAirport = route.arrivalAirport;

  // Check if departure airport is inside the FIR
  if (depAirport && isPointInFir(parseFloat(depAirport.latitude), parseFloat(depAirport.longitude), firCode)) {
    return { affected: true, reason: 'departure' };
  }

  // Check if arrival airport is inside the FIR
  if (arrAirport && isPointInFir(parseFloat(arrAirport.latitude), parseFloat(arrAirport.longitude), firCode)) {
    return { affected: true, reason: 'arrival' };
  }

  // Check if waypoints cross the FIR
  if (route.waypoints && route.waypoints.length > 0) {
    if (doesRouteCrossFir(route.waypoints, firCode)) {
      return { affected: true, reason: 'transit' };
    }
  } else {
    // No waypoints — sample great circle
    if (depAirport && arrAirport) {
      if (doesGreatCircleCrossFir(
        parseFloat(depAirport.latitude), parseFloat(depAirport.longitude),
        parseFloat(arrAirport.latitude), parseFloat(arrAirport.longitude),
        firCode
      )) {
        return { affected: true, reason: 'transit' };
      }
    }
  }

  return { affected: false, reason: null };
}

// ── GET / — List active restrictions ─────────────────────────────────────────

router.get('/', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const restrictions = await AirspaceRestriction.findAll({
      where: { worldMembershipId: membership.id, isActive: true },
      order: [['createdAt', 'DESC']]
    });

    res.json({ restrictions });
  } catch (error) {
    console.error('Error fetching airspace restrictions:', error);
    res.status(500).json({ error: 'Failed to fetch restrictions' });
  }
});

// ── GET /affected-routes/:firCode — Preview affected routes ──────────────────

router.get('/affected-routes/:firCode', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const { firCode } = req.params;

    // Fetch all active routes with airport data
    const routes = await Route.findAll({
      where: { worldMembershipId: membership.id, isActive: true },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['icaoCode', 'iataCode', 'name', 'city', 'latitude', 'longitude'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['icaoCode', 'iataCode', 'name', 'city', 'latitude', 'longitude'] }
      ]
    });

    const affectedRoutes = [];
    for (const route of routes) {
      const check = checkRouteAgainstFir(route, firCode);
      if (check.affected) {
        affectedRoutes.push({
          id: route.id,
          routeNumber: route.routeNumber,
          returnRouteNumber: route.returnRouteNumber,
          departure: route.departureAirport ? {
            icao: route.departureAirport.icaoCode,
            iata: route.departureAirport.iataCode,
            name: route.departureAirport.name,
            city: route.departureAirport.city
          } : null,
          arrival: route.arrivalAirport ? {
            icao: route.arrivalAirport.icaoCode,
            iata: route.arrivalAirport.iataCode,
            name: route.arrivalAirport.name,
            city: route.arrivalAirport.city
          } : null,
          reason: check.reason
        });
      }
    }

    res.json({
      firCode,
      totalActiveRoutes: routes.length,
      affectedRoutes
    });
  } catch (error) {
    console.error('Error checking affected routes:', error);
    res.status(500).json({ error: 'Failed to check affected routes' });
  }
});

// ── POST / — Create restriction (suspend affected routes) ────────────────────

router.post('/', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const { firCode, firName, restrictionType, startDate, endDate, altitudeMin, altitudeMax } = req.body;

    if (!firCode) return res.status(400).json({ error: 'FIR code is required' });
    if (!restrictionType || !['until_further_notice', 'date_range'].includes(restrictionType)) {
      return res.status(400).json({ error: 'Invalid restriction type' });
    }
    if (restrictionType === 'date_range' && (!startDate || !endDate)) {
      return res.status(400).json({ error: 'Start and end dates required for date range restriction' });
    }

    // Check for existing active restriction on same FIR
    const existing = await AirspaceRestriction.findOne({
      where: { worldMembershipId: membership.id, firCode, isActive: true }
    });
    if (existing) {
      return res.status(400).json({ error: `Airspace restriction already active for ${firCode}` });
    }

    // Find affected routes
    const routes = await Route.findAll({
      where: { worldMembershipId: membership.id, isActive: true },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['icaoCode', 'iataCode', 'name', 'city', 'latitude', 'longitude'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['icaoCode', 'iataCode', 'name', 'city', 'latitude', 'longitude'] }
      ]
    });

    const affectedRouteIds = [];
    const affectedDetails = [];
    for (const route of routes) {
      const check = checkRouteAgainstFir(route, firCode);
      if (check.affected) {
        affectedRouteIds.push(route.id);
        affectedDetails.push({
          routeNumber: route.routeNumber,
          reason: check.reason,
          departure: route.departureAirport?.icaoCode,
          arrival: route.arrivalAirport?.icaoCode
        });
      }
    }

    // Create the restriction
    const restriction = await AirspaceRestriction.create({
      worldMembershipId: membership.id,
      firCode,
      firName: firName || firCode,
      restrictionType,
      startDate: startDate || null,
      endDate: endDate || null,
      isActive: true,
      affectedRouteCount: affectedRouteIds.length,
      altitudeMin: altitudeMin != null ? altitudeMin : null,
      altitudeMax: altitudeMax != null ? altitudeMax : null
    });

    // Suspend affected routes
    if (affectedRouteIds.length > 0) {
      await Route.update(
        { isActive: false },
        { where: { id: { [Op.in]: affectedRouteIds } } }
      );

      // Create notifications for suspended routes
      const world = await World.findByPk(membership.worldId);
      for (const detail of affectedDetails) {
        try {
          const reasonLabel = detail.reason === 'departure' ? 'departure airport in restricted airspace'
            : detail.reason === 'arrival' ? 'arrival airport in restricted airspace'
            : 'route transits restricted airspace';
          await Notification.create({
            worldMembershipId: membership.id,
            type: 'route_suspended',
            icon: 'alert-triangle',
            title: `Route ${detail.routeNumber} Suspended`,
            message: `${detail.departure}→${detail.arrival} suspended: ${reasonLabel} (${firName || firCode})`,
            link: '/routes',
            priority: 2,
            gameTime: world?.currentTime || new Date()
          });
        } catch (nErr) { /* non-critical */ }
      }
    }

    res.status(201).json({
      restriction: {
        id: restriction.id,
        firCode: restriction.firCode,
        firName: restriction.firName,
        restrictionType: restriction.restrictionType,
        startDate: restriction.startDate,
        endDate: restriction.endDate,
        affectedRouteCount: restriction.affectedRouteCount,
        altitudeMin: restriction.altitudeMin,
        altitudeMax: restriction.altitudeMax
      },
      suspendedRoutes: affectedDetails
    });
  } catch (error) {
    console.error('Error creating airspace restriction:', error);
    res.status(500).json({ error: 'Failed to create restriction' });
  }
});

// ── DELETE /:id — Remove restriction (re-activate routes) ────────────────────

router.delete('/:id', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(401).json({ error: 'Not authenticated or no world selected' });

    const restriction = await AirspaceRestriction.findOne({
      where: { id: req.params.id, worldMembershipId: membership.id, isActive: true }
    });
    if (!restriction) return res.status(404).json({ error: 'Active restriction not found' });

    // Deactivate the restriction
    restriction.isActive = false;
    await restriction.save();

    // Find currently inactive routes for this airline
    const inactiveRoutes = await Route.findAll({
      where: { worldMembershipId: membership.id, isActive: false },
      include: [
        { model: Airport, as: 'departureAirport', attributes: ['icaoCode', 'iataCode', 'name', 'latitude', 'longitude'] },
        { model: Airport, as: 'arrivalAirport', attributes: ['icaoCode', 'iataCode', 'name', 'latitude', 'longitude'] }
      ]
    });

    // Get remaining active restrictions
    const otherRestrictions = await AirspaceRestriction.findAll({
      where: { worldMembershipId: membership.id, isActive: true }
    });

    // Re-activate routes that are no longer covered by any active restriction
    const reactivatedIds = [];
    for (const route of inactiveRoutes) {
      let stillRestricted = false;
      for (const other of otherRestrictions) {
        const check = checkRouteAgainstFir(route, other.firCode);
        if (check.affected) {
          stillRestricted = true;
          break;
        }
      }
      if (!stillRestricted) {
        reactivatedIds.push(route.id);
      }
    }

    if (reactivatedIds.length > 0) {
      await Route.update(
        { isActive: true },
        { where: { id: { [Op.in]: reactivatedIds } } }
      );

      // Notification for reactivated routes
      const world = await World.findByPk(membership.worldId);
      try {
        await Notification.create({
          worldMembershipId: membership.id,
          type: 'routes_reactivated',
          icon: 'check-circle',
          title: `Airspace Restriction Lifted — ${restriction.firName || restriction.firCode}`,
          message: `${reactivatedIds.length} route(s) reactivated after ${restriction.firCode} restriction removed.`,
          link: '/routes',
          priority: 2,
          gameTime: world?.currentTime || new Date()
        });
      } catch (nErr) { /* non-critical */ }
    }

    res.json({
      success: true,
      firCode: restriction.firCode,
      reactivatedRouteCount: reactivatedIds.length
    });
  } catch (error) {
    console.error('Error removing airspace restriction:', error);
    res.status(500).json({ error: 'Failed to remove restriction' });
  }
});

module.exports = router;
