/**
 * Airway Routing Service
 * Parses X-Plane navigation data (earth_awy.dat, earth_fix.dat) to build
 * a spatial index of worldwide airway fixes, then snaps great circle routes
 * to nearby real waypoints for smooth, realistic-looking ATC routes.
 */

const fs = require('fs');
const path = require('path');

// Navdata file paths
const AWY_FILE = path.join(__dirname, '../data/navdata/earth_awy.dat');
const FIX_FILE = path.join(__dirname, '../data/navdata/earth_fix.dat');

// Constants
const MIN_ROUTE_DISTANCE_NM = 150; // Skip airway routing for short routes
const SAMPLE_INTERVAL_NM = 150;    // Sample great circle every ~150nm
const SNAP_RADIUS_NM = 60;         // Max nm to snap to a fix from sample point
const SIMPLIFY_THRESHOLD_DEG = 12; // Bearing change threshold to keep a waypoint
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const EARTH_RADIUS_NM = 3440.065;

// Spatial grid cell size (degrees) for fast nearest-fix lookups
const GRID_CELL_SIZE = 2;

class AirwayService {
  constructor() {
    this.fixes = new Map();       // fixId → {lat, lng}
    this.graphFixes = new Set();  // fixIds that are part of an airway
    this.spatialGrid = new Map(); // 'gridX,gridY' → [{id, lat, lng}, ...]
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
        this.ready = true;
        const elapsed = Date.now() - startTime;
        console.log(`[Airway] Ready: ${this.fixes.size} fixes (${this.graphFixes.size} on airways), built in ${elapsed}ms`);

        this._backfillExistingRoutes();
      } catch (err) {
        console.error('[Airway] Failed to initialize:', err.message);
      }
    });
  }

  async _backfillExistingRoutes() {
    try {
      const Route = require('../models/Route');
      const Airport = require('../models/Airport');

      const routes = await Route.findAll({
        where: { isActive: true },
        attributes: ['id', 'departureAirportId', 'arrivalAirportId', 'distance']
      });

      if (routes.length === 0) {
        console.log('[Airway] No active routes to compute waypoints for');
        return;
      }

      console.log(`[Airway] Backfilling waypoints for ${routes.length} routes...`);
      let computed = 0;
      let skipped = 0;

      for (const route of routes) {
        try {
          const [depApt, arrApt] = await Promise.all([
            Airport.findByPk(route.departureAirportId, { attributes: ['latitude', 'longitude'] }),
            Airport.findByPk(route.arrivalAirportId, { attributes: ['latitude', 'longitude'] })
          ]);

          if (!depApt || !arrApt) { skipped++; continue; }

          const waypoints = this.computeRoute(
            parseFloat(depApt.latitude), parseFloat(depApt.longitude),
            parseFloat(arrApt.latitude), parseFloat(arrApt.longitude)
          );

          if (waypoints) {
            await route.update({ waypoints });
            computed++;
          } else {
            skipped++;
          }
        } catch (e) {
          skipped++;
        }
      }

      console.log(`[Airway] Backfill complete: ${computed} routes computed, ${skipped} skipped (short/no path)`);
    } catch (err) {
      console.error('[Airway] Backfill failed:', err.message);
    }
  }

  isReady() {
    return this.ready;
  }

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
      count++;
    }

    console.log(`[Airway] Parsed ${count} fixes`);
  }

  /**
   * Parse earth_awy.dat to identify which fixes are part of real airways.
   * We no longer build a full graph — just track which fix IDs appear in airways.
   */
  _parseAirways() {
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

      // Track airway-connected fixes
      this.graphFixes.add(startId);
      this.graphFixes.add(endId);

      // Ensure these fixes are in our map
      if (!this.fixes.has(startId)) {
        this.fixes.set(startId, { lat: startLat, lng: startLng });
      }
      if (!this.fixes.has(endId)) {
        this.fixes.set(endId, { lat: endLat, lng: endLng });
      }

      segmentCount++;
    }

    console.log(`[Airway] Parsed ${segmentCount} airway segments, ${this.graphFixes.size} airway fixes`);
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

  /**
   * Compute a smooth route between two coordinates.
   * Samples points along the great circle and snaps each to the nearest
   * real airway fix, producing a smooth path with realistic waypoint names.
   * Returns array of waypoints [{lat, lng, name}, ...] or null.
   */
  computeRoute(depLat, depLng, arrLat, arrLng) {
    if (!this.ready) return null;

    const directDistance = this._haversine(depLat, depLng, arrLat, arrLng);
    if (directDistance < MIN_ROUTE_DISTANCE_NM) return null;

    const cacheKey = `${depLat.toFixed(2)},${depLng.toFixed(2)}-${arrLat.toFixed(2)},${arrLng.toFixed(2)}`;
    if (this.routeCache.has(cacheKey)) {
      return this.routeCache.get(cacheKey);
    }

    // Sample along the great circle at regular intervals
    const numSamples = Math.max(3, Math.floor(directDistance / SAMPLE_INTERVAL_NM));
    const waypoints = [{ lat: depLat, lng: depLng, name: 'DEP' }];
    const usedFixes = new Set();

    for (let i = 1; i < numSamples; i++) {
      const fraction = i / numSamples;
      const gcPoint = this._interpolateGreatCircle(depLat, depLng, arrLat, arrLng, fraction);

      // Prefer airway-connected fixes, fall back to any fix
      const nearest = this._findNearestAirwayFix(gcPoint.lat, gcPoint.lng, SNAP_RADIUS_NM);

      if (nearest && !usedFixes.has(nearest.id)) {
        usedFixes.add(nearest.id);
        waypoints.push({ lat: nearest.lat, lng: nearest.lng, name: nearest.id });
      }
    }

    waypoints.push({ lat: arrLat, lng: arrLng, name: 'ARR' });

    if (waypoints.length <= 2) {
      this._cacheResult(cacheKey, null);
      return null;
    }

    const simplified = this._simplifyPath(waypoints, SIMPLIFY_THRESHOLD_DEG);

    this._cacheResult(cacheKey, simplified);
    return simplified;
  }

  /**
   * Find the nearest fix to a point, preferring airway-connected fixes.
   * If an airway fix is within radius, use it. Otherwise use any fix.
   */
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

  _simplifyPath(waypoints, thresholdDeg = 12) {
    if (waypoints.length <= 3) return waypoints;

    const result = [waypoints[0]];

    for (let i = 1; i < waypoints.length - 1; i++) {
      const prev = result[result.length - 1];
      const curr = waypoints[i];
      const next = waypoints[i + 1];

      const bearing1 = this._bearing(prev.lat, prev.lng, curr.lat, curr.lng);
      const bearing2 = this._bearing(curr.lat, curr.lng, next.lat, next.lng);

      let bearingDiff = Math.abs(bearing2 - bearing1);
      if (bearingDiff > 180) bearingDiff = 360 - bearingDiff;

      if (bearingDiff >= thresholdDeg) {
        result.push(curr);
      }
    }

    result.push(waypoints[waypoints.length - 1]);
    return result;
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
}

// Singleton
const airwayService = new AirwayService();
module.exports = airwayService;