/**
 * Seasonal demand profiles.
 *
 * Air-travel demand is highly seasonal but the *shape* depends on route
 * character, which a pure formula can't infer (e.g. LHR–GVA is a low-altitude
 * "business" pair by gravity terms, yet it's winter-heavy because GVA is an
 * Alpine ski gateway). So well-known cases are curated by ICAO; everything
 * else falls back to a latitude/route-type heuristic in seasonalityService.
 *
 * Archetype factors multiply the base (0–100) potential demand to give the
 * peak-summer and peak-winter values shown at a glance.
 */

// Per-archetype { summer, winter } multipliers applied to base potential demand.
const ARCHETYPE_FACTORS = {
  ski:            { summer: 0.60, winter: 1.50 }, // Alpine/snow gateways
  summer_sun:     { summer: 1.60, winter: 0.55 }, // Med/beach leisure
  winter_sun:     { summer: 0.95, winter: 1.40 }, // cold origin → tropical escape
  generic_leisure:{ summer: 1.35, winter: 0.75 }, // temperate leisure, summer-biased
  leisure:        { summer: 1.15, winter: 0.95 }, // visiting friends/relatives, mild
  business:       { summer: 1.05, winter: 0.95 }, // near-flat
  flat:           { summer: 1.00, winter: 1.00 }
};

// Ski / winter-sport gateway airports (ICAO). Winter (Dec–Mar) peak.
const SKI_GATEWAYS = new Set([
  // Alps
  'LSGG', // Geneva
  'LSZH', // Zürich
  'LOWI', // Innsbruck
  'LOWS', // Salzburg
  'LFLL', // Lyon
  'LFLS', // Grenoble
  'LFLB', // Chambéry
  'LFLP', // Annecy
  'LIMF', // Turin
  'LIPB', // Bolzano
  'LIPX', // Verona (Dolomites)
  'LJLJ', // Ljubljana (Julian Alps)
  // North America
  'KSLC', // Salt Lake City
  'KDEN', // Denver
  'KEGE', // Eagle/Vail
  'KASE', // Aspen
  'KJAC', // Jackson Hole
  'KGEG', // Spokane
  'KRNO', // Reno/Tahoe
  'CYYC', // Calgary (Banff)
  'CYLW', // Kelowna
  // Japan
  'RJCC', // Sapporo/Niseko
  // Northern lights / winter
  'BIKF', // Keflavík
  'ENTC'  // Tromsø
]);

// Summer beach / sun leisure airports (ICAO). Summer (Jun–Sep) peak.
const SUMMER_SUN = new Set([
  // Spain / Balearics / Canaries
  'LEPA','LEIB','LEMH','LEMG','LEAL','LEBL','GCRR','GCLP','GCTS','GCXO','GCFV',
  // Greece / Cyprus / Croatia / Italy / Portugal
  'LGIR','LGSR','LGRP','LGKO','LGZA','LGSM','LCLK','LCPH','LDSP','LDDU',
  'LIEO','LICJ','LICC','LIBD','LPFR','LPMA','LPPD',
  // France / Turkey / North Africa
  'LFKJ','LFKB','LTAI','LTFE','LTBS','DTMB','GMMX','GMAD','HEGN','HESH','DTTJ'
]);

// Winter-sun long-haul escapes (tropical) — strong Dec–Mar peak for cold
// (high-latitude) origins. (Many are warm year-round; the curated tag
// captures the well-known winter-escape markets.)
const WINTER_SUN = new Set([
  'VRMG','VRMM',          // Maldives
  'VCBI',                 // Colombo
  'FIMP',                 // Mauritius
  'FSIA',                 // Seychelles
  'MDPC','MDLR',          // Dominican Republic
  'TBPB','TNCM','TLPL',   // Barbados / St Maarten / St Lucia
  'MKJS','MKJP',          // Jamaica
  'MUVR','MUHA',          // Cuba
  'MMUN','MMSD',          // Cancún / Los Cabos
  'VTSP','VTSM',          // Phuket / Samui
  'WADD',                 // Bali
  'FALE','FACT'           // South Africa (N-winter = SA summer)
]);

// UK / Crown-Dependency holiday destinations. Temperate summer-leisure islands &
// coast — strongly summer-biased and weekend-heavy, NOT the flat business profile
// their airport types would otherwise imply. Mapped to 'generic_leisure'.
const DOMESTIC_LEISURE = new Set([
  'EGJJ', // Jersey
  'EGJB', // Guernsey
  'EGJA', // Alderney
  'EGHQ', // Newquay (Cornwall)
  'EGNS', // Isle of Man
  'EGHE', // Isles of Scilly (St Mary's)
  'EGHC'  // Land's End
]);

module.exports = { ARCHETYPE_FACTORS, SKI_GATEWAYS, SUMMER_SUN, WINTER_SUN, DOMESTIC_LEISURE };
