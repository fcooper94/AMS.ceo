/**
 * Airway Routing Service
 * Builds a navigational graph from X-Plane airway data and SID/STAR procedures,
 * then computes realistic IFR routes using FIR-segment-based pathfinding.
 *
 * Algorithm:
 * 1. Walk the great circle and detect FIR boundary crossings
 * 2. For each FIR segment, find entry/exit airway fixes
 * 3. FRA (Free Route Airspace) FIRs: entry → exit (DCT)
 * 4. Non-FRA FIRs: NBA* graph pathfind between entry/exit with corridor penalty
 * 5. Stitch all segments together with DEP/ARR markers
 */

const fs = require('fs');
const path = require('path');
const createGraph = require('ngraph.graph');
const { nba } = require('ngraph.path');
const { getFirForPoint } = require('./geoService');

// Navdata file paths
const AWY_FILE = path.join(__dirname, '../data/navdata/earth_awy.dat');
const FIX_FILE = path.join(__dirname, '../data/navdata/earth_fix.dat');
const PROC_FILE = path.join(__dirname, '../data/navdata/procedures.json');

// Constants
const MIN_ROUTE_DISTANCE_NM = 150;
const SNAP_RADIUS_NM = 60;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_NM = 3440.065;
const GRID_CELL_SIZE = 2;

// Graph routing constants
const MAX_DEPARTURE_CONNECTIONS = 5;
const MAX_ARRIVAL_CONNECTIONS = 5;
const DCT_SEARCH_RADIUS_NM = 150;
const DCT_FALLBACK_COUNT = 5;
const MAX_ROUTE_RATIO = 2.0;
const CORRIDOR_PENALTY = 0.8;
const SMOOTH_TURN_THRESHOLD = 85; // degrees — remove waypoints causing turns sharper than this
const ZIGZAG_CUMULATIVE_THRESHOLD = 120; // degrees — max combined turn over 2 consecutive turns in opposite directions
const MIN_WAYPOINT_SPACING_NM = 15; // minimum distance between consecutive waypoints

// FIR sampling for crossing detection
const FIR_SAMPLE_INTERVAL_NM = 30;
const FIR_BINARY_SEARCH_ITERATIONS = 5;
const SHORT_SEGMENT_NM = 80; // Segments shorter than this are treated as FRA

// Free Route Airspace FIR prefixes (real-world, sub-sector suffixes stripped)
const FRA_FIR_PREFIXES = new Set([
  // Central/Eastern Europe
  'LHCC', 'EPWW', 'LRBB', 'LBSR', 'LKAA', 'LZBB',
  // Baltic
  'EETT', 'EYVL', 'EVRR',
  // Central Europe
  'LOVV', 'LJLA', 'LDZO',
  // Italy
  'LIPP', 'LIMM', 'LIBB', 'LIRR',
  // Nordics
  'ENOB', 'ENOR', 'ENOS', 'ENSV', 'ENBD',
  'ESAA', 'ESMM', 'ESOS', 'EKDK', 'EFIN',
  // Iberia / Atlantic
  'LPPC', 'LECB', 'LECM', 'LECS',
  // Benelux / Maastricht UAC
  'EDXX', 'EBBU', 'EHAA',
  // Ireland / Iceland
  'EIDW', 'EISN', 'BIRD',
  // Southeast Europe
  'LYBA', 'LWSS', 'LAAA', 'LQSB', 'LUUU',
  // Cyprus / Malta
  'LCCC', 'LMMM',
]);

class AirwayService {
  constructor() {
    this.fixes = new Map();       // fixId → {lat, lng} (last seen)
    this.fixesByName = new Map(); // fixId → [{lat, lng}, ...] (all locations)
    this.graphFixes = new Set();  // fixIds that are part of an airway
    this.spatialGrid = new Map(); // 'gridX,gridY' → [{id, lat, lng}, ...]

    // Graph-based pathfinding
    this.graph = null;
    this.pathFinder = null;
    this.procedures = null;       // ICAO → { sids: {}, stars: {} }
    this._routeContext = null;    // Set during pathfinding for corridor bias

    this.ready = false;
    this.routeCache = new Map();
    this.maxCacheSize = 5000;
  }

  initialize() {
    setImmediate(async () => {
      try {
        const startTime = Date.now();
        this._parseFixes();
        this._parseAirways();
        this._buildSpatialGrid();
        this._initPathFinder();
        this._loadProcedures();
        this.ready = true;
        const elapsed = Date.now() - startTime;
        console.log(`[Airway] Ready in ${elapsed}ms: ${this.fixes.size} fixes, ${this.graphFixes.size} on airways, graph: ${this.graph.getNodesCount()} nodes / ${this.graph.getLinksCount()} links`);

        this.backfillMissingWaypoints();
      } catch (err) {
        console.error('[Airway] Failed to initialize:', err.message);
      }
    });
  }

  async backfillMissingWaypoints() {
    try {
      const Route = require('../models/Route');
      const Airport = require('../models/Airport');

      // Single joined query — fetches routes + airports in one go (instead of 2 queries per route)
      const routes = await Route.findAll({
        where: { isActive: true, waypoints: null },
        attributes: ['id'],
        include: [
          { model: Airport, as: 'departureAirport', attributes: ['latitude', 'longitude', 'icaoCode'] },
          { model: Airport, as: 'arrivalAirport', attributes: ['latitude', 'longitude', 'icaoCode'] }
        ]
      });

      if (routes.length === 0) {
        console.log('[Airway] All active routes already have waypoints');
        return;
      }

      const startTime = Date.now();
      console.log(`[Airway] Backfilling waypoints for ${routes.length} routes...`);
      let computed = 0;
      let skipped = 0;

      // Compute waypoints and batch DB updates (10 at a time)
      const BATCH_SIZE = 10;
      for (let i = 0; i < routes.length; i += BATCH_SIZE) {
        const batch = routes.slice(i, i + BATCH_SIZE);
        const updates = [];

        for (const route of batch) {
          const dep = route.departureAirport;
          const arr = route.arrivalAirport;
          if (!dep || !arr) { skipped++; continue; }

          try {
            const waypoints = this.computeRoute(
              parseFloat(dep.latitude), parseFloat(dep.longitude),
              parseFloat(arr.latitude), parseFloat(arr.longitude),
              dep.icaoCode, arr.icaoCode
            );
            if (waypoints) {
              updates.push(route.update({ waypoints }));
              computed++;
            } else {
              skipped++;
            }
          } catch (e) {
            skipped++;
          }
        }

        // Batch the DB writes for this group
        if (updates.length > 0) await Promise.all(updates);
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`[Airway] Backfill complete in ${elapsed}s: ${computed} computed, ${skipped} skipped`);
    } catch (err) {
      console.error('[Airway] Backfill failed:', err.message);
    }
  }

  isReady() {
    return this.ready;
  }

  // ─── Data Parsing ──────────────────────────────────────────────────────────

  _parseFixes() {
    const data = fs.readFileSync(FIX_FILE, 'utf8');
    const lines = data.split('\n');
    let count = 0;

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '99') continue;

      const parts = line.split(/\s+/);
      if (parts.length < 3) continue;

      const lat = parseFloat(parts[0]);
      const lng = parseFloat(parts[1]);
      const id = parts[2];

      if (isNaN(lat) || isNaN(lng) || !id) continue;

      this.fixes.set(id, { lat, lng });
      if (!this.fixesByName.has(id)) this.fixesByName.set(id, []);
      this.fixesByName.get(id).push({ lat, lng });
      count++;
    }

    console.log(`[Airway] Parsed ${count} fixes (${this.fixesByName.size} unique names)`);
  }

  _parseAirways() {
    this.graph = createGraph();
    const data = fs.readFileSync(AWY_FILE, 'utf8');
    const lines = data.split('\n');
    let segmentCount = 0;

    for (let i = 3; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line === '99') continue;

      const parts = line.split(/\s+/);
      if (parts.length < 10) continue;

      const startId = parts[0];
      const startLat = parseFloat(parts[1]);
      const startLng = parseFloat(parts[2]);
      const endId = parts[3];
      const endLat = parseFloat(parts[4]);
      const endLng = parseFloat(parts[5]);

      if (isNaN(startLat) || isNaN(endLat)) continue;

      this.graphFixes.add(startId);
      this.graphFixes.add(endId);

      if (!this.fixes.has(startId)) {
        this.fixes.set(startId, { lat: startLat, lng: startLng });
      }
      if (!this.fixes.has(endId)) {
        this.fixes.set(endId, { lat: endLat, lng: endLng });
      }

      if (!this.graph.getNode(startId)) {
        this.graph.addNode(startId, { lat: startLat, lng: startLng });
      }
      if (!this.graph.getNode(endId)) {
        this.graph.addNode(endId, { lat: endLat, lng: endLng });
      }

      const dist = this._haversine(startLat, startLng, endLat, endLng);
      if (!this.graph.hasLink(startId, endId)) {
        this.graph.addLink(startId, endId, { weight: dist });
      }
      if (!this.graph.hasLink(endId, startId)) {
        this.graph.addLink(endId, startId, { weight: dist });
      }

      segmentCount++;
    }

    console.log(`[Airway] Parsed ${segmentCount} segments, graph: ${this.graph.getNodesCount()} nodes, ${this.graph.getLinksCount()} links`);
  }

  _buildSpatialGrid() {
    this.fixes.forEach((coords, id) => {
      const cellX = Math.floor(coords.lat / GRID_CELL_SIZE);
      const cellY = Math.floor(coords.lng / GRID_CELL_SIZE);
      const key = `${cellX},${cellY}`;

      if (!this.spatialGrid.has(key)) {
        this.spatialGrid.set(key, []);
      }
      this.spatialGrid.get(key).push({ id, lat: coords.lat, lng: coords.lng });
    });
  }

  // ─── Graph Pathfinding Setup ───────────────────────────────────────────────

  _initPathFinder() {
    if (!this.graph) return;

    this.pathFinder = nba(this.graph, {
      distance: (fromNode, toNode, link) => {
        let cost = link.data.weight;
        const ctx = this._routeContext;
        if (ctx) {
          const midLat = (fromNode.data.lat + toNode.data.lat) / 2;
          const midLng = (fromNode.data.lng + toNode.data.lng) / 2;
          const ctd = this._crossTrackNm(midLat, midLng, ctx.depLat, ctx.depLng, ctx.arrLat, ctx.arrLng, ctx.bearing12);
          cost += ctd * CORRIDOR_PENALTY;
        }
        return cost;
      },
      heuristic: (fromNode, toNode) => {
        return this._haversine(fromNode.data.lat, fromNode.data.lng, toNode.data.lat, toNode.data.lng);
      }
    });

    console.log('[Airway] NBA* pathfinder initialized');
  }

  // ─── SID/STAR Procedure Loading ────────────────────────────────────────────

  _loadProcedures() {
    if (!fs.existsSync(PROC_FILE)) {
      console.log('[Airway] No procedures.json found, SID/STAR routing disabled');
      return;
    }

    const data = fs.readFileSync(PROC_FILE, 'utf8');
    this.procedures = JSON.parse(data);

    let sidCount = 0, starCount = 0;
    for (const procs of Object.values(this.procedures)) {
      sidCount += Object.keys(procs.sids || {}).length;
      starCount += Object.keys(procs.stars || {}).length;
    }

    console.log(`[Airway] Loaded procedures: ${Object.keys(this.procedures).length} airports, ${sidCount} SIDs, ${starCount} STARs`);
  }

  // ─── Route Computation (FIR-Segment Based) ─────────────────────────────────

  /**
   * Compute a route between two coordinates using FIR-segment-based routing.
   * @returns {Array|null} [{lat, lng, name}, ...] or null
   */
  computeRoute(depLat, depLng, arrLat, arrLng, depIcao, arrIcao) {
    if (!this.ready) return null;

    const directDistance = this._haversine(depLat, depLng, arrLat, arrLng);
    if (directDistance < MIN_ROUTE_DISTANCE_NM) return null;

    const cacheKey = depIcao && arrIcao
      ? `${depIcao}-${arrIcao}`
      : `${depLat.toFixed(2)},${depLng.toFixed(2)}-${arrLat.toFixed(2)},${arrLng.toFixed(2)}`;

    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey);
    }

    const routeLabel = `${depIcao || '?'}-${arrIcao || '?'} (${Math.round(directDistance)}nm)`;
    let result = null;

    // Primary: FIR-segment-based routing
    if (this.graph && this.pathFinder) {
      try {
        result = this._computeFirSegmentRoute(depLat, depLng, arrLat, arrLng, depIcao, arrIcao);
      } catch (err) {
        console.error(`[Airway] ${routeLabel}: FIR segment routing failed:`, err.message);
      }
    }

    // Fallback: basic great circle with coordinate waypoints
    if (!result) {
      console.warn(`[Airway] ${routeLabel}: falling back to basic great circle waypoints`);
      result = this._computeBasicGreatCircleRoute(depLat, depLng, arrLat, arrLng);
    }

    // Only cache successful results
    if (result) {
      this._cacheResult(cacheKey, result);
    }
    return result;
  }

  // ─── FIR Segment Main Algorithm ────────────────────────────────────────────

  /**
   * Main FIR-segment routing algorithm:
   * 1. Detect FIR crossings along the great circle
   * 2. Build ordered FIR segments
   * 3. Route each segment (FRA = DCT, non-FRA = airway graph)
   * 4. Stitch together with deduplication
   */
  _computeFirSegmentRoute(depLat, depLng, arrLat, arrLng, depIcao, arrIcao) {
    const crossings = this._detectFirCrossings(depLat, depLng, arrLat, arrLng);
    const segments = this._buildFirSegments(crossings, depLat, depLng, arrLat, arrLng);

    // Route each segment
    const rawWaypoints = [];

    for (const seg of segments) {
      const segDist = this._haversine(seg.entryLat, seg.entryLng, seg.exitLat, seg.exitLng);
      const isOceanic = !seg.firCode;
      const isFra = isOceanic || this._isFraFir(seg.firCode);

      let segWps;
      if (seg.isDeparture) {
        segWps = this._routeDepartureSegment(seg, depLat, depLng, depIcao, arrLat, arrLng);
      } else if (seg.isArrival) {
        segWps = this._routeArrivalSegment(seg, arrLat, arrLng, arrIcao);
      } else if (isFra || segDist < SHORT_SEGMENT_NM) {
        segWps = this._routeFraSegment(seg);
      } else {
        segWps = this._routeAirwaySegment(seg);
      }

      rawWaypoints.push(...segWps);
    }

    // Assemble with DEP/ARR markers and deduplicate
    const waypoints = [{ lat: depLat, lng: depLng, name: 'DEP' }];
    const usedNames = new Set(['DEP']);

    for (const wp of rawWaypoints) {
      const last = waypoints[waypoints.length - 1];
      // Skip duplicate names (except coordinate labels)
      if (wp.name && usedNames.has(wp.name) && !wp.name.match(/^\d/)) continue;
      // Skip points too close to previous (prevents clustering at FIR boundaries)
      if (last && this._haversine(last.lat, last.lng, wp.lat, wp.lng) < MIN_WAYPOINT_SPACING_NM) continue;
      waypoints.push(wp);
      if (wp.name) usedNames.add(wp.name);
    }

    waypoints.push({ lat: arrLat, lng: arrLng, name: 'ARR' });

    // Remove waypoints that cause sharp turns (backtracking)
    const smoothed = this._smoothRoute(waypoints);

    // Validate total route distance
    const directDistance = this._haversine(depLat, depLng, arrLat, arrLng);
    let totalDist = 0;
    for (let i = 0; i < smoothed.length - 1; i++) {
      totalDist += this._haversine(smoothed[i].lat, smoothed[i].lng, smoothed[i + 1].lat, smoothed[i + 1].lng);
    }
    if (totalDist > directDistance * MAX_ROUTE_RATIO) {
      console.warn(`[Airway] FIR segment route rejected: ${Math.round(totalDist)}nm vs ${Math.round(directDistance)}nm direct`);
      return null;
    }

    return smoothed.length > 2 ? smoothed : null;
  }

  // ─── FIR Crossing Detection ────────────────────────────────────────────────

  /**
   * Walk the great circle and detect FIR boundary crossings.
   * Uses binary search to pinpoint each crossing to ~1nm precision.
   * @returns {Array} [{lat, lng, fromFir, toFir, fraction}, ...] ordered by fraction
   */
  _detectFirCrossings(depLat, depLng, arrLat, arrLng) {
    const directDist = this._haversine(depLat, depLng, arrLat, arrLng);
    const numSamples = Math.max(5, Math.floor(directDist / FIR_SAMPLE_INTERVAL_NM));
    const crossings = [];

    let prevFir = null;
    try { prevFir = getFirForPoint(depLat, depLng); } catch (e) { /* ignore */ }

    let prevFrac = 0;

    for (let i = 1; i <= numSamples; i++) {
      const frac = i / numSamples;
      const pt = (i === numSamples)
        ? { lat: arrLat, lng: arrLng }
        : this._interpolateGreatCircle(depLat, depLng, arrLat, arrLng, frac);

      let curFir = null;
      try { curFir = getFirForPoint(pt.lat, pt.lng); } catch (e) { /* ignore */ }

      if (curFir !== prevFir) {
        // Binary search for precise crossing point
        let lo = prevFrac, hi = frac;
        let crossPt = pt;
        for (let b = 0; b < FIR_BINARY_SEARCH_ITERATIONS; b++) {
          const mid = (lo + hi) / 2;
          const midPt = this._interpolateGreatCircle(depLat, depLng, arrLat, arrLng, mid);
          let midFir = null;
          try { midFir = getFirForPoint(midPt.lat, midPt.lng); } catch (e) { /* ignore */ }
          if (midFir === prevFir) {
            lo = mid;
          } else {
            hi = mid;
            crossPt = midPt;
          }
        }

        crossings.push({
          lat: crossPt.lat,
          lng: crossPt.lng,
          fromFir: prevFir,
          toFir: curFir,
          fraction: (lo + hi) / 2
        });
        prevFir = curFir;
      }

      prevFrac = frac;
    }

    return crossings;
  }

  /**
   * Build ordered FIR segments from crossing points.
   * @returns {Array} [{firCode, entryLat, entryLng, exitLat, exitLng, isDeparture, isArrival}, ...]
   */
  _buildFirSegments(crossings, depLat, depLng, arrLat, arrLng) {
    let depFir = null;
    try { depFir = getFirForPoint(depLat, depLng); } catch (e) { /* ignore */ }

    const segments = [];

    if (crossings.length === 0) {
      // Entire route within one FIR
      segments.push({
        firCode: depFir,
        entryLat: depLat, entryLng: depLng,
        exitLat: arrLat, exitLng: arrLng,
        isDeparture: true, isArrival: true
      });
      return segments;
    }

    // First segment: departure → first crossing
    segments.push({
      firCode: depFir,
      entryLat: depLat, entryLng: depLng,
      exitLat: crossings[0].lat, exitLng: crossings[0].lng,
      isDeparture: true, isArrival: false
    });

    // Intermediate and final segments
    for (let i = 0; i < crossings.length; i++) {
      const isLast = i === crossings.length - 1;
      const nextExit = isLast
        ? { lat: arrLat, lng: arrLng }
        : { lat: crossings[i + 1].lat, lng: crossings[i + 1].lng };

      segments.push({
        firCode: crossings[i].toFir,
        entryLat: crossings[i].lat, entryLng: crossings[i].lng,
        exitLat: nextExit.lat, exitLng: nextExit.lng,
        isDeparture: false, isArrival: isLast
      });
    }

    return segments;
  }

  // ─── Per-Segment Routing ───────────────────────────────────────────────────

  /**
   * Check if a FIR is Free Route Airspace.
   */
  _isFraFir(firCode) {
    if (!firCode) return false;
    if (FRA_FIR_PREFIXES.has(firCode)) return true;
    const base = firCode.split('-')[0];
    return FRA_FIR_PREFIXES.has(base);
  }

  /**
   * Route the departure FIR segment: airport → FIR boundary exit.
   * Uses SID connections if available, then graph pathfind to exit fix.
   */
  _routeDepartureSegment(seg, depLat, depLng, depIcao, arrLat, arrLng) {
    const waypoints = [];
    const isFra = !seg.firCode || this._isFraFir(seg.firCode);
    const exitFix = this._findBestBoundaryFix(seg.exitLat, seg.exitLng);

    // If this segment is also the arrival (same FIR), handle specially
    if (seg.isArrival) {
      return this._routeSingleFirSegment(seg, depLat, depLng, depIcao, null, arrLat, arrLng);
    }

    if (!exitFix) {
      // No fix near boundary - coordinate label
      waypoints.push({ lat: seg.exitLat, lng: seg.exitLng, name: this._coordLabel(seg.exitLat, seg.exitLng) });
      return waypoints;
    }

    const depConns = this._getDepartureConnections(depLat, depLng, depIcao);

    if (isFra) {
      // FRA departure: SID waypoints → DCT to exit
      if (depConns.length > 0) {
        for (const wp of depConns[0].waypoints) {
          waypoints.push({ lat: wp.lat, lng: wp.lng, name: wp.name, type: 'sid' });
        }
      }
      const last = waypoints[waypoints.length - 1];
      if (!last || last.name !== exitFix.id) {
        waypoints.push({ lat: exitFix.lat, lng: exitFix.lng, name: exitFix.id });
      }
    } else {
      // Non-FRA departure: SID → graph pathfind → exit fix
      // Use dep→exit corridor to keep routing in the right direction
      let bestWps = null;
      let bestCost = Infinity;

      for (const conn of depConns) {
        if (conn.fixName === exitFix.id) {
          const cost = conn.cost || 0;
          if (cost < bestCost) {
            bestCost = cost;
            bestWps = conn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'sid' }));
          }
          continue;
        }

        const path = this._graphPathfindSegment(conn.fixName, exitFix.id, depLat, depLng, seg.exitLat, seg.exitLng);
        if (path) {
          const cost = (conn.cost || 0) + path.cost;
          if (cost < bestCost) {
            bestCost = cost;
            bestWps = [
              ...conn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'sid' })),
              ...path.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'enroute' }))
            ];
          }
        }
      }

      if (bestWps) {
        waypoints.push(...bestWps);
      } else {
        // Fallback: just the exit fix
        waypoints.push({ lat: exitFix.lat, lng: exitFix.lng, name: exitFix.id });
      }
    }

    return waypoints;
  }

  /**
   * Route the arrival FIR segment: FIR boundary entry → airport.
   * Uses graph pathfind from entry to STAR connections if available.
   */
  _routeArrivalSegment(seg, arrLat, arrLng, arrIcao) {
    const waypoints = [];
    const isFra = !seg.firCode || this._isFraFir(seg.firCode);
    const entryFix = this._findBestBoundaryFix(seg.entryLat, seg.entryLng);

    if (!entryFix) {
      waypoints.push({ lat: seg.entryLat, lng: seg.entryLng, name: this._coordLabel(seg.entryLat, seg.entryLng) });
      return waypoints;
    }

    const arrConns = this._getArrivalConnections(arrLat, arrLng, arrIcao);

    if (isFra) {
      // FRA arrival: entry fix → DCT → STAR
      waypoints.push({ lat: entryFix.lat, lng: entryFix.lng, name: entryFix.id });
      if (arrConns.length > 0) {
        for (const wp of arrConns[0].waypoints) {
          const last = waypoints[waypoints.length - 1];
          if (last && last.name === wp.name) continue;
          waypoints.push({ lat: wp.lat, lng: wp.lng, name: wp.name, type: 'star' });
        }
      }
    } else {
      // Non-FRA arrival: entry fix → graph pathfind → STAR
      // Use entry→arr corridor to keep routing in the right direction
      let bestWps = null;
      let bestCost = Infinity;

      for (const conn of arrConns) {
        if (conn.fixName === entryFix.id) {
          const cost = conn.cost || 0;
          if (cost < bestCost) {
            bestCost = cost;
            bestWps = conn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'star' }));
          }
          continue;
        }

        const path = this._graphPathfindSegment(entryFix.id, conn.fixName, seg.entryLat, seg.entryLng, arrLat, arrLng);
        if (path) {
          const cost = path.cost + (conn.cost || 0);
          if (cost < bestCost) {
            bestCost = cost;
            bestWps = [
              ...path.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'enroute' })),
              ...conn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'star' }))
            ];
          }
        }
      }

      if (bestWps) {
        waypoints.push(...bestWps);
      } else {
        // Fallback: just the entry fix
        waypoints.push({ lat: entryFix.lat, lng: entryFix.lng, name: entryFix.id });
      }
    }

    return waypoints;
  }

  /**
   * Route when entire route is within a single FIR (departure + arrival combined).
   */
  _routeSingleFirSegment(seg, depLat, depLng, depIcao, arrIcao, arrLat, arrLng) {
    const waypoints = [];
    const isFra = !seg.firCode || this._isFraFir(seg.firCode);

    const depConns = this._getDepartureConnections(depLat, depLng, depIcao);
    const arrConns = this._getArrivalConnections(arrLat, arrLng, arrIcao);

    if (isFra) {
      // FRA: SID waypoints → DCT → STAR waypoints
      if (depConns.length > 0) {
        for (const wp of depConns[0].waypoints) {
          waypoints.push({ lat: wp.lat, lng: wp.lng, name: wp.name, type: 'sid' });
        }
      }
      if (arrConns.length > 0) {
        for (const wp of arrConns[0].waypoints) {
          const last = waypoints[waypoints.length - 1];
          if (last && last.name === wp.name) continue;
          waypoints.push({ lat: wp.lat, lng: wp.lng, name: wp.name, type: 'star' });
        }
      }
    } else {
      // Non-FRA: SID exit → graph → STAR entry
      // Use dep→arr corridor (same as overall GC for single-FIR routes)
      let bestWps = null;
      let bestCost = Infinity;

      for (const depConn of depConns) {
        for (const arrConn of arrConns) {
          if (depConn.fixName === arrConn.fixName) {
            const cost = (depConn.cost || 0) + (arrConn.cost || 0);
            if (cost < bestCost) {
              bestCost = cost;
              bestWps = [
                ...depConn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'sid' })),
                ...arrConn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'star' }))
              ];
            }
            continue;
          }

          const path = this._graphPathfindSegment(depConn.fixName, arrConn.fixName, depLat, depLng, arrLat, arrLng);
          if (path) {
            const cost = (depConn.cost || 0) + path.cost + (arrConn.cost || 0);
            if (cost < bestCost) {
              bestCost = cost;
              bestWps = [
                ...depConn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'sid' })),
                ...path.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'enroute' })),
                ...arrConn.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'star' }))
              ];
            }
          }
        }
      }

      if (bestWps) {
        waypoints.push(...bestWps);
      }
    }

    return waypoints;
  }

  /**
   * Route an FRA FIR segment: just entry and exit fixes (DCT between them).
   */
  _routeFraSegment(seg) {
    const waypoints = [];
    const entryFix = this._findBestBoundaryFix(seg.entryLat, seg.entryLng);
    const exitFix = this._findBestBoundaryFix(seg.exitLat, seg.exitLng);

    if (entryFix) {
      waypoints.push({ lat: entryFix.lat, lng: entryFix.lng, name: entryFix.id });
    } else {
      waypoints.push({ lat: seg.entryLat, lng: seg.entryLng, name: this._coordLabel(seg.entryLat, seg.entryLng) });
    }

    if (exitFix && (!entryFix || exitFix.id !== entryFix.id)) {
      waypoints.push({ lat: exitFix.lat, lng: exitFix.lng, name: exitFix.id });
    } else if (!exitFix) {
      const label = this._coordLabel(seg.exitLat, seg.exitLng);
      if (waypoints.length === 0 || waypoints[waypoints.length - 1].name !== label) {
        waypoints.push({ lat: seg.exitLat, lng: seg.exitLng, name: label });
      }
    }

    return waypoints;
  }

  /**
   * Route a non-FRA FIR segment: graph pathfind between entry and exit fixes.
   * Falls back to FRA-style DCT if pathfinding fails.
   */
  _routeAirwaySegment(seg) {
    const entryFix = this._findBestBoundaryFix(seg.entryLat, seg.entryLng);
    const exitFix = this._findBestBoundaryFix(seg.exitLat, seg.exitLng);

    if (!entryFix || !exitFix) {
      return this._routeFraSegment(seg);
    }

    if (entryFix.id === exitFix.id) {
      return [{ lat: entryFix.lat, lng: entryFix.lng, name: entryFix.id, type: 'enroute' }];
    }

    // Use segment-local corridor (entry→exit) instead of overall GC
    const path = this._graphPathfindSegment(entryFix.id, exitFix.id, seg.entryLat, seg.entryLng, seg.exitLat, seg.exitLng);

    if (path && path.waypoints.length > 0) {
      return path.waypoints.map(w => ({ lat: w.lat, lng: w.lng, name: w.name, type: 'enroute' }));
    }

    // Graph pathfind failed - fall back to FRA-style DCT for this segment
    return this._routeFraSegment(seg);
  }

  // ─── Boundary Fix & Segment Pathfinding Helpers ────────────────────────────

  /**
   * Find the best airway fix near a FIR boundary crossing point.
   * Tries progressively wider radii: 30nm → 60nm → 100nm.
   */
  _findBestBoundaryFix(lat, lng) {
    const radii = [30, 60, 100];
    for (const radius of radii) {
      const fixes = this._findNearestAirwayFixes(lat, lng, radius, 3);
      if (fixes.length > 0) {
        // Prefer graph-connected fixes
        const graphFix = fixes.find(f => this.graph.getNode(f.id));
        return graphFix || fixes[0];
      }
    }
    return null;
  }

  /**
   * Remove waypoints that cause sharp turns (backtracking).
   * Iterates up to 3 passes to catch cascading sharp turns.
   */
  _smoothRoute(waypoints) {
    if (waypoints.length < 3) return waypoints;

    let result = waypoints;

    // Pass 1: Remove individual sharp turns and zigzag patterns
    for (let pass = 0; pass < 3; pass++) {
      const filtered = [result[0]]; // Always keep DEP
      let removed = 0;

      for (let i = 1; i < result.length - 1; i++) {
        const prev = filtered[filtered.length - 1];
        const curr = result[i];
        const next = result[i + 1];

        const bearingIn = this._bearing(prev.lat, prev.lng, curr.lat, curr.lng);
        const bearingOut = this._bearing(curr.lat, curr.lng, next.lat, next.lng);

        let turnAngle = Math.abs(bearingOut - bearingIn);
        if (turnAngle > 180) turnAngle = 360 - turnAngle;

        // Check 1: Individual sharp turn
        if (turnAngle > SMOOTH_TURN_THRESHOLD) {
          removed++;
          continue;
        }

        // Check 2: Zigzag detection — two consecutive turns in opposite directions
        // If this turn + the next turn are in opposite directions and combined > threshold,
        // this waypoint is part of a zigzag pattern
        if (i < result.length - 2) {
          const next2 = result[i + 2];
          const bearingOut2 = this._bearing(next.lat, next.lng, next2.lat, next2.lng);

          // Signed turns to detect direction (positive = right, negative = left)
          let signedTurn1 = bearingOut - bearingIn;
          if (signedTurn1 > 180) signedTurn1 -= 360;
          if (signedTurn1 < -180) signedTurn1 += 360;

          let signedTurn2 = bearingOut2 - bearingOut;
          if (signedTurn2 > 180) signedTurn2 -= 360;
          if (signedTurn2 < -180) signedTurn2 += 360;

          const isZigzag = signedTurn1 * signedTurn2 < 0; // opposite directions
          if (isZigzag && (Math.abs(signedTurn1) + Math.abs(signedTurn2)) > ZIGZAG_CUMULATIVE_THRESHOLD) {
            removed++;
            continue;
          }
        }

        filtered.push(curr);
      }

      filtered.push(result[result.length - 1]); // Always keep ARR
      result = filtered;

      if (removed === 0) break;
    }

    return result;
  }

  /**
   * Graph pathfind between two fixes for a single FIR segment.
   * Uses corridor penalty biased toward the segment corridor.
   * @returns {{waypoints: Array, cost: number}|null}
   */
  _graphPathfindSegment(fromFixId, toFixId, gcDepLat, gcDepLng, gcArrLat, gcArrLng) {
    if (!this.graph.getNode(fromFixId) || !this.graph.getNode(toFixId)) return null;

    // Set corridor context to the OVERALL great circle
    this._routeContext = {
      depLat: gcDepLat, depLng: gcDepLng,
      arrLat: gcArrLat, arrLng: gcArrLng,
      bearing12: this._bearing(gcDepLat, gcDepLng, gcArrLat, gcArrLng)
    };

    try {
      const graphPath = this.pathFinder.find(fromFixId, toFixId);
      this._routeContext = null;

      if (!graphPath || graphPath.length === 0) return null;

      graphPath.reverse(); // ngraph returns target → source

      let cost = 0;
      const waypoints = [];
      for (let i = 0; i < graphPath.length; i++) {
        const n = graphPath[i];
        waypoints.push({ lat: n.data.lat, lng: n.data.lng, name: n.id });
        if (i < graphPath.length - 1) {
          cost += this._haversine(n.data.lat, n.data.lng, graphPath[i + 1].data.lat, graphPath[i + 1].data.lng);
        }
      }

      // Reject if path is wildly longer than direct between entry/exit
      const fromData = this.graph.getNode(fromFixId).data;
      const toData = this.graph.getNode(toFixId).data;
      const directDist = this._haversine(fromData.lat, fromData.lng, toData.lat, toData.lng);
      if (cost > directDist * MAX_ROUTE_RATIO) return null;

      return { waypoints, cost };
    } catch (e) {
      this._routeContext = null;
      return null;
    }
  }

  // ─── Fallback: Basic Great Circle Route ────────────────────────────────────

  /**
   * Ultimate fallback that always produces waypoints.
   * Places a fix or coordinate label every ~200nm along the great circle.
   */
  _computeBasicGreatCircleRoute(depLat, depLng, arrLat, arrLng) {
    const directDistance = this._haversine(depLat, depLng, arrLat, arrLng);
    const numSamples = Math.max(3, Math.floor(directDistance / 200));
    const waypoints = [{ lat: depLat, lng: depLng, name: 'DEP' }];
    const usedFixes = new Set();

    for (let i = 1; i < numSamples; i++) {
      const fraction = i / numSamples;
      const pt = this._interpolateGreatCircle(depLat, depLng, arrLat, arrLng, fraction);
      const fix = this._findNearestAirwayFix(pt.lat, pt.lng, SNAP_RADIUS_NM);

      if (fix && !usedFixes.has(fix.id)) {
        usedFixes.add(fix.id);
        waypoints.push({ lat: fix.lat, lng: fix.lng, name: fix.id });
      } else {
        waypoints.push({ lat: pt.lat, lng: pt.lng, name: this._coordLabel(pt.lat, pt.lng) });
      }
    }

    waypoints.push({ lat: arrLat, lng: arrLng, name: 'ARR' });
    return waypoints.length > 2 ? waypoints : null;
  }

  // ─── SID/STAR Connection Lookups ───────────────────────────────────────────

  _getDepartureConnections(depLat, depLng, depIcao) {
    const connections = [];

    if (depIcao && this.procedures && this.procedures[depIcao]) {
      const sids = this.procedures[depIcao].sids;
      const seen = new Set();

      for (const sid of Object.values(sids)) {
        let graphExitIdx = -1;
        for (let i = sid.waypoints.length - 1; i >= 0; i--) {
          if (this.graph.getNode(sid.waypoints[i].name)) {
            graphExitIdx = i;
            break;
          }
        }
        if (graphExitIdx < 0) continue;

        const exitFix = sid.waypoints[graphExitIdx].name;
        if (seen.has(exitFix)) continue;
        seen.add(exitFix);

        let cost = this._haversine(depLat, depLng, sid.waypoints[0].lat, sid.waypoints[0].lng);
        for (let i = 0; i < graphExitIdx; i++) {
          cost += this._haversine(
            sid.waypoints[i].lat, sid.waypoints[i].lng,
            sid.waypoints[i + 1].lat, sid.waypoints[i + 1].lng
          );
        }

        const wps = sid.waypoints.slice(0, graphExitIdx + 1);
        connections.push({
          fixName: exitFix,
          waypoints: wps.map(w => ({ lat: w.lat, lng: w.lng, name: w.name })),
          cost
        });
      }

      connections.sort((a, b) => a.cost - b.cost);
      if (connections.length > MAX_DEPARTURE_CONNECTIONS) connections.length = MAX_DEPARTURE_CONNECTIONS;
    }

    if (connections.length === 0) {
      const nearest = this._findNearestAirwayFixes(depLat, depLng, DCT_SEARCH_RADIUS_NM, DCT_FALLBACK_COUNT);
      for (const fix of nearest) {
        connections.push({ fixName: fix.id, waypoints: [], cost: fix.dist });
      }
    }

    return connections;
  }

  _getArrivalConnections(arrLat, arrLng, arrIcao) {
    const connections = [];

    if (arrIcao && this.procedures && this.procedures[arrIcao]) {
      const stars = this.procedures[arrIcao].stars;
      const seen = new Set();

      for (const star of Object.values(stars)) {
        let graphEntryIdx = -1;
        for (let i = 0; i < star.waypoints.length; i++) {
          if (this.graph.getNode(star.waypoints[i].name)) {
            graphEntryIdx = i;
            break;
          }
        }
        if (graphEntryIdx < 0) continue;

        const entryFix = star.waypoints[graphEntryIdx].name;
        if (seen.has(entryFix)) continue;
        seen.add(entryFix);

        let cost = 0;
        for (let i = graphEntryIdx; i < star.waypoints.length - 1; i++) {
          cost += this._haversine(
            star.waypoints[i].lat, star.waypoints[i].lng,
            star.waypoints[i + 1].lat, star.waypoints[i + 1].lng
          );
        }
        cost += this._haversine(
          star.waypoints[star.waypoints.length - 1].lat,
          star.waypoints[star.waypoints.length - 1].lng,
          arrLat, arrLng
        );

        const wps = star.waypoints.slice(graphEntryIdx);
        connections.push({
          fixName: entryFix,
          waypoints: wps.map(w => ({ lat: w.lat, lng: w.lng, name: w.name })),
          cost
        });
      }

      connections.sort((a, b) => a.cost - b.cost);
      if (connections.length > MAX_ARRIVAL_CONNECTIONS) connections.length = MAX_ARRIVAL_CONNECTIONS;
    }

    if (connections.length === 0) {
      const nearest = this._findNearestAirwayFixes(arrLat, arrLng, DCT_SEARCH_RADIUS_NM, DCT_FALLBACK_COUNT);
      for (const fix of nearest) {
        connections.push({ fixName: fix.id, waypoints: [], cost: fix.dist });
      }
    }

    return connections;
  }

  // ─── Spatial Lookups ───────────────────────────────────────────────────────

  _findNearestAirwayFixes(lat, lng, radiusNm, maxResults) {
    const cellX = Math.floor(lat / GRID_CELL_SIZE);
    const cellY = Math.floor(lng / GRID_CELL_SIZE);
    const searchRadius = Math.ceil(radiusNm / 60 / GRID_CELL_SIZE) + 1;
    const candidates = [];

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.spatialGrid.get(key);
        if (!cell) continue;

        for (const fix of cell) {
          if (!this.graphFixes.has(fix.id)) continue;
          if (!this.graph.getNode(fix.id)) continue;

          const dist = this._haversine(lat, lng, fix.lat, fix.lng);
          if (dist < radiusNm) {
            candidates.push({ id: fix.id, lat: fix.lat, lng: fix.lng, dist });
          }
        }
      }
    }

    candidates.sort((a, b) => a.dist - b.dist);
    return candidates.slice(0, maxResults);
  }

  _findNearestAirwayFix(lat, lng, radiusNm) {
    const cellX = Math.floor(lat / GRID_CELL_SIZE);
    const cellY = Math.floor(lng / GRID_CELL_SIZE);
    const searchRadius = Math.ceil(radiusNm / 60 / GRID_CELL_SIZE) + 1;

    let bestAirway = null;
    let bestAirwayDist = radiusNm;
    let bestAny = null;
    let bestAnyDist = radiusNm;

    for (let dx = -searchRadius; dx <= searchRadius; dx++) {
      for (let dy = -searchRadius; dy <= searchRadius; dy++) {
        const key = `${cellX + dx},${cellY + dy}`;
        const cell = this.spatialGrid.get(key);
        if (!cell) continue;

        for (const fix of cell) {
          const dist = this._haversine(lat, lng, fix.lat, fix.lng);
          if (dist >= radiusNm) continue;

          if (this.graphFixes.has(fix.id) && dist < bestAirwayDist) {
            bestAirwayDist = dist;
            bestAirway = fix;
          }
          if (dist < bestAnyDist) {
            bestAnyDist = dist;
            bestAny = fix;
          }
        }
      }
    }

    return bestAirway || bestAny;
  }

  // ─── Public Helpers ────────────────────────────────────────────────────────

  findClosestFix(fixName, refLat, refLng) {
    const locations = this.fixesByName.get(fixName);
    if (!locations || locations.length === 0) return null;
    if (locations.length === 1) {
      return { name: fixName, lat: locations[0].lat, lng: locations[0].lng };
    }
    let best = null;
    let bestDist = Infinity;
    for (const loc of locations) {
      const dist = this._haversine(refLat, refLng, loc.lat, loc.lng);
      if (dist < bestDist) {
        bestDist = dist;
        best = loc;
      }
    }
    return best ? { name: fixName, lat: best.lat, lng: best.lng } : null;
  }

  // ─── Math Utilities ────────────────────────────────────────────────────────

  _coordLabel(lat, lng) {
    const latStr = `${Math.abs(Math.round(lat)).toString().padStart(2, '0')}${lat >= 0 ? 'N' : 'S'}`;
    const lngStr = `${Math.abs(Math.round(lng)).toString().padStart(3, '0')}${lng >= 0 ? 'E' : 'W'}`;
    return `${latStr}${lngStr}`;
  }

  _interpolateGreatCircle(lat1, lng1, lat2, lng2, fraction) {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const lambda1 = lng1 * DEG_TO_RAD;
    const lambda2 = lng2 * DEG_TO_RAD;

    const dPhi = phi2 - phi1;
    const dLambda = lambda2 - lambda1;
    const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const delta = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    if (delta === 0) return { lat: lat1, lng: lng1 };

    const A = Math.sin((1 - fraction) * delta) / Math.sin(delta);
    const B = Math.sin(fraction * delta) / Math.sin(delta);

    const x = A * Math.cos(phi1) * Math.cos(lambda1) + B * Math.cos(phi2) * Math.cos(lambda2);
    const y = A * Math.cos(phi1) * Math.sin(lambda1) + B * Math.cos(phi2) * Math.sin(lambda2);
    const z = A * Math.sin(phi1) + B * Math.sin(phi2);

    return {
      lat: Math.atan2(z, Math.sqrt(x * x + y * y)) * RAD_TO_DEG,
      lng: Math.atan2(y, x) * RAD_TO_DEG
    };
  }

  _cacheResult(key, value) {
    if (this.routeCache.size >= this.maxCacheSize) {
      const firstKey = this.routeCache.keys().next().value;
      this.routeCache.delete(firstKey);
    }
    this.routeCache.set(key, value);
  }

  _haversine(lat1, lng1, lat2, lng2) {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const dPhi = (lat2 - lat1) * DEG_TO_RAD;
    const dLambda = (lng2 - lng1) * DEG_TO_RAD;

    const a = Math.sin(dPhi / 2) ** 2 +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_NM * c;
  }

  _bearing(lat1, lng1, lat2, lng2) {
    const phi1 = lat1 * DEG_TO_RAD;
    const phi2 = lat2 * DEG_TO_RAD;
    const dLambda = (lng2 - lng1) * DEG_TO_RAD;

    const y = Math.sin(dLambda) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2) -
              Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);

    return ((Math.atan2(y, x) * RAD_TO_DEG) + 360) % 360;
  }

  _crossTrackNm(ptLat, ptLng, startLat, startLng, _endLat, _endLng, bearing12) {
    const d13 = this._haversine(startLat, startLng, ptLat, ptLng);
    const brng13 = this._bearing(startLat, startLng, ptLat, ptLng);
    const dBrng = (brng13 - bearing12) * DEG_TO_RAD;
    return Math.abs(Math.asin(Math.sin(d13 / EARTH_RADIUS_NM) * Math.sin(dBrng)) * EARTH_RADIUS_NM);
  }
}

// Singleton
const airwayService = new AirwayService();
module.exports = airwayService;
