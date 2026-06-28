# Fiesta Jumps — Website Redesign

Static multi-page site (vanilla HTML/CSS/JS) for Fiesta Jumps, a Santa Barbara party rental company. Built to be dropped into WordPress later — see [INTEGRATION.md](INTEGRATION.md) for that migration path.

## File structure

```
.
├── index.html                   ← Homepage
├── classic-bounce-houses.html   ← Category page: Bounce Houses
├── style.css                    ← Global stylesheet (tokens + every shared component)
├── subpages.css                 ← Shared page-specific styles for category/subpages
├── dark-mode.css                ← Dark theme token + surface overrides (see below)
├── main.js                      ← All shared JS (nav, carousel, cart, transitions, theme toggle, etc.)
├── router.js                    ← Maps clean URL slugs → .html filenames (local dev only)
├── routes.yml                   ← Source of truth for the route map (slug → file → title → prefetch)
├── server.js                    ← Zero-dependency Node dev server (`node server.js`, port 3000)
├── ngrok.yml                    ← Tunnel config for sharing the local dev server
└── INTEGRATION.md               ← WordPress / EventHawk / GHL migration guide
```

Only one category page (`classic-bounce-houses.html`) exists today. `routes.yml` and `router.js` already list the full set of planned category pages (water slides, obstacle courses, combo bounce houses, etc.) — those `.html` files don't exist yet, so the server logs them as "file missing" on startup.

## How styling works

There are two layers of CSS:

1. **`style.css`** — loaded by every page via `<link rel="stylesheet" href="/style.css">`. It holds:
   - `:root` design tokens (colors, spacing, radii, shadows, transitions)
   - Global reset, layout, buttons, header, footer, cart, announcement bar, etc. — anything reused across pages.
2. **`subpages.css`** — loaded *after* `style.css` so it can reference the tokens. Linked from `classic-bounce-houses.html`:

   ```html
   <link rel="stylesheet" href="/style.css">
   <link rel="stylesheet" href="/subpages.css">
   ```

   It contains selectors used by category/subpage layouts (`.cat-hero`, `.pcard`, `.filter-bar`, `.why-rent`, `.seo-section`, etc.) and uses `var(--token)` values defined in `style.css`. As more category pages are built, they can share this same file if their markup reuses these classes, or get their own page-specific stylesheet if a page needs unique rules — link it after `subpages.css` the same way.

Previously, `classic-bounce-houses.html` had its page-specific rules inline in a `<style>` block in `<head>`. That block has been extracted into `subpages.css` so the pattern is consistent with `style.css` being a real stylesheet file rather than inline markup.

### Adding a new category page

For each new category page (e.g. `water-slides.html`):

1. Reuse `subpages.css` if the page follows the same card/hero/filter-bar layout, or add a new `<page-name>.css` if it needs unique rules — link it after `style.css`/`subpages.css`.
2. Copy the `<head>` block from `classic-bounce-houses.html` (font links, `style.css`, `subpages.css`, `dark-mode.css`, the early-theme `<script>`, `router.js`) and the header/footer markup so dark mode and navigation work identically.
3. Don't duplicate anything already in `style.css` (buttons, header, footer, badges, tokens) — only page-unique selectors belong in a page CSS file.
4. `server.js` serves any file in the project root with the correct MIME type automatically, so no server changes are needed when adding a new `.css` file.

## Dark mode

Dark mode is implemented with a **theme attribute + CSS variable overrides**, not by swapping stylesheets in and out. That's the easier and more robust approach here because the whole site already reads its colors from `var(--token)` values defined in `style.css :root` — overriding those tokens for one attribute value recolors almost everything for free, with no extra network request and no flash when toggling.

How it works:

1. **`dark-mode.css`** — redefines the color/shadow tokens under `:root[data-theme="dark"]`, plus a short list of selectors that hardcode a literal `#fff` "card" background instead of a token (header bar, dropdown panel, mobile drawer, cart sidebar, product cards, etc.) so they redirect to the dark `--surface` token too.
2. **An inline snippet at the top of `<head>`** (before the page `<title>`) reads the saved theme from `localStorage` (or the OS `prefers-color-scheme`) and sets `data-theme` on `<html>` *before first paint* — this is what prevents a flash of the light theme on load:
   ```html
   <script>(function () { try { var t = localStorage.getItem('fj-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); document.documentElement.setAttribute('data-theme', t); } catch (e) { } })();</script>
   ```
3. **The toggle button** (`#themeToggle`, a sun/moon icon button in `.hdr-actions`) is wired up by `initThemeToggle()` in `main.js`, which is already called from the shared `init()`. Clicking it flips `data-theme` on `<html>` and saves the choice to `localStorage` under the key `fj-theme`.

### Applying dark mode to a new page

Every page just needs three things — there's no per-page JS or per-page dark CSS required:

1. Link `dark-mode.css` in `<head>`, after `style.css` (and after any page-specific CSS):
   ```html
   <link rel="stylesheet" href="/style.css">
   <link rel="stylesheet" href="/subpages.css">
   <link rel="stylesheet" href="/dark-mode.css">
   ```
2. Paste the early-theme `<script>` snippet above near the top of `<head>`, before the stylesheet links.
3. Copy the `#themeToggle` button markup from `classic-bounce-houses.html`'s `.hdr-actions` into the new page's header. `main.js` (already loaded on every page) finds it by `id` and wires it up automatically.

If a new page introduces its own hardcoded `#fff`/`rgba(255,255,255,*)` "card" background instead of using `var(--surface)`, add one matching `[data-theme="dark"] .your-class { background: var(--surface); }` rule to `dark-mode.css`.

## Running locally

```
node server.js
```

Opens at `http://localhost:3000`. The server reads the `ROUTES` map (kept in sync with `routes.yml`) so clean URLs like `/bounce-house-rentals/` resolve to `classic-bounce-houses.html`.
