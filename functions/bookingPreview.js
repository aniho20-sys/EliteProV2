// The link preview for a coach's public booking page (B38, 2026-10-05).
//
// The app uses a hash router, so every link — `/#/book/<slug>` included — is the same
// index.html to WhatsApp, iMessage and the rest: they read the page's Open Graph tags
// without running any script, and never see what follows the #. Ani sent her booking link
// to a would-be client and the preview was ElitePro's advert to coaches ("First 5 coaches
// free…"). So booking links are shared as `/book/<slug>` (no #); Hosting sends that path
// here, and this answers with a tiny page whose tags name the coach and say what the link
// is for, then forwards a person straight to the real page at `/#/book/<slug>`.
//
// Nothing here is private: the coach's name is already on the public page. An unknown,
// switched-off or malformed link gets the same generic tags (never a 404 page a preview
// would show) and is forwarded to the app, which says the page is not available.

const SLUG_PATTERN = /^[a-z0-9]{10}$/;
const ORIGIN = 'https://elitepro-16718.web.app';

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function slugFromPath(path) {
  const m = String(path || '').match(/^\/book\/([^/?#]+)\/?$/);
  return m && SLUG_PATTERN.test(m[1]) ? m[1] : null;
}

function previewHtml({ slug, coachName }) {
  const target = slug ? `/#/book/${slug}` : '/';
  const title = coachName ? `Book a trial session with ${coachName}` : 'Book a trial session';
  const description = coachName
    ? `Pick a free time with ${coachName} — no app or account needed.`
    : 'Pick a free time — no app or account needed.';
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${t}</title>
<meta name="description" content="${d}">
<meta property="og:site_name" content="ElitePro">
<meta property="og:type" content="website">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${ORIGIN}${slug ? `/book/${slug}` : '/'}">
<meta property="og:image" content="${ORIGIN}/og-book.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${t}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${ORIGIN}/og-book.png">
<meta http-equiv="refresh" content="0;url=${target}">
<script>location.replace(${JSON.stringify(target)});</script>
</head>
<body><p><a href="${target}">${t}</a></p></body>
</html>`;
}

// coachForSlug: (db, slug) → { id, data } | null — the same lookup the public page uses.
async function handlePreview({ db, path, coachForSlug }) {
  const slug = slugFromPath(path);
  let coachName = null;
  if (slug) {
    try {
      const coach = await coachForSlug(db, slug);
      coachName = coach ? String(coach.data.name || '').trim().slice(0, 80) || null : null;
    } catch (err) {
      console.error('[bookingPreview] lookup failed', err); // generic tags, still forwards
    }
  }
  return previewHtml({ slug, coachName: coachName && slug ? coachName : null });
}

module.exports = { slugFromPath, previewHtml, handlePreview, escapeHtml };
