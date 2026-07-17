/**
 * Airline Logo Generator (procedural SVG)
 * ----------------------------------------
 * Builds airline wordmark logos from a name and a THREE-colour scheme:
 *   background — the card fill
 *   primary    — the wordmark / main text colour
 *   secondary  — the accent (marks, swooshes, stripes)
 *
 * Each mark is a self-contained "livery card" (no white box) that reads well
 * on any surface. A `seed` selects 6 designs from a larger pool and adds small
 * per-design variation, so "shuffling" yields fresh sets. Deterministic given
 * the same inputs. No deps, offline. All logos share a 400x140 viewBox.
 *
 * Public API (browser globals):
 *   generateAirlineLogos(name, background, primary, secondary, seed) -> [{ id, label, svg }]
 *   airlineInitials(name) -> "AB"
 */

/* eslint-disable no-unused-vars */

// Two-letter mark: first letter of the first two words (e.g. "British Airways" -> "BA");
// for a single-word name, the first two letters (e.g. "Ryanair" -> "RY").
function airlineInitials(name) {
  const clean = (name || '').trim();
  if (!clean) return 'AA';
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return words[0].slice(0, 2).toUpperCase();
}

function _esc(s) {
  return String(s).replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c]));
}
function _fitFont(text, maxWidth, maxFont, minFont, widthFactor) {
  const n = Math.max(1, (text || '').length);
  return Math.max(minFont, Math.min(maxFont, maxWidth / (n * (widthFactor || 0.60))));
}
// Deterministic RNG from a numeric seed → () => float in [0,1).
function _rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
function _shuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const _FONT = "font-family:'Segoe UI',Arial,Helvetica,sans-serif;";
const _svg = inner => `<svg viewBox="0 0 400 140" xmlns="http://www.w3.org/2000/svg" role="img">${inner}</svg>`;
const _card = bg => `<rect width="400" height="140" rx="18" fill="${bg}"/>`;

// ── Template pool ────────────────────────────────────────────────────────
// Each: (ini, name, bg, txt, acc, rnd) -> svg string. `txt` = primary, `acc` = secondary.

function _wordmark(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 356, 60, 20, 0.6);
  const straight = rnd() < 0.5;
  const accent = straight
    ? `<rect x="80" y="92" width="240" height="7" rx="3.5" fill="${acc}"/>`
    : `<path d="M66 96 Q200 84 334 96 Q200 106 66 100 Z" fill="${acc}"/>`;
  return _svg(`${_card(bg)}
    <text x="200" y="62" text-anchor="middle" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>
    ${accent}`);
}
function _underline(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 356, 58, 20, 0.6);
  return _svg(`${_card(bg)}
    <text x="200" y="66" text-anchor="middle" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>
    <rect x="70" y="96" width="260" height="5" fill="${acc}"/>
    <rect x="70" y="105" width="260" height="2.5" fill="${acc}" opacity="0.55"/>`);
}
function _roundelL(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 240, 42, 16, 0.6);
  const filled = rnd() < 0.5;
  const mark = filled
    ? `<circle cx="76" cy="70" r="46" fill="${acc}"/><text x="76" y="70" text-anchor="middle" dominant-baseline="central" style="${_FONT}" font-size="34" font-weight="800" fill="${bg}">${_esc(ini)}</text>`
    : `<circle cx="76" cy="70" r="46" fill="none" stroke="${acc}" stroke-width="7"/><text x="76" y="70" text-anchor="middle" dominant-baseline="central" style="${_FONT}" font-size="34" font-weight="800" fill="${txt}">${_esc(ini)}</text>`;
  return _svg(`${_card(bg)}${mark}
    <text x="146" y="70" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}
function _roundelR(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 250, 40, 16, 0.6);
  return _svg(`${_card(bg)}
    <circle cx="332" cy="70" r="44" fill="none" stroke="${acc}" stroke-width="7"/>
    <text x="332" y="70" text-anchor="middle" dominant-baseline="central" style="${_FONT}" font-size="32" font-weight="800" fill="${txt}">${_esc(ini)}</text>
    <text x="34" y="70" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}
function _tailfin(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 240, 42, 16, 0.6);
  return _svg(`${_card(bg)}
    <path d="M34 106 L76 28 L102 28 L102 106 Z" fill="${acc}"/>
    <path d="M76 106 L102 60 L102 106 Z" fill="${txt}" opacity="0.85"/>
    <text x="128" y="70" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}
function _globe(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 240, 42, 16, 0.6);
  return _svg(`${_card(bg)}
    <g fill="none" stroke="${acc}" stroke-width="3">
      <circle cx="74" cy="70" r="44"/><ellipse cx="74" cy="70" rx="44" ry="17"/><ellipse cx="74" cy="70" rx="18" ry="44"/><line x1="30" y1="70" x2="118" y2="70"/>
    </g>
    <text x="140" y="70" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}
function _speed(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 320, 56, 18, 0.62);
  return _svg(`${_card(bg)}
    <path d="M28 112 Q160 100 376 44 Q170 86 44 120 Z" fill="${acc}"/>
    <g transform="skewX(-9)"><text x="150" y="72" text-anchor="middle" style="${_FONT}" font-size="${fs}" font-style="italic" font-weight="800" fill="${txt}" letter-spacing="-1">${_esc(name)}</text></g>`);
}
function _stripes(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 292, 48, 18, 0.6);
  return _svg(`${_card(bg)}
    <rect x="22" y="20" width="16" height="100" rx="8" fill="${acc}"/>
    <rect x="46" y="20" width="8" height="100" rx="4" fill="${acc}" opacity="0.6"/>
    <text x="232" y="70" text-anchor="middle" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}
function _chevron(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 250, 42, 16, 0.6);
  return _svg(`${_card(bg)}
    <path d="M28 40 L70 70 L28 100 L44 100 L86 70 L44 40 Z" fill="${acc}"/>
    <path d="M60 40 L102 70 L60 100 L76 100 L118 70 L76 40 Z" fill="${acc}" opacity="0.55"/>
    <text x="140" y="70" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}
function _monoblock(ini, name, bg, txt, acc, rnd) {
  const fs = _fitFont(name, 250, 40, 16, 0.58);
  return _svg(`${_card(bg)}
    <rect x="22" y="26" width="88" height="88" rx="14" fill="${acc}"/>
    <text x="66" y="70" text-anchor="middle" dominant-baseline="central" style="${_FONT}" font-size="46" font-weight="800" fill="${bg}">${_esc(ini)}</text>
    <text x="130" y="70" dominant-baseline="central" style="${_FONT}" font-size="${fs}" font-weight="800" fill="${txt}" letter-spacing="-0.5">${_esc(name)}</text>`);
}

const _POOL = [
  { id: 'wordmark', label: 'Wordmark', fn: _wordmark },
  { id: 'underline', label: 'Underline', fn: _underline },
  { id: 'roundel', label: 'Roundel', fn: _roundelL },
  { id: 'roundelr', label: 'Roundel R', fn: _roundelR },
  { id: 'tailfin', label: 'Tail Fin', fn: _tailfin },
  { id: 'globe', label: 'Globe', fn: _globe },
  { id: 'speed', label: 'Speed', fn: _speed },
  { id: 'stripes', label: 'Stripes', fn: _stripes },
  { id: 'chevron', label: 'Chevron', fn: _chevron },
  { id: 'monoblock', label: 'Monogram', fn: _monoblock },
];

// Build eight logo options for the given name + 3 colours. `seed` selects which
// designs appear and their small variations (change it to reshuffle).
function generateAirlineLogos(name, background, primary, secondary, seed) {
  const bg = background || '#0b2545';
  const txt = primary || '#ffffff';
  const acc = secondary || '#f2b705';
  const nm = (name || 'Airline').trim() || 'Airline';
  const ini = airlineInitials(nm);
  const rnd = _rng(seed);
  const picked = _shuffle(_POOL, rnd).slice(0, 8);
  return picked.map(t => ({
    id: t.id,
    label: t.label,
    svg: t.fn(ini, nm, bg, txt, acc, rnd).replace(/\s{2,}/g, ' ').trim()
  }));
}

// ── Auto-branding (for AI airlines / backfill) ──
// A curated set of nice [background, primary, secondary] airline palettes.
const _AI_PALETTES = [
  ['#0b2545', '#ffffff', '#e01e2b'], ['#0a3d2e', '#ffffff', '#e0c46c'],
  ['#7a1420', '#f7efe6', '#e8b04b'], ['#101820', '#ffffff', '#ff5a3c'],
  ['#12233f', '#7ec8e3', '#ffffff'], ['#2d1b46', '#ffffff', '#f2b705'],
  ['#0e4d64', '#ffffff', '#f4a259'], ['#b31217', '#ffffff', '#1c1c1c'],
  ['#1b4332', '#ffffff', '#95d5b2'], ['#003049', '#ffffff', '#fcbf49'],
  ['#5f0f40', '#ffffff', '#fb8b24'], ['#22223b', '#f2e9e4', '#c9ada7'],
];

// Deterministic numeric seed from a string (so an airline always gets the same logo).
function _hashName(s) {
  let h = 0; s = s || '';
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h || 1;
}

// Pick a full branding set for an airline (deterministic by name unless `seed` given).
// Returns { backgroundColor, primaryColor, secondaryColor, logoTemplate, logoSvg }.
function pickAirlineBranding(name, seed) {
  const s = seed || _hashName(name);
  const rnd = _rng(s);
  const pal = _AI_PALETTES[Math.floor(rnd() * _AI_PALETTES.length)] || _AI_PALETTES[0];
  const logos = generateAirlineLogos(name, pal[0], pal[1], pal[2], s);
  const pick = logos[Math.floor(rnd() * logos.length)] || logos[0];
  return {
    backgroundColor: pal[0], primaryColor: pal[1], secondaryColor: pal[2],
    logoTemplate: pick.id, logoSvg: pick.svg
  };
}

// Export for Node (server-side generation/backfill); stays global in the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateAirlineLogos, airlineInitials, pickAirlineBranding };
}
