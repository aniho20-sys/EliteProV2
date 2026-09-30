// How long browsers may keep each file (firebase.json → hosting.headers).
//
// clientErrors/0567cb39… (2026-09-30 08:27, Ani's iPhone): a deploy landed while the app
// was open; the app did what lazyPage.js says — reload once for the new version — and the
// reload came back as the OLD version, which asked for files the deploy had just removed.
// index.html was served with Firebase's default `max-age=3600`, so the browser was entitled
// to reuse the old page for an hour, and sw.js matched the rule meant for hashed files and
// was marked cacheable for a year. Only content-hashed files may be cached long; the page
// and the service workers must be re-checked on every load.
//
// Checked on the hosting emulator the same day: old config → sw.js "max-age=31536000,
// immutable", index.html no header (production adds 3600); new config → both "no-cache".

import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';

const rules = JSON.parse(readFileSync(join(cwd(), 'firebase.json'), 'utf8')).hosting.headers;
const cacheControl = (rule) => rule.headers.find(h => h.key.toLowerCase() === 'cache-control')?.value || '';

describe('hosting cache headers', () => {
  test.each(['/', '/index.html'])('the page itself (%s) is re-checked on every load', (source) => {
    const rule = rules.find(r => r.source === source);
    expect(rule, `no header rule for ${source}`).toBeTruthy();
    expect(cacheControl(rule)).toBe('no-cache');
  });

  test.each(['sw', 'registerSW', 'firebase-messaging-sw'])('the service worker file %s.js is re-checked on every load', (name) => {
    const rule = rules.find(r => r.source.includes(name) && cacheControl(r) === 'no-cache');
    expect(rule, `no no-cache rule covering /${name}.js`).toBeTruthy();
  });

  test('long caching is only for content-hashed files', () => {
    const longLived = rules.filter(r => /immutable|max-age=31536000/.test(cacheControl(r))).map(r => r.source);
    expect(longLived.sort()).toEqual(['/assets/**', '/workbox-*.js']);
  });
});
