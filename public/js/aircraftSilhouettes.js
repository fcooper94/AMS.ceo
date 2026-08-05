/**
 * AMS aircraft silhouettes — Phase 1
 *
 * Hand-authored top-down SVG aircraft visuals used as the background for the
 * interactive cabin layout. The artwork and the live cabin renderer share a
 * single SVG — the artwork is NOT a separate overlay.
 *
 * Each definition provides:
 *   viewBox    — horizontal coordinate system, nose pointing left
 *   cabinBox   — rectangle the live cabin must fit inside
 *   fuselagePath — outer fuselage, also used as a clip path for the cabin
 *   rearArtwork  — wings, engines, tailplanes (drawn BEHIND fuselage)
 *   bodyArtwork  — fuselage fill, cabin wall, centre line
 *   frontArtwork — cockpit, fin, fairings, door marks (drawn OVER cabin)
 *
 * Phase 1 aircraft: A320 family.
 */

(function initialiseAircraftSilhouettes() {
  'use strict';

  // ── SVG styles injected once into the combined SVG ──────────────────

  var AIRCRAFT_VISUAL_STYLES = '<style>' +
    '.ac-wing,.ac-tailplane{fill:rgba(72,91,113,0.15);stroke:rgba(158,178,201,0.36);stroke-width:1.7;stroke-linejoin:round}' +
    '.ac-wing-panel,.ac-detail-line,.ac-engine-line{fill:none;stroke:rgba(166,185,206,0.22);stroke-width:1.3;stroke-linecap:round}' +
    '.ac-fuselage{fill:rgba(55,72,94,0.30);stroke:rgba(172,193,218,0.58);stroke-width:2.1}' +
    '.ac-cabin-wall{fill:rgba(9,18,31,0.72);stroke:rgba(151,172,197,0.42);stroke-width:1.5}' +
    '.ac-centre-line{fill:none;stroke:rgba(158,178,201,0.10);stroke-width:1;stroke-dasharray:8 8}' +
    '.ac-engine{fill:rgba(55,72,94,0.34);stroke:rgba(169,190,214,0.42);stroke-width:1.5}' +
    '.ac-intake{fill:rgba(5,12,22,0.92);stroke:rgba(172,193,218,0.55);stroke-width:1.5}' +
    '.ac-exhaust{fill:rgba(10,18,29,0.72);stroke:rgba(148,166,187,0.38);stroke-width:1}' +
    '.ac-pylon,.ac-fairing{fill:rgba(75,94,117,0.40);stroke:rgba(158,178,201,0.36);stroke-width:1.3}' +
    '.ac-fin{fill:rgba(72,91,113,0.42);stroke:rgba(172,193,218,0.58);stroke-width:2}' +
    '.ac-fin-shadow{fill:rgba(40,55,74,0.26);stroke:rgba(151,172,197,0.32);stroke-width:1.4}' +
    '.ac-cockpit path{fill:rgba(3,10,19,0.95);stroke:rgba(149,172,199,0.55);stroke-width:1.3}' +
    '.ac-door-guides path{fill:none;stroke:rgba(224,231,239,0.35);stroke-width:2;stroke-linecap:round}' +
    '</style>';

  // ── A320 family visual ──────────────────────────────────────────────

  var A320_FUSELAGE = 'M 42 200 C 75 165, 126 149, 205 142 C 454 126, 1052 126, 1355 142 C 1435 147, 1501 166, 1560 200 C 1501 234, 1435 253, 1355 258 C 1052 274, 454 274, 205 258 C 126 251, 75 235, 42 200 Z';

  var AIRCRAFT_SILHOUETTES = {

    'a320-family': {
      viewBox: { width: 1600, height: 400 },

      cabinBox: { x: 205, y: 139, width: 1160, height: 122 },

      fuselagePath: A320_FUSELAGE,

      rearArtwork:
        // Swept wings — leading edge forward (left), trailing edge aft (right)
        // Wing root at ~x=520, tips sweep AFT to ~x=780
        '<path class="ac-wing" d="M 520 140 L 660 44 L 780 47 L 620 157 L 620 243 L 780 353 L 660 356 L 520 260 Z"/>' +
        // Tailplanes — swept aft from root ~x=1350
        '<path class="ac-tailplane" d="M 1350 155 L 1460 100 L 1520 105 L 1420 165 L 1420 235 L 1520 295 L 1460 300 L 1350 245 Z"/>' +
        // Upper engine — hung under forward wing, intake at front (left)
        '<g transform="rotate(-5 555 105)">' +
          '<path class="ac-pylon" d="M 555 132 L 540 148 L 560 153 L 580 132 Z"/>' +
          '<path class="ac-engine" d="M 505 105 C 509 85, 525 76, 548 75 L 590 76 C 608 77, 618 88, 619 105 C 618 122, 608 133, 590 134 L 548 135 C 525 134, 509 125, 505 105 Z"/>' +
          '<ellipse class="ac-intake" cx="518" cy="105" rx="11" ry="21"/>' +
          '<ellipse class="ac-exhaust" cx="608" cy="105" rx="6" ry="14"/>' +
        '</g>' +
        // Lower engine
        '<g transform="rotate(5 555 295)">' +
          '<path class="ac-pylon" d="M 555 268 L 540 252 L 560 247 L 580 268 Z"/>' +
          '<path class="ac-engine" d="M 505 295 C 509 275, 525 266, 548 265 L 590 266 C 608 267, 618 278, 619 295 C 618 312, 608 323, 590 324 L 548 325 C 525 324, 509 315, 505 295 Z"/>' +
          '<ellipse class="ac-intake" cx="518" cy="295" rx="11" ry="21"/>' +
          '<ellipse class="ac-exhaust" cx="608" cy="295" rx="6" ry="14"/>' +
        '</g>',

      bodyArtwork:
        // Main fuselage
        '<path class="ac-fuselage" d="' + A320_FUSELAGE + '"/>' +
        // Dark cabin floor — nearly fills fuselage
        '<path class="ac-cabin-wall" d="M 191 143 C 435 131, 1090 131, 1370 146 L 1370 254 C 1090 269, 435 269, 191 257 Z"/>' +
        // Central aisle reference
        '<path class="ac-centre-line" d="M 205 200 L 1378 200"/>' +
        // Cockpit bulkhead
        '<path class="ac-detail-line" d="M 191 145 L 191 255"/>' +
        // Rear cabin bulkhead
        '<path class="ac-detail-line" d="M 1370 146 L 1370 254"/>' +
        // Wing-root fairing (behind seats, not in frontArtwork)
        '<path class="ac-fairing" d="M 500 145 C 530 135, 570 131, 620 134 L 680 154 L 680 246 L 620 266 C 570 269, 530 265, 500 255 Z"/>',

      frontArtwork:
        // Cockpit windows
        '<g class="ac-cockpit">' +
          '<path d="M 91 180 L 137 158 L 177 162 L 152 190 Z"/>' +
          '<path d="M 91 220 L 137 242 L 177 238 L 152 210 Z"/>' +
          '<path d="M 148 158 L 189 155 L 178 188 L 151 191 Z"/>' +
          '<path d="M 148 242 L 189 245 L 178 212 L 151 209 Z"/>' +
        '</g>' +
        // Radome
        '<path class="ac-detail-line" d="M 62 200 C 86 190, 86 210, 62 200"/>' +
        // Vertical fin
        '<path class="ac-fin" d="M 1370 143 L 1438 35 L 1475 39 L 1440 164 Z"/>' +
        '<path class="ac-fin-shadow" d="M 1370 257 L 1438 365 L 1475 361 L 1440 236 Z"/>' +
        // Door guide marks
        '<g class="ac-door-guides">' +
          '<path d="M 215 139 L 215 156"/><path d="M 215 244 L 215 261"/>' +
          '<path d="M 660 128 L 660 151"/><path d="M 660 249 L 660 272"/>' +
          '<path d="M 1260 132 L 1260 151"/><path d="M 1260 249 L 1260 268"/>' +
          '<path d="M 1350 140 L 1350 157"/><path d="M 1350 243 L 1350 260"/>' +
        '</g>'
    }
  };

  // ── ICAO code → silhouette mapping ──────────────────────────────────

  var AIRCRAFT_SILHOUETTE_MAP = {
    // Airbus A320 family
    A318: 'a320-family', A319: 'a320-family', A320: 'a320-family',
    A20N: 'a320-family', A321: 'a320-family', A21N: 'a320-family'
  };

  // ── Lookup API ──────────────────────────────────────────────────────

  function normaliseAircraftCode(value) {
    return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function resolveAircraftSilhouette(aircraft) {
    if (!aircraft) return null;
    var icaoCode = normaliseAircraftCode(aircraft.icaoCode || aircraft.icao || aircraft.typeCode);
    var silhouetteId = AIRCRAFT_SILHOUETTE_MAP[icaoCode];
    if (!silhouetteId) return null;
    var sil = AIRCRAFT_SILHOUETTES[silhouetteId];
    if (!sil) return null;
    return {
      id: silhouetteId,
      viewBox: sil.viewBox,
      cabinBox: sil.cabinBox,
      fuselagePath: sil.fuselagePath,
      rearArtwork: sil.rearArtwork,
      bodyArtwork: sil.bodyArtwork,
      frontArtwork: sil.frontArtwork
    };
  }

  function getStyles() {
    return AIRCRAFT_VISUAL_STYLES;
  }

  window.AircraftSilhouettes = Object.freeze({
    definitions: AIRCRAFT_SILHOUETTES,
    mapping: AIRCRAFT_SILHOUETTE_MAP,
    resolve: resolveAircraftSilhouette,
    getStyles: getStyles
  });
})();
