const fs = require('fs');
const path = require('path');

const FIR_GEOJSON_PATH = path.join(__dirname, '../../public/data/fir-boundaries.geojson');
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

let firData = null;
let firFeaturesByCode = new Map();
let firBboxGrid = new Map(); // Spatial grid of FIR bounding boxes for fast lookup
const FIR_GRID_SIZE = 10; // degrees per grid cell
const firPointCache = new Map(); // Memoize getFirForPoint by rounded coords

function loadFirData() {
  if (firData) return;
  const raw = fs.readFileSync(FIR_GEOJSON_PATH, 'utf8');
  firData = JSON.parse(raw);
  firData.features.forEach(feature => {
    firFeaturesByCode.set(feature.properties.id, feature);
  });
  // Build spatial grid for fast getFirForPoint lookups
  firData.features.forEach(feature => {
    const bbox = getFeatureBbox(feature);
    feature._bbox = bbox;
    const minCellX = Math.floor(bbox.minLat / FIR_GRID_SIZE);
    const maxCellX = Math.floor(bbox.maxLat / FIR_GRID_SIZE);
    const minCellY = Math.floor(bbox.minLng / FIR_GRID_SIZE);
    const maxCellY = Math.floor(bbox.maxLng / FIR_GRID_SIZE);
    for (let cx = minCellX; cx <= maxCellX; cx++) {
      for (let cy = minCellY; cy <= maxCellY; cy++) {
        const key = `${cx},${cy}`;
        if (!firBboxGrid.has(key)) firBboxGrid.set(key, []);
        firBboxGrid.get(key).push(feature);
      }
    }
  });
}

function getFeatureBbox(feature) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const polygon of feature.geometry.coordinates) {
    for (const ring of polygon) {
      for (const coord of ring) {
        if (coord[1] < minLat) minLat = coord[1];
        if (coord[1] > maxLat) maxLat = coord[1];
        if (coord[0] < minLng) minLng = coord[0];
        if (coord[0] > maxLng) maxLng = coord[0];
      }
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

/**
 * Ray casting point-in-polygon test.
 * Polygon uses GeoJSON [lng, lat] coordinate order.
 */
function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1]; // lng, lat
    const xj = polygon[j][0], yj = polygon[j][1];

    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if a point is inside a FIR's MultiPolygon geometry.
 */
function isPointInFir(lat, lng, firCode) {
  loadFirData();
  const feature = firFeaturesByCode.get(firCode);
  if (!feature) return false;

  const multiPoly = feature.geometry.coordinates;
  for (const polygon of multiPoly) {
    if (pointInPolygon(lat, lng, polygon[0])) {
      return true;
    }
  }
  return false;
}

/**
 * Check if any waypoint of a route passes through a FIR.
 * Waypoints format: [{lat, lng, name}, ...]
 */
function doesRouteCrossFir(waypoints, firCode) {
  if (!waypoints || waypoints.length === 0) return false;
  for (const wp of waypoints) {
    if (isPointInFir(wp.lat, wp.lng, firCode)) {
      return true;
    }
  }
  return false;
}

/**
 * For routes without waypoints, sample points along the great circle
 * and test if any fall inside the FIR.
 */
function doesGreatCircleCrossFir(depLat, depLng, arrLat, arrLng, firCode) {
  const samples = 10;
  for (let i = 1; i < samples; i++) {
    const fraction = i / samples;
    const point = interpolateGreatCircle(depLat, depLng, arrLat, arrLng, fraction);
    if (isPointInFir(point.lat, point.lng, firCode)) {
      return true;
    }
  }
  return false;
}

function interpolateGreatCircle(lat1, lng1, lat2, lng2, fraction) {
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

/**
 * Get the GeoJSON feature for a FIR code.
 */
function getFirFeature(firCode) {
  loadFirData();
  return firFeaturesByCode.get(firCode) || null;
}

/**
 * Determine which non-oceanic FIR a point is in.
 * Uses spatial grid for fast candidate lookup.
 * Returns the FIR code string or null if not in any FIR.
 */
function getFirForPoint(lat, lng) {
  loadFirData();
  // Memoize by rounding to ~0.5 degree grid (~30nm) — same FIR within each cell
  const cacheKey = `${(lat * 2 | 0)},${(lng * 2 | 0)}`;
  if (firPointCache.has(cacheKey)) return firPointCache.get(cacheKey);

  const cx = Math.floor(lat / FIR_GRID_SIZE);
  const cy = Math.floor(lng / FIR_GRID_SIZE);
  const candidates = firBboxGrid.get(`${cx},${cy}`) || [];
  let result = null;
  for (const feature of candidates) {
    const bb = feature._bbox;
    if (lat < bb.minLat || lat > bb.maxLat || lng < bb.minLng || lng > bb.maxLng) continue;
    const multiPoly = feature.geometry.coordinates;
    for (const polygon of multiPoly) {
      if (pointInPolygon(lat, lng, polygon[0])) {
        result = feature.properties.id;
        break;
      }
    }
    if (result) break;
  }
  firPointCache.set(cacheKey, result);
  return result;
}

/**
 * Get the outer ring polygon coordinates for a FIR sector.
 * Returns [[lng, lat], ...] (GeoJSON order) or null if not found.
 * For MultiPolygon, returns the largest polygon's outer ring.
 */
function getFirBoundaryCoords(firCode) {
  loadFirData();
  const feature = firFeaturesByCode.get(firCode);
  if (!feature) return null;

  const polys = feature.geometry.coordinates;
  if (polys.length === 1) return polys[0][0]; // outer ring of single polygon

  // Multiple polygons — return the one with the largest bounding area
  let best = null, bestArea = 0;
  for (const poly of polys) {
    const ring = poly[0];
    let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
    for (const c of ring) {
      if (c[1] < minLat) minLat = c[1];
      if (c[1] > maxLat) maxLat = c[1];
      if (c[0] < minLng) minLng = c[0];
      if (c[0] > maxLng) maxLng = c[0];
    }
    const area = (maxLat - minLat) * (maxLng - minLng);
    if (area > bestArea) { bestArea = area; best = ring; }
  }
  return best;
}

module.exports = {
  isPointInFir,
  doesRouteCrossFir,
  doesGreatCircleCrossFir,
  getFirFeature,
  getFirForPoint,
  getFirBoundaryCoords,
  pointInPolygon
};
