/**
 * Convert Navigraph navaid.db (Jet DB format) to X-Plane earth_fix.dat and earth_awy.dat
 * Run: node scripts/convert-navdata.mjs
 */
import MDBReader from 'mdb-reader';
import fs from 'fs';

const buf = fs.readFileSync('data/navaid.db');
const reader = new MDBReader(buf);

// ── Build earth_fix.dat ──────────────────────────────────────────────────────
const waypoints = reader.getTable('Waypoints').getData();
const navaids = reader.getTable('Navaids').getData();

const fixLines = [];
fixLines.push('I');
fixLines.push('600 Version - data cycle 2601, build 20260112, metadata FixXP700.');
fixLines.push('');

const seenFixes = new Set();

for (const wp of waypoints) {
  const lat = wp.Latitude;
  const lng = wp.Longtitude;
  const id = wp.Ident;
  if (lat == null || lng == null || !id) continue;
  const key = `${id}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
  if (seenFixes.has(key)) continue;
  seenFixes.add(key);
  fixLines.push(`${lat.toFixed(6).padStart(12)} ${lng.toFixed(6).padStart(13)} ${id}`);
}

for (const nav of navaids) {
  const lat = nav.Latitude;
  const lng = nav.Longtitude;
  const id = nav.Ident;
  if (lat == null || lng == null || !id) continue;
  const key = `${id}|${lat.toFixed(6)}|${lng.toFixed(6)}`;
  if (seenFixes.has(key)) continue;
  seenFixes.add(key);
  fixLines.push(`${lat.toFixed(6).padStart(12)} ${lng.toFixed(6).padStart(13)} ${id}`);
}

fixLines.push('99');
fs.writeFileSync('src/data/navdata/earth_fix.dat', fixLines.join('\n'));
console.log(`earth_fix.dat: ${seenFixes.size} fixes`);

// ── Build earth_awy.dat ─────────────────────────────────────────────────────
const airways = reader.getTable('Airways').getData();
const airwayLegs = reader.getTable('AirwayLegs').getData();

const awyById = new Map();
for (const a of airways) awyById.set(a.ID, a.Ident);

const wpById = new Map();
for (const wp of waypoints) {
  wpById.set(wp.ID, { id: wp.Ident, lat: wp.Latitude, lng: wp.Longtitude });
}
// Navaids that are collocated with waypoints are already in wpById via the waypoint entry
// But some navaids might be referenced directly - add them too with a navaid prefix lookup
for (const nav of navaids) {
  // Navaids referenced by waypoints via NavaidID are already covered
  // But add the navaid itself in case it appears as a standalone waypoint reference
  if (!wpById.has(nav.ID + 1000000)) {
    wpById.set(nav.ID + 1000000, { id: nav.Ident, lat: nav.Latitude, lng: nav.Longtitude });
  }
}

const awyLines = [];
awyLines.push('I');
awyLines.push('640 Version - data cycle 2601, build 20260112, metadata AwyXP700.');
awyLines.push('');

let segCount = 0;
for (const leg of airwayLegs) {
  const wp1 = wpById.get(leg.Waypoint1ID);
  const wp2 = wpById.get(leg.Waypoint2ID);
  const awyName = awyById.get(leg.AirwayID);
  if (!wp1 || !wp2 || !awyName) continue;

  const highLow = leg.Level === 'H' ? 2 : 1;
  awyLines.push(
    `${wp1.id}  ${wp1.lat.toFixed(6)} ${wp1.lng.toFixed(6)} ${wp2.id}  ${wp2.lat.toFixed(6)} ${wp2.lng.toFixed(6)} ${highLow} 000 999 ${awyName}`
  );
  segCount++;
}

awyLines.push('99');
fs.writeFileSync('src/data/navdata/earth_awy.dat', awyLines.join('\n'));
console.log(`earth_awy.dat: ${segCount} airway segments`);

// ── Build procedures.json (SID/STAR extraction) ───────────────────────────
const terminals = reader.getTable('Terminals').getData();
const terminalLegs = reader.getTable('TerminalLegs').getData();

// Also build a navaid-based lookup for WptID resolution
// TerminalLegs.WptID can reference either Waypoints or Navaids
const navById = new Map();
for (const nav of navaids) {
  navById.set(nav.ID, { id: nav.Ident, lat: nav.Latitude, lng: nav.Longtitude });
}

// Index TerminalLegs by TerminalID
const legsByTerminal = new Map();
for (const leg of terminalLegs) {
  if (!legsByTerminal.has(leg.TerminalID)) legsByTerminal.set(leg.TerminalID, []);
  legsByTerminal.get(leg.TerminalID).push(leg);
}

// Proc field: 1=SID, 2=STAR, 3=Approach (skip)
const procedures = {};
let sidCount = 0, starCount = 0, skippedShort = 0;

for (const term of terminals) {
  const isSid = term.Proc === 1;
  const isStar = term.Proc === 2;
  if (!isSid && !isStar) continue;

  const icao = term.ICAO;
  if (!icao) continue;

  const legs = legsByTerminal.get(term.ID) || [];
  // Sort legs by ID to ensure correct sequence
  legs.sort((a, b) => a.ID - b.ID);

  // Extract only legs with valid lat/lon (skip procedural legs like CA, VA, HM)
  const waypoints = [];
  const seenWpNames = new Set();
  for (const leg of legs) {
    if (leg.WptLat == null || leg.WptLon == null) continue;
    if (Math.abs(leg.WptLat) < 0.001 && Math.abs(leg.WptLon) < 0.001) continue;

    // Resolve waypoint name: try Waypoints table first, then Navaids
    let name = null;
    if (leg.WptID != null) {
      const wp = wpById.get(leg.WptID);
      if (wp) name = wp.id;
      if (!name) {
        const nav = navById.get(leg.WptID);
        if (nav) name = nav.id;
      }
    }
    if (!name) name = `WP${leg.ID}`;

    // Deduplicate by name within the procedure
    if (seenWpNames.has(name)) continue;
    seenWpNames.add(name);

    waypoints.push({ name, lat: Math.round(leg.WptLat * 1e6) / 1e6, lng: Math.round(leg.WptLon * 1e6) / 1e6 });
  }

  if (waypoints.length < 2) { skippedShort++; continue; }

  if (!procedures[icao]) procedures[icao] = { sids: {}, stars: {} };

  const procKey = term.Rwy ? `${term.Name}_${term.Rwy}` : term.Name;

  if (isSid) {
    procedures[icao].sids[procKey] = {
      runway: term.Rwy || null,
      waypoints,
      exitFix: waypoints[waypoints.length - 1].name
    };
    sidCount++;
  } else {
    procedures[icao].stars[procKey] = {
      runway: term.Rwy || null,
      waypoints,
      entryFix: waypoints[0].name
    };
    starCount++;
  }
}

fs.writeFileSync('src/data/navdata/procedures.json', JSON.stringify(procedures));
const airportCount = Object.keys(procedures).length;
console.log(`procedures.json: ${airportCount} airports, ${sidCount} SIDs, ${starCount} STARs (${skippedShort} skipped < 2 waypoints)`);
console.log('Done!');