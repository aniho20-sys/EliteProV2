import { describe, test, expect } from 'vitest';
import { contactLinks } from './contactLinks';

describe('contactLinks', () => {
  test('an email address → mailto', () => {
    expect(contactLinks(' jo@example.test ')).toEqual({ kind: 'email', email: 'mailto:jo@example.test', href: 'mailto:jo@example.test' });
  });
  test('a phone number → call and text, spaces and brackets dropped, + kept', () => {
    expect(contactLinks('07700 900123')).toEqual({ kind: 'phone', call: 'tel:07700900123', text: 'sms:07700900123', href: 'tel:07700900123', whatsapp: null });
    expect(contactLinks('+44 (0)7700-900123')).toEqual({ kind: 'phone', call: 'tel:+447700900123', text: 'sms:+447700900123', href: 'tel:+447700900123', whatsapp: 'https://wa.me/447700900123' });
  });
  test('no country code is invented for a local number', () => {
    expect(contactLinks('07700 900123').call).not.toContain('+');
  });
  test('nothing → nothing', () => {
    expect(contactLinks('')).toBeNull();
    expect(contactLinks(undefined)).toBeNull();
  });

  // Ani 2026-10-05: the trial request card had Call and Text but no WhatsApp.
  describe('WhatsApp — only when the full number is certain (#35)', () => {
    test('typed with + or 00', () => {
      expect(contactLinks('+852 9123 4567').whatsapp).toBe('https://wa.me/85291234567');
      expect(contactLinks('0044 7700 900123').whatsapp).toBe('https://wa.me/447700900123');
    });
    test('a UK mobile, for a coach in the UK', () => {
      expect(contactLinks('07700 900123', { timeZone: 'Europe/London' }).whatsapp).toBe('https://wa.me/447700900123');
    });
    test('a local number with no way to be sure of the country: no button', () => {
      expect(contactLinks('07700 900123').whatsapp).toBeNull();                                  // coach's zone unknown
      expect(contactLinks('07700 900123', { timeZone: 'Asia/Hong_Kong' }).whatsapp).toBeNull(); // not a UK coach
      expect(contactLinks('020 7946 0123', { timeZone: 'Europe/London' }).whatsapp).toBeNull(); // UK landline
      expect(contactLinks('9123 4567', { timeZone: 'Asia/Hong_Kong' }).whatsapp).toBeNull();
    });
  });
});
