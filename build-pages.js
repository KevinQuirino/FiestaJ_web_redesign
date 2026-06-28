/**
 * FIESTA JUMPS — GITHUB PAGES BUILD
 * ─────────────────────────────────────────────────────────────
 * Run:  node build-pages.js
 *
 * GitHub Pages only serves static files — it can't run server.js
 * to expand the <!--@include partials/...--> directives. This
 * script reuses server.js's own include/base-tag logic (via
 * require, no server is started) and writes fully-resolved HTML
 * for every route into docs/, plus the CSS/JS assets pages need.
 *
 * Publish by pointing GitHub Pages at the docs/ folder
 * (Settings → Pages → Branch: main, Folder: /docs).
 * Re-run this script and commit docs/ before each deploy.
 *
 * This script does not affect `node server.js` — that dev
 * workflow is untouched.
 ─────────────────────────────────────────────────────────────── */

const fs = require('fs');
const path = require('path');
const { ROUTES, injectBase, ROOT } = require('./server.js');

const OUT = path.join(ROOT, 'docs');

// Static assets every page needs, copied as-is (no includes inside these).
const STATIC_FILES = ['style.css', 'subpages.css', 'dark-mode.css', 'main.js', 'router.js'];

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function buildPage(urlPath, srcRelPath) {
  const srcPath = path.join(ROOT, srcRelPath);
  const raw = fs.readFileSync(srcPath);
  const rendered = injectBase(raw, '.html', urlPath).toString('utf8');

  // /  → docs/index.html
  // /bounce-house-rentals/ → docs/bounce-house-rentals/index.html
  const outDir = path.join(OUT, urlPath === '/' ? '' : urlPath);
  ensureDir(outDir);
  fs.writeFileSync(path.join(outDir, 'index.html'), rendered);
}

function main() {
  ensureDir(OUT);

  for (const [urlPath, srcRelPath] of Object.entries(ROUTES)) {
    buildPage(urlPath, srcRelPath);
  }

  for (const file of STATIC_FILES) {
    fs.copyFileSync(path.join(ROOT, file), path.join(OUT, file));
  }

  // Tell GitHub Pages to skip Jekyll processing (plain static site).
  fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

  console.log(`\n✅ Built ${Object.keys(ROUTES).length} pages + ${STATIC_FILES.length} assets into docs/\n`);
  console.log('   Next: commit docs/, then in GitHub Settings → Pages, set');
  console.log('   Branch: main (or your branch) / Folder: /docs\n');
}

main();
