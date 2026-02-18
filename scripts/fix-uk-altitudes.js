const fs = require('fs');
const path = require('path');

const geoPath = path.join(__dirname, '..', 'public', 'data', 'fir-boundaries.geojson');
const data = JSON.parse(fs.readFileSync(geoPath, 'utf8'));

// Manual UK FIR altitude mapping based on vatglasses group data:
// London Area Control (L* groups): FL55-FL354
// London Terminal (T* groups): FL25-FL244
// Scottish (S* groups): FL35-FL294
// Manchester (M* groups): FL35-FL284
// Channel Islands (J group): FL35-FL194
// Shanwick Oceanic: already correct at FL0-FL599

const UK_ALTITUDES = {
  // London Area Control (en-route)
  'EGTT':    { minFL: 55, maxFL: 354 },
  'EGTT-C':  { minFL: 55, maxFL: 354 },
  'EGTT-D':  { minFL: 55, maxFL: 354 },
  'EGTT-E':  { minFL: 55, maxFL: 354 },
  'EGTT-H':  { minFL: 55, maxFL: 354 },
  'EGTT-M':  { minFL: 55, maxFL: 354 },
  'EGTT-N':  { minFL: 55, maxFL: 354 },
  'EGTT-NE': { minFL: 55, maxFL: 354 },
  'EGTT-NW': { minFL: 55, maxFL: 354 },
  'EGTT-S':  { minFL: 55, maxFL: 354 },
  'EGTT-SC': { minFL: 55, maxFL: 354 },
  'EGTT-W':  { minFL: 55, maxFL: 354 },

  // London Terminal Control
  'EGTL':    { minFL: 25, maxFL: 244 },
  'EGTL-N':  { minFL: 25, maxFL: 244 },
  'EGTL-S':  { minFL: 25, maxFL: 244 },

  // Scottish
  'EGPX':    { minFL: 35, maxFL: 294 },
  'EGPX-A':  { minFL: 35, maxFL: 294 },
  'EGPX-D':  { minFL: 35, maxFL: 294 },
  'EGPX-E':  { minFL: 35, maxFL: 294 },
  'EGPX-N':  { minFL: 35, maxFL: 294 },
  'EGPX-S':  { minFL: 35, maxFL: 294 },
  'EGPX-W':  { minFL: 35, maxFL: 294 },
  'EGPX-WD': { minFL: 35, maxFL: 294 },

  // Manchester / Midlands
  'EGTM':    { minFL: 35, maxFL: 284 },
  'EGTM-NE': { minFL: 35, maxFL: 284 },
  'EGTM-W':  { minFL: 35, maxFL: 284 },

  // Military (not in vatglasses, keep reasonable defaults)
  'EGYP':    { minFL: 0, maxFL: 660 },
};

let updated = 0;
for (const feature of data.features) {
  const id = feature.properties.id;
  if (UK_ALTITUDES[id]) {
    feature.properties.minFL = UK_ALTITUDES[id].minFL;
    feature.properties.maxFL = UK_ALTITUDES[id].maxFL;
    updated++;
    console.log(`${id}: FL${UK_ALTITUDES[id].minFL}-FL${UK_ALTITUDES[id].maxFL}`);
  }
}

fs.writeFileSync(geoPath, JSON.stringify(data, null, 2));
console.log(`\nUpdated ${updated} UK FIR features.`);
