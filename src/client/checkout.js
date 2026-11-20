import { configurationPrice, formatPrice } from '../shared/product.js';
import { offerFor, UTH_PICKUP_CUTOFF } from '../shared/uth.js';

const get = id => document.getElementById(id);

export function initializeCheckout({ state, capture, captureViews, setBusy }) {
  let enabled = false, mode = 'test', testMode = true, submitting = false, draft = null;
  const form = get('checkoutForm');
  const status = get('checkoutStatus');
  const uthPage = document.documentElement.hasAttribute('data-uth');
  get('checkoutDiscount').hidden = !uthPage;
  get('checkoutCode').disabled = !uthPage;
  const discountCode = () => uthPage ? get('checkoutCode').value : '';
  let serverTime = null, timeReceived = 0;
  const currentTime = () => serverTime === null ? Math.floor(Date.now() / 1000)
    : Math.floor(serverTime + (performance.now() - timeReceived) / 1000);
  let previousSelection;
  const priceConfiguration = () => state().configuration ?? {
    version: 9, product: get('product').value, heightLimitMm: get('product').value === 'frame' ? 16 : 28,
    wallMount: get('product').value !== 'frame' && get('wallMount').value === 'yes',
  };
  const currentOffer = () => offerFor(priceConfiguration(), discountCode(), currentTime());
  const priceLabel = () => {
    try { return formatPrice(currentOffer().amount / 100); }
    catch { return formatPrice(configurationPrice(priceConfiguration())); }
  };
  const buttonLabel = () => `${testMode ? 'Zur Testzahlung bei Stripe' : 'Zahlungspflichtig bestellen'} · ${priceLabel()}`;
  const hasSelection = current => current.source === 'area' ? !!current.area : !!current.file;
  function update() {
    const current = state();
    const selection = JSON.stringify([current.source, current.area, current.files.map(file => [file.name, file.size, file.lastModified]), current.summary, current.preview, discountCode(), current.eventRoute,
      uthPage && currentTime() <= UTH_PICKUP_CUTOFF, priceLabel()]);
    if (previousSelection !== selection) get('checkoutAcceptance').checked = false;
    previousSelection = selection;
    get('checkoutFields').disabled = submitting || current.busy;
    get('submitCheckout').disabled = !enabled || submitting || current.busy || !hasSelection(current)
      || current.sample || (uthPage && !current.eventRoute) || current.preview !== 'ready' || !current.valid;
    let offerText = '';
    try {
      const offer = currentOffer();
      if (offer.discount) offerText = `UTH-Rabatt: ${formatPrice(offer.discount / 100)}. Gesamtpreis: ${formatPrice(offer.amount / 100)}. Der Rabatt gilt nicht für Höhenaufschläge oder die Wandaufhängung.`;
    } catch (error) { offerText = error.message; }
    get('checkoutOffer').textContent = offerText;
    const fulfillment = uthPage && currentTime() <= UTH_PICKUP_CUTOFF
      ? 'Abholung am 24. April in Albstadt bei bestätigter Zahlung bis 16. April 2027, 12 Uhr. Bei späterer Bestätigung Versand.'
      : 'Versand innerhalb Deutschlands.';
    if (uthPage) {
      get('checkoutIntro').textContent = 'Stripe erfasst Zahlung und eine deutsche Lieferadresse. Bei Abholung dient die Adresse als Versand-Fallback bei später Zahlung.';
      get('orderDeliveryLabel').textContent = 'Abholung / Versand';
      get('orderDeliveryTime').textContent = fulfillment;
    }
    get('checkoutSummary').textContent = hasSelection(current)
      ? `${current.source === 'area' ? 'Landschaft ohne Route' : current.files.map(file => file.name).join('\n')}\n${current.summary}\nGesamt: ${priceLabel()}\n${fulfillment}`
      : current.source === 'area' ? 'Bestätige zuerst deinen Kartenausschnitt.' : 'Lade zuerst deine eigene GPX-Datei hoch.';
    if (!submitting) get('submitCheckout').textContent = buttonLabel();
  }
  get('checkoutCode').addEventListener('input', update);
  function fail(message) {
    status.textContent = message;
    status.className = 'error';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    update();
    if (submitting || !form.reportValidity()) return;
    const current = state();
    if (!enabled || current.busy || !hasSelection(current) || current.sample || (uthPage && !current.eventRoute) || current.preview !== 'ready' || !current.valid) {
      fail('Für den Checkout brauchst du eine eigene GPX-Datei oder einen bestätigten Kartenausschnitt und eine verfügbare 3D-Vorschau.');
      return;
    }
    let offer;
    try { offer = currentOffer(); }
    catch (error) { fail(error.message); return; }
    const quotedFulfillment = current.eventRoute && currentTime() <= UTH_PICKUP_CUTOFF ? 'pickup' : 'shipping';
    submitting = true;
    setBusy(true);
    get('checkoutFields').disabled = true;
    get('submitCheckout').textContent = testMode ? 'Test-Checkout wird vorbereitet …' : 'Sicherer Checkout wird vorbereitet …';
    status.textContent = '';
    update();
    try {
      const name = get('checkoutName').value.trim(), email = get('checkoutEmail').value.trim();
      const signature = JSON.stringify([current.configuration, name, email, current.eventRoute, discountCode(), offer.amount, quotedFulfillment]);
      if (!draft || draft.file !== current.file || draft.signature !== signature) {
        const body = new FormData();
        body.set('name', name);
        body.set('email', email);
        if (current.files.length === 1) body.set('gpxFile', current.files[0]);
        else for (const file of current.files) body.append('gpxFiles', file);
        body.set('configuration', JSON.stringify(current.configuration));
        if (current.eventRoute) body.set('eventRoute', current.eventRoute);
        if (discountCode().trim()) body.set('discountCode', discountCode().trim());
        if (current.eventRoute || discountCode().trim()) {
          body.set('quotedAmount', String(offer.amount));
          if (current.eventRoute) body.set('quotedFulfillment', quotedFulfillment);
        }
        body.set('previewImage', await capture(), 'peakmemory-vorschau.png');
        for (const { name, blob } of await captureViews()) {
          body.set(`${name}Image`, blob, `peakmemory-ansicht-${name}.png`);
        }
        body.set('submissionKey', crypto.randomUUID());
        body.set('acceptance', 'true');
        draft = { file: current.file, signature, body };
      }
      const response = await fetch(mode === 'live' ? '/checkout/live' : '/checkout', {
        method: 'POST', body: draft.body, signal: AbortSignal.timeout(30000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Der Checkout konnte nicht gestartet werden.');
      const destination = new URL(result.url);
      if (destination.protocol !== 'https:' || destination.hostname !== 'checkout.stripe.com'
        || destination.username || destination.password || destination.port) {
        throw new Error('Die Checkout-Antwort enthält keine gültige Stripe-Adresse.');
      }
      status.textContent = testMode ? 'Du wirst zum sicheren Stripe-Test-Checkout weitergeleitet …'
        : 'Du wirst zum sicheren Stripe-Checkout weitergeleitet …';
      status.className = 'success';
      window.location.assign(destination.href);
    } catch (error) {
      fail(error.name === 'TimeoutError'
        ? 'Keine Checkout-Bestätigung erhalten. Deine Auswahl bleibt erhalten. Erneut versuchen setzt denselben Checkout fort.'
        : `Checkout fehlgeschlagen: ${error.message || 'Verbindungsfehler'}. Deine Auswahl bleibt erhalten.`);
    } finally {
      submitting = false;
      setBusy(false);
      get('checkoutFields').disabled = false;
      get('submitCheckout').textContent = buttonLabel();
      update();
    }
  });
  async function loadAvailability() {
    try {
      const response = await fetch('/shop-status?time=1', { signal: AbortSignal.timeout(10000), cache: 'no-store' });
      if (!response.ok) throw new Error('Der Shop-Status konnte nicht geladen werden.');
      const result = await response.json();
      if (typeof result.enabled !== 'boolean' || !['test', 'live'].includes(result.mode)
        || result.testMode !== (result.mode === 'test')) throw new Error('Ungültiger Shop-Status.');
      enabled = result.enabled;
      if (Number.isSafeInteger(result.serverTime)) { serverTime = result.serverTime; timeReceived = performance.now(); }
      mode = result.mode;
      testMode = result.testMode;
      form.hidden = !enabled;
      get('checkoutAvailability').textContent = enabled
        ? testMode
          ? 'Der Direktkauf ist ausschließlich zum Testen geöffnet. Es werden keine echten Bestellungen angenommen.'
          : ''
        : mode === 'live'
          ? 'Der Live-Shop ist noch nicht vollständig freigegeben. Du kannst dein Relief weiterhin unverbindlich anfragen.'
          : 'Der Direktkauf ist noch nicht aktiviert. Du kannst dein Relief weiterhin unverbindlich anfragen.';
      get('testNotice').hidden = !testMode;
      get('checkoutAvailability').hidden = enabled && !testMode;
      if (!uthPage) {
        get('processPaymentInfo').textContent = testMode
          ? 'Der Direktkauf ist ausschließlich im Stripe-Testmodus geöffnet. Testzahlungen lösen keine echte Bestellung aus.'
          : 'Du bezahlst den angezeigten Gesamtpreis inklusive Versand innerhalb Deutschlands über Stripe. Für Holzsockel ist eine Wandaufhängung für 1 € zusätzlich wählbar. Die Lieferzeit beträgt 5–10 Werktage nach bestätigter Zahlung.';
        get('processProductionInfo').textContent = testMode
          ? 'Testzahlungen lösen keine Produktion oder Lieferung aus. Bei echten Bestellungen beginnt die Fertigung nach bestätigter Zahlung; die Lieferung erfolgt in 5–10 Werktagen.'
          : 'Nach bestätigter Zahlung fertigen wir dein Unikat und liefern innerhalb Deutschlands in 5–10 Werktagen.';
      }
      get('submitCheckout').textContent = buttonLabel();
      update();
    } catch (error) {
      enabled = false;
      get('checkoutAvailability').hidden = false;
      get('checkoutAvailability').textContent = `${error.message || 'Shop nicht erreichbar'} Bitte nutze die unverbindliche Anfrage.`;
      get('checkoutAvailability').className = 'error';
      update();
    }
    document.documentElement.dataset.checkoutMode = mode;
  }
  loadAvailability();
  showPaymentReturn();
  return { update };
}

async function showPaymentReturn() {
  const query = new URLSearchParams(window.location.search);
  const result = query.get('checkout');
  if (!result) return;
  const output = get('paymentStatus');
  const order = query.get('order'), token = query.get('token');
  const mode = query.get('mode') === 'live' ? 'live' : 'test';
  const testMode = mode === 'test';
  const clean = new URL(window.location.href);
  for (const key of ['checkout', 'mode', 'order', 'token']) clean.searchParams.delete(key);
  history.replaceState(null, '', clean.pathname + clean.search + '#checkoutTitle');
  output.scrollIntoView({ block: 'center' });
  if (result === 'cancelled') {
    output.textContent = 'Der Stripe-Checkout wurde verlassen. Eine Zahlung wird hier nicht bestätigt. Nach einem Neuladen bitte deine GPX-Datei erneut auswählen.';
    return;
  }
  if (result !== 'success' || !order || !token) {
    output.textContent = 'Die Zahlungsreferenz fehlt oder ist ungültig. Bitte kontaktiere uns; starte keine zweite Zahlung.';
    output.className = 'error';
    return;
  }
  output.textContent = testMode
    ? 'Test-Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.'
    : 'Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.';
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const response = await fetch(`/order-status?${new URLSearchParams({ mode, order, token })}`, {
        cache: 'no-store', signal: AbortSignal.timeout(10000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Der Zahlungsstatus konnte nicht geprüft werden.');
      if (data.status === 'paid') {
        const heading = document.createElement('strong');
        heading.textContent = testMode ? 'Testzahlung bestätigt' : 'Zahlung bestätigt';
        const reference = document.createElement('span');
        reference.textContent = `Bestellreferenz: ${data.orderId || order}`;
        const message = document.createElement('span');
        message.textContent = testMode
          ? 'Dies ist keine echte Bestellung; es wird kein Produkt gefertigt.'
          : data.fulfillment === 'pickup'
            ? 'Dein Relief liegt am 24. April 2027 am Peak Memory Stand in Albstadt zur Abholung bereit. Du erhältst eine Bestätigung per E-Mail.'
            : data.fulfillment === 'shipping'
              ? 'Dein Relief wird an deine Lieferadresse versandt. Du erhältst eine Bestätigung per E-Mail.'
              : 'Wir senden dir und Peak Memory eine Bestellbestätigung.';
        output.replaceChildren(heading, reference, message);
        output.className = 'success';
        output.scrollIntoView({ block: 'center' });
        return;
      }
      if (data.status === 'failed' || data.status === 'expired') {
        output.textContent = testMode
          ? 'Der Test-Checkout ist fehlgeschlagen oder abgelaufen. Es liegt keine bestätigte Zahlung für diese Bestellung vor.'
          : 'Der Checkout ist fehlgeschlagen oder abgelaufen. Es liegt keine bestätigte Zahlung für diese Bestellung vor.';
        output.className = 'error';
        return;
      }
      if (data.status !== 'pending') throw new Error('Unbekannter Zahlungsstatus.');
      if (attempt < 9) await new Promise(resolve => setTimeout(resolve, 2000));
    }
    output.textContent = testMode
      ? `Die Testzahlung ist noch nicht bestätigt. Bitte kontaktiere uns mit deiner Bestellreferenz, statt erneut zu bezahlen: ${order}`
      : `Die Zahlung ist noch nicht bestätigt. Bitte kontaktiere uns mit deiner Bestellreferenz, statt erneut zu bezahlen: ${order}`;
  } catch (error) {
    output.textContent = `${error.message || 'Statusprüfung fehlgeschlagen'} Bitte nicht erneut bezahlen. Bestellreferenz: ${order}`;
    output.className = 'error';
  }
}
