#!/usr/bin/env node
/**
 * Extract FIR altitude data from vatglasses-data and merge into fir-boundaries.geojson
 *
 * Strategy:
 * 1. Direct match: vatglasses group code === GeoJSON FIR id (works for most files)
 * 2. Prefix fallback: aggregate all sectors per file's ICAO prefix and apply to
 *    unmatched FIRs sharing that prefix (handles UK, US, etc. where groups are abstract)
 * 3. Default: FL0-FL999 for FIRs with no data at all
 *
 * Altitude values are flight levels (e.g., 245 = FL245 = 24,500 ft).
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const GITHUB_BASE = 'https://raw.githubusercontent.com/lennycolton/vatglasses-data/main/data/';

const DATA_FILES = [
  'adr.json', 'ay.json', 'bi-bg.json',
  'db-dg-dx.json', 'df-dr.json', 'di-ga-gb-gf-gg-gl-go-gq-gu.json', 'dn.json', 'dt.json',
  'eb-el.json', 'ed.json', 'ee.json', 'ef.json', 'eg.json', 'eh.json', 'ek.json', 'en.json', 'ep.json', 'es.json', 'ev.json', 'ey.json',
  'fa-fd-fx.json', 'fb.json', 'fc-fe-fg-fk-fo-fp.json', 'fi-fj.json', 'fl.json', 'fm.json', 'fn.json', 'fq.json', 'fs.json', 'fss.json', 'ft.json', 'fv.json', 'fw.json', 'fy.json', 'fz.json',
  'gc.json', 'gm.json', 'gv.json', 'ha-hd.json', 'hb-hr-ht.json', 'hc.json', 'he.json', 'hh.json', 'hj-hs.json', 'hk.json', 'hl.json', 'hu.json',
  'lb.json', 'lc.json', 'le.json', 'lf.json', 'lg.json', 'lh.json', 'li.json', 'lk.json', 'lm.json', 'lo.json', 'lppc.json', 'lppo.json', 'lr.json', 'ls.json', 'lt.json', 'lu.json', 'lx.json', 'lz.json',
  'md.json', 'mg-mh-mn-mr-ms-mz.json', 'mk.json', 'mmfo.json', 'mp.json', 'mu.json', 'nat.json', 'nc.json', 'nf.json', 'nodata.json', 'ns.json', 'nt.json', 'nv.json', 'nw.json', 'nz-ni.json',
  'ob.json', 'oi.json', 'ok.json', 'om.json', 'oo.json', 'ot.json', 'rj.json',
  'sa.json', 'sbao.json', 'sbaz.json', 'sbbs.json', 'sbcw.json', 'sbre.json', 'sc.json', 'se.json', 'sf.json', 'sg.json', 'sip.json', 'sm.json', 'so.json', 'su.json', 'sy.json',
  'ta-tb-td-tf-tg-tk-tl-tr-tt-tv.json', 'tn.json', 'ub.json', 'uc.json', 'ud.json', 'ug.json', 'uhmm.json', 'uiii.json', 'uk.json', 'ulll.json', 'unkl.json', 'unnt.json', 'urrv.json', 'uta.json', 'utd.json', 'uz.json',
  'v.json', 'vc-vr.json', 'vd-vl-vv.json',
  'wa-wi.json', 'wb.json', 'wm.json', 'ws.json',
  'zb.json', 'zg.json', 'zh.json', 'zj.json', 'zl.json', 'zm.json', 'zp.json', 'zs.json', 'zu.json', 'zw.json', 'zy.json'
];

// US/subdirectory data uses airspace.json not {name}.json
const US_DATA_FILES = [
  'ei/airspace.json',
  'zab/airspace.json', 'zak/airspace.json', 'zau/airspace.json', 'zhn/airspace.json', 'zhu/airspace.json',
  'zjx/airspace.json', 'zlc/airspace.json', 'zoa/airspace.json', 'zob/airspace.json',
  'zqm-zqx/airspace.json', 'zul/airspace.json', 'zyz/airspace.json'
];

// Groups to skip (not en-route FIR sectors)
const SKIP_GROUPS = new Set(['app', 'twr', 'mapp', 'del', 'gnd', 'aps', 'rap']);

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'AMS-Ceo-Script' } }, (res) => {
      if (res.statusCode === 404) { resolve(null); return; }
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode} for ${url}`)); res.resume(); return; }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error for ${url}: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

/**
 * Extract ICAO prefixes from a filename like "eg.json" → ["EG"]
 * or "di-ga-gb-gf-gg-gl-go-gq-gu.json" → ["DI","GA","GB","GF","GG","GL","GO","GQ","GU"]
 * or "zab/airspace.json" → ["ZAB"]  (use directory name for subdirectory files)
 */
function getIcaoPrefixes(filename) {
  // For subdirectory files like "zab/airspace.json", use the directory name
  if (filename.includes('/')) {
    const dir = filename.split('/')[0];
    return dir.split('-').map(p => p.toUpperCase());
  }
  // Strip .json
  const base = filename.replace('.json', '');
  return base.split('-').map(p => p.toUpperCase());
}

function isSkipGroup(groupCode) {
  const lower = groupCode.toLowerCase();
  if (SKIP_GROUPS.has(lower)) return true;
  if (lower.endsWith('mil')) return true;
  return false;
}

/**
 * Process one vatglasses data file.
 * Returns { perGroup: { CODE: {minFL, maxFL} }, fileAggregate: {minFL, maxFL} }
 */
function processFile(data) {
  const perGroup = {};
  let fileMin = Infinity;
  let fileMax = -Infinity;

  if (!data || !data.airspace) return { perGroup, fileAggregate: null };

  const groups = data.groups || {};

  // airspace can be an array (most files) or an object keyed by sector ID (US files)
  const airspaceEntries = Array.isArray(data.airspace)
    ? data.airspace
    : Object.values(data.airspace);

  for (const entry of airspaceEntries) {
    const group = entry.group;
    if (!group) continue;

    const skip = isSkipGroup(group);

    for (const sector of (entry.sectors || [])) {
      const sMin = sector.min != null ? sector.min : 0;
      const sMax = sector.max != null ? sector.max : 999;

      // Always collect for per-group (if not a skip group)
      if (!skip) {
        if (!perGroup[group]) {
          perGroup[group] = { name: groups[group]?.name || group, minFL: Infinity, maxFL: -Infinity };
        }
        if (sMin < perGroup[group].minFL) perGroup[group].minFL = sMin;
        if (sMax > perGroup[group].maxFL) perGroup[group].maxFL = sMax;
      }

      // Always contribute to file aggregate (all en-route sectors)
      if (!skip) {
        if (sMin < fileMin) fileMin = sMin;
        if (sMax > fileMax) fileMax = sMax;
      }
    }
  }

  // Clean up
  for (const info of Object.values(perGroup)) {
    if (info.minFL === Infinity) info.minFL = 0;
    if (info.maxFL === -Infinity) info.maxFL = 999;
  }

  const fileAggregate = (fileMin !== Infinity)
    ? { minFL: fileMin, maxFL: fileMax === -Infinity ? 999 : fileMax }
    : null;

  return { perGroup, fileAggregate };
}

async function main() {
  console.log('Extracting FIR altitude data from vatglasses-data...\n');

  const allFirAltitudes = {};   // group code → {minFL, maxFL, name}
  const prefixAltitudes = {};   // ICAO prefix (e.g. "EG") → {minFL, maxFL}
  const allFiles = [...DATA_FILES, ...US_DATA_FILES];
  let processed = 0;
  let failed = 0;

  for (let i = 0; i < allFiles.length; i += 10) {
    const batch = allFiles.slice(i, i + 10);
    const results = await Promise.all(
      batch.map(async (file) => {
        const url = GITHUB_BASE + file;
        try {
          const data = await fetchJSON(url);
          if (!data) { failed++; return { file, result: null }; }
          return { file, result: processFile(data) };
        } catch (err) {
          console.error(`  Failed: ${file} — ${err.message}`);
          failed++;
          return { file, result: null };
        }
      })
    );

    for (const { file, result } of results) {
      if (!result) continue;

      // Merge per-group altitudes
      for (const [code, info] of Object.entries(result.perGroup)) {
        if (allFirAltitudes[code]) {
          allFirAltitudes[code].minFL = Math.min(allFirAltitudes[code].minFL, info.minFL);
          allFirAltitudes[code].maxFL = Math.max(allFirAltitudes[code].maxFL, info.maxFL);
        } else {
          allFirAltitudes[code] = info;
        }
      }

      // Merge file-level aggregates by ICAO prefix
      if (result.fileAggregate) {
        const prefixes = getIcaoPrefixes(file);
        for (const prefix of prefixes) {
          if (prefixAltitudes[prefix]) {
            prefixAltitudes[prefix].minFL = Math.min(prefixAltitudes[prefix].minFL, result.fileAggregate.minFL);
            prefixAltitudes[prefix].maxFL = Math.max(prefixAltitudes[prefix].maxFL, result.fileAggregate.maxFL);
          } else {
            prefixAltitudes[prefix] = { ...result.fileAggregate };
          }
        }
      }
    }

    processed += batch.length;
    process.stdout.write(`\r  Processed ${processed}/${allFiles.length} files...`);
  }

  console.log(`\n\nExtracted altitude data for ${Object.keys(allFirAltitudes).length} FIR groups`);
  console.log(`Collected prefix altitudes for ${Object.keys(prefixAltitudes).length} ICAO prefixes`);
  console.log(`  (${failed} files failed/skipped)\n`);

  // Show examples
  const examples = ['EDGG', 'EDMM', 'LFFF', 'LFRR'];
  for (const ex of examples) {
    if (allFirAltitudes[ex]) {
      console.log(`  ${ex}: FL${allFirAltitudes[ex].minFL} — FL${allFirAltitudes[ex].maxFL} (${allFirAltitudes[ex].name})`);
    }
  }
  console.log('Prefix examples:');
  for (const px of ['EG', 'ED', 'LF', 'ZAB', 'EI']) {
    if (prefixAltitudes[px]) {
      console.log(`  ${px}*: FL${prefixAltitudes[px].minFL} — FL${prefixAltitudes[px].maxFL}`);
    }
  }

  // Merge into fir-boundaries.geojson
  const geojsonPath = path.join(__dirname, '..', 'public', 'data', 'fir-boundaries.geojson');
  console.log(`\nReading ${geojsonPath}...`);
  const geojson = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

  let directMatch = 0;
  let baseMatch = 0;
  let usMatch = 0;
  let prefixMatch = 0;
  let defaulted = 0;

  for (const feature of geojson.features) {
    const firCode = feature.properties.id;

    // 1. Direct match: group code === FIR code
    if (allFirAltitudes[firCode]) {
      feature.properties.minFL = allFirAltitudes[firCode].minFL;
      feature.properties.maxFL = allFirAltitudes[firCode].maxFL;
      directMatch++;
      continue;
    }

    // 2. Base code match (EGTT-C → EGTT)
    const baseCode = firCode.split('-')[0];
    if (baseCode !== firCode && allFirAltitudes[baseCode]) {
      feature.properties.minFL = allFirAltitudes[baseCode].minFL;
      feature.properties.maxFL = allFirAltitudes[baseCode].maxFL;
      baseMatch++;
      continue;
    }

    // 3. US FIR format: KZAB → ZAB
    if (firCode.startsWith('KZ')) {
      const noK = firCode.substring(1);
      const noKBase = noK.split('-')[0];
      if (allFirAltitudes[noK]) {
        feature.properties.minFL = allFirAltitudes[noK].minFL;
        feature.properties.maxFL = allFirAltitudes[noK].maxFL;
        usMatch++;
        continue;
      }
      if (allFirAltitudes[noKBase]) {
        feature.properties.minFL = allFirAltitudes[noKBase].minFL;
        feature.properties.maxFL = allFirAltitudes[noKBase].maxFL;
        usMatch++;
        continue;
      }
      // US prefix fallback: KZAB → prefix "ZAB"
      if (prefixAltitudes[noKBase]) {
        feature.properties.minFL = prefixAltitudes[noKBase].minFL;
        feature.properties.maxFL = prefixAltitudes[noKBase].maxFL;
        prefixMatch++;
        continue;
      }
    }

    // 4. Prefix fallback: EGTT → prefix "EG", ZBAA → prefix "ZB"
    //    Try 4-char prefix first (LPPC), then 3-char (SBA from SBAO), then 2-char (EG)
    let matched = false;
    for (const len of [4, 3, 2]) {
      if (baseCode.length >= len) {
        const prefix = baseCode.substring(0, len);
        if (prefixAltitudes[prefix]) {
          feature.properties.minFL = prefixAltitudes[prefix].minFL;
          feature.properties.maxFL = prefixAltitudes[prefix].maxFL;
          prefixMatch++;
          matched = true;
          break;
        }
      }
    }
    if (matched) continue;

    // 5. Default
    feature.properties.minFL = 0;
    feature.properties.maxFL = 999;
    defaulted++;
  }

  console.log(`\nGeoJSON merge results:`);
  console.log(`  ${directMatch} direct matches (group code = FIR code)`);
  console.log(`  ${baseMatch} base code matches (EGTT-C → EGTT)`);
  console.log(`  ${usMatch} US format matches (KZAB → ZAB)`);
  console.log(`  ${prefixMatch} ICAO prefix matches (EGTT → EG file aggregate)`);
  console.log(`  ${defaulted} defaulted to FL0-FL999`);
  console.log(`  Total: ${directMatch + baseMatch + usMatch + prefixMatch + defaulted}`);

  // Write updated GeoJSON
  fs.writeFileSync(geojsonPath, JSON.stringify(geojson, null, 2), 'utf8');
  console.log(`\nUpdated ${geojsonPath}`);

  // Save raw altitude lookup
  const altitudesPath = path.join(__dirname, '..', 'public', 'data', 'fir-altitudes.json');
  const combined = { perGroup: allFirAltitudes, perPrefix: prefixAltitudes };
  fs.writeFileSync(altitudesPath, JSON.stringify(combined, null, 2), 'utf8');
  console.log(`Saved raw altitude data to ${altitudesPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
