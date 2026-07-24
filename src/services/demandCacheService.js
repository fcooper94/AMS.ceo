/**
 * Demand Cache Service
 *
 * Loads pre-computed demand data from src/data/demandData.json (keyed by ICAO pairs).
 * At boot, reads the static file and builds in-memory Maps keyed by airport UUIDs.
 * Zero gravity model computation at runtime, zero DB queries for demand.
 *
 * To regenerate demandData.json: node src/scripts/generateDemandData.js
 */

const path = require('path');
const gravityModelService = require('./gravityModelService');

class DemandCacheService {
  constructor() {
    // key: "fromAirportId_toAirportId" → demand record
    this.demandMap = new Map();
    // key: fromAirportId → sorted array of demand records (by demand2000 desc)
    this.byOrigin = new Map();
    // key: airportId → airport plain object
    this.airportById = new Map();
    // key: icaoCode → airportId
    this.icaoToId = new Map();
    this._ready = false;
  }

  isReady() {
    return this._ready;
  }

  /**
   * Initialize the cache. Call once at boot after DB is connected.
   * Loads airports from DB (single query), then reads the static demand file.
   */
  async initialize() {
    const startTime = Date.now();
    console.log('[DemandCache] Loading demand data...');

    const { Airport } = require('../models');

    // Single DB query — load all airports for UUID ↔ ICAO mapping
    const airports = await Airport.findAll({
      where: { isActive: true },
      attributes: ['id', 'icaoCode', 'iataCode', 'name', 'city', 'country', 'type',
                   'latitude', 'longitude', 'trafficDemand', 'spareCapacity'],
      raw: true
    });

    // Build lookups
    for (const a of airports) {
      this.airportById.set(a.id, a);
      this.icaoToId.set(a.icaoCode, a.id);
    }

    // Load static demand data. Prefer the committed gzip (~18MB — a normal Git
    // file that deploys everywhere, incl. Railway); fall back to the plain JSON
    // for local dev. The plain file is ~172MB and Git LFS-tracked, so it is NOT
    // present on hosts that don't pull LFS.
    const fs = require('fs');
    const zlib = require('zlib');
    const gzPath = path.join(__dirname, '../data/demandData.json.gz');
    const jsonPath = path.join(__dirname, '../data/demandData.json');

    let raw;
    if (fs.existsSync(gzPath)) {
      console.log(`[DemandCache] Decompressing demand file (${(fs.statSync(gzPath).size / 1024 / 1024).toFixed(0)}MB gz)...`);
      try {
        raw = zlib.gunzipSync(fs.readFileSync(gzPath)).toString('utf8');
      } catch (err) {
        console.warn(`[DemandCache] Could not decompress demandData.json.gz (${err.message}) — skipping cache.`);
        this._ready = true;
        return;
      }
    } else if (fs.existsSync(jsonPath)) {
      raw = fs.readFileSync(jsonPath, 'utf8');
      // On a host where Git LFS content wasn't pulled, this file is just an LFS
      // pointer, not the JSON — don't crash, just skip the cache.
      if (raw.startsWith('version https://git-lfs')) {
        console.warn('[DemandCache] demandData.json is an unresolved Git LFS pointer — skipping cache. Run `git lfs pull` or regenerate with `node src/scripts/generateDemandData.js`.');
        this._ready = true;
        return;
      }
    } else {
      console.warn('[DemandCache] No demand file found (.gz or .json) — run: node src/scripts/generateDemandData.js');
      this._ready = true;
      return;
    }

    console.log('[DemandCache] File read, building index...');
    let demandData;
    try {
      demandData = JSON.parse(raw);
    } catch (err) {
      console.warn(`[DemandCache] Could not parse demand data (${err.message}) — skipping cache; demand will be computed on demand.`);
      this._ready = true;
      return;
    }
    const totalEntries = Object.keys(demandData).length;
    console.log(`[DemandCache] ${totalEntries.toLocaleString()} pairs loaded, mapping to airports...`);

    // Convert ICAO-keyed data to UUID-keyed records.
    // for..in (not Object.entries — that materialises a 5.1M-element array),
    // yielding to the event loop every 250K pairs: this loop is the bulk of
    // the former 30-50s boot stall, and yielding keeps sockets/health/
    // heartbeats alive while the index builds.
    let loaded = 0;
    let skipped = 0;
    let sinceYield = 0;
    const logInterval = Math.max(1, Math.floor(totalEntries / 5)); // log ~5 times

    for (const pairKey in demandData) {
      const scores = demandData[pairKey];
      if (++sinceYield >= 250000) {
        sinceYield = 0;
        await new Promise(resolve => setImmediate(resolve));
      }
      const underscoreIdx = pairKey.indexOf('_');
      const fromIcao = pairKey.substring(0, underscoreIdx);
      const toIcao = pairKey.substring(underscoreIdx + 1);
      const fromId = this.icaoToId.get(fromIcao);
      const toId = this.icaoToId.get(toIcao);

      if (!fromId || !toId) { skipped++; continue; }

      const fromAirport = this.airportById.get(fromId);
      const toAirport = this.airportById.get(toId);

      const record = {
        fromAirportId: fromId,
        toAirportId: toId,
        demand1950: scores[0], demand1960: scores[1], demand1970: scores[2], demand1980: scores[3],
        demand1990: scores[4], demand2000: scores[5], demand2010: scores[6], demand2020: scores[7],
        baseDemand: scores[5],
        demandCategory: gravityModelService.getDemandCategory(
          Math.max(scores[5], scores[6], scores[7])
        ),
        routeType: gravityModelService.determineRouteType(
          fromAirport?.type, toAirport?.type, 0,
          fromAirport?.country, toAirport?.country
        )
      };

      const uuidKey = `${fromId}_${toId}`;
      this.demandMap.set(uuidKey, record);

      if (!this.byOrigin.has(fromId)) {
        this.byOrigin.set(fromId, []);
      }
      this.byOrigin.get(fromId).push(record);
      loaded++;

      if (loaded % logInterval === 0) {
        console.log(`[DemandCache] ${Math.round(loaded / totalEntries * 100)}% mapped (${loaded.toLocaleString()} pairs)`);
      }
    }

    // Overlay UK domestic demand: (1) override gravity with real CAA-2024 data
    // back-projected through the eras for routes that actually operate, then
    // (2) apply a small connectivity floor to any remaining commercial-civil
    // UK↔UK pair so "every civil pair, every era" holds. See
    // ukDomesticDemandService.js.
    this._applyUkDomesticDemand(airports);

    // Same treatment for US domestic, anchored to BTS T-100 2024 (much larger:
    // ~12.5k routes). See usDomesticDemandService.js.
    this._applyUsDomesticDemand(airports);

    // Sort byOrigin arrays by demand2000 descending (yield periodically —
    // ~5M records across thousands of origins is seconds of sync sort)
    let originsSorted = 0;
    for (const [, records] of this.byOrigin) {
      records.sort((a, b) => (b.demand2000 || 0) - (a.demand2000 || 0));
      if (++originsSorted % 500 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }

    this._ready = true;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DemandCache] Ready: ${loaded} pairs loaded in ${elapsed}s (${skipped} skipped — ICAO not in DB)`);
  }

  // Decade → record field, index-aligned with ukDomesticDemandService.DECADES.
  static get DECADE_FIELDS() {
    return ['demand1950', 'demand1960', 'demand1970', 'demand1980',
            'demand1990', 'demand2000', 'demand2010', 'demand2020'];
  }

  /**
   * Fetch (or lazily create) the demand record for an ordered airport pair.
   */
  _ensureRecord(from, to) {
    const uuidKey = `${from.id}_${to.id}`;
    let record = this.demandMap.get(uuidKey);
    let created = false;
    if (!record) {
      record = {
        fromAirportId: from.id,
        toAirportId: to.id,
        demand1950: 0, demand1960: 0, demand1970: 0, demand1980: 0,
        demand1990: 0, demand2000: 0, demand2010: 0, demand2020: 0,
        baseDemand: 0,
        demandCategory: 'very_low',
        routeType: gravityModelService.determineRouteType(
          from.type, to.type, 0, from.country, to.country
        )
      };
      this.demandMap.set(uuidKey, record);
      if (!this.byOrigin.has(from.id)) this.byOrigin.set(from.id, []);
      this.byOrigin.get(from.id).push(record);
      created = true;
    }
    return { record, created };
  }

  _refreshRecordSummary(record) {
    record.baseDemand = record.demand2000;
    record.demandCategory = gravityModelService.getDemandCategory(
      Math.max(record.demand2000, record.demand2010, record.demand2020)
    );
  }

  /**
   * Two-layer UK domestic demand overlay (see ukDomesticDemandService.js):
   *   1. Real CAA-2024 routes OVERRIDE the gravity model with history-shaped,
   *      real-anchored per-decade scores (both directions).
   *   2. Any remaining commercial-civil UK↔UK pair gets a small connectivity
   *      floor so demand is non-zero in every era.
   * Called once during initialize().
   * @param {Array} airports - the airport rows already loaded from the DB
   */
  _applyUkDomesticDemand(airports) {
    let svc;
    try {
      svc = require('./ukDomesticDemandService');
    } catch (err) {
      console.warn(`[DemandCache] UK domestic demand unavailable (${err.message}) — skipping.`);
      return;
    }

    const fields = DemandCacheService.DECADE_FIELDS;

    // Layer 1 — real-data overrides. Keys are undirected "ICAO_ICAO"; apply to
    // both directions. Track covered pairs so the floor skips them.
    const realCovered = new Set();
    const real = svc.realRoutes();
    let realApplied = 0, realSkipped = 0;
    for (const pairKey in real) {
      const us = pairKey.indexOf('_');
      const icaoA = pairKey.slice(0, us), icaoB = pairKey.slice(us + 1);
      const idA = this.icaoToId.get(icaoA), idB = this.icaoToId.get(icaoB);
      if (!idA || !idB) { realSkipped++; continue; }
      const airA = this.airportById.get(idA), airB = this.airportById.get(idB);
      const scores = svc.realRouteScores(real[pairKey].pax, real[pairKey].arch);

      for (const [from, to] of [[airA, airB], [airB, airA]]) {
        const { record } = this._ensureRecord(from, to);
        for (let d = 0; d < fields.length; d++) record[fields[d]] = scores[d]; // override
        record.isFloor = false; // real data — keep its exact order (Jersey > Guernsey…)
        this._refreshRecordSummary(record);
        realCovered.add(`${from.id}_${to.id}`);
      }
      realApplied++;
    }

    // Layer 2 — connectivity floor for in-scope pairs not covered by real data.
    // REPLACES any gravity value (not max): now that real CAA data covers every
    // UK route that actually operates, the gravity model must not drive UK↔UK
    // demand — it wildly overestimates domestic pairs that aren't really flown
    // (e.g. it rated Birmingham–Prestwick at 1,600/day, above real Birmingham–
    // Glasgow). So UK domestic demand = real data where it exists, floor elsewhere.
    const inScope = airports.filter(a => svc.isInScope(a));
    let floored = 0;
    for (const from of inScope) {
      for (const to of inScope) {
        if (from.id === to.id) continue;
        if (realCovered.has(`${from.id}_${to.id}`)) continue;

        const scores = svc.floorScores(from, to);
        const { record } = this._ensureRecord(from, to);
        for (let d = 0; d < fields.length; d++) {
          record[fields[d]] = scores[d]; // replace gravity — suppress it on UK domestic
        }
        record.isFloor = true; // no real service — display may vary these ±1 for variety
        this._refreshRecordSummary(record);
        floored++;
      }
    }

    console.log(`[DemandCache] UK domestic: ${realApplied} real routes overridden (${realSkipped} skipped — ICAO not in DB), ${floored} pairs floored (${inScope.length} in-scope airports)`);
  }

  /**
   * US domestic overlay (see usDomesticDemandService.js): override gravity with
   * real BTS T-100 2024 data for routes that operate, then suppress gravity on
   * any remaining US↔US pair (it over-rates domestic pairs that aren't flown).
   * Unlike the UK, the US pair space is far too large to enumerate, so the
   * suppression scans the existing demand records instead.
   * @param {Array} airports - the airport rows already loaded from the DB
   */
  _applyUsDomesticDemand(airports) {
    let svc;
    try {
      svc = require('./usDomesticDemandService');
    } catch (err) {
      console.warn(`[DemandCache] US domestic demand unavailable (${err.message}) — skipping.`);
      return;
    }

    const fields = DemandCacheService.DECADE_FIELDS;
    const usIds = new Set();
    for (const a of airports) if (svc.isUsAirport(a)) usIds.add(a.id);

    // Layer 1 — real-data overrides (both directions).
    const realCovered = new Set();
    const real = svc.realRoutes();
    let realApplied = 0, realSkipped = 0;
    for (const pairKey in real) {
      const us = pairKey.indexOf('_');
      const idA = this.icaoToId.get(pairKey.slice(0, us)), idB = this.icaoToId.get(pairKey.slice(us + 1));
      if (!idA || !idB) { realSkipped++; continue; }
      const airA = this.airportById.get(idA), airB = this.airportById.get(idB);
      const scores = svc.realRouteScores(real[pairKey].pax, real[pairKey].arch);
      for (const [from, to] of [[airA, airB], [airB, airA]]) {
        const { record } = this._ensureRecord(from, to);
        for (let d = 0; d < fields.length; d++) record[fields[d]] = scores[d];
        record.isFloor = false;
        this._refreshRecordSummary(record);
        realCovered.add(`${from.id}_${to.id}`);
      }
      realApplied++;
    }

    // Layer 2 — suppress gravity on US↔US pairs with no real service. Walk only
    // US-origin records (via byOrigin) rather than scanning all ~5M, and reuse
    // the constant floor summary instead of recomputing per record.
    const floorSc = svc.floorScores();
    const floorBase = floorSc[5];
    const floorCat = gravityModelService.getDemandCategory(Math.max(floorSc[5], floorSc[6], floorSc[7]));
    let suppressed = 0;
    for (const usId of usIds) {
      const recs = this.byOrigin.get(usId);
      if (!recs) continue;
      for (const record of recs) {
        if (!usIds.has(record.toAirportId)) continue;
        if (realCovered.has(`${record.fromAirportId}_${record.toAirportId}`)) continue;
        for (let d = 0; d < fields.length; d++) record[fields[d]] = floorSc[d];
        record.baseDemand = floorBase;
        record.demandCategory = floorCat;
        record.isFloor = true;
        suppressed++;
      }
    }

    console.log(`[DemandCache] US domestic: ${realApplied} real routes overridden (${realSkipped} skipped — ICAO not in DB), ${suppressed} gravity US↔US pairs suppressed to floor`);
  }

  /**
   * Get a single demand record for a pair of airports
   * @returns {Object|null}
   */
  getRecord(fromAirportId, toAirportId) {
    return this.demandMap.get(`${fromAirportId}_${toAirportId}`) || null;
  }

  /**
   * Get all destination demand records from an origin airport
   * @returns {Array} sorted by demand2000 desc
   */
  getDestinations(fromAirportId) {
    return this.byOrigin.get(fromAirportId) || [];
  }

  /**
   * Get a cached airport by ID
   * @returns {Object|null}
   */
  getAirport(airportId) {
    return this.airportById.get(airportId) || null;
  }
}

// Singleton
const demandCacheService = new DemandCacheService();
module.exports = demandCacheService;
