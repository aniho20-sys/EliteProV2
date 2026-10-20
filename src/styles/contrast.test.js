// B52 accessibility: words must be readable. Every text colour token is checked against the
// backgrounds it sits on, in both themes, at WCAG AA (4.5:1) — read from the real stylesheet,
// so a later "slightly brighter" tweak fails here instead of on someone's phone.
import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8');

function block(selector) {
  const at = css.indexOf(`${selector} {`);
  return css.slice(at, css.indexOf('}', at));
}
function tokens(selector) {
  return Object.fromEntries([...block(selector).matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map(m => [m[1], m[2]]));
}
const light = tokens(':root');
const dark = { ...light, ...tokens('[data-theme="dark"]') };

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

const TEXT = ['text', 'text-secondary', 'text-muted', 'accent-text', 'primary-text', 'success-text', 'danger-text', 'warning-dark'];
const BACKGROUNDS = ['bg', 'bg-card', 'bg-card-hover', 'surface'];

describe.each([['light', light], ['dark', dark]])('%s theme', (_, theme) => {
  test.each(TEXT)('--%s reads at 4.5:1 or better on every background', (name) => {
    for (const bg of BACKGROUNDS) {
      expect(contrast(theme[name], theme[bg]), `--${name} on --${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

test('text is never drawn in a brand fill colour — those stay for buttons, fills and borders (Ani 2026-10-20)', () => {
  const offenders = css.match(/(?<![-\w])color:\s*var\(--(accent|primary|success|danger|warning)\)/g) || [];
  expect(offenders).toEqual([]);
});
