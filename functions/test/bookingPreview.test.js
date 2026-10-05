/**
 * functions/bookingPreview.js — the link preview for a shared booking link (B38).
 * Pure functions; no emulator needed (the lookup is passed in).
 */
const { slugFromPath, previewHtml, handlePreview } = require('../bookingPreview');

const tag = (html, prop) => (html.match(new RegExp(`<meta (?:property|name)="${prop}" content="([^"]*)"`)) || [])[1];

describe('booking link previews', () => {
  test('only a well-formed /book/<slug> is a booking link', () => {
    expect(slugFromPath('/book/hqpkzdygx6')).toBe('hqpkzdygx6');
    expect(slugFromPath('/book/hqpkzdygx6/')).toBe('hqpkzdygx6');
    for (const p of ['/book/', '/book/short', '/book/HQPKZDYGX6', '/book/hqpkzdygx6/x', '/book/../users', '/', '']) {
      expect(slugFromPath(p)).toBeNull();
    }
  });

  // Ani 2026-10-05: her booking link previewed as ElitePro's advert to coaches.
  test('a coach\'s link: the preview names them and says what it is for — not the coach advert', async () => {
    const html = await handlePreview({
      db: {}, path: '/book/hqpkzdygx6',
      coachForSlug: async (_db, slug) => (slug === 'hqpkzdygx6' ? { id: 'c', data: { name: 'Ani Ho', businessName: 'Ani Ho Fitness' } } : null),
    });
    expect(tag(html, 'og:title')).toBe('Book a trial session with Ani Ho');
    expect(tag(html, 'og:description')).toMatch(/no app or account needed/);
    expect(tag(html, 'og:image')).toBe('https://elitepro-16718.web.app/og-book.png');
    expect(html).not.toMatch(/coaches|commission|Run your coaching/);
    expect(html).toContain('location.replace("/#/book/hqpkzdygx6")');
    expect(html).toContain('content="0;url=/#/book/hqpkzdygx6"');
  });

  test('unknown, switched off, or the lookup failing: generic tags, still forwarded', async () => {
    for (const coachForSlug of [async () => null, async () => { throw new Error('down'); }]) {
      const html = await handlePreview({ db: {}, path: '/book/aaaaaaaaaa', coachForSlug });
      expect(tag(html, 'og:title')).toBe('Book a trial session');
      expect(html).toContain('/#/book/aaaaaaaaaa');
    }
    const odd = await handlePreview({ db: {}, path: '/book/<script>', coachForSlug: async () => { throw new Error('not called'); } });
    expect(odd).toContain('location.replace("/")');
  });

  test('a name cannot break out of the page', () => {
    const html = previewHtml({ slug: 'hqpkzdygx6', coachName: '"><script>alert(1)</script>' });
    expect(html).not.toContain('<script>alert(1)');
    expect(tag(html, 'og:title')).toBe('Book a trial session with &quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
