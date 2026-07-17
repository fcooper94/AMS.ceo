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

    // Load static demand data
    const demandDataPath = path.join(__dirname, '../data/demandData.json');
    const fs = require('fs');

    if (!fs.existsSync(demandDataPath)) {
      console.warn('[DemandCache] demandData.json not found — run: node src/scripts/generateDemandData.js');
      this._ready = true;
      return;
    }

    // Read and parse in chunks with progress
    const fileSize = fs.statSync(demandDataPath).size;
    console.log(`[DemandCache] Parsing ${(fileSize / 1024 / 1024).toFixed(0)}MB demand file...`);

    const raw = fs.readFileSync(demandDataPath, 'utf8');
    console.log('[DemandCache] File read, building index...');

    // Guard: on a host where Git LFS content wasn't pulled, this file is just an
    // LFS pointer ("version https://git-lfs.github.com/..."), not the JSON. Don't
    // crash the whole server — skip the cache and let demand fall back to
    // on-demand calculation.
    if (raw.startsWith('version https://git-lfs')) {
      console.warn('[DemandCache] demandData.json is an unresolved Git LFS pointer — skipping cache. Run `git lfs pull` on this host, or regenerate with `node src/scripts/generateDemandData.js`.');
      this._ready = true;
      return;
    }

    let demandData;
    try {
      demandData = JSON.parse(raw);
    } catch (err) {
      console.warn(`[DemandCache] Could not parse demandData.json (${err.message}) — skipping cache; demand will be computed on demand.`);
      this._ready = true;
      return;
    }
    const totalEntries = Object.keys(demandData).length;
    console.log(`[DemandCache] ${totalEntries.toLocaleString()} pairs loaded, mapping to airports...`);

    // Convert ICAO-keyed data to UUID-keyed records
    let loaded = 0;
    let skipped = 0;
    const logInterval = Math.max(1, Math.floor(totalEntries / 5)); // log ~5 times

    for (const [pairKey, scores] of Object.entries(demandData)) {
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

    // Sort byOrigin arrays by demand2000 descending
    for (const [, records] of this.byOrigin) {
      records.sort((a, b) => (b.demand2000 || 0) - (a.demand2000 || 0));
    }

    this._ready = true;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`[DemandCache] Ready: ${loaded} pairs loaded in ${elapsed}s (${skipped} skipped — ICAO not in DB)`);
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
