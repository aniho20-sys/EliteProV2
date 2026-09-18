import { describe, test, expect, beforeAll } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ESLint } from 'eslint';
import eslintConfig from '../../eslint.config.js';
import { visiblePropText } from './vocabulary';

// ---------------------------------------------------------------------------
// GUARDIAN: every user-facing file is accounted for.
// ---------------------------------------------------------------------------
// The gate this replaces compared en.js against zh-HK.js and reported 445/445 — a true
// number that meant nothing. A page which never calls t() contributes no keys to en.js,
// and therefore no *missing* keys either, so TrainerDashboard shipped 100% English while
// the dictionary reported 100% translated. react/jsx-no-literals had nothing to say about
// it either, because it only runs on the opt-in TRANSLATED_FILES list. Two opt-in
// mechanisms, and nothing that ever asked which files ought to be on the list.
//
// So the rule here is stated the other way round: any file that still contains
// user-facing English must say so, by name, in one of the two lists below. A file nobody
// has classified fails the run the moment it has a single hardcoded string — a new screen
// cannot join the untranslated pile in silence, which is exactly how the last one did.
//
// AWAITING doubles as the debt ledger: the counts may not rise, and may not be left stale
// once text is translated away, so the number in this file is always the real one.
//
// Method and per-page breakdown: reports/i18n-coverage-audit-2026-09-06.md

const ROOT = new URL('../..', import.meta.url).pathname;
const SRC = join(ROOT, 'src');

const TRANSLATED = readFileSync(join(ROOT, 'eslint.config.js'), 'utf8')
  .match(/const TRANSLATED_FILES = \[([\s\S]*?)\]/)[1]
  .match(/'([^']+)'/g).map(s => s.slice(1, -1));

// Files whose English is deliberately staying English. A reason is mandatory — an
// exemption nobody has to justify is how the last hole stayed open for three weeks.
const EXEMPT = {
  'src/pages/PrivacyPolicyPage.jsx': 'legal text — a translation changes what was agreed to; needs a lawyer, not a translator',
  'src/pages/TermsPage.jsx': 'legal text — same reason',
  'src/pages/LandingPage.jsx': 'no-auth marketing page; the reader has no profile yet, so no language setting to read',
  'src/components/ErrorBoundary.jsx': 'class component — cannot use the useLanguage() hook, and an error boundary must not depend on any context to render (it is what renders when context itself fails)',
  'src/pages/OperatorDashboard.jsx': 'gym啦, behind GYMLA_ENABLED=false (#25) — unreachable',
  'src/pages/StudioManagementPage.jsx': 'gym啦, behind GYMLA_ENABLED=false (#25)',
  'src/pages/StudioBookingPage.jsx': 'gym啦, behind GYMLA_ENABLED=false (#25)',
  'src/pages/TrainerApplicationPage.jsx': 'gym啦, behind GYMLA_ENABLED=false (#25)',
};

// The debt. It stood at 557 strings across 20 files when it was first measured on
// 2026-09-06; it reached zero on 2026-09-18, so every user-facing file is now either on
// TRANSLATED_FILES or in EXEMPT above with a reason.
//
// Empty is the state to keep it in, not a milestone to note and move on from. A new page
// that ships with hardcoded English fails the first guardian below — it is neither
// translated, exempt, nor listed here — and the right fix is to translate it, not to add
// it here. An entry belongs here only for a page too large to convert in the change that
// touches it, and then it is a number that has to come down.
const AWAITING = {};

function jsxFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) jsxFiles(p, out);
    else if (/\.jsx$/.test(name) && !/\.test\./.test(name)) out.push('src/' + relative(SRC, p));
  }
  return out;
}
const ALL = jsxFiles(SRC).sort();

// The literal-string rule is read out of eslint.config.js rather than restated here, so
// allowedStrings has exactly one definition (#37.3). A second copy would drift, and a
// drift in this direction under-reports silently — the failure mode we are fixing.
const literalRule = eslintConfig.find(c => c?.rules?.['react/jsx-no-literals']);

// Props the rule cannot see (it runs with ignoreProps) are counted by the shared scanner
// in ./vocabulary, the same one dictionary.test.js checks translated files with — so the
// count here and the pass/fail there can never disagree about what a hardcoded string is.

let counts;
beforeAll(async () => {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: [{
      files: ['**/*.jsx'],
      plugins: literalRule.plugins,
      languageOptions: { parserOptions: { ecmaVersion: 'latest', ecmaFeatures: { jsx: true }, sourceType: 'module' } },
      rules: { 'react/jsx-no-literals': literalRule.rules['react/jsx-no-literals'] },
    }],
  });
  const results = await eslint.lintFiles(ALL.map(f => join(ROOT, f)));
  counts = new Map();
  for (const rel of ALL) {
    const r = results.find(x => x.filePath === join(ROOT, rel));
    const jsxText = r ? r.messages.filter(m => m.ruleId === 'react/jsx-no-literals').length : 0;
    const props = visiblePropText(readFileSync(join(ROOT, rel), 'utf8')).length;
    counts.set(rel, jsxText + props);
  }
}, 120000);

describe('GUARDIAN: no user-facing file escapes the translation inventory', () => {
  test('a file with hardcoded English is classified, or the run fails', () => {
    const unclassified = ALL.filter(f =>
      counts.get(f) > 0 && !(f in EXEMPT) && !(f in AWAITING));
    expect(
      unclassified,
      'these files contain user-facing English but nobody has said what their status is.\n' +
      'Route the text through t() and add the file to TRANSLATED_FILES, or record it in\n' +
      'AWAITING with its count, or in EXEMPT with a reason:\n' +
      unclassified.map(f => `  ${f}  (${counts.get(f)} strings)`).join('\n'),
    ).toEqual([]);
  });

  test('a file on TRANSLATED_FILES really is clean', () => {
    const dirty = TRANSLATED.filter(f => counts.get(f) > 0);
    expect(
      dirty,
      `listed as translated but still holds English: ${dirty.map(f => `${f} (${counts.get(f)})`).join(', ')}`,
    ).toEqual([]);
  });

  test('nothing is classified twice', () => {
    const doubled = ALL.filter(f =>
      [TRANSLATED.includes(f), f in EXEMPT, f in AWAITING].filter(Boolean).length > 1);
    expect(doubled, `in more than one list: ${doubled.join(', ')}`).toEqual([]);
  });

  test('every ledger and exempt entry names a file that still exists', () => {
    const ghosts = [...Object.keys(AWAITING), ...Object.keys(EXEMPT)].filter(f => !ALL.includes(f));
    expect(ghosts, `listed but no longer in src/: ${ghosts.join(', ')}`).toEqual([]);
  });

  test('the checks are not silently passing on empty input', () => {
    // A typo in the TRANSLATED_FILES regex, or a rename in eslint.config.js, would make
    // every assertion above pass by comparing against nothing at all.
    expect(TRANSLATED.length).toBeGreaterThan(0);
    expect(ALL.length).toBeGreaterThan(20);
    expect(literalRule, 'react/jsx-no-literals not found in eslint.config.js').toBeTruthy();
    expect([...counts.values()].some(n => n > 0)).toBe(true);
  });
});

describe('GUARDIAN: the translation debt can only shrink', () => {
  test.each(Object.keys(AWAITING))('%s', (rel) => {
    const actual = counts.get(rel);
    const recorded = AWAITING[rel];
    expect(
      actual,
      actual > recorded
        ? `${rel} gained ${actual - recorded} untranslated string(s) (${recorded} -> ${actual}). ` +
          'New user-facing text goes through t() — CLAUDE.md #28.'
        : `${rel} is down to ${actual} from ${recorded}. Lower the number in coverage.test.js, ` +
          'or delete the entry and add the file to TRANSLATED_FILES if it is now 0.',
    ).toBe(recorded);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: the English hiding inside JS expressions, listed by hand.
// ---------------------------------------------------------------------------
// react/jsx-no-literals sees JSX text, and the prop scan above sees visible props. Neither
// can see a string inside a ternary, a template literal, or an object property — which is
// how ProfilePage sat on TRANSLATED_FILES, lint-clean, while still showing a trainer two
// English toasts. A regex over expressions was considered and rejected: it cannot tell
// `type: 'Blocked'` (a Firestore value, correctly untranslated) from a sentence, and a test
// that cries wolf gets switched off. So the debt is written down by hand instead.
//
// Every entry below is English a user can still read. The test fails if one disappears
// without the entry being removed, so the list cannot quietly go stale, and a file on
// TRANSLATED_FILES can never again imply "no English left" when some remains.
const EXPRESSION_DEBT = {
  // Messages composed by the trainer and delivered to a STUDENT. These are not a
  // translation question but a whose-language question: the student's own `language` is
  // in Firestore and is the one that should decide, not the trainer's. Awaiting Ani's
  // ruling — the same question she settled as "bilingual" for the invite share text,
  // where the reader is unknown; here the reader is known, so the answer may differ.
  'src/pages/TrainerDashboard.jsx': [
    "just a heads-up — you've got",       // buildDefaultMsg, low sessions
    'could you fill out your training profile',  // buildDefaultMsg, missing profile
    "Haven't seen a workout log in a while",     // buildDefaultMsg, inactive
    'renew now to keep your current rate',       // buildRenewalMsg
    'Great session today',                        // openRecap default note
    'Session Recap',                              // recap message body
  ],
};

describe('GUARDIAN: English inside JS expressions stays visible', () => {
  test.each(Object.entries(EXPRESSION_DEBT))('%s', (rel, fragments) => {
    const src = readFileSync(join(ROOT, rel), 'utf8');
    const gone = fragments.filter(f => !src.includes(f));
    expect(
      gone,
      `${rel} no longer contains: ${gone.join(' | ')}. If this text was translated, delete ` +
      'the entry from EXPRESSION_DEBT; if it was deleted, delete the entry too.',
    ).toEqual([]);
  });

  test('the list is not empty while any entry is claimed', () => {
    expect(Object.keys(EXPRESSION_DEBT).length).toBeGreaterThan(0);
  });
});
