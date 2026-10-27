# Stripe Checkout

## Terrain-only map areas

Configuration version 6 explicitly selects `source: "gpx"` or `source: "area"`.
Versions 1-5 remain GPX configurations. Area configurations contain `area` with
`left`, `top`, `size`: a normalized Web Mercator square, north-up, with `left`
in [0,1), `top` >= 0 and `top + size` <= 1. The square may cross the antimeridian;
tile X wraps, while the stored footprint remains continuous. Approximate center
ground width must be 300 m through 150 km. No `margin` or GPX upload is allowed
for an area. GPX version 6 keeps the existing margin and attachment requirements.

The server validates the area independently and includes the precise configuration
in the submission digest. Areas use the existing configuration column; no
additional migration is required. Legacy NOT NULL `filename` and `gpx_key`
fields are empty for area orders, with no GPX object created. Source-aware upload,
notification and cleanup paths skip these fields. The workshop receives exactly
two attachments: preview PNG and `konfiguration.json`, with the complete area
and personalization. Readable coordinates appear in buyer and owner emails.
Workshop tools should use the stored Mercator square directly, without adding
route margin, rotating it or inventing a route.

The inquiry endpoint accepts a validated area configuration without a GPX and
sends the configuration JSON to the workshop without creating an order. The
frontend explicitly transfers a snapshot via "Zum Kontakt"; the form shows the
selected coordinates and supports removing the snapshot before adding GPX files.

Validate with `npm test`, `npm run build:pages`, `npm run test:browser`,
`npm run test:browser:area` and `npm run test:browser:strava`.
The area browser suite intercepts OSM/elevation requests and mocks checkout/contact:
no paid order or production email is created. Set `PM_SCREENSHOT_DIR` to an
existing session-artifact directory to capture desktop/mobile map and preview.
OSM standard tiles are best-effort; retain attribution and HTTP cache/referrer
requirements, never prefetch/bulk download, and assess provider capacity before
increasing production traffic. Map requests begin only after map mode is selected.

## Editing order confirmations

The branded HTML and plain-text email templates are in
`src/server/order-email.js`. Buyer emails show readable personalization and
shipping information; owner emails additionally show the GPX filename and Stripe
reference. Single-file orders retain the original three attachments; multi-file
orders additionally retain every source GPX alongside the combined GPX.
User-entered content is
HTML-escaped. Live confirmations include the shared purchase information from
`src/shared/purchase.js`; sandbox emails explicitly exclude manufacturing.
Update both formats together and run the checkout tests before deploying.
Already accepted emails are not resent by a template edit.

## Strava: Freigabe vor einer Integration

A personal OAuth/GPX-download prototype is retained as dormant source only.
It is disconnected from the browser and the Node development server; no Strava
controls, background requests or routes are enabled, even with credentials
present. Worker/Pages do not expose the prototype either. Downloaded API-derived
files are for personal prototype use, not a way to bypass the production gate.
Keep ordinary local GPX export and upload available. Do not enable public
OAuth, accept API-derived production files, or reuse ordinary order retention
rules for them until Strava has clarified the following in writing:

- May a connected athlete use their activity coordinates for a paid physical
  terrain relief, including generated GPX and terrain artifacts?
- May workshop staff access these files and receive production email attachments?
- What retention is permitted for order fulfilment, defect claims, backups and
  mailboxes, given API Policy section 6.2's seven-day cache restriction?
- How must deauthorisation, activity/account deletion and deletion requests affect
  pending manufacture and existing production copies?
- Which app review, athlete capacity, attribution and subscription requirements
  apply to this commercial workflow?

Proposed minimal flow for that review: explicit OAuth, one own activity per
relief, private activities opt-in, server-side tokens, expiring sessions,
paginated activity selection and only the chosen activity's coordinate streams.
No public-link scraping or request to unhide home locations. A generated GPX is
not an original export and does not remove Strava-derived-data obligations.
Any future release must carry trusted provenance into checkout and implement
the approved deletion lifecycle before accepting production orders.
See [API Policy](https://www.strava.com/legal/api_policy),
[API Agreement](https://www.strava.com/legal/api) and
[developer access limits](https://developers.strava.com/docs/rate-limits/).

## Multiple local GPX files

Apply `migrations/0003_gpx_collection.sql` to **both** test and live D1
databases before deploying the updated server. Apply earlier migrations first;
do not alter the configured live/test separation or enable payments for testing.
This task does not apply remote migrations or deploy.

Release preparation (from the repository root):

```powershell
npm test
npm run build:pages
npm run test:browser
npm run test:browser:strava
npx wrangler deploy --dry-run
```

After reviewing the release diff and explicitly authorizing deployment, apply
pending migrations in order to both databases, then deploy the primary Worker:

```powershell
npx wrangler d1 migrations list peakmemory-checkout-test --remote
npx wrangler d1 migrations list peakmemory-checkout-live --remote
npx wrangler d1 migrations apply peakmemory-checkout-test --remote
npx wrangler d1 migrations apply peakmemory-checkout-live --remote
npx wrangler deploy
```

Review pending `0002_whatsapp_alert.sql` as well as `0003_gpx_collection.sql`;
do not skip earlier migrations. Keep live/test bindings and payment flags
unchanged. Do not use a real payment as a deployment smoke test. After release,
verify the homepage, GPX multi-selection, absent Strava controls and live
`/shop-status` without creating an order. Git publishing is a separate step;
review already-staged unrelated changes before committing or pushing.

The existing singular `gpxFile` multipart field remains supported. The new
`gpxFiles` field may repeat up to ten times; mixing singular and plural fields
is rejected. Originals share a 5 MiB, 100,000-point and 100-segment budget.
Identical contents are rejected even under different filenames. The server
regenerates a bounded combined GPX from the validated originals, never trusting
a separately supplied combined file. Its size must also fit 5 MiB.

Single-file orders keep their original bytes and attachments. Multi-file orders
store the ordered original-file records in nullable `gpx_manifest`, and the
combined GPX at the existing `gpx_key`. Source R2 keys derive from the order ID
and source index, not a submitted path. The workshop receives all originals,
the combined GPX, preview PNG and configuration JSON (13 attachments for ten
originals). Original attachment names have stable numbered prefixes to avoid
collisions; the manifest retains source names/types/order. Submission hashes
cover every original, including names, types and ordering. Partial-write retries
and retention cleanup cover every source object as well as the combined GPX
and preview. Legacy orders with no manifest keep their previous behavior.

The contact endpoint accepts the same local-file collection and sends originals
plus combined GPX by email without creating an order. The configurator and
contact form deliberately have separate selections; files must be selected
again for an inquiry. Mailbox and workshop copies remain subject to the
operational retention duties below, not just automatic R2 cleanup.

Payment-return confirmations use a prominent green panel with a bold heading,
separate reference and test/live explanation. A redirect alone never shows success:
the panel appears only after authenticated order-status polling reports paid.

**Live checkout reactivation authorized by the owner on 2026-10-13.**
The deployment configuration enables new live orders and disables new sandbox
checkouts (`CHECKOUT_LIVE_ENABLED="true"`, `CHECKOUT_ENABLED="false"`).
The owner also authorized deployment of the current website changes.
Deployment `aaea90ee-8d0b-4e39-a5b2-7e167e04b285` was verified on the custom
domain and workers.dev: shop status reports enabled live mode, new sandbox
checkouts return 503, and unsigned live webhooks return 400. The browser shows
the genuine-order button. No real payment was initiated for verification.
The sandbox notes below describe the earlier temporary testing period.
Live checkout was previously enabled with owner authorization. This temporary
switch does not disable live webhook processing or paid-order notification
retries. Existing Stripe live sessions remain live and must not be used for tests.
The owner has created a Stripe sandbox and reports that rotated test API and
webhook secrets were uploaded through the Cloudflare secret prompt. Secret
values are never retrieved or stored in this repository.
The private D1 database `peakmemory-checkout-test` and R2 bucket
`peakmemory-checkout-test-files` are now bound in `wrangler.toml`, and the
order migration is applied remotely. Public r2.dev access is disabled.
The owner has provisioned separate live resources `peakmemory-checkout-live`
and `peakmemory-checkout-live-files`; their `CHECKOUT_LIVE_DB` and
`CHECKOUT_LIVE_FILES` bindings are configured locally. The owner reports
`0001_checkout.sql` successfully applied to the remote live database.
The live bucket's r2.dev URL is disabled and no public custom domains are attached.
Cloudflare lists both live Stripe secret names; their values and Stripe endpoint
association have not been verified. Deployment succeeded on 2026-10-12 after
Cloudflare API 504 responses. The live webhook rejects unsigned requests with
HTTP 400 without a browser challenge. A subsequent public
shop-status probe confirmed the current response including `"mode":"test"`;
the earlier response mismatch is no longer present.
The test payment flow has been exercised end to end; the public test checkout
was then switched off. Test payments do not constitute real orders or authorize
manufacturing. Live-mode support remains separately gated.

The website legal notices were factually updated on 2026-10-12 with the owner's
confirmed GbR identity and telephone contact. The owner reports no register
entry, VAT ID, or W-ID. The owner has acknowledged completion and approved the
disclosures; this is an owner acknowledgement, not independent legal certification.
The owner's operational responsibilities include:
* Confirm actual provider contracting entities, processing agreements,
  subprocessors, and applicable international-transfer safeguards.
* Define and implement log, mailbox/attachment, production-file, accounting,
  and remaining checkout-reference retention/deletion schedules. The automated
  7/90-day checkout cleanup does not delete those other copies.
* Confirm the shipping provider and any necessary additional disclosures.
* Determine consumer-dispute-resolution duties and participation policy;
  the owner has not yet confirmed these, so no declaration was invented.
* Maintain purchase/withdrawal disclosures and obtain appropriate business/legal
  review when the offer or processing changes.

Inter is now hosted locally with its SIL Open Font License, eliminating the
homepage's Google Fonts requests. The notices distinguish device-access rules
from GDPR processing and describe the actual checkout cleanup and its exceptions.
The owner subsequently acknowledged completion of the legal/provider/retention
checks and WAF protection, but inspection found missing purchase disclosures.
The owner subsequently approved the newly added purchase information and
explicitly authorized live activation. Contract
formation on successful Stripe payment confirmation was explicitly selected by
the owner. Shared purchase text is displayed before checkout and included in live
payment confirmation emails; the personalized-product withdrawal exception also
appears beside the selection confirmation and on Stripe's final payment step.
No consumer-dispute-resolution declaration is made without the owner's wording.
The legal/WAF acknowledgement flags remain `true`. The temporary test selects
`CHECKOUT_ENABLED="true"` and `CHECKOUT_LIVE_ENABLED="false"`.
A signed live Checkout Session delivery
and live order email acceptance have not yet been observed. Monitor the first
genuine order; do not use live cards to create dummy test transactions.
Deployment `89bdf29a-e4a3-423e-b307-896d9c86a243` was verified on the custom
domain and workers.dev: shop status reports enabled live mode, sandbox checkout
returns 503, and unsigned live webhooks return 400. The public browser displays
the genuine-order label, 50 EUR payment button, and purchase-disclosure link.
The subsequent temporary sandbox deployment
`659256d0-f131-4f90-a832-1f672cda60e7` was verified: shop status reports
`enabled:true`, `testMode:true`, `mode:"test"` and new live checkout returns 503.

The configured variants are engraved oak base **50 EUR** (`base`, default),
compact oak base without engraving **45 EUR** (`compact`) and white frame with
engraved white passepartout **60 EUR** (`frame`). Each relief is 10 × 10 cm;
bases are 11 × 13.5 × 2 cm / 11 × 11 × 2 cm; the frame exterior is 20 × 20 cm.
All prices include shipping, **Germany only**.
Both oak bases include four transparent protective feet. Optional `wallMount:true`
adds **1 EUR** (51 / 46 EUR totals); default is false. Frame does not accept this
option. Configuration v4 records it explicitly; older orders retain their original
prices and do not acquire paid hardware retroactively.
No VAT is charged/displayed under **§19 UStG (Kleinunternehmer)**. Delivery wording
is **5–10 working days after payment**. The captured preview is illustrative, not an exact
manufacturing template. Acceptance covers these terms and no additional manual
production approval after payment. Only a verified live payment may trigger
production-labelled email or internal WhatsApp alert. Sandbox payments never
send WhatsApp alerts or instruct actual production. WhatsApp is optional:
live checkout and order-confirmation emails work without WhatsApp configuration.

## Internal WhatsApp production alert

When all WhatsApp settings validate, after a verified live payment the system sends an approved Meta WhatsApp Cloud
API template to the configured business recipient. The alert contains only the
order reference, product name, and customer name, with a payment-confirmed /
start-production notice. It is not sent to the customer and contains no customer
phone number, shipping address, GPX file, or configuration. Email delivery and
WhatsApp acceptance are tracked independently; either channel can retry without
resending a channel already accepted by its provider. Meta API acceptance is not
a delivery receipt, and an ambiguous network timeout can result in a duplicate
message on retry.

Before enabling optional WhatsApp alerts:

1. Provision a WhatsApp Business Platform sender in Meta and create/approve a
   German utility template named `peak_memory_production_alert` with three body
   parameters. Suggested text:
   `Neue bezahlte Bestellung: {{1}}. Produkt: {{2}}. Kunde: {{3}}. Zahlung bestätigt – bitte Produktion starten.`
   If another template name or language is used, configure it explicitly.
2. Set the following production Worker secrets through Cloudflare/Wrangler,
   never in Git: `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`,
   `WHATSAPP_RECIPIENT` (E.164, e.g. `+49…`). Set
   `WHATSAPP_GRAPH_API_VERSION` to a currently supported version for the Meta app.
   Optional non-secret vars are `WHATSAPP_TEMPLATE_NAME` and
   `WHATSAPP_TEMPLATE_LANGUAGE` (defaults are `peak_memory_production_alert`
   and `de`).
3. Apply `migrations/0002_whatsapp_alert.sql` to both test and live D1 databases
   before deploying this code. The new migration defaults legacy rows to
   already-notified, preventing historical paid orders from generating alerts;
   new orders are marked pending for live notification.
4. Review and publish the updated privacy notice and confirm Meta's actual
   contracting entity, processing terms, and any required transfer safeguards.
   Without valid WhatsApp settings, alerts are skipped; live checkout, email
   delivery, and retention cleanup continue normally. Configured alerts retain
   their independent retry behavior.

Meta may retry an accepted-but-unrecorded message if the network or database
fails ambiguously. Check the WhatsApp conversation before manually starting
production when a notification retry or webhook error is reported.

## API contract

All responses are JSON with `Cache-Control: no-store` and `Referrer-Policy:
no-referrer`. No CORS access is enabled.

* `GET /shop-status` → `{ "enabled": false, "testMode": true, "mode": "test" }`
  while both modes are off, or the configured mode. No secrets are returned.
  If both modes are requested, checkout is disabled.
* `POST /checkout` starts **test mode**. `POST /checkout/live` selects the
  **separately gated live mode**. Both use the same validated `multipart/form-data`:
  * `name`: nonempty, ≤200 characters, no control characters;
  * `email`: valid address, ≤200 characters;
  * `gpxFile`: original `.gpx` bytes, nonempty, ≤5 MiB, valid bounded GPX
    (existing shared GPX validation), **or** repeated `gpxFiles` for 1–10
    originals under the aggregate limits described above; never both fields;
  * `configuration`: JSON, ≤4096 characters, `version:5`, `product:"base"|"compact"|"frame"`,
    `preview:"ready"`, validated `engraving`, `margin`, `elevationScale`;
    `wallMount` is a required boolean, false for frame.
    `compact` requires an empty engraving. Legacy `version:2`, `product:"base"`
    is still accepted for existing clients and stored orders.
    Frame configurations through version 4 retain their 55 EUR price; version 5 uses 60 EUR.
    Version 3 remains compatible without wall mount; older versions cannot
    include a `wallMount` field.
  * `previewImage`: required PNG, ≤1 MiB, nonzero dimensions ≤2048×2048,
    supported IHDR format, complete bounded chunks with verified CRCs/IDAT/IEND;
  * `submissionKey`: randomly generated UUID v4, retained for all retries of
    this exact selection, files and buyer details;
  * `acceptance`: the literal string `"true"` (multipart representation of an
    explicit boolean; `"false"`, `"1"` and missing values are rejected).
  * Optional `price`/`currency` are ignored for pricing, but included in payload
    identity. No other fields or duplicate fields (except `gpxFiles`) are accepted.
  → `{ "orderId":"<uuid>", "url":"https://checkout.stripe.com/…",
  "statusUrl":"https://<configured-origin>/order-status?order=<uuid>&token=<secret>" }`.
  Stripe receives a server-defined 5000/4500/6000-cent EUR line item (plus 100 cents
  for the explicitly chosen wood wall mount) based on the
  validated variant (never the supplied price), zero shipping, DE-only shipping
  collection, hosted UI and `submit_type=pay`. Original GPX files, combined GPX
  for collections, PNG and validated
  configuration are durably persisted **before** the Stripe call.
* `GET /order-status?mode=test|live&order=<uuid>&token=<64-hex-secret>` →
  `{ "orderId":"<uuid>", "status":"pending|paid|failed|expired" }`.
  No buyer details, attachments, token, session URL or public order listing.
  Bad/missing tokens and absent orders return the same 404.
* `POST /stripe-webhook` is test-only. `POST /stripe-webhook/live` is the
  separately authenticated live endpoint. Both accept raw bodies ≤256 KiB and
  perform WebCrypto HMAC verification
  using the exact original bytes and a ±300-second timestamp tolerance. Supports
  multiple `v1` signatures for secret rotation. Only mode-matched events
  (`livemode:false` for test, `true` for live) and `cs_test_…` or `cs_live_…`
  sessions can affect state.
  Handles `checkout.session.completed`, `.async_payment_succeeded`,
  `.async_payment_failed`, `.expired`. Other verified mode-matched event types
  are acknowledged without payment changes.

Successful payment requires a matching durable order and session association,
the exact server-defined amount for its stored variant, zero tax/shipping,
`payment_status:"paid"` and a complete German
shipping address. Completion with unpaid status stays pending. Paid cannot be
downgraded by later failure/expiry. Redirects **never** prove payment:

```
https://<configured-origin>/?checkout=success&order=<uuid>&token=<secret>
https://<configured-origin>/?checkout=cancelled
```

Return URLs use only `CHECKOUT_ORIGIN`, never an incoming Host header. If an
Origin header is present on checkout, it must exactly match that trusted origin.
It must be an HTTPS origin without credentials, port, path, query or fragment.

Errors use 400 (validation/signature/test-mode violations), 403 (origin), 404
(status access), 405 (method), 409 (changed idempotent payload or stale recovery),
410 (retained but purged submission), 413 (size), 429 (rate limit), 502 (unconfirmed
provider response) or 503 (disabled/missing configuration/transient failure).
On network/503/502 failures, retry the **same request and submission key**, not a
new payment.

## Enable only after provisioning actual resources

1. Use a **distinct Stripe sandbox** for this integration, isolated from live
   settings/data. Prefer a least-privilege `rk_test_…` restricted key with Checkout
   Session creation access; `sk_test_…` is also accepted. Never use publishable
   keys, `sk_live_…` or `rk_live_…`. Rotate any key pasted into chat; do not save or
   use exposed credentials. Supply replacements only through secret management.
2. The test environment already uses a private D1 database and R2 bucket.
   For live, create a **separate** private D1 database and private R2 bucket.
   Do not enable an R2 public URL, custom public domain, asset binding or public
   listing. Orders/GPX/PNG are not build assets.
3. The test bindings are already configured. Add these **opt-in live** bindings
   only after provisioning, substituting actual names and the actual database UUID:

   ```toml
   [[d1_databases]]
   binding = "CHECKOUT_LIVE_DB"
   database_name = "<actual-live-database-name>"
   database_id = "<actual-account-database-uuid>"
   migrations_dir = "migrations"

   [[r2_buckets]]
   binding = "CHECKOUT_LIVE_FILES"
   bucket_name = "<actual-live-private-bucket-name>"
   ```

   Apply `migrations/0001_checkout.sql` and then
   `migrations/0002_whatsapp_alert.sql` and `migrations/0003_gpx_collection.sql`
   to the live database. Never point the
   live binding at the test database.
4. The current configuration temporarily selects sandbox mode:
   `CHECKOUT_ENABLED="true"` and `CHECKOUT_LIVE_ENABLED="false"`, retaining the
   owner's legal/WAF acknowledgements for later live restoration.
   For a new environment, keep both modes disabled until setup and access-control
   checks pass. Set `CHECKOUT_ORIGIN="https://peak-memory.de"`.
   Install **secrets** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (`whsec_…`)
   `RESEND_API_KEY` with Wrangler/Cloudflare secret management, never in Git.
   WhatsApp credentials, sender ID, and Graph API version are optional; see the
   setup above when enabling internal alerts.
   Existing email addresses are reused:
   `kontakt@peak-memory.de` → owner `peak.memory@web.de`. Buyer confirmation is
   sent to the submitted email. Verify the Resend sending domain and use
   controlled buyer inboxes: **Resend sends real emails even for Stripe tests**.
5. The existing test webhook endpoint is pinned by Stripe to
   **`2026-08-26.dahlia`**. The application separately pins Checkout Session API
   requests to **`2026-09-30.endive`**; request and endpoint event versions are
   intentionally different and independently validated. The configured endpoint
   subscribes to the four Checkout Session events above. A newly created endpoint
   must also use `2026-08-26.dahlia`, or update `STRIPE_WEBHOOK_API_VERSION` and
   run the schema tests to match its pinned version.
   The `collected_information.shipping_details` schema was introduced in Basil
   and remains in use for the existing Dahlia event version; the removed
   top-level `shipping_details` is rejected. See Stripe's authoritative
   [Basil shipping-field change](https://docs.stripe.com/changelog/basil/2025-03-31/checkout-session-remove-shipping-details),
   [webhook versioning guide](https://docs.stripe.com/webhooks/versioning)
   and [versioned Session creation reference](https://docs.stripe.com/api/checkout/sessions/create?api-version=2026-09-30.endive).
   The pinned Endive UI value is `hosted_page`, per the
   [Dahlia UI rename](https://docs.stripe.com/changelog/dahlia/2026-03-25/updates-available-checkout-session-ui-modes).
   Dynamic payment methods remain enabled: no `payment_method_types` allowlist
   is sent. Adaptive pricing is explicitly disabled to preserve fixed EUR.
   Each persisted session request includes `integration_identifier` with eight
   random letters; retries reuse that exact value. Do not upgrade either
   request or webhook versions independently.
   Ensure the webhook secret belongs to that exact test endpoint. For live,
   create a distinct live-mode endpoint at
   `https://peak-memory.de/stripe-webhook/live`, pin it to
   `2026-08-26.dahlia`, subscribe to the same four Checkout Session events, and
   store its signing secret as `STRIPE_LIVE_WEBHOOK_SECRET`. Never reuse the
   sandbox signing secret. Keep old paid orders processable when disabling new checkout:
   the switch gates creation, not authenticated webhooks or notification retry.
6. **Cloudflare WAF/rate protection is mandatory before enabling.** Protect
   `/checkout` and `/order-status` against abusive request rates/bodies; do not
   put browser challenges on Stripe's webhook. Limit webhook abuse without
   blocking legitimate Stripe retries. Optionally bind
   `CHECKOUT_RATE_LIMITER` (Cloudflare Rate Limiting binding) for server-side
   checkout/status limiting; configured limiter outages fail closed.
   A suitable low-volume opt-in Worker binding is:

   ```toml
   [[ratelimits]]
   name = "CHECKOUT_RATE_LIMITER"
   namespace_id = "<distinct-account-rate-limit-namespace-id>"
   simple = { limit = 30, period = 60 }
   ```

   Checkout and status share the per-IP bucket; allow the frontend's bounded
   payment polling. Choose a real distinct namespace ID when configuring this
   binding. This application limiter supplements, not replaces, the mandatory WAF.
7. Restrict database/bucket/dashboard access; redact request queries from
   access/analytics logs. Status tokens are bearer secrets, appear in Stripe
   return URLs and must not be copied into public logs or analytics.
8. Live mode uses independent `CHECKOUT_LIVE_DB`, `CHECKOUT_LIVE_FILES`,
   `STRIPE_LIVE_SECRET_KEY`, and `STRIPE_LIVE_WEBHOOK_SECRET` resources. Provision
   those only in live Stripe/Cloudflare environments; never reuse sandbox
   credentials, database, bucket, or webhook secret. Configure a separate live
   endpoint at `/stripe-webhook/live` and verify it with a real signed live
   delivery before any sale. Do not create test transactions with live cards.
9. Before accepting any live order, have the responsible business/legal advisor
   review and approve the actual Impressum, privacy disclosures, terms and
   cancellation/withdrawal information for individually manufactured products,
   §19 UStG wording, delivery promise, and legally compliant final checkout
   button/mandatory disclosures. Update the site disclosures first, then set
   `CHECKOUT_LIVE_LEGAL_REVIEWED="true"` only after that review is complete.
   This software does not determine or warrant German legal compliance.
   Set `CHECKOUT_LIVE_WAF_REVIEWED="true"` only after verifying that live WAF
   protection covers `/checkout/live` and `/order-status`, and allows signed
   Stripe requests to `/stripe-webhook/live` without browser challenges.
10. Configure and verify live-mode WAF protections and challenge exemptions;
    ensure checkout/live rate protection works. Keep both checkout switches off
    until all legal, fulfillment, live-key, live-storage, live-webhook, notification,
    backup, and monitoring checks are complete. Controlled live activation then
    requires explicitly setting `CHECKOUT_LIVE_ENABLED="true"`; test mode must
    remain off. There is no one-click deployment switch to production.

For local preview without bindings, existing Worker asset/contact/terrain routing
still works; shop status stays disabled and checkout fails gracefully. Tests need
a recent Node 22 release supporting built-in `node:sqlite` (22.13+ recommended):

```
node --test tests/checkout.test.js tests/backend.test.js
```

These tests use an in-memory real SQLite schema, private mocked R2 and mocked
Stripe/Resend. They make no payments, send no email and call no real APIs.

## Worker and Pages deployment

`worker.js` wires all four routes and an every-15-minutes scheduled maintenance
handler; the active cron is harmless without bindings. Existing Pages Functions
also wire all four routes. Pages deployment must configure the same D1/R2
bindings/secrets in the Pages project (or its opt-in deployment config), and
apply the migration to the correct bound database. The existing Pages staging
script copies these handlers/helpers.

**Pages does not run Worker cron triggers.** For a Pages-only deployment, provision
a separately scheduled Worker using this `worker.js`, bound to the **same**
database/bucket/secrets. Disable new checkout on that maintenance Worker; enable
it temporarily only if session-creation recovery is required. Scheduled
notification retry and cleanup work with new checkout disabled. Do not enable
Pages checkout without this scheduled maintenance path.

## Durability, retries and retention

* The submission UUID binds to a SHA-256 digest over exact original file bytes
  and submitted field values (not multipart boundary noise). A differing
  payload returns 409; identical retries reuse the same order/session.
* Random UUID order IDs and independent 256-bit status tokens are generated on
  the server. R2 keys use the order UUID, never user filenames.
* Database leases serialize creation, delivery and cleanup. D1 transactional
  batches commit webhook event receipts and payment transitions together.
  Duplicate/concurrent events cannot cause a second logical payment.
* Stripe's idempotency key is permanently derived from the order UUID and the
  exact Stripe request parameters are snapshotted in D1 before its first call. An
  ambiguous timeout leaves persisted state/snapshots intact. The same exact
  Stripe request can recover for up to 23 hours; creation is refused afterwards
  to avoid a second session once Stripe's ≥24-hour idempotency cache expires.
  Sessions expire within 24 hours. If the session response was lost, a verified
  webhook can associate it using the matching server-generated order metadata.
  Older ambiguous orders require operator reconciliation in the **test**
  dashboard, not a new payment/submission key.
* Verified paid owner mail includes original GPX, PNG and configuration JSON,
  buyer details, German shipping address and the offer/acceptance details.
  Buyer mail confirms test payment. Each has its own stable Resend idempotency
  key. Delivery flags are set only after a successful response with an email ID.
  A Resend or storage error returns a retryable non-2xx webhook response while
  preserving paid state. Scheduled retry also resumes unsent messages.
  Monitor failed retries; Resend delivery is acceptance by its API, not proof
  of inbox delivery. Its provider idempotency retention is finite (24 hours),
  so a lost response followed by a retry after that window can produce a
  duplicate notification; do not interpret this as another payment.
* Scheduled sweeps process bounded batches of 25. Unpaid snapshots are purged
  after **7 days**; successfully notified paid snapshots after **90 days**.
  Cleanup claims orders before deleting R2 and retries partial deletion; it
  never races an active creation/delivery lease or resurrects deleting orders.
  Paid orders with undelivered notifications are deliberately retained for
  recovery rather than silently losing original attachments. Monitor/escalate
  these exceptions and resolve them within the 90-day retention policy.
  Minimal non-contact idempotency tombstones remain so purging does not free
  an old submission UUID for reuse. Purged tokens, buyer PII and configuration
  are removed and events deleted. There is no public retrieval route for R2.

Timeouts cover streamed bodies, external requests and storage/database operations.
Failures never delete a just-created order or interpret a provider timeout as
payment failure. The backend logs only generic failure messages, without secret
tokens, original payloads or provider responses.
