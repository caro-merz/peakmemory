# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary:** endurance athletes (trail runners, marathon and ultra finishers, mountain bikers, hikers) who have finished one specific route and want to keep it as a physical object at home.
- **Gift buyers:** partners, friends and family who want a personal gift for one of those athletes. They often have to get the GPX file from the athlete first.
- **Secondary:** event organizers (marathons, bike races, trade fairs) who order series of five or more pieces as finisher rewards, trophies or gifts, optionally with the organizer's logo on the base.

## Product Purpose
Peak Memory turns a GPX route into a handmade 3D terrain relief with the route marked in red. The website lets visitors upload their own GPX file (or try a sample route), see their own landscape in an interactive 3D preview, choose a product variant, personalize the engraving, and then either buy directly via Stripe (when enabled) or send a non-binding inquiry. Success means a visitor goes from "that's nice" to "that's *my* route" and then orders.

## Positioning
Your own route in your own landscape, previewed live in 3D before you order, and made by hand by two athletes from Baden-Württemberg. It is not a generic mountain print or a poster.

## Operating Context
- GPX export from Komoot, Strava and Garmin Connect (explained on `gpx-hilfe.html`).
- Etsy shop as an alternative ordering channel. Instagram (`@peak.memory`) for workshop impressions.
- In person at race expos (Bike Marathon Albstadt, Allgäu Panorama Marathon).

## Capabilities and Constraints
- Products: oak base with engraving (11 × 13.5 × 2 cm, 50 EUR), compact oak base without engraving (11 × 11 × 2 cm, 45 EUR), white frame with engraved white passe-partout (20 × 20 cm, 60 EUR). The relief is 10 × 10 cm in every variant. Optional wall mount on wooden bases (+1 EUR). Prices include shipping within Germany. No VAT shown per §19 UStG. Delivery takes 5–10 working days after confirmed payment.
- Engraving: up to 3 lines on wood, up to 2 lines on the passe-partout, 120 characters in total. Engraving font is Quicksand Book.
- Vertical exaggeration from 1× to 8×. Adjustable terrain margin.
- The online preview is illustrative only. It is not a print-ready file or an exact image of the finished piece.
- Direct checkout via Stripe is gated (test or live mode). The non-binding inquiry stays available as a fallback. Custom formats and event series of 5+ are available on request.
- Static HTML with Cloudflare endpoints. Fonts are self-hosted, with no third-party font requests. The homepage and legal texts must stay readable without JavaScript.

## Brand Commitments
- Name: Peak Memory. The existing logo (mountain mark and "PEAK MEMORY" wordmark) stays.
- Forest green (`#2D5016`) stays as the brand colour anchor.
- Voice: German, informal "du", warm, factual. No pressure tactics or invented urgency.

## Evidence on Hand
- Real product photography in `images/`: hero piece in lavender (`main.jpeg`), base variants (`custom`, `compact`, `classic`), frame (`rahmen`, `rahmen2`), XXL custom formats (`XXL_Fuji`, `XXL_E5`), workshop impressions (`insights*`), event recaps (`ABM*`, `APM*`) and founder portraits (`caro_new`, `alex_new`).
- Real events: Bike Marathon Albstadt (10–11 July 2025, sponsored trophies) and Allgäu Panorama Marathon (8–9 August 2025).
- **Absent, so never fabricate:** customer testimonials, review counts, star ratings, sales figures and press mentions.

## Product Principles
1. The visitor's own route is the hero. Get them to their landscape as fast as possible.
2. Show the real object honestly. Photos are real, and the preview is labelled illustrative.
3. Handmade and personal over slick and corporate.
4. Be transparent about price, delivery and checkout status.

## Accessibility & Inclusion
- Visible labels, keyboard operability and focus restoration in dialogs.
- Honor `prefers-reduced-motion`: no auto-scrolling, no smooth scroll, no animations.
- Usable without JavaScript for content and legal pages.
