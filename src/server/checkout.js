import {
  CheckoutError, UUID, json, guarded, configured, trustedOrigin, validateCheckout, remote, verifyEvent, base64, modeEnvironment,
} from './checkout-helpers.js';
import { getProduct, configurationPrice } from '../shared/product.js';
import { parseConfiguration } from '../shared/configuration.js';
import { orderEmail } from './order-email.js';

const orderProduct = order => getProduct(parseConfiguration(order.configuration).product);
const orderAmount = order => configurationPrice(parseConfiguration(order.configuration)) * 100;
const attachmentName = name => name.replace(/[\u0000-\u001f\u007f/\\]/g, '_').slice(0, 200);
const originalArtifacts = order => order.gpx_manifest ? JSON.parse(order.gpx_manifest) : [];
export const STRIPE_API_VERSION = '2026-09-30.endive';
export const STRIPE_WEBHOOK_API_VERSION = '2026-08-26.dahlia';
export const STRIPE_LIVE_WEBHOOK_API_VERSION = '2026-08-26.dahlia';
const now = () => Math.floor(Date.now() / 1000);
const statement = (env, sql, ...values) => env.CHECKOUT_DB.prepare(sql).bind(...values);
const run = (env, sql, ...values) => guarded(() => statement(env, sql, ...values).run());
const first = (env, sql, ...values) => guarded(() => statement(env, sql, ...values).first());
const changed = result => result.meta?.changes === 1;
const ready = env => {
  if (!configured(env)) throw new CheckoutError('Checkout ist nicht sicher konfiguriert.', 503);
};
const result = (order, mode) => ({
  orderId: order.id, url: order.session_url,
  statusUrl: `${order.origin}/order-status?mode=${mode}&order=${order.id}&token=${order.status_token}`,
});
function token() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
}
async function rateLimit(request, env) {
  if (!env.CHECKOUT_RATE_LIMITER) return;
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const response = await guarded(() => env.CHECKOUT_RATE_LIMITER.limit({ key: `checkout:${ip}` }));
  if (!response.success) throw new CheckoutError('Zu viele Anfragen.', 429);
}
async function endpoint(operation) {
  try { return await operation(); }
  catch (error) {
    if (!(error instanceof CheckoutError) && !(error instanceof SyntaxError) && !(error instanceof TypeError)) {
      console.error('Checkout operation failed'); // Never log payloads, credentials, status tokens or provider responses.
    }
    return json({ error: error instanceof CheckoutError ? error.message : 'Anfrage konnte nicht verarbeitet werden.' },
      error instanceof CheckoutError ? error.status : 503);
  }
}
export function handleShopStatus(request, env) {
  if (request.method !== 'GET') return Promise.resolve(json({ error: 'Methode nicht erlaubt.' }, 405, { Allow: 'GET' }));
  const testing = modeEnvironment(env, 'test'), live = modeEnvironment(env, 'live');
  const testEnabled = testing.CHECKOUT_ENABLED === 'true' && configured(testing);
  const liveEnabled = live.CHECKOUT_ENABLED === 'true' && configured(live) && whatsappReady(live);
  if (testEnabled && liveEnabled) return Promise.resolve(json({ enabled: false, testMode: true, mode: 'test' }));
  if (live.CHECKOUT_ENABLED === 'true') {
    return Promise.resolve(json({ enabled: liveEnabled, testMode: false, mode: 'live' }));
  }
  return Promise.resolve(json({ enabled: testEnabled, testMode: true, mode: 'test' }));
}
function parameters(order) {
  const live = order.mode === 'live';
  const product = orderProduct(order);
  const configuration = parseConfiguration(order.configuration);
  const hardware = product.id !== 'frame' && configuration.version >= 4
    ? ` Wandaufhängung: ${configuration.wallMount ? 'ja (+1 EUR)' : 'nein'}. Vier transparente Schutzfüße inklusive.` : '';
  const suffix = Array.from(crypto.getRandomValues(new Uint8Array(8)), value => String.fromCharCode(97 + value % 26)).join('');
  return new URLSearchParams({
    mode: 'payment', submit_type: 'pay', ui_mode: 'hosted_page', customer_email: order.email,
    integration_identifier: `peakmemory_${order.mode}_${suffix}`,
    'adaptive_pricing[enabled]': 'false',
    client_reference_id: order.id, 'metadata[order_id]': order.id,
    [`metadata[${live ? 'live_order' : 'test_only'}]`]: 'true',
    success_url: `${order.origin}/?checkout=success&mode=${order.mode}&order=${order.id}&token=${order.status_token}`,
    cancel_url: `${order.origin}/?checkout=cancelled`,
    expires_at: String(order.created_at + 86400),
    'line_items[0][quantity]': '1', 'line_items[0][price_data][currency]': 'eur',
    'line_items[0][price_data][unit_amount]': String(orderAmount(order)),
    'line_items[0][price_data][product_data][name]': `Peak Memory · ${product.name}${live ? '' : ' (TEST)'}`,
    'line_items[0][price_data][product_data][description]': `${product.description} ${product.dimensions}.${hardware} ${orderAmount(order) / 100} EUR inkl. Versand Deutschland. Kein Umsatzsteuerausweis gemäß §19 UStG. Lieferung 5–10 Werktage nach Zahlung. Illustrative Vorschau; keine weitere Produktionsfreigabe.${live ? '' : ' TEST: keine echte Fertigung.'}`,
    'shipping_address_collection[allowed_countries][0]': 'DE',
    'shipping_options[0][shipping_rate_data][type]': 'fixed_amount',
    'shipping_options[0][shipping_rate_data][fixed_amount][amount]': '0',
    'shipping_options[0][shipping_rate_data][fixed_amount][currency]': 'eur',
    'shipping_options[0][shipping_rate_data][display_name]': 'Versand Deutschland inklusive',
    'custom_text[submit][message]': live
      ? 'Individuell nach deiner GPX-Route gefertigt: kein gesetzliches Widerrufsrecht (§ 312g Abs. 2 Nr. 1 BGB). Mängelrechte bleiben bestehen. Vertragsschluss bei erfolgreicher Zahlungsbestätigung. Deine Auswahl ist final; Vorschau illustrativ.'
      : 'Nur Testzahlung – keine echte Bestellung. Illustrative Vorschau; im späteren Verkauf keine zusätzliche Produktionsfreigabe.',
  });
}
async function createSession(env, order) {
  if (order.session_url) return order;
  const live = order.mode === 'live';
  // Stripe retains idempotency keys for at least 24h. Never create another session after that recovery window.
  if (now() - order.created_at > 23 * 3600) throw new CheckoutError('Checkout abgelaufen. Bitte Bestellreferenz beim Support angeben.', 409);
  const session = await remote('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      'Stripe-Version': STRIPE_API_VERSION,
      'Content-Type': 'application/x-www-form-urlencoded', 'Idempotency-Key': `checkout-${order.id}` },
    body: order.session_params,
  });
  let url;
  try { url = new URL(session.url); } catch { throw new CheckoutError('Ungültige Stripe-Checkout-Antwort.', 502); }
  if (session.livemode !== live || !new RegExp(`^cs_${live ? 'live' : 'test'}_[A-Za-z0-9_]+$`).test(session.id || '')
    || url.protocol !== 'https:' || url.hostname !== 'checkout.stripe.com' || url.username || url.password || url.port
    || session.client_reference_id !== order.id || session.metadata?.order_id !== order.id
    || session.amount_total !== orderAmount(order) || session.currency !== 'eur') {
    throw new CheckoutError('Ungültige Stripe-Checkout-Antwort.', 502);
  }
  const updated = await run(env, `UPDATE checkout_orders SET session_id=?, session_url=?, stage='session', updated_at=?
    WHERE id=? AND stage IN ('ready','session') AND (session_id IS NULL OR session_id=?)`,
  session.id, url.href, now(), order.id, session.id);
  if (!changed(updated)) throw new CheckoutError('Checkout-Zuordnung konnte nicht bestätigt werden.', 503);
  return { ...order, session_id: session.id, session_url: url.href };
}
export function handleCheckout(request, sourceEnv, mode = 'test') {
  if (request.method !== 'POST') return Promise.resolve(json({ error: 'Methode nicht erlaubt.' }, 405, { Allow: 'POST' }));
  return endpoint(async () => {
    const env = modeEnvironment(sourceEnv, mode);
    if (env.CHECKOUT_ENABLED !== 'true' || (mode === 'live'
      ? sourceEnv.CHECKOUT_ENABLED === 'true' : sourceEnv.CHECKOUT_LIVE_ENABLED === 'true')) {
      throw new CheckoutError('Checkout ist deaktiviert oder der Zahlungsmodus ist nicht eindeutig ausgewählt.', 503);
    }
    ready(env);
    if (mode === 'live' && !whatsappReady(env)) {
      throw new CheckoutError('WhatsApp-Benachrichtigung ist nicht konfiguriert.', 503);
    }
    if (request.headers.has('Origin') && request.headers.get('Origin') !== trustedOrigin(env)) {
      throw new CheckoutError('Ungültiger Ursprung.', 403);
    }
    await rateLimit(request, env);
    let data;
    try { data = await validateCheckout(request); }
    catch (error) { throw error instanceof CheckoutError ? error : new CheckoutError(error.message); }
    const id = crypto.randomUUID(), secret = token(), timestamp = now();
    const sessionParams = parameters({ id, status_token: secret, created_at: timestamp, mode,
      origin: trustedOrigin(env), email: data.email, configuration: data.configuration }).toString();
    await run(env, `INSERT INTO checkout_orders
      (id,submission_key,payload_digest,status_token,created_at,updated_at,origin,name,email,configuration,filename,acceptance,gpx_key,preview_key,session_params,whatsapp_sent,gpx_manifest)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,1,?,?,?,0,?) ON CONFLICT(submission_key) DO NOTHING`,
    id, data.key, data.digest, secret, timestamp, timestamp, trustedOrigin(env), data.name, data.email,
    data.configuration, data.filename, `orders/${id}/${data.sources.length > 1 ? 'combined' : 'original'}.gpx`,
    `orders/${id}/preview.png`, sessionParams, data.sources.length > 1 ? JSON.stringify(data.sources.map((source, index) => ({
      name: source.name, type: source.type, key: `orders/${id}/original-${index + 1}.gpx`,
    }))) : null);
    let order = await first(env, 'SELECT * FROM checkout_orders WHERE submission_key=?', data.key);
    if (!order || order.payload_digest !== data.digest) throw new CheckoutError('Schlüssel gehört zu einer anderen Auswahl.', 409);
    order.mode = mode;
    if (['deleting', 'purged'].includes(order.stage)) throw new CheckoutError('Bestellung nicht mehr verfügbar.', 410);
    if (order.session_url) return json(result(order, mode));
    const lease = crypto.randomUUID();
    if (!changed(await run(env, `UPDATE checkout_orders SET lease=?,lease_until=? WHERE id=? AND stage IN ('staging','ready','session')
      AND lease_until<?`, lease, now() + 120, order.id, now()))) {
      throw new CheckoutError('Checkout wird verarbeitet. Mit demselben Schlüssel erneut versuchen.', 503);
    }
    try {
      if (order.stage === 'staging') {
        for (const [index, artifact] of originalArtifacts(order).entries()) {
          await guarded(() => env.CHECKOUT_FILES.put(artifact.key, data.sources[index].bytes,
            { httpMetadata: { contentType: 'application/gpx+xml' } }));
        }
        await guarded(() => env.CHECKOUT_FILES.put(order.gpx_key, data.gpx, { httpMetadata: { contentType: 'application/gpx+xml' } }));
        await guarded(() => env.CHECKOUT_FILES.put(order.preview_key, data.preview, { httpMetadata: { contentType: 'image/png' } }));
        if (!changed(await run(env, `UPDATE checkout_orders SET stage='ready',updated_at=? WHERE id=? AND lease=? AND stage='staging'`,
          now(), order.id, lease))) throw new CheckoutError('Speicherung nicht bestätigt.', 503);
        order.stage = 'ready';
      }
      order = await createSession(env, order);
      return json(result(order, mode));
    } finally {
      await run(env, 'UPDATE checkout_orders SET lease=NULL,lease_until=0 WHERE id=? AND lease=?', order.id, lease);
    }
  });
}
export function handleOrderStatus(request, sourceEnv, routeMode) {
  if (request.method !== 'GET') return Promise.resolve(json({ error: 'Methode nicht erlaubt.' }, 405, { Allow: 'GET' }));
  return endpoint(async () => {
    const query = new URL(request.url).searchParams;
    const mode = routeMode || query.get('mode') || 'test';
    const env = modeEnvironment(sourceEnv, mode);
    if (!env.CHECKOUT_DB) throw new CheckoutError('Status nicht verfügbar.', 503);
    await rateLimit(request, env);
    const id = query.get('order'), secret = query.get('token');
    if (query.getAll('order').length !== 1 || query.getAll('token').length !== 1
      || !UUID.test(id || '') || !/^[a-f0-9]{64}$/.test(secret || '')) throw new CheckoutError('Bestellung nicht gefunden.', 404);
    const order = await first(env, `SELECT id,status FROM checkout_orders WHERE id=? AND status_token=? AND stage NOT IN ('deleting','purged')`, id, secret);
    if (!order) throw new CheckoutError('Bestellung nicht gefunden.', 404);
    return json({ orderId: order.id, status: order.status });
  });
}
const eventTypes = new Set(['checkout.session.completed', 'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed', 'checkout.session.expired']);
export function handleStripeWebhook(request, sourceEnv, mode = 'test') {
  if (request.method !== 'POST') return Promise.resolve(json({ error: 'Methode nicht erlaubt.' }, 405, { Allow: 'POST' }));
  return endpoint(async () => {
    // Verify and persist payments independently of mail availability or the new-checkout switch.
    const env = modeEnvironment(sourceEnv, mode);
    const live = mode === 'live';
    const keyPattern = live ? /^(sk|rk)_live_[A-Za-z0-9]+$/ : /^(sk|rk)_test_[A-Za-z0-9]+$/;
    if (!env.CHECKOUT_DB || !env.CHECKOUT_FILES || !keyPattern.test(env.STRIPE_SECRET_KEY || '')) {
      throw new CheckoutError('Webhook nicht konfiguriert.', 503);
    }
    const { event, digest } = await verifyEvent(request, env.STRIPE_WEBHOOK_SECRET, now(), live);
    if (!eventTypes.has(event.type)) return json({ received: true });
    const webhookVersion = live ? STRIPE_LIVE_WEBHOOK_API_VERSION : STRIPE_WEBHOOK_API_VERSION;
    if (event.api_version !== webhookVersion) {
      throw new CheckoutError('Webhook-API-Version stimmt nicht mit dem konfigurierten Stripe-Endpunkt überein.');
    }
    const session = event.data?.object;
    const id = session?.metadata?.order_id;
    if (session?.object !== 'checkout.session' || session.livemode !== live
      || !new RegExp(`^cs_${live ? 'live' : 'test'}_[A-Za-z0-9_]+$`).test(session.id || '') || !UUID.test(id || '')
      || session.client_reference_id !== id || session.metadata[live ? 'live_order' : 'test_only'] !== 'true'
      || session.mode !== 'payment' || session.currency !== 'eur') {
      throw new CheckoutError('Ungültige Stripe-Zahlung.');
    }
    const paid = session.payment_status === 'paid'
      && ['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type);
    if (event.type === 'checkout.session.async_payment_succeeded' && !paid) throw new CheckoutError('Zahlung nicht bestätigt.');
    const shipping = session.collected_information?.shipping_details;
    if (paid && (shipping?.address?.country !== 'DE' || !shipping.name || !shipping.address.line1
      || !shipping.address.postal_code || !shipping.address.city || session.total_details?.amount_shipping !== 0
      || session.total_details?.amount_tax !== 0)) throw new CheckoutError('Betrag oder Versandregion ungültig.');
    const order = await first(env, 'SELECT * FROM checkout_orders WHERE id=?', id);
    if (!order || !['ready', 'session'].includes(order.stage)
      || (order.session_id && order.session_id !== session.id)) throw new CheckoutError('Unbekannte Checkout-Zuordnung.');
    if (session.amount_total !== orderAmount(order)) throw new CheckoutError('Ungültiger Betrag für das bestellte Produkt.');
    const prior = await first(env, 'SELECT digest FROM checkout_events WHERE id=?', event.id);
    if (prior && prior.digest !== digest) throw new CheckoutError('Ereignis widerspricht gespeichertem Ereignis.', 409);
    const status = paid ? 'paid' : event.type === 'checkout.session.expired' ? 'expired'
      : event.type === 'checkout.session.async_payment_failed' ? 'failed' : 'pending';
    // D1 batch is transactional: event receipt and payment transition commit together.
    await guarded(() => env.CHECKOUT_DB.batch([
      statement(env, `INSERT INTO checkout_events(id,digest,order_id,type,created_at) VALUES(?,?,?,?,?)
        ON CONFLICT(id) DO NOTHING`, event.id, digest, id, event.type, now()),
      statement(env, `UPDATE checkout_orders SET session_id=?,status=?,shipping=CASE WHEN ?='paid' THEN COALESCE(shipping,?) ELSE shipping END,
        paid_at=CASE WHEN ?='paid' THEN COALESCE(paid_at,?) ELSE paid_at END, updated_at=?
        WHERE id=? AND stage IN ('ready','session') AND (session_id IS NULL OR session_id=?)
        AND (status='pending' OR ?='paid') AND EXISTS(SELECT 1 FROM checkout_events WHERE id=? AND digest=?)`,
      session.id, status, status, paid ? JSON.stringify({ shipping, customer: session.customer_details || {} }) : null,
      status, now(), now(), id, session.id, status, event.id, digest),
    ]));
    const receipt = await first(env, 'SELECT digest FROM checkout_events WHERE id=?', event.id);
    if (receipt?.digest !== digest) throw new CheckoutError('Ereignis widerspricht gespeichertem Ereignis.', 409);
    const persisted = await first(env, 'SELECT * FROM checkout_orders WHERE id=?', id);
    if (!persisted || persisted.session_id !== session.id || (paid && persisted.status !== 'paid')) {
      throw new CheckoutError('Zahlungsstatus nicht gespeichert.', 503);
    }
    if (persisted.status === 'paid') await notify(env, { ...persisted, mode });
    return json({ received: true });
  });
}
async function notify(env, order) {
  if (order.owner_sent && order.buyer_sent && (order.mode !== 'live' || order.whatsapp_sent)) return;
  const lease = crypto.randomUUID();
  if (!changed(await run(env, `UPDATE checkout_orders SET notify_lease=?,notify_until=? WHERE id=? AND status='paid'
    AND stage IN ('ready','session') AND notify_until<?`, lease, now() + 120, order.id, now()))) {
    throw new CheckoutError('Benachrichtigung wird verarbeitet; erneut versuchen.', 503);
  }
  try {
    order = { ...await first(env, 'SELECT * FROM checkout_orders WHERE id=?', order.id), mode: order.mode };
    const details = JSON.parse(order.shipping);
    let whatsappFailure;
    if (order.mode === 'live' && !order.whatsapp_sent) {
      try {
        await sendProductionAlert(env, order);
        if (!changed(await run(env, `UPDATE checkout_orders SET whatsapp_sent=1
          WHERE id=? AND notify_lease=? AND stage!='deleting'`, order.id, lease))) {
          throw new CheckoutError('WhatsApp-Zustellung nicht gespeichert.', 503);
        }
      } catch (error) { whatsappFailure = error; }
    }
    for (const kind of ['owner', 'buyer']) {
      if (order[`${kind}_sent`]) continue;
      if (!env.RESEND_API_KEY) throw new CheckoutError('E-Mail-Benachrichtigung nicht konfiguriert; Zahlung gespeichert.', 503);
      let attachments;
      if (kind === 'owner') {
        const gpx = await guarded(() => env.CHECKOUT_FILES.get(order.gpx_key));
        const preview = await guarded(() => env.CHECKOUT_FILES.get(order.preview_key));
        if (!gpx || !preview) throw new CheckoutError('Bestellanhänge fehlen; Benachrichtigung wird wiederholt.', 503);
        attachments = [
          { filename: attachmentName(order.filename), content: base64(new Uint8Array(await guarded(() => gpx.arrayBuffer()))) },
          { filename: 'peakmemory-vorschau.png', content_type: 'image/png', content: base64(new Uint8Array(await guarded(() => preview.arrayBuffer()))) },
          { filename: 'konfiguration.json', content: base64(new TextEncoder().encode(order.configuration)), content_type: 'application/json' },
        ];
        const originals = [];
        for (const [index, artifact] of originalArtifacts(order).entries()) {
          const original = await guarded(() => env.CHECKOUT_FILES.get(artifact.key));
          if (!original) throw new CheckoutError('Bestellanhänge fehlen; Benachrichtigung wird wiederholt.', 503);
          originals.push({ filename: `original-${String(index + 1).padStart(2, '0')}-${attachmentName(artifact.name)}`.slice(0, 200),
            content: base64(new Uint8Array(await guarded(() => original.arrayBuffer()))) });
        }
        attachments.unshift(...originals);
      }
      const delivery = await remote('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json',
          'Idempotency-Key': `checkout-${order.id}-${kind}` },
        body: JSON.stringify({ from: 'kontakt@peak-memory.de',
          to: kind === 'owner' ? 'peak.memory@web.de' : order.email,
          reply_to: kind === 'owner' ? order.email : 'peak.memory@web.de',
          ...orderEmail(order, details, kind), ...(attachments ? { attachments } : {}) }),
      });
      if (typeof delivery.id !== 'string' || !delivery.id) throw new CheckoutError('E-Mail-Zustellung nicht bestätigt.', 502);
      if (!changed(await run(env, `UPDATE checkout_orders SET ${kind}_sent=1 WHERE id=? AND notify_lease=? AND stage!='deleting'`,
        order.id, lease))) throw new CheckoutError('E-Mail-Zustellung nicht gespeichert.', 503);
    }
    if (whatsappFailure) throw whatsappFailure;
  } finally {
    await run(env, 'UPDATE checkout_orders SET notify_lease=NULL,notify_until=0,notify_after=? WHERE id=? AND notify_lease=?',
      now() + 900, order.id, lease);
  }
}
async function sendProductionAlert(env, order) {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
  const recipient = env.WHATSAPP_RECIPIENT;
  const graphVersion = env.WHATSAPP_GRAPH_API_VERSION;
  const templateName = env.WHATSAPP_TEMPLATE_NAME || 'peak_memory_production_alert';
  const templateLanguage = env.WHATSAPP_TEMPLATE_LANGUAGE || 'de';
  if (!whatsappReady(env)) {
    throw new CheckoutError('WhatsApp-Benachrichtigung nicht konfiguriert; Zahlung gespeichert.', 503);
  }
  const product = orderProduct(order);
  const delivery = await remote(`https://graph.facebook.com/${graphVersion}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: recipient.replace(/^\+/, ''),
      type: 'template',
      template: {
        name: templateName,
        language: { code: templateLanguage },
        components: [{
          type: 'body',
          parameters: [
            { type: 'text', text: order.id },
            { type: 'text', text: product.name },
            { type: 'text', text: order.name },
          ],
        }],
      },
    }),
  });
  if (!Array.isArray(delivery.messages) || typeof delivery.messages[0]?.id !== 'string' || !delivery.messages[0].id) {
    throw new CheckoutError('WhatsApp-Zustellung nicht bestätigt.', 502);
  }
}
function whatsappReady(env) {
  return !!env.WHATSAPP_ACCESS_TOKEN
    && /^\d+$/.test(env.WHATSAPP_PHONE_NUMBER_ID || '')
    && /^\+?[1-9]\d{7,14}$/.test(env.WHATSAPP_RECIPIENT || '')
    && /^v\d+\.\d+$/.test(env.WHATSAPP_GRAPH_API_VERSION || '')
    && /^[a-z0-9_]{1,512}$/.test(env.WHATSAPP_TEMPLATE_NAME || 'peak_memory_production_alert')
    && /^[a-z]{2}(?:_[A-Z]{2})?$/.test(env.WHATSAPP_TEMPLATE_LANGUAGE || 'de');
}
export async function checkoutMaintenance(sourceEnv, mode = 'test') {
  const env = modeEnvironment(sourceEnv, mode);
  if (!env.CHECKOUT_DB || !env.CHECKOUT_FILES) return;
  const timestamp = now();
  const orders = await guarded(() => statement(env, `SELECT * FROM checkout_orders WHERE stage!='deleting'
    AND ((status='paid' AND (owner_sent=0 OR buyer_sent=0 OR (?='live' AND whatsapp_sent=0))
      AND notify_after<=? AND notify_until<?)
    OR (stage='ready' AND session_url IS NULL AND created_at>? AND lease_until<?))
    ORDER BY created_at LIMIT 25`, mode, timestamp, timestamp, timestamp - 23 * 3600, timestamp).all());
  for (const order of orders.results) {
    try {
      if (!configured(env)) continue;
      order.mode = mode;
      if (order.status === 'paid') await notify(env, order);
      else if (env.CHECKOUT_ENABLED === 'true') {
        const lease = crypto.randomUUID();
        if (changed(await run(env, `UPDATE checkout_orders SET lease=?,lease_until=? WHERE id=? AND lease_until<? AND stage='ready'`,
          lease, now() + 120, order.id, now()))) {
          try { await createSession(env, order); }
          finally { await run(env, 'UPDATE checkout_orders SET lease=NULL,lease_until=0 WHERE id=? AND lease=?', order.id, lease); }
        }
      }
    } catch { console.error('Checkout retry failed; durable state retained'); }
  }
  const abandoned = await guarded(() => statement(env, `SELECT * FROM checkout_orders WHERE stage!='purged' AND
    (stage='deleting' OR (status!='paid' AND created_at<?) OR (status='paid' AND paid_at<? AND owner_sent=1 AND buyer_sent=1
      AND (? != 'live' OR whatsapp_sent=1)))
    AND lease_until<? AND notify_until<? LIMIT 25`, timestamp - 7 * 86400, timestamp - 90 * 86400,
  mode, timestamp, timestamp).all());
  for (const order of abandoned.results) {
    const lease = crypto.randomUUID();
    // Claim before touching R2. Webhooks and creators cannot transition a deleting order.
    if (!changed(await run(env, `UPDATE checkout_orders SET stage='deleting',lease=?,lease_until=?
      WHERE id=? AND stage!='purged' AND lease_until<? AND notify_until<? AND
      (stage='deleting' OR (status!='paid' AND created_at<?) OR (status='paid' AND paid_at<? AND owner_sent=1 AND buyer_sent=1
        AND (? != 'live' OR whatsapp_sent=1)))`,
    lease, now() + 120, order.id, now(), now(), timestamp - 7 * 86400, timestamp - 90 * 86400, mode))) continue;
    try {
      await guarded(() => env.CHECKOUT_FILES.delete([
        ...originalArtifacts(order).map(artifact => artifact.key), order.gpx_key, order.preview_key,
      ]));
      await guarded(() => env.CHECKOUT_DB.batch([
        statement(env, 'DELETE FROM checkout_events WHERE order_id=? AND EXISTS(SELECT 1 FROM checkout_orders WHERE id=? AND lease=?)',
          order.id, order.id, lease),
        // Keep a PII-free idempotency tombstone: an old submission key must never create a second payment.
        statement(env, `UPDATE checkout_orders SET stage='purged',status_token='',name='',email='',configuration='',
          filename='',gpx_key='',preview_key='',gpx_manifest=NULL,session_url=NULL,session_params='',shipping=NULL,lease=NULL,lease_until=0,
          notify_lease=NULL,notify_until=0 WHERE id=? AND stage='deleting' AND lease=?`, order.id, lease),
      ]));
    } catch { console.error('Checkout cleanup failed; will retry'); }
  }
}
