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
const MAX_GPX_SIZE = 5 * 1024 * 1024;

const TYPE_LABELS = {
  individual: 'Individuelle Bestellung (Einzelstück)',
  event:      'Event-Anfrage (ab 30 Stück)',
  other:      'Sonstiges',
};

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Redirect www -> apex
    if (url.hostname === 'www.peak-memory.de') {
      url.hostname = 'peak-memory.de';
      return Response.redirect(url.toString(), 301);
    }

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

  const { name, email, type, message, gpxFile } = data;

  // Server-side validation
  if (!name || String(name).trim().length < 1)          return json({ error: 'Name ist ein Pflichtfeld.' }, 400);
  if (!email || !EMAIL_RE.test(email))                  return json({ error: 'Ungültige E-Mail-Adresse.' }, 400);
  if (!message || String(message).trim().length < 5)    return json({ error: 'Nachricht ist zu kurz.' }, 400);

  const safeName    = String(name).trim().slice(0, 200);
  const safeEmail   = String(email).trim().slice(0, 200);
  const safeType    = TYPE_LABELS[type] ?? 'Nicht angegeben';
  const safeMessage = String(message).trim().slice(0, 4000);
  const attachment = await createGpxAttachment(gpxFile);

  if (attachment && attachment.error) {
    return json({ error: attachment.error }, 400);
  }

  const text = [
    `Name:    ${safeName}`,
    `E-Mail:  ${safeEmail}`,
    `Art:     ${safeType}`,
    '',
    'Nachricht:',
    safeMessage,
  ].join('\n');

  const payload = {
    from:     SENDER,
    to:       RECIPIENT,
    reply_to: safeEmail,
    subject:  `Anfrage von ${safeName} – ${safeType}`,
    text,
  };

  if (attachment) {
    payload.attachments = [attachment];
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
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

async function createGpxAttachment(file) {
  if (!file || typeof file === 'string') {
    return null;
  }

  if (!(file instanceof File)) {
    return { error: 'Ungültiger Dateiupload.' };
  }

  if (!/\.gpx$/i.test(file.name)) {
    return { error: 'Bitte nur GPX-Dateien mit der Endung .gpx hochladen.' };
  }

  if (file.size > MAX_GPX_SIZE) {
    return { error: 'Die GPX-Datei darf maximal 5 MB groß sein.' };
  }

  return {
    filename: file.name.slice(0, 200),
    content: arrayBufferToBase64(await file.arrayBuffer()),
  };
}

function arrayBufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
}


