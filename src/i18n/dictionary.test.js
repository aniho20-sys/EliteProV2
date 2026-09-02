import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import en from './en';
import zh from './zh-HK';
import { exerciseLibrary, muscleGroups, equipmentTypes, movementPatterns } from '../data/exercises';
import { UNIT_OPTIONS } from '../utils/workoutUtils';

// The dictionaries are checked mechanically, because the failures they can produce are
// exactly the kind nobody notices: a raw key rendered as text has no error attached, a
// dead key costs bytes forever, and a Cantonese colloquialism in a written-Chinese app
// reads as sloppy to every Hong Kong user and invisible to every reviewer who is not one.

const SRC = new URL('..', import.meta.url).pathname;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|jsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

// Every key passed to t() anywhere in src/, with where it was found.
function referencedKeys() {
  const found = new Map();
  for (const file of walk(SRC)) {
    if (file.includes('/i18n/')) continue;
    const src = readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\bt\(\s*(['"])([^'"]+)\1/g)) {
      const key = m[2];
      if (!found.has(key)) found.set(key, []);
      found.get(key).push(relative(SRC, file));
    }
  }
  return found;
}

const base = (key) => key.replace(/_(one|other)$/, '');
const enBases = new Set(Object.keys(en).map(base));
const zhBases = new Set(Object.keys(zh).map(base));

// ---------------------------------------------------------------------------
// L2: every key the code asks for exists in English, and every English key is used.
// ---------------------------------------------------------------------------
describe('English is the source of truth', () => {
  const refs = referencedKeys();

  test('every t(key) in src/ exists in en.js', () => {
    const missing = [...refs.keys()].filter(k => !enBases.has(k));
    expect(missing, `referenced but not in en.js:\n${missing.map(k => `  ${k}  (${refs.get(k).join(', ')})`).join('\n')}`).toEqual([]);
  });

  test('every key in en.js is referenced by some t() call', () => {
    // A key nobody asks for is either a typo of one somebody does ask for, or dead
    // weight that will be translated for nothing.
    const dead = [...enBases].filter(k => !refs.has(k));
    expect(dead, `in en.js but never used: ${dead.join(', ')}`).toEqual([]);
  });

  test('plural keys come in pairs', () => {
    for (const key of Object.keys(en)) {
      if (key.endsWith('_one')) expect(en, `${key} has no _other`).toHaveProperty(`${base(key)}_other`);
      if (key.endsWith('_other')) expect(en, `${key} has no _one`).toHaveProperty(`${base(key)}_one`);
    }
  });

  test('no English value is empty', () => {
    for (const [k, v] of Object.entries(en)) expect(v, k).not.toBe('');
  });
});

// ---------------------------------------------------------------------------
// zh-HK can be incomplete — that is the fallback design — but never wrong-shaped.
// ---------------------------------------------------------------------------
describe('zh-HK translates only what English has', () => {
  test('every zh key exists in en', () => {
    const orphans = [...zhBases].filter(k => !enBases.has(k));
    expect(orphans, `in zh-HK.js but not in en.js: ${orphans.join(', ')}`).toEqual([]);
  });

  test('no zh value is empty — an intentionally blank string would render as nothing', () => {
    for (const [k, v] of Object.entries(zh)) expect(v, k).not.toBe('');
  });

  test('zh never writes a _one form (Chinese has no plural; _other serves every count)', () => {
    expect(Object.keys(zh).filter(k => k.endsWith('_one'))).toEqual([]);
  });

  test('coverage report (informational — does not fail)', () => {
    const covered = [...enBases].filter(k => zhBases.has(k)).length;
    const pct = enBases.size ? Math.round((covered / enBases.size) * 100) : 100;
    console.log(`[i18n] zh-HK covers ${covered}/${enBases.size} keys (${pct}%)`);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: training vocabulary is data, not UI, and is never translated.
// ---------------------------------------------------------------------------
describe('GUARDIAN: training vocabulary never enters the dictionaries', () => {
  const vocabulary = [
    ...exerciseLibrary.map(e => e.name),
    ...muscleGroups,
    ...equipmentTypes,
    ...movementPatterns,
    ...UNIT_OPTIONS.map(u => u.label),
    'sets', 'reps', 'kg', 'RPE', 'tempo',
  ].map(s => s.toLowerCase());

  const FORBIDDEN_NAMESPACES = ['exercise.', 'exercises.', 'muscle.', 'equipment.', 'pattern.', 'unit.', 'units.'];

  test('no forbidden namespace in either dictionary', () => {
    for (const key of [...Object.keys(en), ...Object.keys(zh)]) {
      for (const ns of FORBIDDEN_NAMESPACES) expect(key.startsWith(ns), key).toBe(false);
    }
  });

  test('no dictionary value is a bare vocabulary term', () => {
    // "Bench Press" as an English value would mean somebody made a key for it, which is
    // the first step towards somebody translating it.
    for (const [k, v] of [...Object.entries(en), ...Object.entries(zh)]) {
      expect(vocabulary.includes(String(v).trim().toLowerCase()), `${k} = ${v}`).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: register. Written Traditional Chinese, Hong Kong vocabulary.
// ---------------------------------------------------------------------------
describe('GUARDIAN: zh-HK register is written Chinese, not spoken Cantonese', () => {
  // Cantonese-only characters. Any one of these in a UI string is colloquial by definition.
  const COLLOQUIAL = ['嘅', '啲', '咗', '嚟', '唔', '喺', '俾', '畀', '乜', '咩', '而家', '點解', '仲', '佢', '睇', '揀', '嗰', '啱', '嘢', '冇', '咁', '噉', '呢個', '嗱'];
  // Ani's ruling on Hong Kong usage, 2026-09-02.
  const WRONG_TERMS = [['課時', '堂'], ['私教', '教練'], ['預定', '預約'], ['剩下', '剩餘']];

  test('no Cantonese colloquial characters', () => {
    for (const [k, v] of Object.entries(zh)) {
      for (const c of COLLOQUIAL) expect(String(v).includes(c), `${k} = "${v}" contains 「${c}」`).toBe(false);
    }
  });

  test('the specified Hong Kong terms are used, not their alternatives', () => {
    for (const [k, v] of Object.entries(zh)) {
      for (const [wrong, right] of WRONG_TERMS) {
        expect(String(v).includes(wrong), `${k} = "${v}" uses 「${wrong}」— use 「${right}」`).toBe(false);
      }
    }
  });

  test('no mixed-script verbs ("book 堂")', () => {
    for (const [k, v] of Object.entries(zh)) {
      expect(/\b(book|cancel|log|check)\b/i.test(String(v)), `${k} = "${v}"`).toBe(false);
    }
  });
});
