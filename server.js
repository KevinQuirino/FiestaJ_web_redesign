/**
 * FIESTA JUMPS — LOCAL DEV SERVER
 * ─────────────────────────────────────────────────────────────
 * Run:  node server.js
 * Open: http://localhost:3000
 *
 * This server reads routes.yml and maps clean slugs to .html
 * files — identical to how WordPress/Apache handles them live.
 * No more "Cannot GET /bounce-house-rentals/" errors.
 *
 * No npm install needed — uses only Node.js built-in modules.
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = 3000;
const ROOT = __dirname;

/* ── ROUTE MAP ─────────────────────────────────────────────────
  Must match routes.yml exactly.
  Key   = clean URL slug
  Value = HTML filename on disk
─────────────────────────────────────────────────────────────── */
const ROUTES = {
  '/': 'homePage/index.html',
  '/bounce-house-rentals/': 'bounceHouses/classic-bounce-houses.html',
  '/combo-bounce-house-rentals/': 'bounceHouses/combo-bounce-houses.html',
  '/dry-slide-rentals/': 'bounceHouses/dry-slides.html',
  '/water-slides-rentals/': 'bounceHouses/water-slides.html',
  '/foam-cannon-rentals/': 'bounceHouses/foam-cannon.html',
  '/obstacle-course-rentals/': 'Activities/obstacle-courses.html',
  '/interactive-game-rentals/': 'Activities/interactive-games.html',
  '/photo-booth-rental/': 'Activities/photo-booth.html',
  '/concessions-machine/': 'Activities/concessions.html',
  '/sb-trackless-train/': 'Activities/trackless-train.html',
  '/tent-rentals/': 'eventEssentials/tent-rentals.html',
  '/tables-chairs-linen/': 'eventEssentials/tables-chairs.html',
  '/generators/': 'eventEssentials/generators.html',
  '/fully-staffed-attendants/': 'eventEssentials/staffed-attendants.html',
  '/bundle-deals/': 'deals/bundle-deals.html',
  '/about-us/': 'company/about.html',
  '/service-area/': 'company/service-area.html',
  '/coupons/': 'company/coupons.html',
  '/contact/': 'company/contact.html',
  '/book-now/': 'company/book-now.html',
  '/privacy-policy/': 'company/privacy.html',
};

/* ── MIME TYPES ──────────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.yml': 'text/yaml',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
};

/* ── BASE TAG INJECTION ──────────────────────────────────────
   Automatically injects <base href="/"> into every HTML page.
   This means ANY relative path (style.css, main.js, images)
   always resolves from the site root — even when the page is
   served at /bounce-house-rentals/ or any other sub-route.
   This is a safety net; all HTML files should also use
   absolute paths like /style.css for maximum compatibility.
─────────────────────────────────────────────────────────── */
function injectBase(data, ext, urlPath) {
  if (ext !== '.html') return data; // only modify HTML
  let html = data.toString('utf8');
  // Only inject if <base> isn't already present
  if (!html.includes('<base ')) {
    // Insert right after <head>
    html = html.replace(/(<head[^>]*>)/i, '$1\n  <base href="/">');
  }
  html = processIncludes(html);
  return Buffer.from(html, 'utf8');
}

/* ── PARTIAL INCLUDES ─────────────────────────────────────────
   Pages pull shared markup (announcement bar, header, category
   hero) from partials/ via a comment directive:

     <!--@include partials/header.html-->

   The category-hero partial accepts page-specific content as
   inline JSON right after the path:

     <!--@include partials/category-hero.html
     { "breadcrumbCurrent": "Dry Slides", "catTag": "...", ... }
     -->

   Tokens in the partial file ({{key}}) are replaced with the
   matching JSON value. This is the dev-time equivalent of
   WordPress's header.php / get_template_part() includes
   described in INTEGRATION.md.
─────────────────────────────────────────────────────────── */
function renderPartial(partialPath, dataBlock) {
  const filePath = path.join(ROOT, partialPath);
  let content = fs.readFileSync(filePath, 'utf8');
  const data = dataBlock && dataBlock.trim() ? JSON.parse(dataBlock) : {};
  if (Array.isArray(data.badges)) {
    data.badgesHtml = data.badges
      .map((b) => `<span class="hero-badge">${b}</span>`)
      .join('\n            ');
  }
  return content.replace(/\{\{(\w+)\}\}/g, (match, key) => (key in data ? data[key] : ''));
}

function processIncludes(html) {
  return html.replace(/<!--@include\s+([\s\S]*?)-->/g, (full, body) => {
    const splitAt = body.search(/\s/);
    const partialPath = splitAt === -1 ? body.trim() : body.slice(0, splitAt);
    const dataBlock = splitAt === -1 ? '' : body.slice(splitAt);
    try {
      return renderPartial(partialPath, dataBlock);
    } catch (err) {
      return `<!-- include error in ${partialPath}: ${err.message} -->`;
    }
  });
}

/* ── SERVER ──────────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0]; // strip query string

  // Normalise: add trailing slash if missing and not a file
  if (!path.extname(urlPath) && !urlPath.endsWith('/')) {
    urlPath += '/';
  }

  // 1. Check if it's a clean-slug route
  let filePath = null;
  if (ROUTES[urlPath]) {
    filePath = path.join(ROOT, ROUTES[urlPath]);
  }

  // 2. Fallback: try as a direct static file (css, js, images, etc.)
  if (!filePath) {
    const candidate = path.join(ROOT, urlPath);
    // Security: ensure it stays inside ROOT
    if (candidate.startsWith(ROOT)) {
      filePath = candidate;
    }
  }

  // 3. Serve the file
  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Try without trailing slash
      const alt = path.join(ROOT, urlPath.replace(/\/$/, ''));
      fs.readFile(alt, (err2, data2) => {
        if (err2) {
          // Serve branded 404.html if it exists, otherwise inline fallback
          const notFoundFile = path.join(ROOT, '404.html');
          fs.readFile(notFoundFile, (e3, d3) => {
            if (e3) {
              // Inline fallback — utf-8 charset ensures emoji/arrows render
              res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(Buffer.from(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>404 — Fiesta Jumps</title>
<base href="/">
<link rel="stylesheet" href="/style.css">
<script src="/router.js"></script>
<style>
  .err-wrap{min-height:100svh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 24px;background:var(--off-white)}
  .err-code{font-family:'Nunito',sans-serif;font-size:clamp(80px,15vw,160px);font-weight:900;line-height:1;background:var(--grad-orange);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:8px}
  .err-emoji{font-size:56px;margin-bottom:20px}
  .err-title{font-family:'Nunito',sans-serif;font-size:clamp(22px,4vw,36px);font-weight:900;color:var(--ink);margin-bottom:14px}
  .err-sub{font-size:16px;color:var(--ink3);line-height:1.7;max-width:480px;margin:0 auto 32px}
  .err-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap}
  .err-links{margin-top:48px;display:flex;gap:10px;flex-wrap:wrap;justify-content:center}
  .err-chip{font-family:'Poppins',sans-serif;font-size:13px;font-weight:600;color:var(--ink2);background:#fff;border:1.5px solid var(--border);padding:8px 16px;border-radius:var(--r-full);text-decoration:none;transition:all .15s}
  .err-chip:hover{border-color:var(--orange);color:var(--orange)}
  .err-path{font-family:var(--font-mono,monospace);font-size:13px;color:var(--ink4);background:var(--surface);padding:6px 14px;border-radius:8px;margin-bottom:28px;display:inline-block}
</style>
</head>
<body>
<div class="err-wrap">
  <div class="err-emoji">🏰</div>
  <div class="err-code">404</div>
  <h1 class="err-title">This page bounced away!</h1>
  <p class="err-sub">The page you're looking for doesn't exist yet, or the link may have changed. Let's get you back to the fun.</p>
  <div class="err-btns">
    <a href="/" class="btn btn-orange btn-lg fj-link">Back to Homepage</a>
    <a href="/bounce-house-rentals/" class="btn btn-ghost btn-lg fj-link">Browse Rentals</a>
  </div>
  <div class="err-links">
    <a href="/bounce-house-rentals/" class="err-chip fj-link">🏰 Bounce Houses</a>
    <a href="/water-slides-rentals/" class="err-chip fj-link">💧 Water Slides</a>
    <a href="/obstacle-course-rentals/" class="err-chip fj-link">🏁 Obstacle Courses</a>
    <a href="/concessions-machine/" class="err-chip fj-link">🍿 Concessions</a>
    <a href="/bundle-deals/" class="err-chip fj-link">📦 Bundle Deals</a>
    <a href="/contact/" class="err-chip fj-link">✉️ Contact Us</a>
  </div>
</div>
<script src="/main.js"></script>
</body>
</html>`, 'utf8'));
            } else {
              res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(injectBase(d3, '.html', '/404'));
            }
          });
          return;
        }

        const ext = path.extname(alt);
        const mime = MIME[ext] || 'application/octet-stream';
        const body = injectBase(data2, ext, urlPath);
        res.writeHead(200, { 'Content-Type': mime });
        res.end(body);
      });
      return;
    }

    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';

    // Inject <base href="/"> into HTML so relative paths (style.css, main.js)
    // always resolve from root — even pages served at /bounce-house-rentals/
    const body = injectBase(data, ext, urlPath);

    // Cache static assets (js/css/images) in browser
    const headers = { 'Content-Type': mime };
    if (['.css', '.js', '.png', '.jpg', '.webp', '.svg', '.woff2'].includes(ext)) {
      headers['Cache-Control'] = 'public, max-age=3600';
    } else {
      headers['Cache-Control'] = 'no-cache';
    }

    res.writeHead(200, headers);
    res.end(body);
  });
});

// Only auto-start the server when run directly (`node server.js`).
// This lets build-pages.js `require()` this file to reuse processIncludes/
// injectBase/ROUTES without spinning up a listener.
if (require.main === module) {
  server.listen(PORT, () => {
    console.log('\n🎉 Fiesta Jumps dev server running!\n');
    console.log(`   Local:   http://localhost:${PORT}`);
    console.log(`   Network: http://${getLocalIP()}:${PORT}\n`);
    console.log('   Routes:');
    Object.entries(ROUTES).forEach(([slug, file]) => {
      const exists = fs.existsSync(path.join(ROOT, file));
      const icon = exists ? '✅' : '⚠️  (file missing)';
      console.log(`   ${icon}  ${slug.padEnd(35)} → ${file}`);
    });
    console.log('\n   Press Ctrl+C to stop.\n');
  });
}

module.exports = { ROUTES, MIME, injectBase, processIncludes, ROOT };

function getLocalIP() {
  try {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) return net.address;
      }
    }
  } catch (_) { }
  return '0.0.0.0';
}