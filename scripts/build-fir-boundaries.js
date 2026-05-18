/**
 * Build a FIR-level boundaries file for the World Map from the raw VATEUD
 * subsector dataset.
 *
 * Rule per base FIR (id before the first "-"):
 *   - If a base feature (id === base) exists, that polygon already represents
 *     the whole FIR — use it and discard its "-X" subsectors.
 *   - Otherwise (subsector-only FIRs like EGTT/London), geometrically dissolve
 *     all subsectors into a single outline with @turf/union.
 *
 * Input  : public/data/fir-boundaries.geojson   (raw subsectors — left untouched)
 * Output : public/data/fir-boundaries-base.geojson
 */
const fs = require('fs');
const path = require('path');
const { union } = require('@turf/union');
const { featureCollection } = require('@turf/helpers');

const SRC = path.join(__dirname, '../public/data/fir-boundaries.geojson');
const OUT = path.join(__dirname, '../public/data/fir-boundaries-base.geojson');

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const baseOf = (id) => String(id).split('-')[0];

const groups = new Map();
for (const f of raw.features) {
  const b = baseOf(f.properties.id);
  if (!groups.has(b)) groups.set(b, []);
  groups.get(b).push(f);
}

const outFeatures = [];
let usedBase = 0;
let dissolved = 0;
let fallbackMerged = 0;

for (const [base, feats] of groups) {
  const baseFeature = feats.find((f) => String(f.properties.id) === base);

  if (baseFeature) {
    baseFeature.properties.id = base;
    outFeatures.push(baseFeature);
    usedBase++;
    continue;
  }

  // Subsector-only FIR — dissolve all parts into one polygon.
  const polys = feats.filter(
    (f) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon')
  );

  // Average label position across subsectors that carry one.
  const labelled = feats.filter((f) => f.properties.label_lat && f.properties.label_lon);
  const labelLat = labelled.length
    ? (labelled.reduce((s, f) => s + parseFloat(f.properties.label_lat), 0) / labelled.length).toFixed(4)
    : undefined;
  const labelLon = labelled.length
    ? (labelled.reduce((s, f) => s + parseFloat(f.properties.label_lon), 0) / labelled.length).toFixed(4)
    : undefined;

  const rep = feats[0].properties;
  const minFL = Math.min(...feats.map((f) => f.properties.minFL).filter((v) => typeof v === 'number'));
  const maxFL = Math.max(...feats.map((f) => f.properties.maxFL).filter((v) => typeof v === 'number'));

  const props = {
    id: base,
    oceanic: rep.oceanic,
    region: rep.region,
    division: rep.division,
    ...(labelLat ? { label_lat: labelLat, label_lon: labelLon } : {}),
    ...(Number.isFinite(minFL) ? { minFL } : {}),
    ...(Number.isFinite(maxFL) ? { maxFL } : {}),
  };

  let geometry = null;
  try {
    const merged = union(featureCollection(polys));
    if (merged && merged.geometry) geometry = merged.geometry;
  } catch (e) {
    console.warn(`  union failed for ${base}: ${e.message} — falling back to MultiPolygon concat`);
  }

  if (!geometry) {
    // Fallback: concatenate all polygons into one MultiPolygon (may show faint
    // internal lines, but the FIR is preserved rather than dropped).
    const coords = [];
    for (const f of polys) {
      if (f.geometry.type === 'Polygon') coords.push(f.geometry.coordinates);
      else coords.push(...f.geometry.coordinates);
    }
    geometry = { type: 'MultiPolygon', coordinates: coords };
    fallbackMerged++;
  } else {
    dissolved++;
  }

  outFeatures.push({ type: 'Feature', properties: props, geometry });
}

const out = { type: 'FeatureCollection', features: outFeatures };
fs.writeFileSync(OUT, JSON.stringify(out));

const egtt = outFeatures.find((f) => f.properties.id === 'EGTT');
console.log(`Input features      : ${raw.features.length}`);
console.log(`Distinct base FIRs  : ${groups.size}`);
console.log(`Used base feature   : ${usedBase}`);
console.log(`Dissolved (turf)    : ${dissolved}`);
console.log(`Fallback merged     : ${fallbackMerged}`);
console.log(`Output features     : ${outFeatures.length}`);
console.log(`EGTT present        : ${egtt ? 'yes (' + egtt.geometry.type + ')' : 'NO'}`);
console.log(`Written             : ${path.relative(process.cwd(), OUT)}`);
