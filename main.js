/* ═══════════════════════════════════════════════════════════════
  FIESTA JUMPS — MAIN JS v3
  No dependencies · WordPress-ready · Full feature set
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── DOM refs ──────────────────────────────────────────────── */
  const ptCurtain = document.getElementById('ptCurtain');
  const siteHeader = document.getElementById('siteHeader');
  const burgerBtn = document.getElementById('burgerBtn');
  const mobDrawer = document.getElementById('mobDrawer');
  const cartBtn = document.getElementById('cartBtn');
  const cartCloseBtn = document.getElementById('cartCloseBtn');
  const cartOverlay = document.getElementById('cartOverlay');
  const cartSidebar = document.getElementById('cartSidebar');
  const cartCount = document.getElementById('cartCount');
  const hcTrack = document.getElementById('hcTrack');
  const hcPrev = document.getElementById('hcPrev');
  const hcNext = document.getElementById('hcNext');
  const hcDots = document.getElementById('hcDots');
  const revTrack = document.getElementById('revTrack');
  const revPrev = document.getElementById('revPrev');
  const revNext = document.getElementById('revNext');
  const revDots = document.getElementById('revDots');
  const heroLocText = document.getElementById('heroLocText');
  const mapGeoNote = document.getElementById('mapGeoNote');
  const mapGeoText = document.getElementById('mapGeoText');

  /* ══════════════════════════════════════════════════════════════
    PAGE TRANSITION — Overlay div fade (Framer-style)
    Uses a dedicated #fj-overlay div instead of html opacity.
    This prevents the blank-page flash on mobile Safari/Chrome
    that happens when opacity is set on <html> or <body>.

    On load:    overlay fades OUT (page appears from black)
    On click:   overlay fades IN  (page disappears to black)
    On back:    pageshow event resets overlay instantly
  ═══════════════════════════════════════════════════════════════ */
  function initPageTransitions() {
    // ── Create the overlay div ────────────────────────────────
    const overlay = document.createElement('div');
    overlay.id = 'fj-overlay';
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      background: '#1C1410',   // warm dark — matches footer/mission bg
      zIndex: '99999',
      opacity: '1',
      pointerEvents: 'none',
      transition: 'opacity 0.38s ease',
      willChange: 'opacity',
    });
    document.body.appendChild(overlay);

    // Fade IN the page (overlay fades out → page visible)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.style.opacity = '0';
      });
    });

    // After fade completes, remove pointer-events so it doesn't
    // block clicks (opacity 0 but still in DOM for back-button)
    overlay.addEventListener('transitionend', () => {
      overlay.style.display = overlay.style.opacity === '0' ? 'none' : 'block';
    }, { passive: true });

    // ── Back / Forward (bfcache restore) ─────────────────────
    window.addEventListener('pageshow', e => {
      if (e.persisted) {
        // Restore from bfcache — instantly hide overlay
        overlay.style.transition = 'none';
        overlay.style.opacity = '0';
        overlay.style.display = 'none';
      }
    });

    // Safety net: ensure page is never stuck invisible
    setTimeout(() => {
      overlay.style.opacity = '0';
      overlay.style.display = 'none';
    }, 1000);

    const prefetched = new Set();
    let isNavigating = false;

    function isInternal(href, target) {
      if (!href || target === '_blank') return false;
      if (href.startsWith('#') || href.startsWith('tel:') || href.startsWith('mailto:')) return false;
      if (href.startsWith('http') && !href.startsWith(window.location.origin)) return false;
      return true;
    }

    function getHref(link) {
      const raw = link.getAttribute('href') || '';
      return window.FJ_ROUTER ? window.FJ_ROUTER.resolve(raw) : raw;
    }

    function prefetchUrl(url) {
      if (!url || prefetched.has(url)) return;
      if (window.FJ_ROUTER?.isNodeServer) {
        const slug = url.replace(window.location.origin, '');
        if (!window.FJ_ROUTER.map[slug]) return;
      }
      prefetched.add(url);
      const l = document.createElement('link');
      l.rel = 'prefetch'; l.as = 'document'; l.href = url;
      document.head.appendChild(l);
    }

    // Prefetch on hover
    document.addEventListener('mouseover', e => {
      const link = e.target.closest('a.fj-link');
      if (!link) return;
      const h = getHref(link);
      if (isInternal(h, link.target)) prefetchUrl(h);
    }, { passive: true });

    // Prefetch on touchstart
    document.addEventListener('touchstart', e => {
      const link = e.target.closest('a.fj-link');
      if (!link) return;
      const h = getHref(link);
      if (isInternal(h, link.target)) prefetchUrl(h);
    }, { passive: true });

    // Click: fade overlay IN then navigate
    document.addEventListener('click', e => {
      const link = e.target.closest('a.fj-link');
      if (!link || isNavigating) return;
      const h = getHref(link);
      if (!isInternal(h, link.target)) return;

      e.preventDefault();
      isNavigating = true;

      // Show overlay (page fades to dark)
      overlay.style.display = 'block';
      overlay.style.transition = 'opacity 0.28s ease';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          overlay.style.opacity = '1';
        });
      });

      // Warm up cache
      fetch(h, { credentials: 'same-origin', cache: 'force-cache' }).catch(() => null);

      // Navigate after fade
      setTimeout(() => { window.location.href = h; }, 300);
    });
  }

  /* ══ STICKY HEADER ══════════════════════════════════════════ */
  function initHeader() {
    if (!siteHeader) return;
    const update = () => siteHeader.classList.toggle('scrolled', window.scrollY > 24);
    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  /* ══ MEGA DROPDOWN ══════════════════════════════════════════ */
  function initDropdowns() {
    const items = document.querySelectorAll('.hdr-nav-item.has-drop');
    const timers = {};
    const repositioners = [];

    items.forEach((item, i) => {
      const btn = item.querySelector('.hdr-nav-btn');
      const panel = item.querySelector('.drop-panel');

      // Anchor the panel under its own button (so the mouse never has far to
      // travel and the hover-out timer doesn't fire before it gets there),
      // but clamp it so it still can't run off either edge of the viewport.
      const positionPanel = () => {
        if (!panel || !btn) return;
        const margin = 16;
        const btnRect = btn.getBoundingClientRect();
        const half = panel.offsetWidth / 2;
        const min = half + margin;
        const max = window.innerWidth - half - margin;
        const center = Math.max(min, Math.min(btnRect.left + btnRect.width / 2, max));
        panel.style.left = `${center}px`;
      };
      repositioners.push({ item, positionPanel });

      const open = () => {
        clearTimeout(timers[i]);
        closeAll();
        item.classList.add('drop-open');
        btn && btn.setAttribute('aria-expanded', 'true');
        positionPanel();
      };
      const close = () => {
        clearTimeout(timers[i]);
        timers[i] = setTimeout(() => {
          item.classList.remove('drop-open');
          btn && btn.setAttribute('aria-expanded', 'false');
        }, 130);
      };

      item.addEventListener('mouseenter', () => { clearTimeout(timers[i]); open(); });
      item.addEventListener('mouseleave', close);
      item.querySelector('.drop-panel')?.addEventListener('mouseenter', () => clearTimeout(timers[i]));

      // Keyboard
      btn && btn.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          item.classList.contains('drop-open') ? close() : open();
        }
        if (e.key === 'Escape') closeAll();
      });
    });

    document.addEventListener('click', e => {
      if (!e.target.closest('.hdr-nav-item.has-drop')) closeAll();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeAll();
    });
    window.addEventListener('resize', debounce(() => {
      repositioners.forEach(({ item, positionPanel }) => {
        if (item.classList.contains('drop-open')) positionPanel();
      });
    }, 100), { passive: true });

    function closeAll() {
      items.forEach((item, i) => {
        clearTimeout(timers[i]);
        item.classList.remove('drop-open');
        item.querySelector('.hdr-nav-btn')?.setAttribute('aria-expanded', 'false');
      });
    }
  }

  /* ══ MOBILE BURGER ══════════════════════════════════════════ */
  function initMobileNav() {
    if (!burgerBtn || !mobDrawer) return;
    let open = false;

    // The drawer is position:fixed and fills down to the bottom of the
    // screen with no gap — but "where the header ends" shifts (the
    // announcement bar showing or not, web fonts swapping in and reflowing
    // the header a moment after open, etc.), so it's re-measured every
    // frame for as long as the drawer stays open rather than just once.
    let rafId = null;
    const positionDrawer = () => {
      const top = siteHeader.getBoundingClientRect().bottom;
      mobDrawer.style.top = `${top}px`;
      mobDrawer.style.height = `${window.innerHeight - top}px`;
    };
    const trackPosition = () => {
      positionDrawer();
      if (open) rafId = requestAnimationFrame(trackPosition);
    };

    burgerBtn.addEventListener('click', () => {
      open = !open;
      burgerBtn.classList.toggle('open', open);
      burgerBtn.setAttribute('aria-expanded', open);
      mobDrawer.classList.toggle('open', open);
      mobDrawer.setAttribute('aria-hidden', !open);
      if (open) { trackPosition(); lockBodyScroll(); }
      else { cancelAnimationFrame(rafId); unlockBodyScroll(); }
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (open && !e.target.closest('.site-header')) {
        open = false;
        burgerBtn.classList.remove('open');
        mobDrawer.classList.remove('open');
        mobDrawer.setAttribute('aria-hidden', 'true');
        cancelAnimationFrame(rafId);
        unlockBodyScroll();
      }
    });
  }

  /* ══ CART SIDEBAR ═══════════════════════════════════════════ */
  function initCart() {
    const openCart = () => {
      if (!cartSidebar || !cartOverlay) return;
      cartSidebar.classList.add('open');
      cartOverlay.classList.add('open');
      cartSidebar.setAttribute('aria-hidden', 'false');
      lockBodyScroll();
    };
    const closeCart = () => {
      if (!cartSidebar || !cartOverlay) return;
      cartSidebar.classList.remove('open');
      cartOverlay.classList.remove('open');
      cartSidebar.setAttribute('aria-hidden', 'true');
      unlockBodyScroll();
    };

    cartBtn && cartBtn.addEventListener('click', openCart);
    cartCloseBtn && cartCloseBtn.addEventListener('click', closeCart);
    cartOverlay && cartOverlay.addEventListener('click', closeCart);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && cartSidebar?.classList.contains('open')) closeCart();
    });

    // EventHawk cart count listener
    window.addEventListener('eventhawk:cartUpdated', e => {
      const n = e.detail?.itemCount ?? 0;
      if (cartCount) {
        cartCount.textContent = n;
        // bounce animation
        cartCount.style.transform = 'scale(1.5)';
        setTimeout(() => { cartCount.style.transform = ''; }, 220);
      }
    });
  }

  /* ══ HERO CAROUSEL — smooth infinite loop ═══════════════════
     Uses cloned first/last slides so the wrap-around is seamless.
     No jump: clone technique = real infinite feel.
  ════════════════════════════════════════════════════════════ */
  function initHeroCarousel() {
    if (!hcTrack) return;
    const origSlides = Array.from(hcTrack.querySelectorAll('.hc-slide'));
    if (!origSlides.length) return;

    const total = origSlides.length;
    let current = 1;     // real index starts at 1 (after clone)
    let isMoving = false;
    let autoTimer = null;
    let touchStartX = 0;

    // ── Clone first and last slide for seamless wrap ──
    const cloneFirst = origSlides[0].cloneNode(true);
    const cloneLast = origSlides[total - 1].cloneNode(true);
    hcTrack.appendChild(cloneFirst);
    hcTrack.insertBefore(cloneLast, origSlides[0]);
    // Track now: [cloneLast, slide1, slide2, ..., slideN, cloneFirst]

    const allSlides = () => hcTrack.querySelectorAll('.hc-slide');

    // ── Position instantly (no animation) to real slide 1 ──
    setPos(current, false);

    // ── Build dots (one per REAL slide) ──
    if (hcDots) {
      origSlides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'hc-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.addEventListener('click', () => { goTo(i + 1); resetAuto(); });
        hcDots.appendChild(dot);
      });
    }

    function setPos(idx, animate) {
      hcTrack.style.transition = animate
        ? 'transform 0.55s cubic-bezier(0.76, 0, 0.24, 1)'
        : 'none';
      hcTrack.style.transform = `translateX(-${idx * 100}%)`;
    }

    function updateDots(realIdx) {
      // realIdx is 1-based; dots are 0-based
      const dotEls = hcDots?.querySelectorAll('.hc-dot') || [];
      dotEls.forEach((d, i) => d.classList.toggle('active', i === realIdx - 1));
    }

    function goTo(idx) {
      if (isMoving) return;
      isMoving = true;
      current = idx;
      setPos(current, true);
      updateDots(
        current <= 0 ? total : current > total ? 1 : current
      );

      // After animation ends, silently jump to real clone if at edge
      setTimeout(() => {
        if (current === 0) {
          current = total;
          setPos(current, false);
          updateDots(current);
        } else if (current === total + 1) {
          current = 1;
          setPos(current, false);
          updateDots(current);
        }
        isMoving = false;
      }, 560);
    }

    function next() { goTo(current + 1); }
    function prev() { goTo(current - 1); }

    hcNext && hcNext.addEventListener('click', () => { resetAuto(); next(); });
    hcPrev && hcPrev.addEventListener('click', () => { resetAuto(); prev(); });

    // Touch swipe — distinguishes horizontal swipe from vertical scroll
    let touchStartY = 0;
    let touchLocked = false; // true = horizontal swipe captured

    hcTrack.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
      touchLocked = false;
    }, { passive: true });

    hcTrack.addEventListener('touchmove', e => {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - touchStartY);
      if (!touchLocked && dx > dy && dx > 8) {
        touchLocked = true; // horizontal — capture it
      }
      // Only prevent default if clearly horizontal (stops page scroll)
      if (touchLocked) e.preventDefault();
    }, { passive: false }); // passive:false required to call preventDefault

    hcTrack.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 44) { resetAuto(); diff > 0 ? next() : prev(); }
      touchLocked = false;
    }, { passive: true });

    // ── Auto-play: full 4.5s gap after ANY manual interaction ──
    // resetAuto() clears the old interval and starts a fresh one,
    // guaranteeing the next auto-advance is always 4.5s from now.
    const AUTO_DELAY = 4500;
    function startAuto() {
      autoTimer = setInterval(() => {
        // Only advance if carousel isn't mid-animation
        if (!isMoving) next();
      }, AUTO_DELAY);
    }
    function resetAuto() {
      clearInterval(autoTimer); // kill current countdown
      startAuto();              // start a brand new 4.5s countdown
    }

    const carousel = hcTrack.closest('.hero-carousel');
    // Pause auto when user hovers (they're looking at a slide)
    carousel?.addEventListener('mouseenter', () => clearInterval(autoTimer));
    // Resume from full 4.5s when they leave (not mid-cycle)
    carousel?.addEventListener('mouseleave', resetAuto);
    startAuto();
  } // end initHeroCarousel

  /* ══ REVIEWS CAROUSEL — fixed offset & reachable dots ═══════
     Bug fixes:
     1. Gap measured from getComputedStyle (not hardcoded 18px)
     2. Each dot maps to one card position — all dots reachable
     3. Auto-advances by one card at a time, wraps correctly
  ════════════════════════════════════════════════════════════ */
  function initReviews() {
    if (!revTrack) return;
    const cards = Array.from(revTrack.querySelectorAll('.rev-card'));
    if (!cards.length) return;

    let idx = 0;
    let autoTimer = null;
    let touchStartX = 0;

    function getVisible() {
      if (window.innerWidth <= 580) return 1;
      if (window.innerWidth <= 900) return 2;
      return 3;
    }

    // Measure gap from CSS so it's always accurate
    function getGap() {
      const gap = parseFloat(
        getComputedStyle(revTrack).gap ||
        getComputedStyle(revTrack).columnGap || '18'
      );
      return isNaN(gap) ? 18 : gap;
    }

    function getMax() {
      // Each dot should be reachable — max = total cards - visible
      return Math.max(0, cards.length - getVisible());
    }

    // Build dots: one dot per possible stop position (0 to max)
    function buildDots() {
      if (!revDots) return;
      revDots.innerHTML = '';
      const max = getMax();
      for (let i = 0; i <= max; i++) {
        const dot = document.createElement('button');
        dot.className = 'rev-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Reviews page ${i + 1}`);
        const pos = i; // capture
        dot.addEventListener('click', () => { goTo(pos); resetRevAuto(); });
        revDots.appendChild(dot);
      }
    }

    function goTo(n) {
      const max = getMax();
      idx = Math.min(max, Math.max(0, n));
      const cardW = cards[0].offsetWidth;
      const gap = getGap();
      revTrack.style.transform = `translateX(-${idx * (cardW + gap)}px)`;
      revDots?.querySelectorAll('.rev-dot').forEach((d, i) =>
        d.classList.toggle('active', i === idx)
      );
    }

    // Wrap-around: after last position go back to 0
    function next() {
      const max = getMax();
      goTo(idx >= max ? 0 : idx + 1);
    }
    function prev() {
      const max = getMax();
      goTo(idx <= 0 ? max : idx - 1);
    }

    revNext && revNext.addEventListener('click', () => { next(); resetRevAuto(); });
    revPrev && revPrev.addEventListener('click', () => { prev(); resetRevAuto(); });

    let revTouchStartY = 0;
    let revTouchLocked = false;

    revTrack.addEventListener('touchstart', e => {
      touchStartX = e.touches[0].clientX;
      revTouchStartY = e.touches[0].clientY;
      revTouchLocked = false;
    }, { passive: true });

    revTrack.addEventListener('touchmove', e => {
      const dx = Math.abs(e.touches[0].clientX - touchStartX);
      const dy = Math.abs(e.touches[0].clientY - revTouchStartY);
      if (!revTouchLocked && dx > dy && dx > 8) revTouchLocked = true;
      if (revTouchLocked) e.preventDefault();
    }, { passive: false });

    revTrack.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 44) { diff > 0 ? next() : prev(); resetRevAuto(); }
      revTouchLocked = false;
    }, { passive: true });

    function startRevAuto() {
      autoTimer = setInterval(() => {
        if (!document.hidden) next(); // skip if tab is not visible
      }, 5000);
    }
    function resetRevAuto() {
      clearInterval(autoTimer); // kill current countdown
      startRevAuto();           // fresh full 5s countdown from now
    }

    const section = revTrack.closest('.reviews-section');
    section?.addEventListener('mouseenter', () => clearInterval(autoTimer));
    section?.addEventListener('mouseleave', startRevAuto);

    // Rebuild on resize so dots + offsets stay accurate
    window.addEventListener('resize', debounce(() => {
      buildDots();
      goTo(0);
    }, 200));

    buildDots();
    startRevAuto();
  }

  /* Public re-init for when live reviews replace static HTML cards */
  function initReviewDots() {
    // Re-run initReviews logic after dynamic card injection
    initReviews();
  }

  /* ══ TRAIN GALLERY THUMBS ═══════════════════════════════════ */
  function initTrainGallery() {
    const main = document.querySelector('.tg-main img');
    const thumbs = document.querySelectorAll('.tg-thumb');
    if (!main || !thumbs.length) return;
    thumbs.forEach(thumb => {
      thumb.addEventListener('click', () => {
        main.src = thumb.dataset.full || thumb.src;
        thumbs.forEach(t => t.classList.remove('active'));
        thumb.classList.add('active');
      });
    });
  }

  /* ══ SCROLL ANIMATIONS (AOS-lite) ══════════════════════════ */
  function initScrollAnim() {
    const els = document.querySelectorAll('[data-aos]');
    if (!els.length) return;

    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const el = e.target;
          const delay = el.style.getPropertyValue('--d') || '0ms';
          el.style.transitionDelay = delay;
          el.classList.add('aos-in');
          obs.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => obs.observe(el));
  }

  /* ══ RENTAL TAB SWITCHER ════════════════════════════════════ */
  function initRentalTabs() {
    const tabs = document.querySelectorAll('.rtab');
    const panels = document.querySelectorAll('.rtab-panel');
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        switchTab(tab.dataset.tab);
        // Smooth scroll to the section top on mobile
        if (window.innerWidth < 900) {
          document.getElementById('rentals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  }

  // Global so cat-card onclick="switchTab('classic')" works
  window.switchTab = function (tabId) {
    const tabs = document.querySelectorAll('.rtab');
    const panels = document.querySelectorAll('.rtab-panel');
    tabs.forEach(t => {
      const active = t.dataset.tab === tabId;
      t.classList.toggle('active', active);
      t.setAttribute('aria-selected', active);
    });
    panels.forEach(p => {
      p.classList.toggle('active', p.id === 'tab-' + tabId);
    });
  };

  /* ══ GOOGLE REVIEWS LIVE SCORE ══════════════════════════════
    Fetches the live rating + review count from Google Places API.

    HOW TO ACTIVATE:
    1. Go to: https://console.cloud.google.com/
    2. Create a project → enable "Places API (New)"
    3. Create an API key → restrict it to your domain
    4. Paste the key into GOOGLE_PLACES_API_KEY below
    5. Confirm your Place ID at:
        https://developers.google.com/maps/documentation/places/web-service/place-id
        (search "Fiesta Jumps Santa Barbara" and copy the Place ID)

    COST: Google gives $200/month free credit (~6,000 Place Details calls).
    At normal traffic levels this will be $0/month.

    If no API key is set, the section shows the hardcoded fallback values
    already in the HTML (4.9 / "Google Reviews") — still looks correct.
  ════════════════════════════════════════════════════════════ */
  const GOOGLE_PLACES_API_KEY = 'google_api_key'; // ← paste your key here e.g. 'AIzaSy...'
  const GOOGLE_PLACE_ID = 'google_id'; // ← confirm your Place ID

  async function fetchGoogleRating() {
    if (!GOOGLE_PLACES_API_KEY || !GOOGLE_PLACE_ID) return;

    try {
      // Request rating + review count + 5 newest reviews in one API call
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${GOOGLE_PLACE_ID}?languageCode=en`,
        {
          headers: {
            'X-Goog-Api-Key': GOOGLE_PLACES_API_KEY,
            // reviews field returns up to 5 most relevant/recent reviews
            'X-Goog-FieldMask': 'rating,userRatingCount,reviews'
          }
        }
      );

      if (!res.ok) throw new Error(`Places API ${res.status}`);
      const data = await res.json();

      const rating = data.rating;
      const count = data.userRatingCount;
      const reviews = data.reviews || []; // array of up to 5 reviews

      if (!rating) return;

      // ── 1. Update score number ──────────────────────────────
      const rounded = Math.round(rating * 10) / 10;
      const scoreLive = document.getElementById('revScoreLive');
      const countLive = document.getElementById('revCountLive');
      const starsDisp = document.getElementById('revStarsDisplay');
      const liveBadge = document.getElementById('revLiveBadge');

      if (scoreLive) scoreLive.textContent = rounded.toFixed(1);
      if (countLive) countLive.textContent = `· ${count.toLocaleString()} Google Reviews`;

      // ── 2. Partial-fill star bar ────────────────────────────
      if (starsDisp) {
        const pct = (rating / 5) * 100;
        starsDisp.innerHTML = `
          <span class="rev-stars-partial" aria-label="${rounded} out of 5 stars">
            ★★★★★
            <span class="rev-stars-fill" style="width:${pct}%">★★★★★</span>
          </span>`;
      }

      // ── 3. Show live badge ──────────────────────────────────
      if (liveBadge) liveBadge.style.display = 'inline-flex';

      // ── 4. Render live review cards ─────────────────────────
      // Takes up to 5 reviews from the API and replaces the static HTML cards
      if (reviews.length > 0) {
        renderLiveReviews(reviews);
      }

      // ── 5. Cache everything for 1 hour ─────────────────────
      localStorage.setItem('fj_rating', JSON.stringify({
        rating, count, reviews, cachedAt: Date.now()
      }));

    } catch (err) {
      console.warn('Google Places fetch failed:', err.message);
      // Static fallback cards in HTML remain visible — no action needed
    }
  }

  // Avatar background colors — cycles through for each reviewer
  const AVATAR_COLORS = [
    '#EF4444', '#10B981', '#F59E0B', '#3B82F6',
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  function renderLiveReviews(reviews) {
    const track = document.getElementById('revTrack');
    if (!track) return;

    // Build star string from rating number (e.g. 4 → ★★★★☆)
    function starsFromRating(n) {
      const full = Math.round(n);
      return '★'.repeat(full) + '☆'.repeat(5 - full);
    }

    // Format relative time from Google's relativePublishTimeDescription
    // Google returns a string like "a week ago", "2 months ago" — use it directly
    function timeAgo(review) {
      return review.relativePublishTimeDescription || '';
    }

    // Build initials from author name
    function initials(name) {
      if (!name) return '?';
      const parts = name.trim().split(' ');
      return parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : parts[0][0].toUpperCase();
    }

    // Clear existing static cards
    track.innerHTML = '';

    // Render each live review card
    reviews.forEach((review, i) => {
      const name = review.authorAttribution?.displayName || 'Google Reviewer';
      const text = review.text?.text || '';
      const rating = review.rating || 5;
      const time = timeAgo(review);
      const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
      const initial = initials(name);
      const stars = starsFromRating(rating);
      const profile = review.authorAttribution?.uri || '#';

      const card = document.createElement('div');
      card.className = 'rev-card';
      card.innerHTML = `
        <div class="rev-top">
          <a href="${profile}" target="_blank" rel="noopener noreferrer"
             style="text-decoration:none;display:flex;align-items:center;gap:12px">
            <div class="rev-avatar" style="background:${color}">${initial}</div>
            <div class="rev-info">
              <strong>${name}</strong>
              <span class="rev-verified">✓ Google Review</span>
              <p class="rev-date">${time}</p>
            </div>
          </a>
        </div>
        <div class="rev-stars-row" style="color:#F59E0B">${stars}</div>
        <p class="rev-text">${text}</p>
        <span class="rev-source">Posted on Google</span>
      `;
      track.appendChild(card);
    });

    // Re-initialize the carousel dots now that cards are replaced
    initReviewDots();
  }

  function initReviewDots() {
    const dots = document.getElementById('revDots');
    const cards = document.querySelectorAll('.rev-card');
    if (!dots || !cards.length) return;
    dots.innerHTML = '';
    cards.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 'rev-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', `Review ${i + 1}`);
      dot.addEventListener('click', () => {
        // reuse goTo from initReviews closure via dataset
        dot.dataset.idx = i;
        const event = new CustomEvent('revGoTo', { detail: i });
        document.dispatchEvent(event);
      });
      dots.appendChild(dot);
    });
  }

  function initGoogleRating() {
    // Check localStorage cache first (1 hour TTL)
    try {
      const cached = JSON.parse(localStorage.getItem('fj_rating') || 'null');
      if (cached && (Date.now() - cached.cachedAt) < 3_600_000) {
        // Apply cached score
        const rounded = Math.round(cached.rating * 10) / 10;
        const scoreLive = document.getElementById('revScoreLive');
        const countLive = document.getElementById('revCountLive');
        const starsDisp = document.getElementById('revStarsDisplay');
        const liveBadge = document.getElementById('revLiveBadge');

        if (scoreLive) scoreLive.textContent = rounded.toFixed(1);
        if (countLive) countLive.textContent = `· ${cached.count.toLocaleString()} Google Reviews`;
        if (starsDisp) {
          const pct = (cached.rating / 5) * 100;
          starsDisp.innerHTML = `<span class="rev-stars-partial" aria-label="${rounded} out of 5 stars">★★★★★<span class="rev-stars-fill" style="width:${pct}%">★★★★★</span></span>`;
        }
        if (liveBadge) liveBadge.style.display = 'inline-flex';

        // Also render cached review cards if available
        if (cached.reviews && cached.reviews.length > 0) {
          renderLiveReviews(cached.reviews);
        }
        return; // cache hit — skip API call
      }
    } catch (_) { /* localStorage blocked */ }

    // No valid cache — fetch live from API
    fetchGoogleRating();
  }

  /* ══ GEOLOCATION — AUTO-SET CITY ════════════════════════════
     Uses the browser Geolocation API (requires user permission).
     On approval: reverse-geocodes to a city name, then:
     - Updates the hero location pill
     - Shows a note near the map
     - Pre-fills the EventHawk booking form city field
     This mirrors how Walmart / Instacart auto-detect your location.
  ════════════════════════════════════════════════════════════ */
  const SERVICE_CITIES = [
    'Santa Barbara', 'Montecito', 'Carpinteria',
    'Goleta', 'Santa Ynez', 'Los Olivos', 'Buellton', 'Isla Vista'
  ];

  async function initGeolocation() {
    if (!navigator.geolocation) return;

    // Only request if user hasn't already denied
    const perm = await navigator.permissions?.query({ name: 'geolocation' }).catch(() => null);
    if (perm?.state === 'denied') return;

    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode using the free OpenStreetMap Nominatim API
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
            { headers: { 'Accept': 'application/json' } }
          );
          const data = await res.json();
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            null;

          if (city) {
            // Update hero location pill
            if (heroLocText) heroLocText.textContent = city + ', CA';

            // Check if it's a service area
            const inArea = SERVICE_CITIES.some(c => city.toLowerCase().includes(c.toLowerCase()));
            if (inArea && mapGeoNote && mapGeoText) {
              mapGeoNote.style.display = 'flex';
              mapGeoText.textContent =
                `Your location (${city}) was automatically detected — we deliver to your area!`;
            }

            // Store for booking form pre-fill
            sessionStorage.setItem('fj_city', city);
            sessionStorage.setItem('fj_lat', latitude);
            sessionStorage.setItem('fj_lng', longitude);
          }
        } catch (_) { /* Geocoding failed silently */ }
      },
      () => { /* User denied — do nothing */ },
      { timeout: 8000, maximumAge: 600000 }
    );
  }

  /* Pre-fill EventHawk booking form city on booking pages */
  function prefillBookingCity() {
    const city = sessionStorage.getItem('fj_city');
    if (!city) return;
    // Wait for EventHawk widget to render
    const tryFill = () => {
      const cityField =
        document.querySelector('[name="city"]') ||
        document.querySelector('[placeholder*="city" i]') ||
        document.querySelector('[placeholder*="City" i]');
      if (cityField && !cityField.value) {
        cityField.value = city;
        cityField.dispatchEvent(new Event('input', { bubbles: true }));
        cityField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };
    // Try immediately and after a short delay for async widgets
    tryFill();
    setTimeout(tryFill, 1500);
    setTimeout(tryFill, 3500);
  }

  /* ══ SMOOTH ANCHOR SCROLL ═══════════════════════════════════ */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(link => {
      link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (!target) return;
        e.preventDefault();
        const offset = (siteHeader?.offsetHeight ?? 0) + 16;
        window.scrollTo({
          top: target.getBoundingClientRect().top + window.scrollY - offset,
          behavior: 'smooth'
        });
      });
    });
  }

  /* ══ DARK MODE TOGGLE ═══════════════════════════════════════
     Theme is set early (before paint) by an inline snippet in
     <head> — see index.html / classic-bounce-houses.html. This
     just wires up the button so the user can flip it and persist
     the choice in localStorage. */
  function initThemeToggle() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const root = document.documentElement;

    const setPressed = () => {
      btn.setAttribute('aria-pressed', root.getAttribute('data-theme') === 'dark');
    };
    setPressed();

    btn.addEventListener('click', () => {
      const next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('fj-theme', next); } catch (e) { }
      setPressed();
    });
  }

  /* ══ ANNOUNCEMENTS BAR PAUSE ════════════════════════════════ */
  function initAnnBar() {
    const track = document.querySelector('.ann-track');
    if (!track) return;
    track.addEventListener('mouseenter', () => track.style.animationPlayState = 'paused');
    track.addEventListener('mouseleave', () => track.style.animationPlayState = 'running');
  }

  /* ══ UTIL ═══════════════════════════════════════════════════ */
  /* body { overflow: hidden } alone doesn't stop touch-drag scrolling on
     mobile Safari/Chrome — it only blocks mouse-wheel scroll on desktop.
     Pinning body with position:fixed (and restoring scroll position after)
     is what actually locks the background while a drawer/sidebar is open. */
  let lockedScrollY = 0;
  function lockBodyScroll() {
    lockedScrollY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.width = '100%';
  }
  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    document.body.style.width = '';
    window.scrollTo(0, lockedScrollY);
  }

  function debounce(fn, wait) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  }

  /* ══ PRODUCT MODAL ══════════════════════════════════════════ */
  function initProductModal() {
    const overlay = document.getElementById('prodModalOverlay');
    const closeBtn = document.getElementById('prodModalClose');
    if (!overlay) return;

    const mEmoji = document.getElementById('prodModalEmoji');
    const mTitle = document.getElementById('prodModalTitle');
    const mBadge = document.getElementById('prodModalBadge');
    const mDesc = document.getElementById('prodModalDesc');
    const mDims = document.getElementById('prodModalDims');
    const mArea = document.getElementById('prodModalArea');
    const mCap = document.getElementById('prodModalCap');
    const mPower = document.getElementById('prodModalPower');
    const mPrice = document.getElementById('prodModalPrice');
    const mCta = document.getElementById('prodModalCta');

    function openModal(data) {
      if (mEmoji) mEmoji.textContent = data.emoji || '🏰';
      if (mTitle) mTitle.textContent = data.title || '';
      
      if (mBadge) {
        if (data.badge) {
          mBadge.textContent = data.badge;
          mBadge.style.display = 'inline-block';
        } else {
          mBadge.style.display = 'none';
        }
      }

      if (mDesc) mDesc.textContent = data.desc || '';
      if (mDims) mDims.textContent = data.dims || 'N/A';
      if (mArea) mArea.textContent = data.area || 'N/A';
      if (mCap) mCap.textContent = data.cap || 'N/A';
      if (mPower) mPower.textContent = data.power || 'N/A';
      if (mPrice) mPrice.textContent = data.price || 'N/A';
      if (mCta) mCta.href = data.book || '#';

      overlay.classList.add('open');
      overlay.setAttribute('aria-hidden', 'false');
      lockBodyScroll();
    }

    function closeModal() {
      overlay.classList.remove('open');
      overlay.setAttribute('aria-hidden', 'true');
      unlockBodyScroll();
    }

    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('.js-open-modal');
      if (trigger) {
        e.preventDefault();
        openModal(trigger.dataset);
      }
    });

    closeBtn && closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) {
        closeModal();
      }
    });
  }

  /* ══ INIT ═══════════════════════════════════════════════════ */
  function init() {
    initPageTransitions();
    initHeader();
    initDropdowns();
    initMobileNav();
    initCart();
    initHeroCarousel();
    initReviews();
    initTrainGallery();
    initScrollAnim();
    initRentalTabs();       // tab switcher
    initProductModal();     // product modal
    initGoogleRating();
    initGeolocation();
    prefillBookingCity();
    initSmoothScroll();
    initAnnBar();
    initThemeToggle();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();