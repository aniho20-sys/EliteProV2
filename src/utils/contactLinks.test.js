import { describe, test, expect } from 'vitest';
import { contactLinks } from './contactLinks';

describe('contactLinks', () => {
  test('an email address → mailto', () => {
    expect(contactLinks(' jo@example.test ')).toEqual({ kind: 'email', email: 'mailto:jo@example.test', href: 'mailto:jo@example.test' });
  });
  test('a phone number → call and text, spaces and brackets dropped, + kept', () => {
    expect(contactLinks('07700 900123')).toEqual({ kind: 'phone', call: 'tel:07700900123', text: 'sms:07700900123', href: 'tel:07700900123' });
    expect(contactLinks('+44 (0)7700-900123')).toEqual({ kind: 'phone', call: 'tel:+447700900123', text: 'sms:+447700900123', href: 'tel:+447700900123' });
  });
  test('no country code is invented for a local number', () => {
    expect(contactLinks('07700 900123').call).not.toContain('+');
  });
  test('nothing → nothing', () => {
    expect(contactLinks('')).toBeNull();
    expect(contactLinks(undefined)).toBeNull();
  });
});
