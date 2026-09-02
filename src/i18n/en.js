// The source dictionary. Every string a user can see is a key here, and English is the
// language that key is written in — this file is the single source of truth, and zh-HK.js
// can only translate keys that exist here.
//
// Keys are flat, dotted, namespaced by screen or by shared purpose:
//   nav.*  dash.*  booking.*  plans.*  profile.*  auth.*  common.*
//
// There is deliberately NO exercise.*, muscle.*, equipment.*, pattern.* or unit.*
// namespace. Exercise names, sets/reps/kg/RPE/tempo, muscle/equipment/movement-pattern
// tags, and anything a trainer typed themselves are data, not UI, and never pass through
// t() — the lint rule that refuses a non-literal key is what enforces that.
//
// Plurals: write `key_one` and `key_other`. Interpolation: `{name}`.
//
// src/i18n/dictionary.test.js checks that every key referenced by t() in src/ exists here,
// and that every key here is referenced somewhere — so a typo fails the build instead of
// rendering as a raw key, and a dead key cannot accumulate.

const en = {
  // Filled in from phase-1 pages in the next commit. Empty on purpose until then: this
  // commit is the machinery, and must change nothing a user can see.
};

export default en;
