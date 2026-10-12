export const PURCHASE_INFORMATION = [
  {
    title: 'Verkäufer und Kontakt',
    text: 'Peak Memory GbR, Poststr. 29, 71229 Leonberg, Deutschland. Vertreten durch Carolin Merz und Alexander Weimer. E-Mail: peak.memory@web.de. Telefon: 0162 2701613.',
  },
  {
    title: 'Produkt und Gesamtpreis',
    text: 'Der Direktkauf umfasst ein individuell nach deiner GPX-Route und Konfiguration gefertigtes 3D-Geländerelief (10 × 10 cm). Du wählst eine von drei Ausführungen: Eiche-Holzsockel (11 × 13,5 × 2 cm) mit Gravur auf Holz für 50 EUR; kompakter Eiche-Holzsockel (11 × 11 × 2 cm) ohne Gravur für 45 EUR; weißer Rahmen (20 × 20 cm Außenmaß) mit weißem, graviertem Passepartout für 55 EUR. Ein Stück pro Bestellung. Alle Gesamtpreise enthalten den Versand innerhalb Deutschlands. Kein Umsatzsteuerausweis gemäß § 19 UStG. Holzmaserung, Rahmenprofil, Passepartout und Fertigungsdetails können von der illustrativen Online-Vorschau abweichen; die gesetzlichen Mängelrechte bleiben unberührt.',
  },
  {
    title: 'Wandaufhängung und Schutzfüße bei Holzsockeln',
    text: 'Beide Eiche-Holzsockel haben vier transparente Schutzfüße auf der Unterseite. Optional kannst du eine gezahnte Wandaufhängung auf der Rückseite für 1 EUR Aufpreis wählen (Standard: Nein). Der Gesamtpreis beträgt dann 51 EUR für den Holzsockel mit Gravur bzw. 46 EUR für den kompakten Holzsockel ohne Gravur, jeweils inklusive Versand innerhalb Deutschlands. Die Option gilt nicht für den Rahmen. Form und Position der Aufhängung und Schutzfüße in der Online-Vorschau sind illustrativ.',
  },
  {
    title: 'Bestellablauf und Vertragsschluss',
    text: 'Du lädst deine eigene GPX-Datei hoch, wählst die Produktausführung, dann Gravur (soweit vorgesehen) und Einstellungen und prüfst die Zusammenfassung mit dem Gesamtpreis. Beim kompakten Holzsockel ohne Gravur wird kein Gravurtext gefertigt. Eingaben kannst du vor der Weiterleitung an Stripe ändern; nach einer Änderung musst du die finale Auswahl erneut bestätigen. Lieferadresse und verfügbare Zahlungsarten werden im gehosteten Stripe-Checkout angezeigt. Vor der abschließenden Zahlung kannst du den Checkout verlassen und deine Auswahl auf unserer Website neu bearbeiten. Mit dem abschließenden zahlungspflichtigen Bestellschritt bei Stripe gibst du ein verbindliches Kaufangebot ab. Wir nehmen dieses Angebot mit erfolgreicher Zahlungsbestätigung durch Stripe an; dann kommt der Vertrag zustande. Bei verzögerten Zahlungsarten gilt dies erst, wenn Stripe die Zahlung als erfolgreich bestätigt. Eine bloße Rückleitung auf unsere Website ist keine Zahlungsbestätigung.',
  },
  {
    title: 'Zahlung, Fertigung und Lieferung',
    text: 'Die Zahlung erfolgt über die im Stripe-Checkout angebotenen Zahlungsarten. Nach bestätigter Zahlung beginnt die Fertigung ohne weitere persönliche Produktionsfreigabe. Deine bestätigte Route, Produktausführung, Gravur (soweit vorgesehen) und Konfiguration sind Grundlage der Fertigung. Die Lieferung erfolgt ausschließlich innerhalb Deutschlands in 5–10 Werktagen nach bestätigter Zahlung. Sonderformate und besondere Wünsche sind nicht Teil dieses Direktkaufs und müssen vorher separat angefragt werden.',
  },
  {
    title: 'Kein gesetzliches Widerrufsrecht bei dieser Personalisierung',
    text: 'Das Relief wird nicht vorgefertigt, sondern nach deiner individuellen GPX-Route und Konfiguration hergestellt. Für solche Waren besteht gemäß § 312g Abs. 2 Nr. 1 BGB kein gesetzliches Widerrufsrecht. Dies ist kein Verzicht auf bestehende Rechte durch eine Checkbox, sondern die gesetzliche Ausnahme für individuell angefertigte Waren. Deine gesetzlichen Rechte bei Mängeln oder einer nicht vertragsgemäßen Lieferung bleiben uneingeschränkt bestehen. Bei Problemen kontaktiere uns über die oben genannten Kontaktdaten.',
  },
  {
    title: 'Vertragssprache und Bestellbestätigung',
    text: 'Vertragssprache ist Deutsch. Nach verifizierter Zahlung erhältst du eine E-Mail mit Bestellreferenz, Konfiguration, Versandinformationen und diesen Kaufhinweisen. Du kannst diese Hinweise vor der Bestellung über die Druck- oder Speicherfunktion deines Browsers sichern. Die Bestelldaten werden intern gespeichert; es gibt kein Kundenkonto mit dauerhaft abrufbarer Vertragshistorie. Eine unverbindliche Anfrage ist keine Bestellung. Im ausdrücklich gekennzeichneten Stripe-Sandboxmodus entsteht kein Kaufvertrag und es erfolgt keine Fertigung.',
  },
];

export const PURCHASE_INFORMATION_TEXT = PURCHASE_INFORMATION
  .map(section => `${section.title}\n${section.text}`).join('\n\n');
