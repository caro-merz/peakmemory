/**
 * Cloudflare Worker – peak-memory.de
 *
 * Routes:
 *   POST /contact  → sends form data via Resend API
 *   *              → static assets (index.html, images, …)
 *
 * Required secret (Cloudflare Workers → Settings → Variables & Secrets):
 *   RESEND_API_KEY
 */

const RECIPIENT = 'peak.memory@web.de';
const SENDER    = 'kontakt@peak-memory.de';
const EMAIL_RE  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const TYPE_LABELS = {
  individual: 'Individuelle Bestellung (Einzelstück)',
  event:      'Event-Anfrage (ab 30 Stück)',
  other:      'Sonstiges',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Route: contact form submission
    if (url.pathname === '/contact' && request.method === 'POST') {
      return handleContact(request, env);
    }

    // Everything else: serve static assets
    return env.ASSETS.fetch(request);
  },
};

async function handleContact(request, env) {
  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return json({ error: 'Serverkonfigurationsfehler' }, 500);
  }

  // Parse body (JSON or form-encoded)
  let data;
  const ct = request.headers.get('content-type') ?? '';
  try {
    data = ct.includes('application/json')
      ? await request.json()
      : Object.fromEntries(await request.formData());
  } catch {
    return json({ error: 'Ungültige Anfrage' }, 400);
  }

  const { name, email, type, message } = data;

  // Server-side validation
  if (!name || String(name).trim().length < 1)          return json({ error: 'Name ist ein Pflichtfeld.' }, 400);
  if (!email || !EMAIL_RE.test(email))                  return json({ error: 'Ungültige E-Mail-Adresse.' }, 400);
  if (!message || String(message).trim().length < 5)    return json({ error: 'Nachricht ist zu kurz.' }, 400);

  const safeName    = String(name).trim().slice(0, 200);
  const safeEmail   = String(email).trim().slice(0, 200);
  const safeType    = TYPE_LABELS[type] ?? 'Nicht angegeben';
  const safeMessage = String(message).trim().slice(0, 4000);

  const text = [
    `Name:    ${safeName}`,
    `E-Mail:  ${safeEmail}`,
    `Art:     ${safeType}`,
    '',
    'Nachricht:',
    safeMessage,
    '',
    '---',
    'GPX-Datei bitte als Anhang per E-Mail an peak.memory@web.de senden.',
  ].join('\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from:     SENDER,
      to:       RECIPIENT,
      reply_to: safeEmail,
      subject:  `Anfrage von ${safeName} – ${safeType}`,
      text,
    }),
  });

  if (!res.ok) {
    console.error('Resend error', res.status, await res.text().catch(() => ''));
    return json({ error: 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.' }, 502);
  }

  return json({ ok: true });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
