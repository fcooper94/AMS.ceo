/**
 * Generate src/data/ukDomesticReal2024.json from the CAA annual 2024 domestic
 * route dataset (src/data/caaDomestic2024.csv — Table 12.2, both-directions,
 * deduplicated per pair).
 *
 * Output: one entry per undirected UK domestic pair with real 2024 traffic:
 *   { "EGKK_EGJJ": { "pax": 1046, "arch": "leisure" }, ... }
 *   - pax  = 2024 daily passengers, both directions (annual total / 365)
 *   - arch = history archetype used to back-project through the eras
 *            (business | leisure | lifeline | regional)
 *
 * The runtime (ukDomesticDemandService) turns each into 8 per-decade demand
 * scores. This is real ground truth, so it overrides the gravity model for
 * these pairs. Military / pure-GA airports in the CAA file are excluded.
 *
 * Regenerate: node src/scripts/generateUkDomesticData.js
 */
const fs = require('fs');
const path = require('path');

// CAA airport name → ICAO. Military & pure-GA fields are intentionally omitted
// (Brize Norton, Marham, Northolt, Warton, Compton Abbas, Dunkeswell, Redhill),
// so any route touching them is skipped.
const NAME_TO_ICAO = {
  'ABERDEEN': 'EGPD', 'ALDERNEY': 'EGJA', 'BARRA': 'EGPR',
  'BELFAST CITY (GEORGE BEST)': 'EGAC', 'BELFAST INTERNATIONAL': 'EGAA',
  'BENBECULA': 'EGPL', 'BIGGIN HILL': 'EGKB', 'BIRMINGHAM': 'EGBB', 'BLACKPOOL': 'EGNH',
  'BOURNEMOUTH': 'EGHH', 'BRISTOL': 'EGGD', 'CAMBRIDGE': 'EGSC',
  'CAMPBELTOWN': 'EGEC', 'CARDIFF WALES': 'EGFF', 'CITY OF DERRY (EGLINTON)': 'EGAE',
  'COLL': 'EGEL', 'COLONSAY': 'EGEY', 'DUNDEE': 'EGPN',
  'EAST MIDLANDS INTERNATIONAL': 'EGNX', 'EDAY': 'EGED', 'EDINBURGH': 'EGPH',
  'EXETER': 'EGTE', 'FAIR ISLE': 'EGEF', 'FARNBOROUGH': 'EGLF',
  'GATWICK': 'EGKK', 'GLASGOW': 'EGPF', 'GLOUCESTERSHIRE': 'EGBJ',
  'GUERNSEY': 'EGJB', 'HAWARDEN': 'EGNR', 'HEATHROW': 'EGLL',
  'HUMBERSIDE': 'EGNJ', 'INVERNESS': 'EGPE', 'ISLAY': 'EGPI',
  'ISLE OF MAN': 'EGNS', 'ISLES OF SCILLY (ST.MARYS)': 'EGHE', 'JERSEY': 'EGJJ',
  'KIRKWALL': 'EGPA', 'LANDS END (ST JUST)': 'EGHC', 'LEEDS BRADFORD': 'EGNM',
  'LERWICK (TINGWALL)': 'EGET', 'LIVERPOOL (JOHN LENNON)': 'EGGP',
  'LONDON CITY': 'EGLC', 'LUTON': 'EGGW', 'MANCHESTER': 'EGCC',
  'NEWCASTLE': 'EGNT', 'NEWQUAY': 'EGHQ', 'NORTH RONALDSAY': 'EGEN',
  'NORWICH': 'EGSH', 'OBAN (NORTH CONNEL)': 'EGEO', 'OXFORD (KIDLINGTON)': 'EGTK',
  'PAPA WESTRAY': 'EGEP', 'PRESTWICK': 'EGPK', 'SANDAY': 'EGES',
  'SOUTHAMPTON': 'EGHI', 'SOUTHEND': 'EGMC', 'STANSTED': 'EGSS',
  'STORNOWAY': 'EGPO', 'STRONSAY': 'EGER', 'SUMBURGH': 'EGPB',
  'TEESSIDE INTERNATIONAL AIRPORT': 'EGNV', 'TIREE': 'EGPU',
  'WESTRAY': 'EGEW', 'WHALSAY': 'EGEH', 'WICK JOHN O GROATS': 'EGPC'
  // Deliberately unmapped (military / GA): BRIZE NORTON, MARHAM(KINGS LYNN),
  // NORTHOLT, WARTON, COMPTON ABASS, DUNKESWELL, REDHILL, FOULA (no ICAO in DB).
};

// Archetype sets for history back-projection. See HISTORY_PROFILES in
// ukDomesticDemandService.js for what each curve means.
const LEISURE_DEST = new Set(['EGJJ', 'EGJB', 'EGJA', 'EGNS', 'EGHQ', 'EGHE', 'EGHC']);
const LIFELINE = new Set([
  'EGPR', 'EGPU', 'EGEL', 'EGEY', 'EGPI', 'EGPL', 'EGPO', 'EGEC', 'EGPC', 'EGPA',
  'EGPB', 'EGET', 'EGEF', 'EGEH', 'EGEN', 'EGEP', 'EGES', 'EGER', 'EGEW', 'EGED', 'EGEO'
]);
const LONDON = new Set(['EGLL', 'EGKK', 'EGSS', 'EGGW', 'EGLC', 'EGMC']);

function archetype(icaoA, icaoB) {
  if (LIFELINE.has(icaoA) || LIFELINE.has(icaoB)) return 'lifeline';
  if (LEISURE_DEST.has(icaoA) || LEISURE_DEST.has(icaoB)) return 'leisure';
  if (LONDON.has(icaoA) || LONDON.has(icaoB)) return 'business';
  return 'regional';
}

function main() {
  const csvPath = path.join(__dirname, '../data/caaDomestic2024.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').split(/\r?\n/).filter(Boolean);
  const hdr = lines[0].split(',');
  const i1 = hdr.indexOf('apt1_apt_name');
  const i2 = hdr.indexOf('apt2_apt_name');
  const iPax = hdr.indexOf('total_pax_tp');

  const out = {};
  let skippedUnmapped = new Set();
  let skippedZero = 0, kept = 0;

  for (let i = 1; i < lines.length; i++) {
    const c = lines[i].split(',');
    const name1 = c[i1], name2 = c[i2];
    const annualPax = parseInt(c[iPax], 10) || 0;

    const ic1 = NAME_TO_ICAO[name1];
    const ic2 = NAME_TO_ICAO[name2];
    if (!ic1) skippedUnmapped.add(name1);
    if (!ic2) skippedUnmapped.add(name2);
    if (!ic1 || !ic2) continue;

    if (annualPax <= 0) { skippedZero++; continue; } // defunct in 2024 — leave to the floor

    // A route that operated at all is ≥1/day (tiny annual totals otherwise round
    // to 0 and read as "no service", which also breaks the CI ordering check).
    const daily = Math.max(1, Math.round(annualPax / 365));
    // Canonical (alphabetical) undirected key; runtime expands to both directions.
    const [a, b] = ic1 < ic2 ? [ic1, ic2] : [ic2, ic1];
    const key = `${a}_${b}`;
    const arch = archetype(a, b);
    // If a pair appears twice (shouldn't in this dataset), keep the larger.
    if (!out[key] || daily > out[key].pax) out[key] = { pax: daily, arch };
    kept++;
  }

  // Channel Island hierarchy: from any shared origin, Jersey must out-rank
  // Guernsey must out-rank Alderney (Jersey is the dominant island — CAA totals
  // ~1.6M/0.8M/0.08M pax/yr). Real per-route figures occasionally tie (e.g.
  // Southampton–Guernsey slightly above Southampton–Jersey); cap the lower island
  // to keep a clear gap. Only touches origins that serve more than one island.
  const [JJ, JB, JA] = ['EGJJ', 'EGJB', 'EGJA'];
  const ciKey = (origin, island) => (origin < island ? `${origin}_${island}` : `${island}_${origin}`);
  const origins = new Set();
  for (const key of Object.keys(out)) {
    const [a, b] = key.split('_');
    if ([JJ, JB, JA].includes(a) && ![JJ, JB, JA].includes(b)) origins.add(b);
    if ([JJ, JB, JA].includes(b) && ![JJ, JB, JA].includes(a)) origins.add(a);
  }
  // Keep a ≥20% gap (GAP) so the ±9% display wobble can never invert the order.
  const GAP = 0.8;
  let ciCapped = 0;
  for (const o of origins) {
    const kj = ciKey(o, JJ), kb = ciKey(o, JB), ka = ciKey(o, JA);
    const jj = out[kj]?.pax, jb = out[kb]?.pax;
    // Guernsey clearly below Jersey
    if (jj != null && jb != null && jb > jj * GAP) { out[kb].pax = Math.max(1, Math.floor(jj * GAP)); ciCapped++; }
    // Alderney clearly below Guernsey (or Jersey if no Guernsey route from here)
    const upper = out[kb]?.pax ?? out[kj]?.pax;
    const ja = out[ka]?.pax;
    if (upper != null && ja != null && ja > upper * GAP) { out[ka].pax = Math.max(1, Math.floor(upper * GAP)); ciCapped++; }
  }
  if (ciCapped) console.log(`Channel Island hierarchy: capped ${ciCapped} route(s) to keep Jersey > Guernsey > Alderney`);

  const outPath = path.join(__dirname, '../data/ukDomesticReal2024.json');
  fs.writeFileSync(outPath, JSON.stringify(out, null, 0));

  const byArch = {};
  for (const k in out) byArch[out[k].arch] = (byArch[out[k].arch] || 0) + 1;

  console.log(`UK domestic real routes written: ${Object.keys(out).length} pairs`);
  console.log('By archetype:', byArch);
  console.log(`Rows kept: ${kept}, skipped (zero pax 2024): ${skippedZero}`);
  console.log('Unmapped names (skipped):', [...skippedUnmapped].sort().join(', ') || '(none)');
  console.log('Written to', outPath);
}

main();
