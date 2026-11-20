import { PURCHASE_INFORMATION, PURCHASE_INFORMATION_TEXT } from '../shared/purchase.js';
import { getProduct, configurationPrice, formatPrice, WALL_MOUNT_PRICE_EUR } from '../shared/product.js';
import { describeArea } from '../shared/area.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

export function orderEmail(order, details, kind, { productionViews = false } = {}) {
  const live = order.mode === 'live';
  const owner = kind === 'owner';
  const configuration = JSON.parse(order.configuration);
  const isArea = configuration.source === 'area';
  const product = getProduct(configuration.product);
  const offer = order.offer ? JSON.parse(order.offer) : null;
  const event = !!offer?.route;
  const pickup = event && order.fulfillment === 'pickup';
  const shipping = details.shipping;
  const address = shipping.address;
  const title = live ? owner ? 'Neue bezahlte Bestellung' : 'Dein Erinnerungsstück ist bestellt.'
    : 'Testzahlung bestätigt';
  const introduction = live
    ? owner ? 'Die Zahlung ist bestätigt. Die Bestellung kann gefertigt werden.'
      : `Danke, ${order.name}! Deine ${isArea ? 'Landschaft' : 'Route'} wird zu deinem persönlichen Erinnerungsstück.`
    : 'Dies ist eine Sandbox-Testbestellung. Kein Geld wurde abgebucht; es wird kein Produkt gefertigt.';
  const rows = [
    ['Bestellreferenz', order.id],
    ['Produkt', `${product.name} · 1 Stück`],
    ['Relief / Ausführung', `10 × 10 cm / ${product.dimensions}`],
    ...(event ? [['UTH-Strecke', offer.route]] : []),
    ...(offer?.discount ? [['Rabatt', `UTH: -${formatPrice(offer.discount / 100)}`]] : []),
    ['Gesamt', `${offer ? formatPrice(offer.amount / 100) : `${configurationPrice(configuration)} EUR`} · ${live ? 'bezahlt' : 'simulierte Zahlung'}`],
    ...(configuration.version >= 4 && product.id !== 'frame' ? [
      ['Wandaufhängung', configuration.wallMount ? `Ja · ${WALL_MOUNT_PRICE_EUR} EUR Aufpreis enthalten` : 'Nein'],
      ['Schutzfüße', '4 transparente Schutzfüße inklusive'],
    ] : []),
    ['Gravur', configuration.engraving || 'Ohne Gravur'],
    ...(isArea ? [['Gelände', describeArea(configuration.area)]]
      : [['Geländerand', `${Math.round(configuration.margin * 100)} %`]]),
    ['Höhenüberhöhung', `${configuration.elevationScale}×`],
    ...(configuration.version >= 8 ? [['Reliefhöhe', `Maximal ${configuration.heightLimitMm} mm einschließlich Grundplatte und Route, ohne Sockel`]] : []),
    [pickup ? 'Adresse für Versand bei später Zahlung' : 'Lieferadresse', [shipping.name, address.line1, address.line2,
      `${address.postal_code} ${address.city}`, address.state, address.country].filter(Boolean).join('\n')],
    ...(owner ? [['Name / E-Mail', `${order.name}\n${order.email}`],
      ...(!isArea ? [['GPX-Datei', order.filename]] : []), ['Stripe Checkout', order.session_id]] : []),
  ];
  const next = live
    ? pickup
      ? 'Nach bestätigter Zahlung fertigen wir dein Relief. Du kannst es am 24. April 2027 am Peak Memory Stand in Albstadt abholen.'
      : event && order.created_at <= 1807869600
        ? 'Deine Zahlung wurde nach der Abholfrist bestätigt. Dein Relief wird daher an die angegebene Adresse innerhalb Deutschlands versandt, statt am Stand bereitgelegt. Die Lieferung erfolgt in 5–10 Werktagen nach bestätigter Zahlung.'
        : 'Nach bestätigter Zahlung beginnt die Fertigung ohne weitere persönliche Produktionsfreigabe. Lieferung innerhalb Deutschlands in 5–10 Werktagen.'
    : 'Keine Produktion und keine Lieferung. Diese E-Mail dient nur zur Prüfung des Bestellablaufs; keine manuelle Produktionsfreigabe ist erforderlich (im späteren echten Verkauf).';
  const note = 'Kein Umsatzsteuerausweis gemäß §19 UStG. Die Online-Vorschau ist illustrativ, keine exakte Fertigungsvorlage.';
  const attachments = owner ? isArea
    ? `Die GPX-Datei markiert die Grenze des Kartenausschnitts. Konfiguration und Vorschaubild findest du ebenfalls in den Anhängen.${productionViews ? ' Dazu kommen Ansichten von oben und diagonal.' : ''} Das Relief wird ohne Route gefertigt.`
    : order.gpx_manifest
    ? `Alle Original-GPX-Dateien, die kombinierte GPX, Vorschaubild${productionViews ? ' und Ansichten von oben und diagonal' : ''} sowie Konfiguration findest du in den Anhängen.`
    : `Original-GPX, Vorschaubild${productionViews ? ' sowie Ansichten von oben und diagonal' : ''} und Konfiguration findest du in den Anhängen.` : '';
  const subject = `Peak Memory${live ? '' : ' TEST'} · ${title} · ${order.id}`;
  const applicablePurchaseInformation = configuration.version < 8
    ? PURCHASE_INFORMATION.filter(section => section.title !== 'Reliefhöhe').map(section =>
      section.title === 'Wandaufhängung und Schutzfüße bei Holzsockeln'
        ? { ...section, text: section.text.replace('dann in der Standardhöhe', 'dann') } : section)
    : PURCHASE_INFORMATION;
  const purchaseInformation = configuration.version < 7 ? applicablePurchaseInformation.map(section => {
    if (section.title === 'Produkt und Gesamtpreis') return { ...section,
      text: section.text.replace('mit Gravur auf Holz für 55 EUR', 'mit Gravur auf Holz für 50 EUR')
        .replace('ohne Gravur für 50 EUR', 'ohne Gravur für 45 EUR')
        .replace('Passepartout für 65 EUR', `Passepartout für ${configuration.version < 5 ? 55 : 60} EUR`) };
    if (section.title === 'Wandaufhängung und Schutzfüße bei Holzsockeln') return { ...section,
      text: section.text.replace('56 EUR für den Holzsockel', '51 EUR für den Holzsockel')
        .replace('51 EUR für den kompakten', '46 EUR für den kompakten') };
    return section;
  }) : applicablePurchaseInformation;
  const purchase = event ? purchaseInformation.map(section => {
    if (section.title === 'Zahlung, Fertigung und Lieferung') return { ...section,
      text: `${next} Das Relief wird individuell nach deiner bestätigten Konfiguration gefertigt.` };
    if (section.title === 'Bestellablauf und Vertragsschluss') return { ...section,
      text: section.text.replace('Du lädst deine eigene GPX-Datei hoch oder wählst und bestätigst ein Quadrat auf der Karte für eine Landschaft ohne Route.', 'Du wählst deine UTH-Strecke.') };
    if (section.title === 'Vertragssprache und Bestellbestätigung') return { ...section,
      text: section.text.replace('Versandinformationen', 'Abhol- bzw. Versandinformationen') };
    return section;
  }) : purchaseInformation;
  const purchaseText = event || configuration.version < 8
    ? purchase.map(section => `${section.title}\n${section.text}`).join('\n\n') : PURCHASE_INFORMATION_TEXT;
  const text = [
    title, introduction, '', ...rows.map(([label, value]) => `${label}: ${value}`),
    '', next, note, attachments,
    'Fragen? Antworte an peak.memory@web.de oder rufe uns unter 0162 2701613 an.',
    'Peak Memory GbR · Poststr. 29 · 71229 Leonberg',
    ...(live ? ['', purchaseText] : []),
  ].filter(value => value !== '').join('\n\n');
  const html = `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:24px 12px;background:#f0efe9;color:#1a1a1a;font-family:Arial,sans-serif">
<table role="presentation" style="width:100%;max-width:600px;margin:auto;border-collapse:collapse;background:#ffffff"><tr><td style="padding:32px">
<p style="margin:0 0 24px;color:#2d5016;font-size:24px;font-weight:bold">Peak Memory</p>
<p style="font-size:12px;letter-spacing:2px;color:#555">${live ? 'DEINE ROUTE. DEINE ERINNERUNG.' : 'SANDBOX · KEINE ECHTE BESTELLUNG'}</p>
<h1 style="font-size:28px;line-height:1.25;color:#2d5016">${escapeHtml(title)}</h1>
<p style="line-height:1.6">${escapeHtml(introduction)}</p>
<h2 style="font-size:18px;margin-top:28px">Deine Bestellung im Überblick</h2>
<table style="width:100%;border-collapse:collapse;table-layout:fixed">${rows.map(([label, value]) => `<tr><th scope="row" style="width:35%;padding:12px 8px 12px 0;border-bottom:1px solid #e8e8e4;text-align:left;vertical-align:top;font-size:13px;color:#555">${escapeHtml(label)}</th><td style="padding:12px 0;border-bottom:1px solid #e8e8e4;font-size:14px;overflow-wrap:anywhere;word-break:break-word;white-space:pre-line">${escapeHtml(value)}</td></tr>`).join('')}</table>
<h2 style="font-size:18px;margin-top:28px">${live ? 'So geht es weiter' : 'Nur ein Testlauf'}</h2>
<p style="line-height:1.6">${escapeHtml(next)}</p>
${attachments ? `<p style="line-height:1.6">${escapeHtml(attachments)}</p>` : ''}
<p style="font-size:12px;color:#555;line-height:1.6">${escapeHtml(note)}</p>
<p style="line-height:1.6">Fragen zu deiner Bestellung? Schreib uns an <a href="mailto:peak.memory@web.de" style="color:#2d5016">peak.memory@web.de</a> oder ruf uns unter 0162 2701613 an.</p>
<p style="font-size:12px;color:#555">Peak Memory GbR · Poststr. 29 · 71229 Leonberg<br>Carolin Merz und Alexander Weimer</p>
${live ? `<hr style="border:0;border-top:1px solid #e8e8e4;margin:28px 0"><h2 style="font-size:18px">Kaufhinweise &amp; Widerruf</h2>${purchase.map(section => `<h3 style="font-size:14px">${escapeHtml(section.title)}</h3><p style="font-size:12px;color:#555;line-height:1.6">${escapeHtml(section.text)}</p>`).join('')}` : ''}
</td></tr></table></body></html>`;
  return { subject, text, html };
}
