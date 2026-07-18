/**
 * Shared display-currency utility (loaded on every page before layout.js).
 *
 * All money in the game is stored/computed in USD. Each world picks a display
 * currency (USD / GBP / EUR); this converts USD → that currency, snaps the
 * result to clean numbers, and formats it with the right symbol.
 *
 * Global helpers (used app-wide):
 *   setAppCurrency(code) / getAppCurrency() / getCurrencySymbol()
 *   convertFromUSD(usd)  → number in the display currency
 *   convertToUSD(local)  → number back in USD (for values a player enters)
 *   formatCurrency(usd)       → "£1,234,000"  (symbol + grouped, snapped)
 *   formatCurrencyShort(usd)  → "£41.9M"      (symbol + short, snapped)
 *   formatCurrencyValue(usd)  → alias of formatCurrency (legacy name)
 *
 * The display currency is seeded synchronously from localStorage so formatting
 * is correct on first paint; layout.js updates it from /api/world/info.
 */
(function () {
  // Fixed, game-stable exchange rates (USD base). Not live FX.
  const RATES = { USD: 1, GBP: 0.80, EUR: 0.92 };
  const SYMBOLS = { USD: '$', GBP: '£', EUR: '€' };

  let current = 'USD';
  try {
    const saved = localStorage.getItem('amsWorldCurrency');
    if (saved && RATES[saved]) current = saved;
  } catch (e) { /* localStorage unavailable */ }

  // Snap a value to a clean increment based on its magnitude, so converted
  // amounts never show ugly precision (e.g. £41,872,340 → £41,900,000).
  function roundNice(n) {
    const sign = n < 0 ? -1 : 1;
    const a = Math.abs(n);
    if (a === 0) return 0;
    let step;
    if (a >= 1e9) step = 1e7;
    else if (a >= 1e8) step = 1e6;
    else if (a >= 1e7) step = 1e5;
    else if (a >= 1e6) step = 1e4;
    else if (a >= 1e5) step = 1e3;
    else if (a >= 1e4) step = 100;
    else if (a >= 1e3) step = 10;
    else if (a >= 100) step = 5;
    else step = 1;
    return sign * Math.round(a / step) * step;
  }

  function rate() { return RATES[current] || 1; }

  window.setAppCurrency = function (code) {
    if (RATES[code]) {
      current = code;
      try { localStorage.setItem('amsWorldCurrency', code); } catch (e) { /* ignore */ }
      // Let pages that want to re-render money react.
      try { window.dispatchEvent(new CustomEvent('currencychange', { detail: { currency: code } })); } catch (e) { /* ignore */ }
    }
  };
  window.getAppCurrency = function () { return current; };
  window.getCurrencySymbol = function () { return SYMBOLS[current] || '$'; };
  window.getCurrencyRate = function () { return rate(); };

  window.convertFromUSD = function (usd) { return (Number(usd) || 0) * rate(); };
  window.convertToUSD = function (local) { return (Number(local) || 0) / rate(); };

  // Full form: "£1,234,000" — symbol + grouped digits, snapped to clean numbers.
  window.formatCurrency = function (usd, opts) {
    opts = opts || {};
    const sym = SYMBOLS[current] || '$';
    let local = (Number(usd) || 0) * rate();
    // Snap converted currencies to clean numbers; keep USD exact (it's the base).
    if (opts.raw !== true && current !== 'USD') local = roundNice(local);
    const neg = local < 0 ? '-' : '';
    const digits = Math.abs(local).toLocaleString('en-US', {
      minimumFractionDigits: opts.decimals || 0,
      maximumFractionDigits: opts.decimals || 0
    });
    return neg + sym + digits;
  };

  // Short form: "£41.9M" / "£990K" / "£120".
  window.formatCurrencyShort = function (usd) {
    const sym = SYMBOLS[current] || '$';
    const raw = (Number(usd) || 0) * rate();
    const local = current !== 'USD' ? roundNice(raw) : raw;
    const a = Math.abs(local);
    const neg = local < 0 ? '-' : '';
    let body;
    if (a >= 1e9) body = (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B';
    else if (a >= 1e6) body = (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M';
    else if (a >= 1e3) body = Math.round(a / 1e3) + 'K';
    else body = String(Math.round(a));
    return neg + sym + body;
  };

  // Legacy alias used in a couple of files.
  window.formatCurrencyValue = window.formatCurrency;

  // Keep any static currency-symbol labels (.cur-sym) in sync with the currency.
  function refreshSymbols() {
    document.querySelectorAll('.cur-sym').forEach(function (el) { el.textContent = SYMBOLS[current] || '$'; });
  }
  window.refreshCurrencySymbols = refreshSymbols;
  window.addEventListener('currencychange', refreshSymbols);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refreshSymbols);
  else refreshSymbols();

  // Number-only variants (no symbol) for the rare place that adds its own.
  window.currencyNumber = function (usd) {
    let local = (Number(usd) || 0) * rate();
    if (current !== 'USD') local = roundNice(local);
    const neg = local < 0 ? '-' : '';
    return neg + Math.abs(local).toLocaleString('en-US', { maximumFractionDigits: 0 });
  };
})();
