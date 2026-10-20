import { describe, test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { newId, idTime } from './ids';
import { managedClientId } from './managedClient';

describe('document ids (B52)', () => {
  test('two ids made in the same millisecond differ', () => {
    const now = 1760000000000;
    const ids = new Set(Array.from({ length: 50 }, () => newId('sched', now)));
    expect(ids.size).toBe(50);
  });
  test('shape: prefix, milliseconds, four characters — the no-app client id still matches firestore.rules', () => {
    expect(newId('plan', 1760000000000, () => 0)).toBe('plan-1760000000000-0000');
    expect(managedClientId(1760000000000, () => 0.5)).toMatch(/^managed-[0-9]{10,16}-[a-z0-9]{4}$/);
  });
  test('the time is read back from old and new ids alike', () => {
    expect(idTime('sched-1760000000000')).toBe(1760000000000);
    expect(idTime('sched-1760000000000-a1b2')).toBe(1760000000000);
    expect(idTime('gc-abc')).toBe(0);
    expect(idTime(undefined)).toBe(0);
  });
  test('AppContext makes no id from the clock alone any more', () => {
    const src = readFileSync(new URL('../context/AppContext.jsx', import.meta.url), 'utf8');
    expect(src).not.toMatch(/`[a-z]+-\$\{(Date\.now\(\)|now)\}`/);
  });
});
