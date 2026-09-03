import { describe, test, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import en from './en';
import zh from './zh-HK';
import { exerciseLibrary, equipmentTypes, movementPatterns } from '../data/exercises';


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

  test('_one/_other are reserved for plurals and nothing else', () => {
    // Written twice during the 2026-09-02 conversion and caught twice by the pairs test
    // above: 'role.sign_out_other' and 'profile.provider_other' were ordinary keys whose
    // names happened to end in _other, so the plural machinery read them as half a pair
    // and the key looked simultaneously missing and unused. Naming this failure directly
    // means the next person gets told what is wrong rather than deducing it.
    const orphans = Object.keys(en).filter(k => (
      (k.endsWith('_one') && !(`${base(k)}_other` in en))
      || (k.endsWith('_other') && !(`${base(k)}_one` in en))
    ));
    expect(orphans, `not a plural pair — rename so it does not end in _one/_other: ${orphans.join(', ')}`).toEqual([]);
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

  test('no zh value is empty — write null for a deliberate blank, never an empty string', () => {
    // null is the explicit way to say "this language needs no word here" (see sched.at,
    // where Chinese joins a date and a time with nothing between them). An empty string
    // would look like a translation somebody forgot to finish.
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
// GUARDIAN: the props jsx-no-literals cannot see.
// ---------------------------------------------------------------------------
// That rule runs with ignoreProps, because flagging every className buries the finding.
// The props that DO carry user-visible text are checked here instead — a hardcoded
// placeholder is invisible to a reviewer and to the Chinese user alike.
describe('GUARDIAN: no untranslated prop text in a translated file', () => {
  const TRANSLATED = readFileSync(new URL('../../eslint.config.js', import.meta.url).pathname, 'utf8')
    .match(/const TRANSLATED_FILES = \[([\s\S]*?)\]/)[1]
    .match(/'([^']+)'/g)?.map(s => s.slice(1, -1)) || [];

  const VISIBLE_PROPS = ['placeholder', 'aria-label', 'title', 'alt'];

  test.each(TRANSLATED)('%s', (rel) => {
    const src = readFileSync(new URL(`../../${rel}`, import.meta.url).pathname, 'utf8');
    const offenders = [];
    for (const prop of VISIBLE_PROPS) {
      for (const m of src.matchAll(new RegExp(`${prop}=(["'])([^"']{2,})\\1`, 'g'))) {
        // A value with no letters in it is a number or punctuation — a sample rate like
        // "65", not a sentence. Those read the same in every language.
        if (!/\p{L}/u.test(m[2])) continue;
        offenders.push(`${prop}="${m[2]}"`);
      }
    }
    expect(offenders, `hardcoded in ${rel}: ${offenders.join(', ')}`).toEqual([]);
  });

  test('the list itself is not silently empty', () => {
    // A typo in the regex above would make every file "pass" by testing nothing.
    expect(TRANSLATED.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: training vocabulary is data, not UI, and is never translated.
// ---------------------------------------------------------------------------
describe('GUARDIAN: training vocabulary never enters the dictionaries', () => {
  // Two lists are deliberately NOT value-checked, because their words are also ordinary UI
  // words and banning them as values would ban the legitimate use:
  //   muscle groups   — "Chest" is a muscle tag AND the label on a chest-measurement row
  //   UNIT_OPTIONS    — "Time" is a workout unit AND the label on the booking time field
  // What remains is the vocabulary that is never plausibly UI copy: exercise names,
  // equipment, movement patterns, and the measurement words themselves. The muscle.* and
  // unit.* namespace bans above are what protect the excluded two, and nothing can render
  // either through t() anyway, because t() refuses a variable key.
  const vocabulary = [
    ...exerciseLibrary.map(e => e.name),
    ...equipmentTypes,
    ...movementPatterns,
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
  // Words that exist ONLY in Cantonese. Deliberately not bare 「呢」, which is an ordinary
  // sentence-final particle in written Chinese too — a checker that fires on correct text
  // gets switched off, and then it protects nothing.
  //
  // 呢度 / 嗰度 / 依家 were added on 2026-09-02 after Ani caught 「由呢度開始」 in the first
  // draft of the dictionary. 「呢個」 was on the list and 「呢度」 was not, so the phrase
  // passed. That is the whole failure mode of a keyword list: it catches what someone
  // thought of, and the one nobody thought of is the one that ships.
  const COLLOQUIAL = [
    '嘅', '啲', '咗', '嚟', '唔', '喺', '俾', '畀', '乜', '咩', '而家', '依家',
    '點解', '點樣', '仲', '佢', '睇', '揀', '嗰', '啱', '嘢', '冇', '咁', '噉',
    '呢個', '呢度', '呢啲', '嗰度', '邊度', '邊個', '幾多', '嗱', '諗', '攞',
  ];
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

// ---------------------------------------------------------------------------
// GUARDIAN: the language picker's own labels stay literal.
// ---------------------------------------------------------------------------
describe('GUARDIAN: the way out of a language is readable in that language', () => {
  test('LanguagePicker names each option in its own language, not through t()', () => {
    // Routing these through t() would rename both options into whichever language the
    // reader is already stuck in — which is precisely the person who needs to switch.
    // CLAUDE.md #28 records this as the single exception to "never hardcode Chinese".
    const src = readFileSync(new URL('../components/LanguagePicker.jsx', import.meta.url).pathname, 'utf8');
    expect(src).toMatch(/label: 'English'/);
    expect(src).toMatch(/label: '繁體中文'/);
    expect(src).not.toMatch(/label: t\(/);
  });
});

// ---------------------------------------------------------------------------
// GATE: the picker cannot open to trainers before the dictionary is finished.
// ---------------------------------------------------------------------------
// Ani's sequencing rule, 2026-09-02: translate first, then open the switch. A trainer who
// picks Chinese must get Chinese — not Chinese navigation over English pages.
//
// Written as a coupling rather than a promise. While LanguagePicker keeps its client-only
// gate, zh coverage is reported and not enforced (a partly-translated client dictionary
// falls back to English by design). The moment somebody removes that gate, this test starts
// requiring every key in en.js to have a Chinese value, and the build fails until it does.
// The two cannot drift apart, because the same file decides both.
describe('GATE: opening the picker to trainers requires 100% coverage', () => {
  const picker = readFileSync(new URL('../components/LanguagePicker.jsx', import.meta.url).pathname, 'utf8');
  const gated = /CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED\s*=\s*true/.test(picker)
    && /CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED\s*&&\s*currentUser\.role\s*!==\s*'client'/.test(picker);

  test('the gate is either in force, or the dictionary is complete', () => {
    if (gated) return; // still client-only: partial coverage is the documented design
    const untranslated = [...enBases].filter(k => !zhBases.has(k));
    expect(
      untranslated,
      `LanguagePicker is open to trainers but ${untranslated.length} keys have no Chinese:\n  ${untranslated.join('\n  ')}`,
    ).toEqual([]);
  });

  test('the gate check itself still matches the component', () => {
    // If the constant is renamed, `gated` silently becomes false and the coverage rule
    // starts firing — noisy, but never silently permissive. This asserts the detection is
    // actually finding something, so a rename shows up as this test rather than a mystery.
    expect(picker).toMatch(/CLIENT_ONLY_UNTIL_TRAINER_TRANSLATED/);
  });
});
