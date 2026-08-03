/**
 * AI Aircraft Registration Generator
 *
 * Generates realistic registrations using the comprehensive ICAO prefix system
 * from registrationPrefixes.js. Respects country-specific rules (letters vs
 * digits vs mixed) so AI aircraft look authentic.
 */

const { getRegistrationPrefix, REGISTRATION_RULES } = require('../../public/js/registrationPrefixes');

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';

/**
 * Generate a valid registration suffix for a given prefix, respecting
 * the country's ICAO rules (letter-only, digit-only, or mixed).
 */
function _generateSuffix(prefix) {
  const rule = REGISTRATION_RULES[prefix] || REGISTRATION_RULES.default;
  const len = Array.isArray(rule.length) ? rule.length[1] : rule.length;
  const desc = (rule.description || '').toLowerCase();

  // Detect suffix character set from the rule description
  if (desc.includes('digit') && !desc.includes('letter')) {
    // Pure digits (e.g., RA-12345, HL-1234, HK-1234)
    let s = '';
    for (let i = 0; i < len; i++) s += DIGITS[Math.floor(Math.random() * 10)];
    // Avoid leading zero for aesthetics
    if (s[0] === '0') s = (1 + Math.floor(Math.random() * 9)) + s.substring(1);
    return s;
  }
  if (desc.includes('letter') && !desc.includes('digit') && !desc.includes('number')) {
    // Pure letters (e.g., G-ABCD, F-WXYZ)
    let s = '';
    for (let i = 0; i < len; i++) s += LETTERS[Math.floor(Math.random() * 26)];
    return s;
  }
  // US-style: numbers optionally ending with 1-2 letters (N12345, N123AB)
  if (prefix === 'N-') {
    const numLen = 3 + Math.floor(Math.random() * 2); // 3-4 digits
    let s = '';
    s += (1 + Math.floor(Math.random() * 9)); // no leading zero
    for (let i = 1; i < numLen; i++) s += DIGITS[Math.floor(Math.random() * 10)];
    // 50% chance of trailing letters (1-2)
    if (Math.random() < 0.5) {
      s += LETTERS[Math.floor(Math.random() * 26)];
      if (Math.random() < 0.5) s += LETTERS[Math.floor(Math.random() * 26)];
    }
    return s;
  }
  // Mixed: "1 letter then N digits" (e.g., UP-A1234, CU-T1234, VN-A123)
  if (desc.includes('letter') && desc.includes('digit')) {
    let s = LETTERS[Math.floor(Math.random() * 26)];
    for (let i = 1; i < len; i++) s += DIGITS[Math.floor(Math.random() * 10)];
    return s;
  }
  // Default: letters
  let s = '';
  for (let i = 0; i < len; i++) s += LETTERS[Math.floor(Math.random() * 26)];
  return s;
}

/**
 * Generate a unique AI aircraft registration.
 *
 * @param {string} prefix - ICAO prefix (e.g. 'G-', 'N-', 'EC-')
 * @param {Set<string>} existingRegs - Set of already-used registrations
 * @returns {string} A unique registration string
 */
function generateAIRegistration(prefix, existingRegs) {
  for (let i = 0; i < 200; i++) {
    const reg = prefix + _generateSuffix(prefix);
    if (!existingRegs.has(reg)) {
      existingRegs.add(reg);
      return reg;
    }
  }
  // Absolute fallback — should never happen
  const fb = prefix + 'X' + Math.floor(Math.random() * 99999);
  existingRegs.add(fb);
  return fb;
}

module.exports = { generateAIRegistration };
