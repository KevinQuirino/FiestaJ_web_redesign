/* ═══════════════════════════════════════════════════════════════
FIESTA JUMPS — ROUTER
═══════════════════════════════════════════════════════════════
Environments:
    node server.js     → http://localhost:3000  (slug-aware server)
    WordPress          → clean slugs work natively
    Live Server        → DO NOT USE for navigation — use server.js

This file exposes window.FJ_ROUTER so main.js can:
    1. Resolve slugs correctly per environment
    2. Know which pages to prefetch from the current page
    3. Detect environment (local node server vs WordPress)
═══════════════════════════════════════════════════════════════ */
(function () {
    'use strict';

    /* ── ROUTE MAP ─────────────────────────────────────────────
    Key   = clean slug (used in every href="..." attribute)
    Value = { file, prefetch[] }
    ─────────────────────────────────────────────────────────── */
    const ROUTE_MAP = {
        '/': {
            file: 'homePage/index.html',
            prefetch: [
                '/bounce-house-rentals/',
                '/water-slides-rentals/',
                '/bundle-deals/',
                '/book-now/'
            ]
        },
        '/bounce-house-rentals/': {
            file: 'bounceHouses/classic-bounce-houses.html',
            prefetch: [
                '/combo-bounce-house-rentals/',
                '/water-slides-rentals/',
                '/bundle-deals/',
                '/book-now/'
            ]
        },
        '/combo-bounce-house-rentals/': {
            file: 'bounceHouses/combo-bounce-houses.html',
            prefetch: [
                '/bounce-house-rentals/',
                '/water-slides-rentals/',
                '/bundle-deals/'
            ]
        },
        '/dry-slide-rentals/': {
            file: 'bounceHouses/dry-slides.html',
            prefetch: [
                '/water-slides-rentals/',
                '/obstacle-course-rentals/'
            ]
        },
        '/water-slides-rentals/': {
            file: 'bounceHouses/water-slides.html',
            prefetch: [
                '/bounce-house-rentals/',
                '/foam-cannon-rentals/',
                '/bundle-deals/'
            ]
        },
        '/foam-cannon-rentals/': {
            file: 'bounceHouses/foam-cannon.html',
            prefetch: [
                '/water-slides-rentals/',
                '/interactive-game-rentals/'
            ]
        },
        '/obstacle-course-rentals/': {
            file: 'Activities/obstacle-courses.html',
            prefetch: [
                '/interactive-game-rentals/',
                '/bundle-deals/'
            ]
        },
        '/interactive-game-rentals/': {
            file: 'Activities/interactive-games.html',
            prefetch: [
                '/concessions-machine/',
                '/photo-booth-rental/'
            ]
        },
        '/photo-booth-rental/': {
            file: 'Activities/photo-booth.html',
            prefetch: [
                '/interactive-game-rentals/',
                '/concessions-machine/'
            ]
        },
        '/concessions-machine/': {
            file: 'Activities/concessions.html',
            prefetch: [
                '/bundle-deals/',
                '/tent-rentals/'
            ]
        },
        '/sb-trackless-train/': {
            file: 'Activities/trackless-train.html',
            prefetch: [
                '/bundle-deals/',
                '/fully-staffed-attendants/'
            ]
        },
        '/tent-rentals/': {
            file: 'eventEssentials/tent-rentals.html',
            prefetch: [
                '/tables-chairs-linen/',
                '/generators/',
                '/bundle-deals/'
            ]
        },
        '/tables-chairs-linen/': {
            file: 'eventEssentials/tables-chairs.html',
            prefetch: [
                '/tent-rentals/',
                '/bundle-deals/'
            ]
        },
        '/generators/': {
            file: 'eventEssentials/generators.html',
            prefetch: [
                '/tent-rentals/',
                '/fully-staffed-attendants/'
            ]
        },
        '/fully-staffed-attendants/': {
            file: 'eventEssentials/staffed-attendants.html',
            prefetch: [
                '/bundle-deals/'
            ]
        },
        '/bundle-deals/': {
            file: 'deals/bundle-deals.html',
            prefetch: [
                '/bounce-house-rentals/',
                '/book-now/'
            ]
        },
        '/about-us/': {
            file: 'company/about.html',
            prefetch: [
                '/service-area/',
                '/contact/'
            ]
        },
        '/service-area/': {
            file: 'company/service-area.html',
            prefetch: [
                '/bounce-house-rentals/',
                '/book-now/'
            ]
        },
        '/coupons/': {
            file: 'company/coupons.html', prefetch: ['/book-now/']
        },
        '/contact/': { file: 'company/contact.html', prefetch: ['/book-now/'] },
        '/book-now/': { file: 'company/book-now.html', prefetch: [] },
        '/privacy-policy/': { file: 'company/privacy.html', prefetch: [] },
    };

    /* ── ENVIRONMENT DETECTION ─────────────────────────────────
    isNodeServer → running on localhost:3000 via server.js
    Clean slugs work — no rewriting needed
    isWP         → running on real domain
    Clean slugs work — no rewriting needed
    isLiveServer → 127.0.0.1:5500 (VS Code Live Server)
    Slugs DON'T work — must use server.js instead
    ─────────────────────────────────────────────────────────── */
    const { hostname, port, href } = window.location;
    const isNodeServer = hostname === 'localhost' && port === '3000';
    const isLiveServer = hostname === '127.0.0.1' && port === '5500';
    const isWP = !isNodeServer && !isLiveServer && !href.startsWith('file://');

    // Warn if using Live Server (slugs will 404)
    if (isLiveServer) {
        console.warn(
            '%c⚠️ Fiesta Jumps Router',
            'color:#FF5A1F;font-weight:bold',
            '\n\nLive Server cannot handle clean URL slugs like /bounce-house-rentals/\n' +
            'Navigation links will 404.\n\n' +
            'Fix: run the slug-aware dev server instead:\n' +
            '  node server.js\n' +
            'Then open: http://localhost:3000'
        );
    }

    /* ── RESOLVE: slug → navigable URL ────────────────────────
       On node server and WordPress, slugs work as-is.
       Exposed so main.js can build the correct URL for navigation.
    ─────────────────────────────────────────────────────────── */
    function resolve(slug) {
        // Always use clean slugs — server.js and WordPress both handle them
        return slug;
    }

    /* ── CURRENT PAGE SLUG ─────────────────────────────────── */
    function currentSlug() {
        let p = window.location.pathname;
        if (!p.endsWith('/') && !p.includes('.')) p += '/';
        return p || '/';
    }

    /* ── INJECT PREFETCH TAGS (only for existing pages) ───────
       Silently checks each slug with a HEAD request before
       injecting the prefetch tag — avoids 404s in the console
       for pages not yet created.
    ─────────────────────────────────────────────────────────── */
    function injectPrefetch(slugs) {
        if (!slugs?.length) return;
        slugs.forEach(slug => {
            if (document.querySelector(`link[rel="prefetch"][href="${slug}"]`)) return;
            // Check if the page exists before prefetching (avoids 404 noise)
            fetch(slug, { method: 'HEAD', cache: 'no-store' })
                .then(res => {
                    if (!res.ok) return; // page doesn't exist yet — skip
                    const l = document.createElement('link');
                    l.rel = 'prefetch';
                    l.as = 'document';
                    l.href = slug;
                    document.head.appendChild(l);
                })
                .catch(() => { }); // silently ignore network errors
        });
    }

    /* ── PUBLIC API ────────────────────────────────────────── */
    window.FJ_ROUTER = {
        map: ROUTE_MAP,
        isNodeServer,
        isLiveServer,
        isWP,
        resolve,
        currentSlug,
        currentPrefetch: () => ROUTE_MAP[currentSlug()]?.prefetch || [],
        fileForSlug: (slug) => ROUTE_MAP[slug]?.file || null,
    };

    /* ── AUTO PREFETCH ON LOAD ─────────────────────────────── */
    function init() {
        injectPrefetch(window.FJ_ROUTER.currentPrefetch());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();