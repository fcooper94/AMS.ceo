const fs = require('fs');
const path = require('path');

const FIR_GEOJSON_PATH = path.join(__dirname, '../../public/data/fir-boundaries.geojson');
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

let firData = null;
let firFeaturesByCode = new Map();

function loadFirData() {
  if (firData) return;
  const raw = fs.readFileSync(FIR_GEOJSON_PATH, 'utf8');
  firData = JSON.parse(raw);
  firData.features.forEach(feature => {
    firFeaturesByCode.set(feature.properties.id, feature);
  });
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

module.exports = {
  isPointInFir,
  doesRouteCrossFir,
  doesGreatCircleCrossFir,
  getFirFeature
};
