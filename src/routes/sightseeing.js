const express = require('express');
const router = express.Router();
const { SightseeingTour, WorldMembership, Airport, UserAircraft, Aircraft, User } = require('../models');

// ── Helpers ──────────────────────────────────────────────────────────

/** Resolve the caller's membership for the active world, or null. */
async function getMembership(req) {
  const activeWorldId = req.session?.activeWorldId;
  if (!activeWorldId || !req.user) return null;
  const user = await User.findOne({ where: { vatsimId: req.user.vatsimId } });
  if (!user) return null;
  return WorldMembership.findOne({ where: { userId: user.id, worldId: activeWorldId } });
}

/** Great-circle distance in nautical miles. */
function haversineNm(lat1, lon1, lat2, lon2) {
  const R = 3440.065;
  const toRad = d => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Total round-trip distance: base -> waypoints (in order) -> base. */
function tourDistanceNm(base, waypoints) {
  const b = { lat: parseFloat(base.latitude), lng: parseFloat(base.longitude) };
  const pts = [b, ...waypoints.map(w => ({ lat: parseFloat(w.lat), lng: parseFloat(w.lng) })), b];
  let d = 0;
  for (let i = 1; i < pts.length; i++) {
    d += haversineNm(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng);
  }
  return d;
}

/** Flight minutes from distance + cruise speed (knots), rounded to 5 min. */
function tourDurationMin(distanceNm, cruiseSpeed) {
  const kts = cruiseSpeed > 0 ? cruiseSpeed : 200;
  const min = (distanceNm / kts) * 60;
  return Math.max(5, Math.round(min / 5) * 5);
}

/** Validate + normalise a waypoints array. Returns {ok, waypoints|error}. */
function normaliseWaypoints(raw) {
  if (!Array.isArray(raw) || raw.length < 1) {
    return { ok: false, error: 'A tour needs at least one scenic waypoint' };
  }
  if (raw.length > 25) {
    return { ok: false, error: 'A tour can have at most 25 waypoints' };
  }
  const waypoints = [];
  for (const w of raw) {
    const lat = parseFloat(w.lat);
    const lng = parseFloat(w.lng);
    if (!isFinite(lat) || !isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return { ok: false, error: 'Invalid waypoint coordinates' };
    }
    waypoints.push({ lat, lng, name: (w.name || '').toString().slice(0, 60) });
  }
  return { ok: true, waypoints };
}

// Serialise a tour (+ includes) for the client.
function serialiseTour(t) {
  const ac = t.assignedAircraft;
  return {
    id: t.id,
    name: t.name,
    baseAirportId: t.baseAirportId,
    baseAirport: t.baseAirport ? {
      id: t.baseAirport.id, icaoCode: t.baseAirport.icaoCode, name: t.baseAirport.name,
      latitude: t.baseAirport.latitude, longitude: t.baseAirport.longitude
    } : null,
    waypoints: t.waypoints || [],
    distanceNm: parseFloat(t.distanceNm),
    durationMin: t.durationMin,
    ticketPrice: parseFloat(t.ticketPrice),
    daysOfWeek: t.daysOfWeek,
    scheduledDepartureTime: t.scheduledDepartureTime,
    isActive: t.isActive,
    assignedAircraftId: t.assignedAircraftId,
    assignedAircraft: ac ? {
      id: ac.id, registration: ac.registration,
      manufacturer: ac.aircraft?.manufacturer, model: ac.aircraft?.model,
      cruiseSpeed: ac.aircraft?.cruiseSpeed, passengerCapacity: ac.aircraft?.passengerCapacity
    } : null,
    totalFlights: t.totalFlights,
    totalRevenue: parseFloat(t.totalRevenue),
    totalPassengers: t.totalPassengers,
    averageLoadFactor: parseFloat(t.averageLoadFactor)
  };
}

// ── Routes ───────────────────────────────────────────────────────────

/** List the airline's sightseeing tours. */
router.get('/', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const tours = await SightseeingTour.findAll({
      where: { worldMembershipId: membership.id },
      include: [
        { model: Airport, as: 'baseAirport' },
        { model: UserAircraft, as: 'assignedAircraft', include: [{ model: Aircraft, as: 'aircraft' }] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(tours.map(serialiseTour));
  } catch (err) {
    console.error('[sightseeing] list failed:', err);
    res.status(500).json({ error: 'Failed to load sightseeing tours' });
  }
});

/** Create a sightseeing tour. */
router.post('/', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const {
      name, baseAirportId, waypoints, ticketPrice,
      assignedAircraftId, scheduledDepartureTime, daysOfWeek
    } = req.body;

    if (!name || !name.trim()) return res.status(400).json({ error: 'Tour name is required' });
    if (!baseAirportId) return res.status(400).json({ error: 'A base airport is required' });
    const price = parseFloat(ticketPrice);
    if (!isFinite(price) || price < 0) return res.status(400).json({ error: 'A valid ticket price is required' });

    const wp = normaliseWaypoints(waypoints);
    if (!wp.ok) return res.status(400).json({ error: wp.error });

    const base = await Airport.findByPk(baseAirportId);
    if (!base) return res.status(404).json({ error: 'Base airport not found' });

    // Optional assigned aircraft — must be owned by this airline. Its speed sets
    // duration and its range must cover the whole loop (no refuelling en route).
    let aircraft = null;
    if (assignedAircraftId) {
      aircraft = await UserAircraft.findOne({
        where: { id: assignedAircraftId, worldMembershipId: membership.id },
        include: [{ model: Aircraft, as: 'aircraft' }]
      });
      if (!aircraft) return res.status(400).json({ error: 'Assigned aircraft not found in your fleet' });
    }

    const distanceNm = tourDistanceNm(base, wp.waypoints);
    if (aircraft && aircraft.aircraft?.rangeNm && distanceNm > parseFloat(aircraft.aircraft.rangeNm)) {
      return res.status(400).json({
        error: `Tour is ${Math.round(distanceNm)} nm — beyond the ${aircraft.aircraft.model}'s ${aircraft.aircraft.rangeNm} nm range. Shorten the route or pick a longer-range aircraft.`
      });
    }
    const durationMin = tourDurationMin(distanceNm, aircraft?.aircraft?.cruiseSpeed);

    const tour = await SightseeingTour.create({
      worldMembershipId: membership.id,
      name: name.trim().slice(0, 100),
      baseAirportId,
      waypoints: wp.waypoints,
      distanceNm: distanceNm.toFixed(2),
      durationMin,
      ticketPrice: price,
      assignedAircraftId: aircraft ? aircraft.id : null,
      scheduledDepartureTime: scheduledDepartureTime || null,
      daysOfWeek: Array.isArray(daysOfWeek) && daysOfWeek.length ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6],
      isActive: true
    });

    const full = await SightseeingTour.findByPk(tour.id, {
      include: [
        { model: Airport, as: 'baseAirport' },
        { model: UserAircraft, as: 'assignedAircraft', include: [{ model: Aircraft, as: 'aircraft' }] }
      ]
    });
    res.status(201).json({ success: true, tour: serialiseTour(full) });
  } catch (err) {
    console.error('[sightseeing] create failed:', err);
    res.status(500).json({ error: 'Failed to create sightseeing tour' });
  }
});

/** Update a tour (name, price, waypoints, aircraft, schedule, active). */
router.put('/:id', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const tour = await SightseeingTour.findOne({
      where: { id: req.params.id, worldMembershipId: membership.id }
    });
    if (!tour) return res.status(404).json({ error: 'Tour not found' });

    const { name, ticketPrice, waypoints, assignedAircraftId, scheduledDepartureTime, daysOfWeek, isActive } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'Tour name cannot be empty' });
      updates.name = name.trim().slice(0, 100);
    }
    if (ticketPrice !== undefined) {
      const price = parseFloat(ticketPrice);
      if (!isFinite(price) || price < 0) return res.status(400).json({ error: 'Invalid ticket price' });
      updates.ticketPrice = price;
    }
    if (scheduledDepartureTime !== undefined) updates.scheduledDepartureTime = scheduledDepartureTime || null;
    if (Array.isArray(daysOfWeek)) updates.daysOfWeek = daysOfWeek.length ? daysOfWeek : [0, 1, 2, 3, 4, 5, 6];
    if (isActive !== undefined) updates.isActive = !!isActive;

    // Recompute distance/duration if waypoints or aircraft changed.
    let aircraft = null;
    const newAircraftId = assignedAircraftId !== undefined ? assignedAircraftId : tour.assignedAircraftId;
    if (newAircraftId) {
      aircraft = await UserAircraft.findOne({
        where: { id: newAircraftId, worldMembershipId: membership.id },
        include: [{ model: Aircraft, as: 'aircraft' }]
      });
      if (!aircraft) return res.status(400).json({ error: 'Assigned aircraft not found in your fleet' });
    }
    if (assignedAircraftId !== undefined) updates.assignedAircraftId = aircraft ? aircraft.id : null;

    if (waypoints !== undefined || assignedAircraftId !== undefined) {
      const wpRaw = waypoints !== undefined ? waypoints : tour.waypoints;
      const wp = normaliseWaypoints(wpRaw);
      if (!wp.ok) return res.status(400).json({ error: wp.error });
      const base = await Airport.findByPk(tour.baseAirportId);
      const distanceNm = tourDistanceNm(base, wp.waypoints);
      if (aircraft && aircraft.aircraft?.rangeNm && distanceNm > parseFloat(aircraft.aircraft.rangeNm)) {
        return res.status(400).json({ error: `Tour is ${Math.round(distanceNm)} nm — beyond the aircraft's ${aircraft.aircraft.rangeNm} nm range.` });
      }
      updates.waypoints = wp.waypoints;
      updates.distanceNm = distanceNm.toFixed(2);
      updates.durationMin = tourDurationMin(distanceNm, aircraft?.aircraft?.cruiseSpeed);
    }

    await tour.update(updates);
    const full = await SightseeingTour.findByPk(tour.id, {
      include: [
        { model: Airport, as: 'baseAirport' },
        { model: UserAircraft, as: 'assignedAircraft', include: [{ model: Aircraft, as: 'aircraft' }] }
      ]
    });
    res.json({ success: true, tour: serialiseTour(full) });
  } catch (err) {
    console.error('[sightseeing] update failed:', err);
    res.status(500).json({ error: 'Failed to update sightseeing tour' });
  }
});

/** Delete a tour. */
router.delete('/:id', async (req, res) => {
  try {
    const membership = await getMembership(req);
    if (!membership) return res.status(404).json({ error: 'Not a member of this world' });

    const deleted = await SightseeingTour.destroy({
      where: { id: req.params.id, worldMembershipId: membership.id }
    });
    if (!deleted) return res.status(404).json({ error: 'Tour not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('[sightseeing] delete failed:', err);
    res.status(500).json({ error: 'Failed to delete sightseeing tour' });
  }
});

module.exports = router;
