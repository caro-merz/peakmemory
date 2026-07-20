/**
 * Cloudflare Pages Function – POST /contact
 * Validates form input and delivers it via Resend to peak.memory@web.de.
 *
 * Required environment variable (set in Cloudflare Pages → Settings → Env vars):
 *   RESEND_API_KEY – your Resend API key
 */

const RECIPIENT = 'peak.memory@web.de';
const SENDER    = 'kontakt@peak-memory.de';
const MAX_GPX_SIZE = 5 * 1024 * 1024;

const TYPE_LABELS = {
  individual: 'Individuelle Bestellung (Einzelstück)',
  event:      'Event-Anfrage (ab 30 Stück)',
  other:      'Sonstiges',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is not configured');
    return jsonResponse({ error: 'Serverkonfigurationsfehler' }, 500);
  }

  // Parse – accept both JSON and form-encoded bodies
  let data;
  const ct = request.headers.get('content-type') || '';
  try {
    if (ct.includes('application/json')) {
      data = await request.json();
    } else {
      const fd = await request.formData();
      data = Object.fromEntries(fd.entries());
    }
  } catch {
    return jsonResponse({ error: 'Ungültige Anfrage' }, 400);
  }

  const { name, email, type, message, gpxFile } = data;

  // Server-side validation
  if (!name || typeof name !== 'string' || name.trim().length < 1) {
    return jsonResponse({ error: 'Name ist ein Pflichtfeld.' }, 400);
  }
  if (!email || !EMAIL_RE.test(email)) {
    return jsonResponse({ error: 'Ungültige E-Mail-Adresse.' }, 400);
  }
  if (!message || typeof message !== 'string' || message.trim().length < 5) {
    return jsonResponse({ error: 'Nachricht ist zu kurz.' }, 400);
  }

  // Sanitise inputs before embedding in email
  const safeName    = name.trim().slice(0, 200);
  const safeEmail   = email.trim().slice(0, 200);
  const safeType    = TYPE_LABELS[type] ?? 'Nicht angegeben';
  const safeMessage = message.trim().slice(0, 4000);
  const attachment = await createGpxAttachment(gpxFile);

  if (attachment && attachment.error) {
    return jsonResponse({ error: attachment.error }, 400);
  }

  const emailBody = [
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
    text:     emailBody,
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
    const detail = await res.text().catch(() => '');
    console.error('Resend error', res.status, detail);
    return jsonResponse({ error: 'E-Mail konnte nicht gesendet werden. Bitte versuche es später erneut.' }, 502);
  }

  return jsonResponse({ ok: true });
}

function jsonResponse(body, status = 200) {
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
