const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const { ScheduledFlight, RecurringMaintenance, Route, UserAircraft, Airport, Aircraft, WorldMembership, User, World } = require('../models');
const { checkMaintenanceConflict, attemptMaintenanceReschedule, optimizeMaintenanceForDates, createAutoScheduledMaintenance, refreshAutoScheduledMaintenance } = require('./fleet');

// Wind and route variation constants (must match frontend scheduling-v3.js)
const WIND_ADJUSTMENT_FACTOR = 0.13; // 13% variation for jet stream effect
const ROUTE_VARIATION_FACTOR = 0.035; // ±3.5% for natural-looking times

/**
 * Calculate wind multiplier based on flight direction (matches frontend logic)
 * Eastbound flights are faster (tailwind), westbound are slower (headwind)
 */
function getWindMultiplier(depLng, arrLng, depLat = 0, arrLat = 0) {
  // Calculate longitude difference (handling date line crossing)
  let lngDiff = arrLng - depLng;
  if (lngDiff > 180) lngDiff -= 360;
  else if (lngDiff < -180) lngDiff += 360;

  // Scale effect based on latitude (strongest at mid-latitudes 30-60°)
  const avgLat = Math.abs((depLat + arrLat) / 2);
  let latitudeScale = 1.0;
  if (avgLat < 20) latitudeScale = 0.2;
  else if (avgLat < 30) latitudeScale = 0.5;
  else if (avgLat > 60) latitudeScale = 0.6;

  // Only apply wind effect for significant east-west travel
  if (Math.abs(lngDiff) < 10) return 1.0;

  // Eastbound (positive lngDiff) = faster, Westbound = slower
  const direction = lngDiff > 0 ? -1 : 1;
  const eastWestRatio = Math.min(1, Math.abs(lngDiff) / 90);
  return 1 + (direction * WIND_ADJUSTMENT_FACTOR * latitudeScale * eastWestRatio);
}

/**
 * Calculate route variation for natural-looking times (matches frontend logic)
 * Deterministic based on coordinates so same route always has same variation
 */
function getRouteVariation(depLat, depLng, arrLat, arrLng) {
  const coordSum = (depLat * 7.3) + (depLng * 11.7) + (arrLat * 13.1) + (arrLng * 17.9);
  const hash = Math.sin(coordSum) * 10000;
  const normalized = hash - Math.floor(hash);
  const variation = (normalized - 0.5) * 2 * ROUTE_VARIATION_FACTOR;
  return 1 + variation;
}

/**
 * Calculate flight minutes with wind and route variation (matches frontend logic)
 */
function calculateFlightMinutes(distanceNm, cruiseSpeed, depLng, arrLng, depLat, arrLat) {
  const baseMinutes = (distanceNm / cruiseSpeed) * 60;
  const windMultiplier = getWindMultiplier(depLng, arrLng, depLat, arrLat);
  const routeVariation = getRouteVariation(depLat, depLng, arrLat, arrLng);
  return Math.round(baseMinutes * windMultiplier * routeVariation);
}

/**
 * Calculate arrival date and time based on departure and full round-trip duration
 * Accounts for outbound + turnaround + return, tech stops, wind effects, and route variation
 * @param {string} departureDate - YYYY-MM-DD format
 * @param {string} departureTime - HH:MM:SS format
 * @param {object} route - Route object with distance, turnaroundTime, airports with coordinates
 * @param {number} cruiseSpeed - Aircraft cruise speed in knots (defaults to 450)
 * @returns {{ arrivalDate: string, arrivalTime: string }}
 */
function calculateArrivalDateTime(departureDate, departureTime, route, cruiseSpeed = 450) {
  // Parse departure datetime
  const depDateTime = new Date(`${departureDate}T${departureTime}`);

  // Handle both old API (distanceNm as number) and new API (route object)
  const distance = typeof route === 'object' ? (parseFloat(route.distance) || 500) : (parseFloat(route) || 500);
  const speed = cruiseSpeed || 450;
  const turnaroundMinutes = typeof route === 'object' ? (route.turnaroundTime || 45) : 45;
  const hasTechStop = typeof route === 'object' && route.techStopAirport;

  // Get coordinates for wind calculation
  const depLat = parseFloat(route.departureAirport?.latitude) || 0;
  const depLng = parseFloat(route.departureAirport?.longitude) || 0;
  const arrLat = parseFloat(route.arrivalAirport?.latitude) || 0;
  const arrLng = parseFloat(route.arrivalAirport?.longitude) || 0;

  let totalMinutes;

  if (hasTechStop) {
    // Tech stop route: leg1 + techStop + leg2 + turnaround + leg3 + techStop + leg4
    const techStopMinutes = 30;
    const techLat = parseFloat(route.techStopAirport?.latitude) || 0;
    const techLng = parseFloat(route.techStopAirport?.longitude) || 0;
    const leg1Distance = route.legOneDistance || Math.round(distance * 0.4);
    const leg2Distance = route.legTwoDistance || Math.round(distance * 0.6);

    // Calculate each leg with wind effects
    const leg1Minutes = calculateFlightMinutes(leg1Distance, speed, depLng, techLng, depLat, techLat);
    const leg2Minutes = calculateFlightMinutes(leg2Distance, speed, techLng, arrLng, techLat, arrLat);
    const leg3Minutes = calculateFlightMinutes(leg2Distance, speed, arrLng, techLng, arrLat, techLat);
    const leg4Minutes = calculateFlightMinutes(leg1Distance, speed, techLng, depLng, techLat, depLat);

    totalMinutes = leg1Minutes + techStopMinutes + leg2Minutes +
                   turnaroundMinutes +
                   leg3Minutes + techStopMinutes + leg4Minutes;
  } else {
    // Standard round-trip with wind effects
    const outboundMinutes = calculateFlightMinutes(distance, speed, depLng, arrLng, depLat, arrLat);
    const returnMinutes = calculateFlightMinutes(distance, speed, arrLng, depLng, arrLat, depLat);
    totalMinutes = outboundMinutes + turnaroundMinutes + returnMinutes;
  }

  // Calculate arrival datetime (when the round-trip completes)
  const arrDateTime = new Date(depDateTime.getTime() + totalMinutes * 60 * 1000);

  // Round minutes to nearest 5
  const rawMinutes = arrDateTime.getMinutes();
  const roundedMinutes = Math.round(rawMinutes / 5) * 5;
  if (roundedMinutes === 60) {
    arrDateTime.setHours(arrDateTime.getHours() + 1);
    arrDateTime.setMinutes(0);
  } else {
    arrDateTime.setMinutes(roundedMinutes);
  }
  arrDateTime.setSeconds(0);

  // Format arrival date and time using local time (avoids UTC timezone shift)
  const year = arrDateTime.getFullYear();
  const month = String(arrDateTime.getMonth() + 1).padStart(2, '0');
  const day = String(arrDateTime.getDate()).padStart(2, '0');
  const arrivalDate = `${year}-${month}-${day}`;
  const hours = String(arrDateTime.getHours()).padStart(2, '0');
  const mins = String(arrDateTime.getMinutes()).padStart(2, '0');
  const arrivalTime = `${hours}:${mins}:00`;

  return { arrivalDate, arrivalTime };
}

/**
 * GET /api/schedule/data
 * Combined endpoint - returns fleet, routes, flights, and maintenance in a single request
 * This is much faster than making 4 separate requests
 */
router.get('/data', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Get active world from session
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

    const worldMembershipId = membership.id;

    // Run all queries in parallel for maximum speed
    const [fleet, routes, flights, maintenancePatterns] = await Promise.all([
      // Fleet query
      UserAircraft.findAll({
        where: { worldMembershipId },
        include: [{ model: Aircraft, as: 'aircraft' }],
        order: [['acquiredAt', 'DESC']]
      }),

      // Routes query
      Route.findAll({
        where: { worldMembershipId },
        include: [
          { model: Airport, as: 'departureAirport' },
          { model: Airport, as: 'arrivalAirport' },
          { model: Airport, as: 'techStopAirport' }
        ]
      }),

      // Flight templates query (weekly templates - no date filtering needed)
      ScheduledFlight.findAll({
        where: { isActive: true },
        include: [
          {
            model: Route,
            as: 'route',
            required: true,
            where: { worldMembershipId },
            include: [
              { model: Airport, as: 'departureAirport' },
              { model: Airport, as: 'arrivalAirport' },
              { model: Airport, as: 'techStopAirport' }
            ]
          },
          {
            model: UserAircraft,
            as: 'aircraft',
            include: [{ model: Aircraft, as: 'aircraft' }]
          }
        ],
        order: [['dayOfWeek', 'ASC'], ['departureTime', 'ASC']]
      }),

      // Maintenance patterns query - return ALL scheduled maintenance (no date filter)
      // so modal can show "Next Scheduled" for far-future checks like A, C, D
      (async () => {
        const aircraftIds = await UserAircraft.findAll({
          where: { worldMembershipId },
          attributes: ['id'],
          raw: true
        }).then(rows => rows.map(r => r.id));

        console.log('[MAINT-QUERY] worldMembershipId:', worldMembershipId, 'aircraftIds:', aircraftIds.length);

        if (aircraftIds.length === 0) return [];

        const maint = await RecurringMaintenance.findAll({
          where: {
            aircraftId: { [Op.in]: aircraftIds },
            status: 'active'
          }
        });
        console.log('[MAINT-QUERY] Found', maint.length, 'maintenance records');
        return maint;
      })()
    ]);

    // Efficiently attach maintenance to fleet (O(n) instead of O(n*m))
    const maintenanceByAircraft = {};
    for (const m of maintenancePatterns) {
      if (!maintenanceByAircraft[m.aircraftId]) {
        maintenanceByAircraft[m.aircraftId] = [];
      }
      maintenanceByAircraft[m.aircraftId].push(m);
    }

    const fleetWithMaintenance = fleet.map(aircraft => {
      const aircraftJson = aircraft.toJSON();
      aircraftJson.recurringMaintenance = maintenanceByAircraft[aircraft.id] || [];
      return aircraftJson;
    });

    // Background: refresh auto-scheduled maintenance on page load
    // This keeps maintenance current as game time advances (prevents checks from expiring)
    (async () => {
      try {
        const activeWorldId2 = req.session?.activeWorldId;
        for (const aircraft of fleet) {
          const hasAutoSchedule = aircraft.autoScheduleDaily || aircraft.autoScheduleWeekly ||
            aircraft.autoScheduleA || aircraft.autoScheduleC || aircraft.autoScheduleD;
          if (hasAutoSchedule) {
            await refreshAutoScheduledMaintenance(aircraft.id, activeWorldId2);
          }
        }
      } catch (err) {
        console.error('[MAINT-REFRESH] Error refreshing maintenance on page load:', err.message);
      }
    })();

    // Generate display blocks for multi-day maintenance (C/D checks)
    // This creates separate blocks with displayDate for each day of multi-day maintenance
    const maintenanceBlocks = [];

    // Parse start and end dates for range checking
    const rangeStart = startDate ? new Date(startDate + 'T00:00:00Z') : null;
    const rangeEnd = endDate ? new Date(endDate + 'T00:00:00Z') : null;

    for (const pattern of maintenancePatterns) {
      const patternJson = pattern.toJSON ? pattern.toJSON() : pattern;

      // Normalize scheduledDate
      let patternDateStr = null;
      if (patternJson.scheduledDate) {
        if (patternJson.scheduledDate instanceof Date) {
          patternDateStr = patternJson.scheduledDate.toISOString().split('T')[0];
        } else {
          patternDateStr = String(patternJson.scheduledDate).split('T')[0];
        }
      }

      // For multi-day maintenance (C, D checks), generate display blocks for each day
      if (patternDateStr && ['C', 'D'].includes(patternJson.checkType)) {
        const daysSpan = Math.ceil((patternJson.duration || 60) / 1440);
        const patternStart = new Date(patternDateStr + 'T00:00:00Z');

        // Always include the primary block (day 0) for C/D checks
        // This ensures getInProgressMaintenance() can detect it even when viewing future weeks
        // The frontend will determine if it's actually in progress based on game time
        let includedPrimaryBlock = false;

        for (let dayOffset = 0; dayOffset < daysSpan; dayOffset++) {
          const displayDate = new Date(patternStart);
          displayDate.setUTCDate(displayDate.getUTCDate() + dayOffset);
          const displayDateStr = displayDate.toISOString().split('T')[0];

          const isPrimaryBlock = dayOffset === 0;

          // Skip if outside requested date range (but always include primary block for C/D checks)
          if (rangeStart && rangeEnd) {
            if (displayDate < rangeStart || displayDate > rangeEnd) {
              // Exception: always include primary block for C/D checks so frontend can detect in-progress
              if (!isPrimaryBlock) {
                continue;
              }
            }
          }

          const isOngoing = dayOffset > 0;
          if (isPrimaryBlock) includedPrimaryBlock = true;

          maintenanceBlocks.push({
            id: `${patternJson.id}-${displayDateStr}`,
            patternId: patternJson.id,
            aircraftId: patternJson.aircraftId,
            checkType: patternJson.checkType,
            scheduledDate: patternDateStr, // Original start date
            displayDate: displayDateStr, // The date this block shows on
            startTime: isOngoing ? '00:00:00' : patternJson.startTime,
            duration: patternJson.duration,
            displayDuration: isOngoing ? 1440 : patternJson.duration,
            status: 'scheduled',
            isOngoing: isOngoing
          });
        }
      } else {
        // For daily/weekly/A checks, just add the pattern with displayDate = scheduledDate
        // Only include if within date range (if range specified)
        if (rangeStart && rangeEnd && patternDateStr) {
          const checkDate = new Date(patternDateStr + 'T00:00:00Z');
          if (checkDate < rangeStart || checkDate > rangeEnd) {
            // Still include for maintenance status modal (far future checks)
            // but mark as out of range so frontend can filter if needed
          }
        }
        maintenanceBlocks.push({
          ...patternJson,
          displayDate: patternDateStr || patternJson.scheduledDate
        });
      }
    }

    // Deduplicate blocks by aircraft + date + checkType
    // This prevents showing the same maintenance twice (e.g. duplicate DB records from race conditions)
    const seen = new Set();
    const deduplicatedBlocks = maintenanceBlocks.filter(block => {
      const key = `${block.aircraftId}-${block.displayDate}-${block.checkType}`;
      if (seen.has(key)) {
        console.log(`[MAINT-DEDUP] Removing duplicate block: ${key}`);
        return false;
      }
      seen.add(key);
      return true;
    });

    res.json({
      fleet: fleetWithMaintenance,
      routes,
      flights,
      maintenance: deduplicatedBlocks
    });
  } catch (error) {
    console.error('Error fetching schedule data:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedule/flights
 * Fetch all scheduled flights for the current user's active world
 */
router.get('/flights', async (req, res) => {
  try {
    // Get active world from session
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

    const worldMembershipId = membership.id;

    // Weekly templates - return all active templates (no date filtering)
    const scheduledFlights = await ScheduledFlight.findAll({
      where: { isActive: true },
      include: [
        {
          model: Route,
          as: 'route',
          required: true,
          where: { worldMembershipId },
          include: [
            { model: Airport, as: 'departureAirport' },
            { model: Airport, as: 'arrivalAirport' },
            { model: Airport, as: 'techStopAirport' }
          ]
        },
        {
          model: UserAircraft,
          as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }
      ],
      order: [
        ['dayOfWeek', 'ASC'],
        ['departureTime', 'ASC']
      ]
    });

    res.json(scheduledFlights);
  } catch (error) {
    console.error('Error fetching scheduled flights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get a reference date string (YYYY-MM-DD) for a given day of week (0=Sun, 6=Sat)
 * Used to calculate arrival times via calculateArrivalDateTime
 */
function getReferenceDateForDow(dayOfWeek) {
  // Jan 7, 2024 is a Sunday (dow=0)
  const refDate = new Date('2024-01-07T00:00:00');
  refDate.setDate(refDate.getDate() + dayOfWeek);
  return refDate.toISOString().split('T')[0];
}

/**
 * Calculate pre-flight and post-flight durations for an aircraft/route combination
 */
function calculateFlightDurations(acType, paxCapacity, routeDistance) {
  let cateringDuration = 0;
  if (paxCapacity >= 50 && acType !== 'Cargo') {
    if (paxCapacity < 100) cateringDuration = 5;
    else if (paxCapacity < 200) cateringDuration = 10;
    else cateringDuration = 15;
  }
  let boardingDuration = 0;
  if (acType !== 'Cargo') {
    if (paxCapacity < 50) boardingDuration = 10;
    else if (paxCapacity < 100) boardingDuration = 15;
    else if (paxCapacity < 200) boardingDuration = 20;
    else if (paxCapacity < 300) boardingDuration = 25;
    else boardingDuration = 35;
  }
  let fuellingDuration = 0;
  if (routeDistance < 500) fuellingDuration = 10;
  else if (routeDistance < 1500) fuellingDuration = 15;
  else if (routeDistance < 3000) fuellingDuration = 20;
  else fuellingDuration = 25;
  const preFlightDuration = Math.max(cateringDuration + boardingDuration, fuellingDuration);

  let deboardingDuration = 0;
  if (acType !== 'Cargo') {
    if (paxCapacity < 50) deboardingDuration = 5;
    else if (paxCapacity < 100) deboardingDuration = 8;
    else if (paxCapacity < 200) deboardingDuration = 12;
    else if (paxCapacity < 300) deboardingDuration = 15;
    else deboardingDuration = 20;
  }
  let cleaningDuration;
  if (paxCapacity < 50) cleaningDuration = 5;
  else if (paxCapacity < 100) cleaningDuration = 10;
  else if (paxCapacity < 200) cleaningDuration = 15;
  else if (paxCapacity < 300) cleaningDuration = 20;
  else cleaningDuration = 25;
  const postFlightDuration = deboardingDuration + cleaningDuration;

  return { preFlightDuration, postFlightDuration };
}

/**
 * Check for template time overlap on the same day or adjacent days
 * Returns conflicting template or null
 */
function checkTemplateOverlap(newDepMinutes, newPreFlight, newArrMinutes, newPostFlight, newDayOfWeek, newArrivalDayOffset, existingTemplates) {
  const newPreStart = newDepMinutes - newPreFlight;
  const newPostEnd = newArrMinutes + newPostFlight;

  for (const ex of existingTemplates) {
    const exDurations = calculateFlightDurations(
      ex.aircraft?.aircraft?.type || 'Narrowbody',
      ex.aircraft?.aircraft?.passengerCapacity || 150,
      ex.route?.distance || 0
    );

    const [exDepH, exDepM] = ex.departureTime.split(':').map(Number);
    const exDepMinutes = exDepH * 60 + exDepM;
    const exPreStart = exDepMinutes - exDurations.preFlightDuration;

    const [exArrH, exArrM] = (ex.arrivalTime || '23:59:00').split(':').map(Number);
    const exArrMinutes = exArrH * 60 + exArrM;
    const exPostEnd = exArrMinutes + exDurations.postFlightDuration;
    const exArrDayOffset = ex.arrivalDayOffset || 0;

    // Check overlap on the new flight's departure day
    if (ex.dayOfWeek === newDayOfWeek) {
      // Both depart same day - check time overlap
      const exEndOnThisDay = exArrDayOffset === 0 ? exPostEnd : 1440;
      const newEndOnThisDay = newArrivalDayOffset === 0 ? newPostEnd : 1440;
      if (newPreStart < exEndOnThisDay && newEndOnThisDay > exPreStart) {
        return ex;
      }
    }

    // Check if existing flight from previous day spills into new flight's departure day
    if (exArrDayOffset > 0) {
      const exArrDow = (ex.dayOfWeek + exArrDayOffset) % 7;
      if (exArrDow === newDayOfWeek) {
        // Existing arrives on our departure day (0 to exPostEnd)
        const newEndOnThisDay = newArrivalDayOffset === 0 ? newPostEnd : 1440;
        if (newPreStart < exPostEnd && newEndOnThisDay > 0) {
          return ex;
        }
      }
    }

    // Check if new flight's arrival day conflicts with existing departure day
    if (newArrivalDayOffset > 0) {
      const newArrDow = (newDayOfWeek + newArrivalDayOffset) % 7;
      if (ex.dayOfWeek === newArrDow) {
        // New arrives on existing's departure day
        const exEndOnThisDay = exArrDayOffset === 0 ? exPostEnd : 1440;
        if (0 < exEndOnThisDay && newPostEnd > exPreStart) {
          return ex;
        }
      }
    }
  }
  return null;
}

/**
 * POST /api/schedule/flight
 * Create a new weekly flight template
 */
router.post('/flight', async (req, res) => {
  try {
    const { routeId, aircraftId, dayOfWeek, departureTime } = req.body;

    if (dayOfWeek === undefined || dayOfWeek === null || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: 'Invalid dayOfWeek (must be 0-6)' });
    }

    // Get active world from session
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

    const worldMembershipId = membership.id;

    const route = await Route.findOne({
      where: { id: routeId, worldMembershipId },
      include: [
        { model: Airport, as: 'departureAirport' },
        { model: Airport, as: 'arrivalAirport' },
        { model: Airport, as: 'techStopAirport' }
      ]
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId },
      include: [{ model: Aircraft, as: 'aircraft' }]
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    const routeDistance = route.distance || 0;
    const { preFlightDuration, postFlightDuration } = calculateFlightDurations(acType, paxCapacity, routeDistance);

    // Calculate arrival time using a reference date for this day-of-week
    const refDateStr = getReferenceDateForDow(dayOfWeek);
    const { arrivalDate: refArrivalDate, arrivalTime } = calculateArrivalDateTime(
      refDateStr, departureTime, route, aircraft.aircraft?.cruiseSpeed
    );
    const arrivalDayOffset = Math.round((new Date(refArrivalDate + 'T00:00:00') - new Date(refDateStr + 'T00:00:00')) / 86400000);

    const [depH, depM] = departureTime.split(':').map(Number);
    const depMinutes = depH * 60 + depM;
    const [arrH, arrM] = arrivalTime.split(':').map(Number);
    const arrMinutes = arrH * 60 + arrM;
    const totalDurationMinutes = (arrivalDayOffset * 1440) + arrMinutes - depMinutes;

    // Check for overlapping templates on same aircraft
    const daysToCheck = new Set([dayOfWeek]);
    if (arrivalDayOffset > 0) {
      for (let d = 1; d <= arrivalDayOffset; d++) daysToCheck.add((dayOfWeek + d) % 7);
    }
    daysToCheck.add((dayOfWeek - 1 + 7) % 7);

    const existingTemplates = await ScheduledFlight.findAll({
      where: { aircraftId, isActive: true, dayOfWeek: { [Op.in]: [...daysToCheck] } },
      include: [
        { model: Route, as: 'route', include: [{ model: Airport, as: 'departureAirport' }, { model: Airport, as: 'arrivalAirport' }] },
        { model: UserAircraft, as: 'aircraft', include: [{ model: Aircraft, as: 'aircraft' }] }
      ]
    });

    const conflict = checkTemplateOverlap(depMinutes, preFlightDuration, arrMinutes, postFlightDuration, dayOfWeek, arrivalDayOffset, existingTemplates);

    if (conflict) {
      const depAirport = conflict.route?.departureAirport?.iataCode || '???';
      const arrAirport = conflict.route?.arrivalAirport?.iataCode || '???';
      const routeNum = conflict.route?.routeNumber || 'Unknown';
      const returnNum = conflict.route?.returnRouteNumber || '';
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      return res.status(409).json({
        error: 'Schedule conflict detected',
        conflict: {
          type: 'flight',
          routeNumber: routeNum,
          returnRouteNumber: returnNum,
          departure: depAirport,
          arrival: arrAirport,
          dayOfWeek: conflict.dayOfWeek,
          departureTime: conflict.departureTime.substring(0, 5),
          arrivalTime: (conflict.arrivalTime || '').substring(0, 5),
          message: `Conflicts with ${routeNum}/${returnNum} (${depAirport}→${arrAirport}) on ${dayNames[conflict.dayOfWeek]} departing ${conflict.departureTime.substring(0, 5)}`
        }
      });
    }

    // Create flight template
    const scheduledFlight = await ScheduledFlight.create({
      routeId, aircraftId, dayOfWeek, departureTime, arrivalTime, arrivalDayOffset, totalDurationMinutes, isActive: true
    });

    const completeFlightData = await ScheduledFlight.findByPk(scheduledFlight.id, {
      include: [
        { model: Route, as: 'route', include: [{ model: Airport, as: 'departureAirport' }, { model: Airport, as: 'arrivalAirport' }, { model: Airport, as: 'techStopAirport' }] },
        { model: UserAircraft, as: 'aircraft', include: [{ model: Aircraft, as: 'aircraft' }] }
      ]
    });

    refreshAutoScheduledMaintenance(aircraftId, activeWorldId).catch(e =>
      console.log('[SCHEDULE] Auto-scheduler re-run failed:', e.message)
    );

    res.status(201).json(completeFlightData);
  } catch (error) {
    console.error('Error creating scheduled flight:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schedule/flights/batch
 * Create multiple scheduled flights at once (for weekly scheduling)
 * Much faster than making individual requests
 */
router.post('/flights/batch', async (req, res) => {
  try {
    const { routeId, aircraftId, flights } = req.body;
    // flights is an array of { dayOfWeek, departureTime }

    if (!flights || !Array.isArray(flights) || flights.length === 0) {
      return res.status(400).json({ error: 'No flights provided' });
    }

    if (flights.length > 14) {
      return res.status(400).json({ error: 'Maximum 14 flights per batch' });
    }

    // Validate all dayOfWeek values
    for (const flight of flights) {
      if (flight.dayOfWeek === undefined || flight.dayOfWeek === null || flight.dayOfWeek < 0 || flight.dayOfWeek > 6) {
        return res.status(400).json({ error: 'Invalid dayOfWeek (must be 0-6)' });
      }
    }

    // Get active world from session
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

    const worldMembershipId = membership.id;

    // Validate route belongs to user's world
    const route = await Route.findOne({
      where: { id: routeId, worldMembershipId },
      include: [
        { model: Airport, as: 'departureAirport' },
        { model: Airport, as: 'arrivalAirport' },
        { model: Airport, as: 'techStopAirport' }
      ]
    });

    if (!route) {
      return res.status(404).json({ error: 'Route not found' });
    }

    // Validate aircraft belongs to user's world
    const aircraft = await UserAircraft.findOne({
      where: { id: aircraftId, worldMembershipId },
      include: [{ model: Aircraft, as: 'aircraft' }]
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    const cruiseSpeed = aircraft.aircraft?.cruiseSpeed;
    const acType = aircraft.aircraft?.type || 'Narrowbody';
    const paxCapacity = aircraft.aircraft?.passengerCapacity || 150;
    const routeDistance = route.distance || 0;
    const { preFlightDuration, postFlightDuration } = calculateFlightDurations(acType, paxCapacity, routeDistance);

    // Get all existing templates for this aircraft (for overlap checking)
    const existingTemplates = await ScheduledFlight.findAll({
      where: { aircraftId, isActive: true },
      include: [
        {
          model: Route, as: 'route',
          include: [
            { model: Airport, as: 'departureAirport' },
            { model: Airport, as: 'arrivalAirport' }
          ]
        },
        {
          model: UserAircraft, as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }
      ]
    });

    // Filter out conflicting flights and prepare batch data
    const templatesToCreate = [];
    const conflicts = [];
    // Track templates we're adding in this batch for intra-batch overlap detection
    const batchTemplates = [];

    for (const flight of flights) {
      // Use a reference date for this day-of-week to calculate arrival
      const refDate = getReferenceDateForDow(flight.dayOfWeek);
      const { arrivalDate: refArrDate, arrivalTime } = calculateArrivalDateTime(
        refDate, flight.departureTime, route, cruiseSpeed
      );
      const arrivalDayOffset = Math.round((new Date(refArrDate + 'T00:00:00') - new Date(refDate + 'T00:00:00')) / 86400000);

      const [depH, depM] = flight.departureTime.split(':').map(Number);
      const depMinutes = depH * 60 + depM;
      const [arrH, arrM] = arrivalTime.split(':').map(Number);
      const arrMinutes = arrH * 60 + arrM;

      // Calculate total duration
      const totalDurationMinutes = arrivalDayOffset * 1440 + arrMinutes - depMinutes;

      // Check overlap with existing templates AND already-added batch templates
      const allTemplates = [...existingTemplates, ...batchTemplates];
      const conflict = checkTemplateOverlap(
        depMinutes, preFlightDuration, arrMinutes, postFlightDuration,
        flight.dayOfWeek, arrivalDayOffset, allTemplates
      );

      if (conflict) {
        conflicts.push(flight.dayOfWeek);
      } else {
        const templateData = {
          routeId,
          aircraftId,
          dayOfWeek: flight.dayOfWeek,
          departureTime: flight.departureTime,
          arrivalTime,
          arrivalDayOffset,
          totalDurationMinutes,
          isActive: true
        };
        templatesToCreate.push(templateData);

        // Add to batch templates for intra-batch overlap checking
        batchTemplates.push({
          dayOfWeek: flight.dayOfWeek,
          departureTime: flight.departureTime,
          arrivalTime,
          arrivalDayOffset,
          aircraft: { aircraft: aircraft.aircraft },
          route
        });
      }
    }

    if (templatesToCreate.length === 0) {
      return res.status(409).json({
        error: 'All flights conflict with existing schedule',
        conflicts
      });
    }

    // Bulk create all templates
    const createdTemplates = await ScheduledFlight.bulkCreate(templatesToCreate);

    // Fetch complete data for all created templates
    const completeData = await ScheduledFlight.findAll({
      where: { id: { [Op.in]: createdTemplates.map(f => f.id) } },
      include: [
        {
          model: Route, as: 'route',
          include: [
            { model: Airport, as: 'departureAirport' },
            { model: Airport, as: 'arrivalAirport' },
            { model: Airport, as: 'techStopAirport' }
          ]
        },
        {
          model: UserAircraft, as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }
      ]
    });

    // Re-run auto-scheduler in background
    refreshAutoScheduledMaintenance(aircraftId, activeWorldId).catch(e =>
      console.log('[BATCH] Auto-scheduler re-run failed:', e.message)
    );

    res.status(201).json({
      created: completeData,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    });
  } catch (error) {
    console.error('Error batch creating flight templates:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/schedule/flight/:id
 * Delete a scheduled flight
 */
router.delete('/flight/:id', async (req, res) => {
  try {
    const { id } = req.params;

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

    const worldMembershipId = membership.id;

    // Find the scheduled flight and verify ownership
    const scheduledFlight = await ScheduledFlight.findByPk(id, {
      include: [
        {
          model: Route,
          as: 'route',
          where: {
            worldMembershipId: worldMembershipId
          }
        }
      ]
    });

    if (!scheduledFlight) {
      return res.status(404).json({ error: 'Scheduled flight not found' });
    }

    const aircraftId = scheduledFlight.aircraftId;
    await scheduledFlight.destroy();

    // Re-optimize maintenance in background (don't block the response)
    refreshAutoScheduledMaintenance(aircraftId, activeWorldId).catch(e =>
      console.log('[DELETE] Auto-scheduler re-run failed:', e.message)
    );

    res.json({ message: 'Scheduled flight deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheduled flight:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/schedule/flight/:id
 * Update a flight template (dayOfWeek, departureTime, isActive)
 */
router.put('/flight/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { dayOfWeek, departureTime, isActive } = req.body;

    // Get active world from session
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

    const worldMembershipId = membership.id;

    // Find the template and verify ownership
    const scheduledFlight = await ScheduledFlight.findByPk(id, {
      include: [
        {
          model: Route, as: 'route',
          where: { worldMembershipId },
          include: [
            { model: Airport, as: 'departureAirport' },
            { model: Airport, as: 'arrivalAirport' },
            { model: Airport, as: 'techStopAirport' }
          ]
        },
        {
          model: UserAircraft, as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }
      ]
    });

    if (!scheduledFlight) {
      return res.status(404).json({ error: 'Scheduled flight not found' });
    }

    // Update simple fields
    if (isActive !== undefined) scheduledFlight.isActive = isActive;

    // If dayOfWeek or departureTime changed, recalculate arrival info
    const newDow = dayOfWeek !== undefined ? dayOfWeek : scheduledFlight.dayOfWeek;
    const newDepTime = departureTime !== undefined ? departureTime : scheduledFlight.departureTime;

    if (dayOfWeek !== undefined || departureTime !== undefined) {
      if (dayOfWeek !== undefined && (dayOfWeek < 0 || dayOfWeek > 6)) {
        return res.status(400).json({ error: 'Invalid dayOfWeek (must be 0-6)' });
      }

      const refDateStr = getReferenceDateForDow(newDow);
      const route = scheduledFlight.route;
      const cruiseSpeed = scheduledFlight.aircraft?.aircraft?.cruiseSpeed;
      const { arrivalDate: refArrDate, arrivalTime } = calculateArrivalDateTime(
        refDateStr, newDepTime, route, cruiseSpeed
      );
      const arrivalDayOffset = Math.round((new Date(refArrDate + 'T00:00:00') - new Date(refDateStr + 'T00:00:00')) / 86400000);
      const [depH, depM] = newDepTime.split(':').map(Number);
      const [arrH, arrM] = arrivalTime.split(':').map(Number);
      const totalDurationMinutes = arrivalDayOffset * 1440 + (arrH * 60 + arrM) - (depH * 60 + depM);

      scheduledFlight.dayOfWeek = newDow;
      scheduledFlight.departureTime = newDepTime;
      scheduledFlight.arrivalTime = arrivalTime;
      scheduledFlight.arrivalDayOffset = arrivalDayOffset;
      scheduledFlight.totalDurationMinutes = totalDurationMinutes;
    }

    await scheduledFlight.save();

    // Fetch updated data with associations
    const updatedFlight = await ScheduledFlight.findByPk(scheduledFlight.id, {
      include: [
        {
          model: Route, as: 'route',
          include: [
            { model: Airport, as: 'departureAirport' },
            { model: Airport, as: 'arrivalAirport' },
            { model: Airport, as: 'techStopAirport' }
          ]
        },
        {
          model: UserAircraft, as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }
      ]
    });

    // Re-optimize maintenance in background
    refreshAutoScheduledMaintenance(scheduledFlight.aircraftId, activeWorldId).catch(e =>
      console.log('[UPDATE] Auto-scheduler re-run failed:', e.message)
    );

    res.json(updatedFlight);
  } catch (error) {
    console.error('Error updating flight template:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedule/maintenance
 * Fetch all scheduled maintenance checks for the current user's active world
 */
router.get('/maintenance', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

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

    const worldMembershipId = membership.id;

    // Get user's aircraft IDs first (single query)
    const userAircraftIds = await UserAircraft.findAll({
      where: { worldMembershipId },
      attributes: ['id'],
      raw: true
    }).then(rows => rows.map(r => r.id));

    if (userAircraftIds.length === 0) {
      return res.json({ maintenance: [], debug: { aircraftCount: 0 } });
    }

    // Fetch all active maintenance for user's aircraft in a single optimized query
    // Filter by date range at database level when possible
    let dateFilter = {};
    if (startDate && endDate) {
      // For scheduled maintenance, we need records where:
      // 1. scheduledDate is within range, OR
      // 2. For multi-day maintenance, scheduledDate is before range but extends into it
      // To be safe, fetch records from (startDate - 90 days) to cover long C/D checks
      const extendedStartDate = new Date(startDate);
      extendedStartDate.setDate(extendedStartDate.getDate() - 90);
      const extendedStartStr = extendedStartDate.toISOString().split('T')[0];

      dateFilter = {
        [Op.or]: [
          { scheduledDate: { [Op.between]: [extendedStartStr, endDate] } },
          { scheduledDate: null } // Legacy day-of-week patterns
        ]
      };
    }

    const recurringPatterns = await RecurringMaintenance.findAll({
      where: {
        aircraftId: { [Op.in]: userAircraftIds },
        status: 'active',
        ...dateFilter
      },
      include: [
        {
          model: UserAircraft,
          as: 'aircraft',
          attributes: ['id', 'registration', 'worldMembershipId'],
          include: [
            { model: Aircraft, as: 'aircraft', attributes: ['id', 'manufacturer', 'model', 'variant'] }
          ]
        }
      ]
    });

    // Generate maintenance blocks for the requested date range
    const maintenanceBlocks = [];

    if (startDate && endDate) {
      // Parse dates
      const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
      const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
      const start = new Date(Date.UTC(startYear, startMonth - 1, startDay));
      const end = new Date(Date.UTC(endYear, endMonth - 1, endDay));

      // For each date in range
      const currentDate = new Date(start);
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getUTCDay();
        const dateStr = currentDate.toISOString().split('T')[0];

        // Add all matching patterns for this day
        for (const pattern of recurringPatterns) {
          // Match by dayOfWeek (recurring pattern) OR by specific scheduledDate
          const matchesByDayOfWeek = pattern.dayOfWeek === dayOfWeek && !pattern.scheduledDate;

          // Normalize scheduledDate for comparison (could be Date object or string)
          let patternDateStr = null;
          if (pattern.scheduledDate) {
            if (pattern.scheduledDate instanceof Date) {
              patternDateStr = pattern.scheduledDate.toISOString().split('T')[0];
            } else {
              patternDateStr = String(pattern.scheduledDate).split('T')[0];
            }
          }

          // For multi-day maintenance (C, D checks) or overnight maintenance (A checks),
          // check if current date falls within maintenance period
          let matchesByDateRange = false;
          if (patternDateStr && ['A', 'C', 'D'].includes(pattern.checkType)) {
            const patternStart = new Date(patternDateStr + 'T00:00:00Z');

            // For A checks, calculate if it spans overnight
            // For C/D checks, use days-based calculation
            let daysSpan;
            if (pattern.checkType === 'A') {
              // A check: calculate based on start time + duration crossing midnight
              const startTimeParts = (pattern.startTime || '00:00:00').split(':');
              const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
              const endMinutes = startMinutes + (pattern.duration || 540);
              daysSpan = Math.ceil(endMinutes / 1440); // How many calendar days it spans
            } else {
              // C/D checks: days-based
              daysSpan = Math.ceil((pattern.duration || 60) / 1440);
            }

            const patternEnd = new Date(patternStart);
            patternEnd.setUTCDate(patternEnd.getUTCDate() + daysSpan - 1); // -1 because start day counts

            const checkDate = new Date(dateStr + 'T00:00:00Z');
            matchesByDateRange = checkDate >= patternStart && checkDate <= patternEnd;
          }

          const matchesByDate = patternDateStr === dateStr;

          if (matchesByDayOfWeek || matchesByDate || matchesByDateRange) {
            // Generate a maintenance block for this date
            // For multi-day maintenance on subsequent days, adjust the display
            const isMultiDayOngoing = matchesByDateRange && !matchesByDate;

            // For A checks: only create ONE block (on the scheduled date), not separate ongoing blocks
            // The single block will include spansOvernight info for frontend rendering
            if (pattern.checkType === 'A' && isMultiDayOngoing) {
              // Skip creating the "day 2" ongoing block for A checks
              // The original block already has all the info needed
              continue;
            }

            // Calculate display duration for the current day
            let displayDuration = pattern.duration;
            if (isMultiDayOngoing) {
              // For C/D checks: full day on subsequent days
              displayDuration = 1440;
            }

            // For A checks, check if it spans overnight
            let spansOvernight = false;
            let endTimeNextDay = null;
            if (pattern.checkType === 'A') {
              const startTimeParts = (pattern.startTime || '00:00:00').split(':');
              const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
              const endMinutes = startMinutes + (pattern.duration || 540);
              if (endMinutes > 1440) {
                spansOvernight = true;
                const nextDayMinutes = endMinutes - 1440;
                const nextDayHours = Math.floor(nextDayMinutes / 60);
                const nextDayMins = nextDayMinutes % 60;
                endTimeNextDay = `${String(nextDayHours).padStart(2, '0')}:${String(nextDayMins).padStart(2, '0')}`;
              }
            }

            maintenanceBlocks.push({
              id: `${pattern.id}-${dateStr}`, // Composite ID for frontend tracking
              patternId: pattern.id,
              aircraftId: pattern.aircraftId,
              checkType: pattern.checkType,
              scheduledDate: isMultiDayOngoing ? patternDateStr : dateStr, // Original start date for reference
              displayDate: dateStr, // The date this block is being displayed on
              startTime: isMultiDayOngoing ? '00:00:00' : pattern.startTime, // Full day for ongoing
              duration: pattern.duration, // Always use full duration for progress calculation
              displayDuration: displayDuration, // Display duration for this day
              status: 'scheduled',
              isOngoing: isMultiDayOngoing, // Flag to indicate this is an ongoing multi-day block (only for C/D)
              spansOvernight: spansOvernight, // For A checks that go past midnight
              endTimeNextDay: endTimeNextDay, // End time on the next day (e.g., "07:00")
              aircraft: pattern.aircraft
            });
          }
        }

        // Move to next day
        currentDate.setUTCDate(currentDate.getUTCDate() + 1);
      }
    }

    // Sort by date and time
    maintenanceBlocks.sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) {
        return a.scheduledDate.localeCompare(b.scheduledDate);
      }
      return a.startTime.localeCompare(b.startTime);
    });

    // Auto-optimize maintenance positions (reposition daily checks before flights)
    // Group by aircraftId and collect dates
    const aircraftDates = new Map();
    for (const block of maintenanceBlocks) {
      if (block.checkType === 'daily') {
        if (!aircraftDates.has(block.aircraftId)) {
          aircraftDates.set(block.aircraftId, new Set());
        }
        aircraftDates.get(block.aircraftId).add(block.scheduledDate);
      }
    }

    // Optimize each aircraft's maintenance
    for (const [acId, dates] of aircraftDates) {
      try {
        await optimizeMaintenanceForDates(acId, [...dates]);
      } catch (optError) {
        console.error(`Error optimizing maintenance for aircraft ${acId}:`, optError.message);
      }
    }

    // Re-fetch maintenance after optimization to get updated times
    const updatedPatterns = await RecurringMaintenance.findAll({
      where: { status: 'active' },
      include: [{
        model: UserAircraft,
        as: 'aircraft',
        where: { worldMembershipId: worldMembershipId },
        include: [{ model: Aircraft, as: 'aircraft' }]
      }]
    });

    // Rebuild maintenance blocks with updated times
    const updatedBlocks = [];
    const updatedStart = new Date(startDate || new Date().toISOString().split('T')[0]);
    const updatedEnd = new Date(endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    const curDate = new Date(updatedStart);
    while (curDate <= updatedEnd) {
      const dateStr = curDate.toISOString().split('T')[0];
      for (const pattern of updatedPatterns) {
        let patternDateStr = null;
        if (pattern.scheduledDate) {
          patternDateStr = pattern.scheduledDate instanceof Date
            ? pattern.scheduledDate.toISOString().split('T')[0]
            : String(pattern.scheduledDate).split('T')[0];
        }

        // For multi-day maintenance (C, D checks) or overnight maintenance (A checks),
        // check if current date falls within maintenance period
        let matchesByDateRange = false;
        if (patternDateStr && ['A', 'C', 'D'].includes(pattern.checkType)) {
          const patternStart = new Date(patternDateStr + 'T00:00:00Z');

          // For A checks, calculate if it spans overnight
          // For C/D checks, use days-based calculation
          let daysSpan;
          if (pattern.checkType === 'A') {
            // A check: calculate based on start time + duration crossing midnight
            const startTimeParts = (pattern.startTime || '00:00:00').split(':');
            const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
            const endMinutes = startMinutes + (pattern.duration || 540);
            daysSpan = Math.ceil(endMinutes / 1440); // How many calendar days it spans
          } else {
            // C/D checks: days-based
            daysSpan = Math.ceil((pattern.duration || 60) / 1440);
          }

          const patternEnd = new Date(patternStart);
          patternEnd.setUTCDate(patternEnd.getUTCDate() + daysSpan - 1); // -1 because start day counts

          const checkDate = new Date(dateStr + 'T00:00:00Z');
          matchesByDateRange = checkDate >= patternStart && checkDate <= patternEnd;
        }

        const matchesByDate = patternDateStr === dateStr;

        if (matchesByDate || matchesByDateRange) {
          // For multi-day maintenance on subsequent days, adjust the display
          const isMultiDayOngoing = matchesByDateRange && !matchesByDate;

          // For A checks: only create ONE block (on the scheduled date), not separate ongoing blocks
          if (pattern.checkType === 'A' && isMultiDayOngoing) {
            // Skip creating the "day 2" ongoing block for A checks
            continue;
          }

          // Calculate display duration for the current day
          let displayDuration = pattern.duration;
          if (isMultiDayOngoing) {
            // For C/D checks: full day on subsequent days
            displayDuration = 1440;
          }

          // For A checks, check if it spans overnight
          let spansOvernight = false;
          let endTimeNextDay = null;
          if (pattern.checkType === 'A') {
            const startTimeParts = (pattern.startTime || '00:00:00').split(':');
            const startMinutes = parseInt(startTimeParts[0]) * 60 + parseInt(startTimeParts[1]);
            const endMinutes = startMinutes + (pattern.duration || 540);
            if (endMinutes > 1440) {
              spansOvernight = true;
              const nextDayMinutes = endMinutes - 1440;
              const nextDayHours = Math.floor(nextDayMinutes / 60);
              const nextDayMins = nextDayMinutes % 60;
              endTimeNextDay = `${String(nextDayHours).padStart(2, '0')}:${String(nextDayMins).padStart(2, '0')}`;
            }
          }

          updatedBlocks.push({
            id: `${pattern.id}-${dateStr}`,
            patternId: pattern.id,
            aircraftId: pattern.aircraftId,
            checkType: pattern.checkType,
            scheduledDate: isMultiDayOngoing ? patternDateStr : dateStr, // Original start date for reference
            displayDate: dateStr, // The date this block is being displayed on
            startTime: isMultiDayOngoing ? '00:00:00' : pattern.startTime, // Full day for ongoing
            duration: pattern.duration, // Always use full duration for progress calculation
            displayDuration: displayDuration, // Display duration for this day
            status: 'scheduled',
            isOngoing: isMultiDayOngoing, // Flag to indicate this is an ongoing multi-day block (only for C/D)
            spansOvernight: spansOvernight, // For A checks that go past midnight
            endTimeNextDay: endTimeNextDay, // End time on the next day (e.g., "07:00")
            aircraft: pattern.aircraft
          });
        }
      }
      curDate.setUTCDate(curDate.getUTCDate() + 1);
    }

    updatedBlocks.sort((a, b) => {
      if (a.scheduledDate !== b.scheduledDate) return a.scheduledDate.localeCompare(b.scheduledDate);
      return a.startTime.localeCompare(b.startTime);
    });

    // Deduplicate blocks by composite key (patternId + displayDate + checkType)
    const seen = new Set();
    const deduplicatedBlocks = updatedBlocks.filter(block => {
      const key = `${block.patternId || block.id}-${block.displayDate}-${block.checkType}`;
      if (seen.has(key)) {
        console.log(`[MAINT-DEDUP] Removing duplicate block: ${key}`);
        return false;
      }
      seen.add(key);
      return true;
    });

    // Include debug info in response
    const debugInfo = {
      requestedRange: { startDate, endDate },
      patternsFound: updatedPatterns.length,
      patterns: updatedPatterns.map(p => ({
        aircraft: p.aircraft?.registration,
        checkType: p.checkType,
        scheduledDate: p.scheduledDate,
        dayOfWeek: p.dayOfWeek
      })),
      blocksGenerated: deduplicatedBlocks.length,
      optimized: true
    };

    res.json({ maintenance: deduplicatedBlocks, debug: debugInfo });
  } catch (error) {
    console.error('Error fetching maintenance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schedule/maintenance
 * Create a new scheduled maintenance check
 */
router.post('/maintenance', async (req, res) => {
  try {
    const { aircraftId, checkType, scheduledDate, startTime, repeat } = req.body;

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

    const worldMembershipId = membership.id;

    // Validate aircraft belongs to user's world
    const aircraft = await UserAircraft.findOne({
      where: {
        id: aircraftId,
        worldMembershipId: worldMembershipId
      }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found' });
    }

    // Validate check type and set duration
    if (!['daily', 'weekly', 'A', 'C', 'D'].includes(checkType)) {
      return res.status(400).json({ error: 'Invalid check type. Must be daily, weekly, A, C, or D' });
    }

    // Duration in minutes: daily=60 (1hr), weekly=135 (2.25hrs), A=540 (9hrs), C=30240 (21 days), D=108000 (75 days)
    const durationMap = { 'daily': 60, 'weekly': 135, 'A': 540, 'C': 30240, 'D': 108000 };
    const duration = durationMap[checkType];

    // Get day of week from scheduledDate
    const [year, month, day] = scheduledDate.split('-').map(Number);
    const baseDate = new Date(Date.UTC(year, month - 1, day));
    const dayOfWeek = baseDate.getUTCDay(); // 0=Sunday, 6=Saturday

    // Determine which day-of-week patterns to create
    const daysToSchedule = [];

    if (repeat) {
      if (checkType === 'daily') {
        // Daily checks: create pattern for every day of the week (0-6)
        for (let i = 0; i < 7; i++) {
          daysToSchedule.push(i);
        }
      } else if (['C', 'D'].includes(checkType)) {
        // C and D checks: one-time only (they take weeks/months and repeat yearly, not weekly)
        daysToSchedule.push(dayOfWeek);
      } else {
        // weekly/A checks: create pattern for the selected day only (weekly repeat)
        daysToSchedule.push(dayOfWeek);
      }
    } else {
      // Non-repeating: create pattern for just this day
      daysToSchedule.push(dayOfWeek);
    }

    console.log(`Creating recurring ${checkType} check patterns for days: ${daysToSchedule}`);

    // Calculate maintenance window in minutes
    const [maintH, maintM] = startTime.split(':').map(Number);
    const maintStartMinutes = maintH * 60 + maintM;
    const maintEndMinutes = maintStartMinutes + duration;

    // Check for conflicting flight templates on this day-of-week
    // Query templates that depart on this day OR whose arrival spills into this day
    const existingFlights = await ScheduledFlight.findAll({
      where: {
        aircraftId,
        isActive: true,
        dayOfWeek: dayOfWeek
      },
      include: [
        {
          model: Route,
          as: 'route',
          include: [
            { model: Airport, as: 'departureAirport' },
            { model: Airport, as: 'arrivalAirport' }
          ]
        },
        {
          model: UserAircraft,
          as: 'aircraft',
          include: [{ model: Aircraft, as: 'aircraft' }]
        }
      ]
    });

    // Check each existing flight for overlap with the maintenance window
    for (const existingFlight of existingFlights) {
      // Calculate existing flight's operation window
      const existingAcType = existingFlight.aircraft?.aircraft?.type || 'Narrowbody';
      const existingPax = existingFlight.aircraft?.aircraft?.passengerCapacity || 150;
      const existingDist = existingFlight.route?.distance || 0;

      // Calculate existing pre-flight duration
      let exCatering = 0;
      if (existingPax >= 50 && existingAcType !== 'Cargo') {
        if (existingPax < 100) exCatering = 5;
        else if (existingPax < 200) exCatering = 10;
        else exCatering = 15;
      }
      let exBoarding = 0;
      if (existingAcType !== 'Cargo') {
        if (existingPax < 50) exBoarding = 10;
        else if (existingPax < 100) exBoarding = 15;
        else if (existingPax < 200) exBoarding = 20;
        else if (existingPax < 300) exBoarding = 25;
        else exBoarding = 35;
      }
      let exFuelling = 0;
      if (existingDist < 500) exFuelling = 10;
      else if (existingDist < 1500) exFuelling = 15;
      else if (existingDist < 3000) exFuelling = 20;
      else exFuelling = 25;
      const exPreFlight = Math.max(exCatering + exBoarding, exFuelling);

      // Calculate existing post-flight duration
      let exDeboard = 0;
      if (existingAcType !== 'Cargo') {
        if (existingPax < 50) exDeboard = 5;
        else if (existingPax < 100) exDeboard = 8;
        else if (existingPax < 200) exDeboard = 12;
        else if (existingPax < 300) exDeboard = 15;
        else exDeboard = 20;
      }
      let exClean;
      if (existingPax < 50) exClean = 5;
      else if (existingPax < 100) exClean = 10;
      else if (existingPax < 200) exClean = 15;
      else if (existingPax < 300) exClean = 20;
      else exClean = 25;
      const exPostFlight = exDeboard + exClean;

      // Calculate flight operation window in minutes from midnight
      const [exDepH, exDepM] = existingFlight.departureTime.split(':').map(Number);
      const exDepMinutes = exDepH * 60 + exDepM;
      const flightOpStart = exDepMinutes - exPreFlight;

      const [exArrH, exArrM] = existingFlight.arrivalTime.split(':').map(Number);
      const exArrMinutes = exArrH * 60 + exArrM;
      // If flight spans overnight, add 24 hours per offset day to arrival
      let flightOpEnd = exArrMinutes + exPostFlight;
      if (existingFlight.arrivalDayOffset > 0) {
        flightOpEnd += existingFlight.arrivalDayOffset * 1440;
      }

      // Check for overlap
      const overlaps = maintStartMinutes < flightOpEnd && maintEndMinutes > flightOpStart;

      if (overlaps) {
        const depAirport = existingFlight.route?.departureAirport?.iataCode || existingFlight.route?.departureAirport?.icaoCode || '???';
        const arrAirport = existingFlight.route?.arrivalAirport?.iataCode || existingFlight.route?.arrivalAirport?.icaoCode || '???';
        const routeNum = existingFlight.route?.routeNumber || 'Unknown';
        const returnNum = existingFlight.route?.returnRouteNumber || '';

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const flightDay = dayNames[existingFlight.dayOfWeek] || 'Unknown';

        const checkNames = { 'daily': 'Daily Check', 'weekly': 'Weekly Check', 'A': 'A Check' };
        const checkName = checkNames[checkType] || `${checkType} Check`;

        return res.status(409).json({
          error: 'Schedule conflict detected',
          conflict: {
            type: 'flight',
            routeNumber: routeNum,
            returnRouteNumber: returnNum,
            departure: depAirport,
            arrival: arrAirport,
            dayOfWeek: existingFlight.dayOfWeek,
            departureTime: existingFlight.departureTime.substring(0, 5),
            arrivalTime: existingFlight.arrivalTime.substring(0, 5),
            message: `${checkName} conflicts with ${routeNum}/${returnNum} (${depAirport}→${arrAirport}) on ${flightDay} departing ${existingFlight.departureTime.substring(0, 5)}`
          }
        });
      }
    }

    // Create recurring maintenance patterns
    const createdPatterns = [];
    for (const day of daysToSchedule) {
      // Check for conflicts with other maintenance (same aircraft, overlapping time window)
      // For scheduled (one-time) maintenance, also check if the dates overlap
      const existingMaintenance = await RecurringMaintenance.findAll({
        where: {
          aircraftId,
          dayOfWeek: day,
          status: 'active'
        }
      });

      let maintConflict = null;
      for (const existing of existingMaintenance) {
        // For multi-day maintenance (C, D checks), check if date ranges overlap
        if (existing.scheduledDate) {
          const existingDateStr = existing.scheduledDate instanceof Date
            ? existing.scheduledDate.toISOString().split('T')[0]
            : String(existing.scheduledDate).split('T')[0];

          // Calculate when existing maintenance ends
          const existingStartDate = new Date(existingDateStr + 'T00:00:00Z');
          const existingDuration = existing.duration || 60;
          const existingDaysSpan = Math.ceil(existingDuration / 1440); // Days the maintenance spans
          const existingEndDate = new Date(existingStartDate);
          existingEndDate.setUTCDate(existingEndDate.getUTCDate() + existingDaysSpan);

          // Calculate when new maintenance would end
          const newStartDate = new Date(scheduledDate + 'T00:00:00Z');
          const newDaysSpan = Math.ceil(duration / 1440);
          const newEndDate = new Date(newStartDate);
          newEndDate.setUTCDate(newEndDate.getUTCDate() + newDaysSpan);

          // Check if date ranges overlap
          const datesOverlap = newStartDate < existingEndDate && newEndDate > existingStartDate;

          if (!datesOverlap) {
            // If dates don't overlap, this existing maintenance is not a conflict
            continue;
          }
        }

        // Check time overlap within the day
        const [exMaintH, exMaintM] = String(existing.startTime).split(':').map(Number);
        const exMaintStart = exMaintH * 60 + exMaintM;
        const exMaintEnd = exMaintStart + existing.duration;

        const overlaps = maintStartMinutes < exMaintEnd && maintEndMinutes > exMaintStart;
        if (overlaps) {
          maintConflict = existing;
          break;
        }
      }

      if (maintConflict) {
        console.log(`Conflict found for day ${day} at ${startTime} with existing maintenance on ${maintConflict.scheduledDate}, skipping`);
        continue;
      }

      // If this is a smaller check, check if there's a larger check on this day
      if (checkType === 'daily') {
        const weeklyCheckExists = await RecurringMaintenance.findOne({
          where: {
            aircraftId,
            dayOfWeek: day,
            checkType: 'weekly',
            status: 'active'
          }
        });

        if (weeklyCheckExists) {
          console.log(`Weekly check exists for day ${day}, skipping daily check`);
          continue;
        }
      }

      // Create recurring maintenance pattern
      console.log(`Creating maintenance pattern for day ${day} at ${startTime} on ${scheduledDate}`);
      const pattern = await RecurringMaintenance.create({
        aircraftId,
        checkType,
        dayOfWeek: day,
        scheduledDate,  // Include the specific date for display
        startTime,
        duration,
        status: 'active'
      });

      createdPatterns.push(pattern.id);
    }

    console.log(`Created ${createdPatterns.length} recurring maintenance patterns`);

    // If no patterns were created (all skipped due to conflicts), return an error
    if (createdPatterns.length === 0) {
      return res.status(409).json({
        error: 'No maintenance scheduled - conflicts with existing maintenance on this day/time'
      });
    }

    // Fetch complete pattern data
    const completePatternData = await RecurringMaintenance.findAll({
      where: {
        id: createdPatterns
      },
      include: [
        {
          model: UserAircraft,
          as: 'aircraft',
          include: [
            { model: Aircraft, as: 'aircraft' }
          ]
        }
      ]
    });

    console.log(`[MAINT] Returning ${completePatternData.length} patterns:`, completePatternData.map(p => ({
      id: p.id,
      checkType: p.checkType,
      scheduledDate: p.scheduledDate,
      dayOfWeek: p.dayOfWeek,
      startTime: p.startTime
    })));

    res.status(201).json(completePatternData);
  } catch (error) {
    console.error('Error creating recurring maintenance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/schedule/maintenance/:id
 * Delete a recurring maintenance pattern
 */
router.delete('/maintenance/:id', async (req, res) => {
  try {
    let { id } = req.params;

    // If ID is composite (uuid-YYYY-MM-DD format), extract the UUID
    // Use regex to safely detect a trailing date without corrupting valid UUIDs
    const dateSuffix = id.match(/-\d{4}-\d{2}-\d{2}$/);
    if (dateSuffix) {
      id = id.slice(0, id.length - dateSuffix[0].length);
    }

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

    const worldMembershipId = membership.id;

    // Find the recurring maintenance pattern and verify ownership
    const recurringMaintenance = await RecurringMaintenance.findByPk(id, {
      include: [
        {
          model: UserAircraft,
          as: 'aircraft',
          where: {
            worldMembershipId: worldMembershipId
          }
        }
      ]
    });

    if (!recurringMaintenance) {
      return res.status(404).json({ error: 'Recurring maintenance pattern not found' });
    }

    await recurringMaintenance.destroy();

    res.json({ message: 'Recurring maintenance pattern deleted successfully' });
  } catch (error) {
    console.error('Error deleting recurring maintenance:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/schedule/maintenance/aircraft/:aircraftId/type/:checkType
 * Delete all recurring maintenance patterns of a specific type for an aircraft
 */
router.delete('/maintenance/aircraft/:aircraftId/type/:checkType', async (req, res) => {
  try {
    const { aircraftId, checkType } = req.params;

    // Validate checkType
    if (!['weekly', 'A'].includes(checkType)) {
      return res.status(400).json({ error: 'Invalid check type. Must be weekly or A.' });
    }

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

    // Verify the aircraft belongs to this user
    const aircraft = await UserAircraft.findOne({
      where: {
        id: aircraftId,
        worldMembershipId: membership.id
      }
    });

    if (!aircraft) {
      return res.status(404).json({ error: 'Aircraft not found or not owned by user' });
    }

    // Delete all recurring maintenance of this type for this aircraft
    const deletedCount = await RecurringMaintenance.destroy({
      where: {
        aircraftId: aircraftId,
        checkType: checkType
      }
    });

    const checkTypeName = checkType === 'A' ? 'daily checks' : 'weekly checks';
    res.json({
      message: `All ${checkTypeName} deleted successfully`,
      deletedCount: deletedCount
    });
  } catch (error) {
    console.error('Error deleting all maintenance of type:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Compute virtual scheduledDate and arrivalDate from a template's dayOfWeek + arrivalDayOffset
 * relative to the current game date.
 */
function computeVirtualDates(template, worldTime) {
  const gameDayOfWeek = worldTime.getDay();
  const templateDow = template.dayOfWeek;

  // Calculate how many days ago (or today) this template's departure day was
  let daysAgo = (gameDayOfWeek - templateDow + 7) % 7;

  // If it's the same day of week, check if it has departed yet
  if (daysAgo === 0) {
    const gameTimeStr = worldTime.toTimeString().split(' ')[0];
    if (template.departureTime > gameTimeStr) {
      // Hasn't departed yet this week - this is from last week (or not active)
      daysAgo = 7;
    }
  }

  // The virtual departure date
  const depDate = new Date(worldTime);
  depDate.setDate(depDate.getDate() - daysAgo);
  const scheduledDate = depDate.toISOString().split('T')[0];

  // The virtual arrival date
  const arrDate = new Date(depDate);
  arrDate.setDate(arrDate.getDate() + (template.arrivalDayOffset || 0));
  const arrivalDate = arrDate.toISOString().split('T')[0];

  return { scheduledDate, arrivalDate };
}

/**
 * Find active flight templates for a given world time.
 * Returns templates that have departed but not yet completed their round-trip.
 */
async function findActiveTemplates(worldTime, membershipFilter) {
  const gameDayOfWeek = worldTime.getDay();
  const gameTimeStr = worldTime.toTimeString().split(' ')[0];

  // Build query conditions for active flights:
  // 1. Departed today and not yet completed (same-day or multi-day)
  // 2. Departed on previous days and arriving today or later (multi-day)
  const dayConditions = [
    // Departed today, still flying
    { dayOfWeek: gameDayOfWeek, departureTime: { [Op.lte]: gameTimeStr } }
  ];

  // Multi-day flights that departed on previous days
  for (let offset = 1; offset <= 3; offset++) {
    const pastDow = (gameDayOfWeek - offset + 7) % 7;
    dayConditions.push({
      dayOfWeek: pastDow,
      arrivalDayOffset: { [Op.gte]: offset }
    });
  }

  const templates = await ScheduledFlight.findAll({
    where: {
      isActive: true,
      [Op.or]: dayConditions
    },
    include: [
      {
        model: Route,
        as: 'route',
        required: true,
        where: membershipFilter,
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
            attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'latitude', 'longitude']
          }
        ]
      },
      {
        model: UserAircraft,
        as: 'aircraft',
        include: [
          {
            model: Aircraft,
            as: 'aircraft'
          }
        ]
      }
    ],
    order: [
      ['dayOfWeek', 'ASC'],
      ['departureTime', 'ASC']
    ]
  });

  // Filter out flights that have already completed their round-trip today
  return templates.filter(template => {
    const { scheduledDate, arrivalDate } = computeVirtualDates(template, worldTime);
    const currentDate = worldTime.toISOString().split('T')[0];

    // If arrival date is in the past, flight is completed
    if (arrivalDate < currentDate) return false;

    // If arrival date is today, check if arrival time has passed
    if (arrivalDate === currentDate && template.arrivalTime) {
      if (template.arrivalTime <= gameTimeStr) return false;
    }

    return true;
  });
}

/**
 * GET /api/schedule/active
 * Fetch all currently active (in-flight) templates for the user's airline
 */
router.get('/active', async (req, res) => {
  try {
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

    const worldTimeService = require('../services/worldTimeService');
    const worldTime = worldTimeService.getCurrentTime(activeWorldId) || new Date();

    const activeTemplates = await findActiveTemplates(worldTime, {
      worldMembershipId: membership.id
    });

    // Transform data for the map - compute virtual dates for compatibility
    const flights = activeTemplates.map(template => {
      const { scheduledDate, arrivalDate } = computeVirtualDates(template, worldTime);
      return {
        id: template.id,
        scheduledDate,
        departureTime: template.departureTime,
        arrivalTime: template.arrivalTime,
        arrivalDate,
        status: 'in_progress',
        route: {
          id: template.route.id,
          routeNumber: template.route.routeNumber,
          returnRouteNumber: template.route.returnRouteNumber,
          distance: template.route.distance,
          turnaroundTime: template.route.turnaroundTime || 45,
          techStopAirport: template.route.techStopAirport || null,
          demand: template.route.demand || 0,
          averageLoadFactor: parseFloat(template.route.averageLoadFactor) || 0
        },
        departureAirport: template.route.departureAirport,
        arrivalAirport: template.route.arrivalAirport,
        aircraft: template.aircraft ? {
          id: template.aircraft.id,
          registration: template.aircraft.registration,
          aircraftType: template.aircraft.aircraft,
          passengerCapacity: template.aircraft.aircraft?.passengerCapacity || 0
        } : null
      };
    });

    res.json({ flights });
  } catch (error) {
    console.error('Error fetching active flights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/schedule/active-all
 * Fetch all currently active (in-flight) templates for ALL airlines in the world
 */
router.get('/active-all', async (req, res) => {
  try {
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

    const userMembership = await WorldMembership.findOne({
      where: { userId: user.id, worldId: activeWorldId }
    });

    if (!userMembership) {
      return res.status(404).json({ error: 'Not a member of this world' });
    }

    const userMembershipId = userMembership.id;

    // Get all memberships in this world
    const allMemberships = await WorldMembership.findAll({
      where: { worldId: activeWorldId },
      attributes: ['id', 'airlineName', 'airlineCode']
    });

    const membershipIds = allMemberships.map(m => m.id);
    const membershipMap = new Map(allMemberships.map(m => [m.id, { airlineName: m.airlineName, airlineCode: m.airlineCode }]));

    const worldTimeService = require('../services/worldTimeService');
    const worldTime = worldTimeService.getCurrentTime(activeWorldId) || new Date();

    const activeTemplates = await findActiveTemplates(worldTime, {
      worldMembershipId: { [Op.in]: membershipIds }
    });

    // Transform data for the map, including airline info
    const flights = activeTemplates.map(template => {
      const membershipId = template.route.worldMembershipId;
      const airlineInfo = membershipMap.get(membershipId) || {};
      const isOwnFlight = membershipId === userMembershipId;
      const { scheduledDate, arrivalDate } = computeVirtualDates(template, worldTime);

      return {
        id: template.id,
        scheduledDate,
        departureTime: template.departureTime,
        arrivalTime: template.arrivalTime,
        arrivalDate,
        status: 'in_progress',
        isOwnFlight: isOwnFlight,
        airlineName: airlineInfo.airlineName || 'Unknown Airline',
        airlineCode: airlineInfo.airlineCode || '??',
        route: {
          id: template.route.id,
          routeNumber: template.route.routeNumber,
          returnRouteNumber: template.route.returnRouteNumber,
          distance: template.route.distance,
          turnaroundTime: template.route.turnaroundTime || 45,
          techStopAirport: template.route.techStopAirport || null,
          demand: template.route.demand || 0,
          averageLoadFactor: parseFloat(template.route.averageLoadFactor) || 0
        },
        departureAirport: template.route.departureAirport,
        arrivalAirport: template.route.arrivalAirport,
        aircraft: template.aircraft ? {
          id: template.aircraft.id,
          registration: template.aircraft.registration,
          aircraftType: template.aircraft.aircraft,
          passengerCapacity: template.aircraft.aircraft?.passengerCapacity || 0
        } : null
      };
    });

    res.json({ flights });
  } catch (error) {
    console.error('Error fetching all active flights:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/schedule/clear-all
 * Clear all scheduled flights and maintenance for the specified aircraft
 * Only clears schedules for aircraft owned by the user in the current world
 */
router.post('/clear-all', async (req, res) => {
  try {
    const { aircraftIds, mode = 'all' } = req.body;

    if (!aircraftIds || !Array.isArray(aircraftIds) || aircraftIds.length === 0) {
      return res.status(400).json({ error: 'Aircraft IDs are required' });
    }

    if (!['flights', 'maintenance', 'all'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode. Must be flights, maintenance, or all' });
    }

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

    const worldMembershipId = membership.id;

    // Verify all aircraft belong to this user's membership
    const ownedAircraft = await UserAircraft.findAll({
      where: {
        id: { [Op.in]: aircraftIds },
        worldMembershipId: worldMembershipId
      },
      attributes: ['id']
    });

    const ownedAircraftIds = ownedAircraft.map(a => a.id);

    if (ownedAircraftIds.length === 0) {
      return res.status(400).json({ error: 'No valid aircraft found to clear' });
    }

    const result = { aircraftCount: ownedAircraftIds.length };

    // Delete flights if mode is 'flights' or 'all'
    if (mode === 'flights' || mode === 'all') {
      result.flightsDeleted = await ScheduledFlight.destroy({
        where: { aircraftId: { [Op.in]: ownedAircraftIds } }
      });
    }

    // Delete maintenance if mode is 'maintenance' or 'all'
    if (mode === 'maintenance' || mode === 'all') {
      result.maintenanceDeleted = await RecurringMaintenance.destroy({
        where: { aircraftId: { [Op.in]: ownedAircraftIds } }
      });
    }

    console.log(`Cleared schedules (mode: ${mode}): flights=${result.flightsDeleted ?? 'skipped'}, maintenance=${result.maintenanceDeleted ?? 'skipped'} for ${ownedAircraftIds.length} aircraft`);

    res.json({
      message: 'Schedules cleared successfully',
      ...result
    });
  } catch (error) {
    console.error('Error clearing schedules:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
