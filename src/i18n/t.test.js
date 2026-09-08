import { describe, test, expect, vi } from 'vitest';
import { translate, resolveLanguage, resolveRecipientLanguage, browserDefault } from './t';

const en = {
  'dash.title': 'Today',
  'dash.hello': 'Morning, {name}',
  'dash.sessions_left_one': '{count} session left',
  'dash.sessions_left_other': '{count} sessions left',
  'common.only_en': 'English only',
};
const zh = {
  'dash.title': '今日課堂',
  'dash.hello': '早晨，{name}',
  // Chinese has no plural: one key serves every count.
  'dash.sessions_left_other': '剩餘 {count} 堂',
};
const dicts = { en, zh };

describe('lookup', () => {
  test('English', () => {
    expect(translate(dicts, 'en', 'dash.title')).toBe('Today');
  });

  test('Chinese when present', () => {
    expect(translate(dicts, 'zh-HK', 'dash.title')).toBe('今日課堂');
  });

  test('interpolation in both languages', () => {
    expect(translate(dicts, 'en', 'dash.hello', { name: 'Ani' })).toBe('Morning, Ani');
    expect(translate(dicts, 'zh-HK', 'dash.hello', { name: 'Ani' })).toBe('早晨，Ani');
  });

  test('a missing interpolation var becomes empty, not a literal {name}', () => {
    expect(translate(dicts, 'en', 'dash.hello', {})).toBe('Morning, ');
  });
});

describe('plurals', () => {
  test('English picks _one for exactly 1 and _other otherwise', () => {
    expect(translate(dicts, 'en', 'dash.sessions_left', { count: 1 })).toBe('1 session left');
    expect(translate(dicts, 'en', 'dash.sessions_left', { count: 0 })).toBe('0 sessions left');
    expect(translate(dicts, 'en', 'dash.sessions_left', { count: 7 })).toBe('7 sessions left');
  });

  test('Chinese uses its single _other form for every count, including 1', () => {
    // The whole point of the lookup order: zh-HK.js never has to write _one.
    expect(translate(dicts, 'zh-HK', 'dash.sessions_left', { count: 1 })).toBe('剩餘 1 堂');
    expect(translate(dicts, 'zh-HK', 'dash.sessions_left', { count: 7 })).toBe('剩餘 7 堂');
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN
// ---------------------------------------------------------------------------
// The one failure this module exists to make impossible is a raw key on screen.
describe('GUARDIAN: a raw key is never shown to a user', () => {
  test('Chinese missing → English', () => {
    expect(translate(dicts, 'zh-HK', 'common.only_en')).toBe('English only');
  });

  test('Chinese dictionary not loaded yet → English, not a crash', () => {
    expect(translate({ en, zh: null }, 'zh-HK', 'dash.title')).toBe('Today');
  });

  test('missing everywhere, production → empty string', () => {
    expect(translate(dicts, 'en', 'nope.missing')).toBe('');
    expect(translate(dicts, 'zh-HK', 'nope.missing')).toBe('');
  });

  test('missing everywhere, development → visibly wrapped key plus a console error', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const out = translate(dicts, 'en', 'nope.missing', undefined, { dev: true });
    expect(out).toBe('⟦nope.missing⟧');
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0]).toMatch(/nope\.missing/);
    spy.mockRestore();
  });

  test('the production output for a missing key never equals the key itself', () => {
    for (const key of ['dash.title.typo', 'x', 'nav.home', 'a.b.c.d']) {
      const out = translate(dicts, 'zh-HK', key);
      expect(out).not.toBe(key);
      expect(out).toBe('');
    }
  });
});

describe('resolveLanguage', () => {
  test('nobody signed in → browser language decides', () => {
    expect(resolveLanguage(null, 'zh-HK')).toBe('zh-HK');
    expect(resolveLanguage(null, 'en-GB')).toBe('en');
    expect(resolveLanguage(undefined, undefined)).toBe('en');
  });

  test('a client who chose a language keeps it, whatever the browser says', () => {
    expect(resolveLanguage({ role: 'client', language: 'zh-HK' }, 'en-US')).toBe('zh-HK');
    expect(resolveLanguage({ role: 'client', language: 'en' }, 'zh-HK')).toBe('en');
  });

  test('a client who has not chosen follows the browser', () => {
    expect(resolveLanguage({ role: 'client' }, 'zh-TW')).toBe('zh-HK');
    expect(resolveLanguage({ role: 'client' }, 'en')).toBe('en');
  });

  test('an unsupported stored value is ignored rather than trusted', () => {
    expect(resolveLanguage({ role: 'client', language: 'fr' }, 'zh')).toBe('zh-HK');
    expect(resolveLanguage({ role: 'client', language: 'zh' }, 'en')).toBe('en');
  });

  test('a trainer is treated the same as anyone else', () => {
    // Trainers were held at English while their screens were untranslated. The hold came
    // off on 2026-09-02 when the dictionary reached 100% — translate first, then open the
    // switch, which is the order Ani set.
    expect(resolveLanguage({ role: 'trainer', language: 'zh-HK' }, 'en')).toBe('zh-HK');
    expect(resolveLanguage({ role: 'trainer', language: 'en' }, 'zh-HK')).toBe('en');
    expect(resolveLanguage({ role: 'trainer' }, 'zh-HK')).toBe('zh-HK');
    expect(resolveLanguage({ role: 'operator', language: 'zh-HK' }, 'en')).toBe('zh-HK');
  });
});

describe('browserDefault', () => {
  test.each([
    ['zh-HK', 'zh-HK'], ['zh-TW', 'zh-HK'], ['zh', 'zh-HK'], ['ZH-Hant-HK', 'zh-HK'],
    ['en-GB', 'en'], ['en', 'en'], ['ja', 'en'], ['', 'en'], [undefined, 'en'], [null, 'en'],
  ])('%p → %p', (input, expected) => {
    expect(browserDefault(input)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// GUARDIAN: outbound text follows the reader, and never silently defaults to English.
// ---------------------------------------------------------------------------
// Ani's ruling 2026-09-07. A renewal reminder, a session recap and an invoice a student
// files as an expense are all read by the student, so the student's language decides.
// The part worth guarding is the fallback: when the student has never chosen a language
// the answer is the SENDER's language, not English. With the UK and Hong Kong markets
// running together, defaulting to English quietly sends English to a Hong Kong student
// who simply never opened the Profile card.
describe('GUARDIAN: a message is written in the reader\'s language', () => {
  const zhTrainer = { language: 'zh-HK' };
  const enTrainer = { language: 'en' };

  test('the reader\'s own choice wins, even against the sender', () => {
    expect(resolveRecipientLanguage({ language: 'zh-HK' }, enTrainer)).toBe('zh-HK');
    expect(resolveRecipientLanguage({ language: 'en' }, zhTrainer)).toBe('en');
  });

  test('a reader with no language falls back to the SENDER, not to English', () => {
    expect(resolveRecipientLanguage({}, zhTrainer)).toBe('zh-HK');
    expect(resolveRecipientLanguage({ language: null }, zhTrainer)).toBe('zh-HK');
    expect(resolveRecipientLanguage(undefined, zhTrainer)).toBe('zh-HK');
  });

  test('an unsupported value is ignored rather than passed through', () => {
    // A stray 'zh-CN' or 'zh' must not reach translate() as a language it cannot serve.
    expect(resolveRecipientLanguage({ language: 'zh-CN' }, zhTrainer)).toBe('zh-HK');
    expect(resolveRecipientLanguage({ language: 'fr' }, enTrainer)).toBe('en');
  });

  test('English is the answer only when nobody has a usable language', () => {
    expect(resolveRecipientLanguage({}, {})).toBe('en');
    expect(resolveRecipientLanguage(null, null)).toBe('en');
  });
});
