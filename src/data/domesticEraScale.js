/**
 * Era scaling for real-data-anchored DOMESTIC routes (UK + US).
 *
 * The global world-pax curve (WORLD_PAX: 1950 = 1/58th of today) is right for
 * total air travel but far too steep for individual busy DOMESTIC routes — those
 * grew ~5×, not ~58×, from 1950. Under the global curve the biggest routes'
 * back-projected scores blow past the 0-100 ceiling and clamp, so in an early-era
 * world every big route reads the same ~137/day. This gentler curve keeps their
 * scores in range so they differentiate and show realistic magnitudes.
 *
 * Values are the era factor (score→pax scaler) relative to the modern reference.
 * They CANCEL in display — the back-projection divides target pax by the same
 * factor the front-end multiplies back — so their only job is to keep scores in a
 * usable [1,~95] range. demandToPax in public/js/routes-create.js keeps a mirror
 * of this table (front-end can't require server modules); keep the two in sync.
 */
module.exports = {
  1950: 0.17, 1960: 0.28, 1970: 0.44, 1980: 0.62,
  1990: 0.90, 2000: 1.15, 2010: 1.15, 2020: 1.10
};
