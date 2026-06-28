# Fiesta Jumps Website Redesign

## WordPress + EventHawk + GHL Integration Guide

---


  <!-- const GOOGLE_PLACES_API_KEY = 'ID...'; // ← paste your key here e.g. 'AIzaSy...'
  const GOOGLE_PLACE_ID = 'ID....'; // ← confirm your Place ID -->

## FILE STRUCTURE

```text
fiesta-jumps-theme/
├── style.css               ← Main stylesheet (all tokens, components)
├── main.js                 ← All JS: transitions, dropdown, carousel, cart
├── index.html              ← Homepage template
├── bounce-house-rentals.html ← Category page (replicate for all categories)
├── INTEGRATION.md          ← This file
└── assets/
    ├── fonts/              ← Self-host Nunito + Poppins for performance
    └── icons/              ← Favicon, logo assets
```

---

## WORDPRESS IMPLEMENTATION

### 1. Theme Setup (Elementor or Block Theme)

Convert to a WordPress theme with this PHP structure:

```text
wp-content/themes/fiesta-jumps/
├── style.css           ← WordPress theme header + base styles
├── functions.php       ← Enqueue scripts/styles
├── header.php          ← Site header HTML (nav, announcement bar)
├── footer.php          ← Site footer HTML
├── index.php           ← Homepage template
├── page.php            ← Generic page template
├── taxonomy.php        ← Category listing page
├── single-product.php  ← Single rental item page
├── js/
│   └── main.js
└── assets/
```

### 2. functions.php — Enqueue Assets

```php
<?php
function fj_enqueue_assets() {
    wp_enqueue_style(
        'fj-fonts',
        'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Poppins:wght@400;500;600;700;800&display=swap',
        [],
        null
    );
    wp_enqueue_style(
        'fj-main',
        get_template_directory_uri() . '/style.css',
        ['fj-fonts'],
        '2.0.0'
    );
    wp_enqueue_script(
        'fj-main',
        get_template_directory_uri() . '/js/main.js',
        [],
        '2.0.0',
        true  // Load in footer
    );
}
add_action('wp_enqueue_scripts', 'fj_enqueue_assets');
```

### 3. header.php Structure

```php
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
  <meta charset="<?php bloginfo('charset'); ?>">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <?php wp_head(); ?>
</head>
<body <?php body_class('page-transition-ready'); ?>>

<div class="page-transition-overlay" id="pageTransition"></div>

<!-- Announcement Bar -->
<div class="announcement-bar">
  <div class="announcement-track">
    <!-- Marquee items here — can be dynamic from ACF/Options Page -->
    <?php
    $announcements = get_field('announcements', 'options');
    if ($announcements) {
        foreach ($announcements as $a) {
            echo '<span class="announcement-item">' . esc_html($a['text']) . '</span>';
            echo '<span class="announcement-sep">·</span>';
        }
        // Duplicate for seamless scroll
        foreach ($announcements as $a) {
            echo '<span class="announcement-item">' . esc_html($a['text']) . '</span>';
            echo '<span class="announcement-sep">·</span>';
        }
    }
    ?>
  </div>
</div>

<!-- Site Header -->
<header class="site-header" id="siteHeader">
  <!-- ... full header HTML from index.html ... -->
</header>
```

### 4. Breadcrumbs (PHP — Yoast or Custom)

```php
<!-- Using Yoast SEO breadcrumbs -->
<?php if (function_exists('yoast_breadcrumb')) : ?>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <?php yoast_breadcrumb('<span class="breadcrumb-inner">', '</span>'); ?>
  </nav>
<?php endif; ?>

<!-- OR Custom breadcrumbs: -->
<?php
function fj_breadcrumbs() {
    echo '<nav class="breadcrumbs" aria-label="Breadcrumb">';
    echo '<span class="breadcrumb-item"><a href="' . home_url() . '" class="nav-link">Home</a></span>';
    echo '<span class="breadcrumb-sep" aria-hidden="true">›</span>';
    
    if (is_category() || is_tax()) {
        $term = get_queried_object();
        if ($term->parent) {
            $parent = get_term($term->parent, $term->taxonomy);
            echo '<span class="breadcrumb-item"><a href="' . get_term_link($parent) . '">' . $parent->name . '</a></span>';
            echo '<span class="breadcrumb-sep">›</span>';
        }
        echo '<span class="breadcrumb-item current">' . $term->name . '</span>';
    } elseif (is_singular()) {
        $terms = get_the_terms(get_the_ID(), 'product_cat');
        if ($terms) {
            $term = $terms[0];
            echo '<span class="breadcrumb-item"><a href="' . get_term_link($term) . '">' . $term->name . '</a></span>';
            echo '<span class="breadcrumb-sep">›</span>';
        }
        echo '<span class="breadcrumb-item current">' . get_the_title() . '</span>';
    }
    echo '</nav>';
}
```

---

## EVENTHAWK INTEGRATION

### Cart & Booking Widget

EventHawk provides its own booking/cart widget. Integrate it like this:

```html
<!-- Replace the static "Book Now" links with EventHawk booking trigger -->
<a href="#" class="btn btn--primary nav-link" onclick="EventHawk.openBooking(); return false;">
  Book Now
</a>

<!-- EventHawk Set Event Date button -->
<a href="#" class="btn btn--primary" onclick="EventHawk.setEventDate(); return false;">
  Set Event Date
</a>

<!-- EventHawk cart integration -->
<button class="cart-btn" onclick="EventHawk.openCart(); return false;" id="cartBtn">
  <!-- Cart icon SVG -->
  <span class="cart-count" id="cartCount">0</span>
</button>

<!-- EventHawk will update cart count via their JS API -->
<script>
  // Listen for EventHawk cart updates
  window.addEventListener('eventhawk:cartUpdated', function(e) {
    const count = e.detail.itemCount || 0;
    const el = document.getElementById('cartCount');
    if (el) {
      el.textContent = count;
      el.style.display = count > 0 ? 'flex' : 'none';
    }
  });
</script>
```

### "Get Quote" Buttons

```html
<!-- Each product's Get Quote button triggers EventHawk -->
<a href="#" class="btn btn--primary btn--sm" 
   onclick="EventHawk.addToCart('<?php echo $product_id; ?>'); return false;">
  Get Quote
</a>
```

---

## GHL (GoHighLevel) INTEGRATION

### Contact Form

```html
<!-- Replace the static contact form with GHL embed -->
<div id="ghl-contact-form">
  <!-- GHL form embed code goes here -->
  <!-- Example: -->
  <script src="https://link.msgsndr.com/js/form_embed.js" type="text/javascript"></script>
  <iframe
    src="https://api.leadconnectorhq.com/widget/form/YOUR_FORM_ID"
    style="width:100%;height:auto;border:none;border-radius:12px;"
    id="inline-YOUR_FORM_ID"
    data-layout="{'id':'LAYOUT_ID'}"
    data-trigger-type="alwaysShow"
    data-activate-on-load="true"
    data-deactivate-on-body-click="false"
    data-form-name="Contact Form"
    data-height="480"
    data-layout-iframe-id="inline-YOUR_FORM_ID"
    data-form-id="YOUR_FORM_ID"
    title="Contact Form">
  </iframe>
</div>
```

### SMS / Chat Widget

```html
<!-- GHL chat widget — paste before </body> -->
<script>
  window.GHL_CHAT_CONFIG = {
    locationId: 'YOUR_LOCATION_ID',
    // Customize to match brand colors
    primaryColor: '#FF6B00',
    accentColor: '#FFD700',
  };
</script>
<script src="https://widgets.leadconnectorhq.com/chat/index.js" async defer></script>
```

---

## DISCOUNT BAR — DYNAMIC DATA (WordPress Options)

Instead of hardcoding the announcement bar items, manage them via ACF Options Page:

```php
// In functions.php
if (function_exists('acf_add_options_page')) {
    acf_add_options_page([
        'page_title' => 'Fiesta Jumps Settings',
        'menu_title' => 'FJ Settings',
        'menu_slug'  => 'fj-settings',
    ]);
}
// Then register an 'announcements' repeater field
// with subfields: icon (emoji), text, link (optional)
```

---

## PERFORMANCE CHECKLIST

| Task | Status |
|------|--------|
| Self-host Nunito + Poppins fonts | ☐ |
| Enable WordPress caching (WP Rocket / W3TC) | ☐ |
| Minify CSS + JS | ☐ |
| Lazy load all rental product images | ☐ |
| WebP format for all images | ☐ |
| Preload critical fonts + LCP image | ☐ |
| Set `rel="preconnect"` for Google Fonts | ✅ |
| Remove unused Elementor bloat | ☐ |
| CDN (Cloudflare or BunnyCDN) | ☐ |
| Core Web Vitals — LCP < 2.5s, CLS < 0.1 | ☐ |

---

## PAGE LIST — PAGES TO CREATE

### Main Pages

- `/` — Homepage (index.html)
- `/about-us/` — About
- `/contact/` — Contact + GHL Form
- `/service-area/` — Service area with map
- `/coupons/` — Discounts page
- `/book-now/` — EventHawk booking page

### Rental Categories

- `/bounce-house-rentals/` ← (bounce-house-rentals.html)
- `/water-slides-rentals/`
- `/obstacle-course-rentals/`
- `/combo-bounce-house-rentals/`
- `/concessions-machine/`
- `/foam-cannon-rentals/`
- `/dry-slide-rentals/`
- `/interactive-game-rentals/`
- `/photo-booth-rental/`
- `/sb-trackless-train/`
- `/tent-rentals/`
- `/tables-chairs-linen/`
- `/generators/`
- `/fully-staffed-attendants/`
- `/bundle-deals/`

### City/Area Pages (Local SEO)

- `/montecito/`
- `/goleta/`
- `/carpinteria/`
- `/santa-ynez/`
- `/los-olivos/`
- `/buellton/`
- `/isla-vista/`

---

## COLOR REFERENCE (Match Logo)

```css
--fj-yellow:  #FFD700;  /* Logo gold/yellow */
--fj-orange:  #FF6B00;  /* Primary CTA, accents */
--fj-blue:    #1A56DB;  /* Trust, links, nav */
--fj-ink:     #1A1A2E;  /* Body text, dark bg */
```

These are pulled from the Fiesta Jumps logo and applied consistently
throughout all typography, CTAs, and UI components.
