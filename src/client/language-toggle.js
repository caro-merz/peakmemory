(function () {
  const defaultLang = 'de';
  const deToEn = Object.freeze({
    'Zum Konfigurator': 'Go to configurator',
    'Produkte': 'Products',
    'Konfigurator': 'Configurator',
    'Für Veranstalter': 'For organizers',
    'Über uns': 'About us',
    'News': 'News',
    'Q&A': 'FAQ',
    'Kontakt': 'Contact',
    'Hauptnavigation': 'Main navigation',
    'Peak Memory Startseite': 'Peak Memory home page',
    'Über Peak Memory': 'About Peak Memory',
    'Karussell': 'Carousel',
    'Lade zuerst deine eigene GPX-Datei hoch.': 'Upload your own GPX file first.',
    'Auf Etsy ansehen': 'View on Etsy',
    'Dein individuelles Relief': 'Your custom relief',
    '. Lade deine Route hoch, gestalte deine Gravur und frage dein persönliches Erinnerungsstück unverbindlich an.': '. Upload your route, personalize your engraving, and request your keepsake with no obligation.',
    '. Noch keine Datei? Unsere': '. No file yet? Our',
    '10 × 10 cm Relief auf Eiche, mit Lasergravur auf Holz. Eiche-Holzsockel: 11 × 13,5 × 2 cm.': '10 × 10 cm relief on oak, with laser engraving on the wood. Oak base: 11 × 13.5 × 2 cm.',
    '10 × 10 cm Relief auf kompaktem Eiche-Holzsockel, ohne Gravur. Eiche-Holzsockel: 11 × 11 × 2 cm.': '10 × 10 cm relief on a compact oak base, without engraving. Oak base: 11 × 11 × 2 cm.',
    '10 × 10 cm Relief im weißen Rahmen mit Gravur auf weißem Passepartout. Weißer Rahmen / weißes Passepartout: 20 × 20 cm Außenmaß.': '10 × 10 cm relief in a white frame, with engraving on the white mount. White frame / white mount: 20 × 20 cm overall.',
    '10 × 10 cm Relief · Eiche-Holzsockel: 11 × 13,5 × 2 cm.': '10 × 10 cm relief · oak base: 11 × 13.5 × 2 cm.',
    '10 × 10 cm Relief · Eiche-Holzsockel: 11 × 11 × 2 cm.': '10 × 10 cm relief · oak base: 11 × 11 × 2 cm.',
    '10 × 10 cm Relief · Weißer Rahmen / weißes Passepartout: 20 × 20 cm Außenmaß.': '10 × 10 cm relief · white frame / white mount: 20 × 20 cm overall.',
    'Jetzt gestalten': 'Design now',
    'Gestalte deine Erinnerung.': 'Design your keepsake.',
    'Deine Route. Dein Relief.': 'Your route. Your keepsake.',
    'Route hochladen': 'Upload route',
    'Produkt auswählen': 'Choose product',
    'Personalisieren': 'Personalize',
    'Sicher bezahlen': 'Secure payment',
    'Produktion & Versand': 'Production & shipping',
    'Deine Route F\u00fcr Zuhause': 'Your route for home',
    'Ein Abenteuer.': 'An adventure.',
    'Ein Stück für Zuhause.': 'A keepsake for home.',
    'Lade deine GPX-Datei hoch oder wähle eine Landschaft auf der Karte. Entdecke dein Relief in 3D und gestalte dein persönliches Erinnerungsstück. Kostenlos, ohne Anmeldung und ohne Bestellung.': 'Upload your GPX file or choose a map section. Discover your relief in 3D and customize your personal keepsake. Free, no sign-up, and no order required.',
    'Wie möchtest du dein Relief gestalten?': 'How do you want to design your relief?',
    'GPX-Route': 'GPX route',
    'Mit deiner GPX-Datei': 'With your GPX file',
    'Kartenausschnitt': 'Map section',
    'Direkt auf der Karte wählen': 'Choose directly on the map',
    'Wähle deine Landschaft': 'Choose your landscape',
    'Verschiebe und zoome die Karte unter dem Quadrat.': 'Move and zoom the map inside the square.',
    'Karte wird geladen …': 'Loading map…',
    'Diesen Ausschnitt verwenden': 'Use this section',
    'Karte erneut laden': 'Reload map',
    'Deine Route': 'Your route',
    'Deine Produktauswahl': 'Your product selection',
    'Ausführung wählen': 'Choose design',
    'Holzsockel mit Gravur': 'Wood base with engraving',
    'Holzsockel ohne Gravur': 'Wood base without engraving',
    'Rahmen mit graviertem Passepartout': 'Frame with engraved passe-partout',
    'Wandaufhängung': 'Wall mounting',
    'Nein': 'No',
    'Ja (+1 €)': 'Yes (+€1)',
    'Gezahnte Aufhängung auf der Rückseite.': 'Toothed hanger on the back.',
    'Deine Personalisierung': 'Your personalization',
    'Gravurwunsch': 'Engraving request',
    'Max. 3 Zeilen und insgesamt 120 Zeichen. Beispielwerte – bitte an deine Tour anpassen.': 'Max. 3 lines and 120 characters total. Example values – please adapt to your tour.',
    'Gelände rund um deine Route:': 'Terrain around your route:',
    'Wenig Rand': 'Less border',
    'Mehr Landschaft': 'More landscape',
    'Höhenüberhöhung:': 'Elevation boost:',
    '1× · Natürliche Höhen': '1× · Natural elevation',
    '8× · Markantes Relief': '8× · Strong relief',
    'So könnte deine Erinnerung aussehen.': 'This is how your keepsake could look.',
    'Noch keine Route': 'No route yet',
    'Deine Landschaft wartet auf dich.': 'Your landscape is waiting for you.',
    'Lade eine Route hoch oder probiere die Beispielroute.': 'Upload a route or try the sample route.',
    'Wähle eine Route, um die 3D-Vorschau zu starten.': 'Choose a route to start the 3D preview.',
    'Ansicht zurücksetzen': 'Reset view',
    'Erneut laden': 'Reload',
    'Illustrative Vorschau, kein exaktes Fertigungsbild.': 'Illustrative preview, not an exact production rendering.',
    'Beim Direktkauf gelten deine Routen oder dein Kartenausschnitt und Einstellungen als final. Die Fertigung beginnt nach bestätigter Zahlung, ohne zusätzliche Vorschau-Freigabe. Prüfe deshalb besonders deine Gravur.': 'For direct purchase, your route or map section and settings are final. Production starts after payment is confirmed, without another preview approval. Please check your engraving carefully.',
    'Maße & Hinweise zur Vorschau': 'Dimensions & preview notes',
    'Geländedaten & Quellen': 'Terrain data & sources',
    'Dein Erinnerungsstück bestellen.': 'Order your keepsake.',
    'Lieferadresse und Zahlung erfasst Stripe im nächsten Schritt.': 'Delivery address and payment are collected by Stripe in the next step.',
    'Relief': 'Relief',
    'Produkt': 'Product',
    'Liefergebiet': 'Delivery region',
    'Deutschland': 'Germany',
    'Lieferzeit': 'Delivery time',
    '5–10 Werktage nach Zahlung': '5–10 business days after payment',
    'Gesamtpreis für dein Erinnerungsstück': 'Total price for your keepsake',
    'Inkl. Versand innerhalb Deutschlands. Kein Umsatzsteuerausweis gemäß §19 UStG.': 'Incl. shipping within Germany. No VAT statement under §19 UStG.',
    'Ein Stück pro Bestellung. Sonderformate bitte separat anfragen.': 'One piece per order. Please request custom formats separately.',
    'Der Direktkauf ist noch nicht aktiviert. Du kannst dein Relief weiterhin unverbindlich anfragen.': 'Direct purchase is not activated yet. You can still request your relief without obligation.',
    'Dein Name': 'Your name',
    'E-Mail-Adresse': 'Email address',
    'Deine Auswahl': 'Your selection',
    'Ich habe meine Route oder meinen Kartenausschnitt, Gravur und Einstellungen geprüft. Beim Direktkauf sind sie final; eine weitere Produktionsfreigabe erfolgt nicht. Die 3D-Vorschau ist illustrativ.': 'I have checked my route or map section, engraving, and settings. For direct purchase they are final; no further production approval is required. The 3D preview is illustrative.',
    'Kein gesetzliches Widerrufsrecht:': 'No statutory right of withdrawal:',
    'Kaufhinweise, Vertragsschluss & Widerruf': 'Purchase notes, contract conclusion & withdrawal',
    'Datenschutzhinweise': 'Privacy policy',
    'Dein Untertitel': 'Your subtitle',
    'Jetzt bestellen': 'Order now',
    'Homepage': 'Home',
    'Startseite': 'Home',
    'Menü öffnen': 'Open menu',
    'Menü schließen': 'Close menu',
    'Englisch': 'English',
    'Deutsch': 'German',
    'Sprache': 'Language',
    'Dein Abenteuer als ': 'Your adventure as ',
    '3D-Relief auf Eiche': 'a 3D oak terrain relief',
    'Lade deine Route hoch, gestalte deine Gravur und frage dein persönliches Erinnerungsstück unverbindlich an.': 'Upload your route, personalize your engraving, and request your keepsake with no obligation.',
    'Deine Route gestalten': 'Design your route',
    'Produkte ansehen': 'View products',
    'auf Etsy bestellen': 'Order on Etsy',
    'Einblicke auf Instagram': 'See us on Instagram',
    'Reliefs auf Eiche oder im Rahmen · ab 45 € inkl. Versand in Deutschland': 'Oak or framed reliefs · from €45 incl. shipping in Germany',
    'Handgefertigt in Baden-Württemberg': 'Handmade in Baden-Württemberg',
    'Gestalte deine Erinnerung.': 'Design your keepsake.',
    'Deine Route, drei Ausführungen: auf Eiche mit Gravur, auf kompaktem Holzsockel ohne Gravur oder im weißen Rahmen mit graviertem Passepartout. Alle direkt im Konfigurator gestalten.': 'Your route, three ways: on engraved oak, on a compact unengraved wood base, or in a white frame with an engraved mount. Customize each option in the configurator.',
    'Deine GPX-Route als 10 × 10 cm Relief auf Eiche-Holzsockel (11 × 13,5 × 2 cm). Bis zu drei Zeilen Lasergravur direkt auf Holz.': 'Your GPX route as a 10 × 10 cm relief on an oak base (11 × 13.5 × 2 cm). Add up to three lines of laser engraving directly on the wood.',
    '50 € inkl. Versand innerhalb Deutschlands': '€50 including shipping within Germany',
    'Vier transparente Schutzfüße inklusive. Wandaufhängung optional für 1 € Aufpreis.': 'Includes four transparent protective feet. Optional wall mount for an additional €1.',
    'Deine GPX-Route als 10 × 10 cm Relief auf kompaktem Eiche-Holzsockel (11 × 11 × 2 cm). Ohne Gravur, mit Fokus auf deine Landschaft.': 'Your GPX route as a 10 × 10 cm relief on a compact oak base (11 × 11 × 2 cm). No engraving, keeping the focus on your landscape.',
    '45 € inkl. Versand innerhalb Deutschlands': '€45 including shipping within Germany',
    'Dein 10 × 10 cm Relief im weißen Rahmen (20 × 20 cm Außenmaß) mit weißem Passepartout. Bis zu drei Zeilen Gravur auf dem Passepartout.': 'Your 10 × 10 cm relief in a white frame (20 × 20 cm outside dimensions) with a white mount. Add up to three lines of engraving on the mount.',
    '60 € inkl. Versand innerhalb Deutschlands': '€60 including shipping within Germany',
    'Alle Preise inklusive Versand innerhalb Deutschlands. Kein Umsatzsteuerausweis gemäß §19 UStG. Lieferung in 5–10 Werktagen nach bestätigter Zahlung.': 'All prices include shipping within Germany. VAT is not itemized under §19 UStG. Delivery takes 5–10 business days after confirmed payment.',
    'Individuelle Formate auf Anfrage': 'Custom sizes available on request',
    'Wir können individuelle Formate (z.B. für größere Bergketten oder ganze Länder) abbilden – z.B. 20 × 24 cm Holzsockel mit 18 × 18 cm 3D-Modell. ': 'We can create custom sizes (for example, larger mountain ranges or entire countries), such as a 20 × 24 cm wood base with an 18 × 18 cm 3D model. ',
    'Kontaktiert uns dafür einfach': 'Get in touch to discuss your idea',
    "So funktioniert's": 'How it works',
    'Du kannst hier direkt per Konfigurator und Online-Zahlung bestellen. Etsy bleibt eine alternative Bestellmöglichkeit.': 'Order directly here using the configurator and online payment. Etsy remains an alternative way to order.',
    'Lade deine GPX-Datei in den ': 'Upload your GPX file in the ',
    'Noch keine Datei? Unsere ': 'No file yet? Our ',
    ' hilft dir beim Export.': ' explains how to export one.',
    'Wähle Holzsockel mit Gravur, kompakten Sockel ohne Gravur oder Rahmen mit graviertem Passepartout. Die Vorschau und dein Gesamtpreis passen sich an.': 'Choose an engraved wood base, a compact unengraved base, or a frame with an engraved mount. The preview and total price update to match.',
    'Gestalte bei Holzsockel mit Gravur und Rahmen deinen Text. Geländerand und Höhenüberhöhung sind bei allen Varianten einstellbar. Prüfe vor dem Kauf deine Auswahl – die Vorschau bleibt illustrativ.': 'Personalize the text on the engraved wood base or frame. Terrain margin and vertical exaggeration can be adjusted for every option. Check your choices before purchase; the preview is illustrative.',
    'Bei aktiviertem Direktkauf bezahlst du den angezeigten Gesamtpreis inklusive Versand innerhalb Deutschlands über Stripe. Holzsockel kosten 45 € bzw. 50 €, optional mit Wandaufhängung für 1 € Aufpreis; der Rahmen kostet 60 €. Ob gerade echte Bestellungen möglich sind, zeigt der Konfigurator.': 'When direct purchase is enabled, pay the displayed total, including shipping within Germany, through Stripe. Wood bases cost €45 or €50, with an optional €1 wall mount; the frame costs €60. The configurator shows whether real orders are currently available.',
    'Bei einer echten Bestellung beginnt die Produktion nach bestätigter Zahlung. Die Lieferung innerhalb Deutschlands erfolgt in 5–10 Werktagen nach Zahlung. Testzahlungen lösen keine Produktion aus.': 'For a real order, production starts after payment is confirmed. Delivery within Germany takes 5–10 business days. Test payments do not trigger production.',
    'Alle Etsy-Artikel ansehen': 'View all Etsy items',
    'Impressionen aus der Werkstatt': 'Workshop snapshots',
    'Slider mit Werkstatt-Impressionen': 'Workshop photo slider',
    'Mehr Impressionen unserer Arbeit auf Instagram': 'See more of our work on Instagram',
    'Einblicke in vergangene Veranstaltungen und Begegnungen mit euch.': 'A look back at events and the people we have met.',
    'Rückblick': 'Recap',
    'Wir waren mit einem Stand auf der Expo des Bike Marathon Albstadt vertreten und haben die Trophäen für den Albstadtmeister und die Albstadtmeisterin gesponsort. Das Event war ein voller Erfolg – wir haben uns sehr über den Austausch mit euch gefreut!': 'We had a booth at the Bike Marathon Albstadt expo and sponsored the trophies for the Albstadt champion titles. The event was a great success, and we loved meeting and talking with you!',
    'Das war ein tolles Wochenende bei strahlendem Sonnenschein! Am Samstag waren wir bei der Startnummernausgabe in der Indoor Arena Allgäu vor Ort, am Sonntag haben wir die Finisher am Ziel empfangen. Wir haben uns sehr über den Austausch mit euch gefreut! ': 'It was a wonderful weekend in the sunshine! On Saturday we joined the race-number pickup at the Indoor Arena Allgäu; on Sunday we welcomed finishers at the finish line. We loved meeting and talking with you! ',
    'Wer noch kein Modell seiner Strecke hat: Finisher können ihr personalisiertes Modell (Ultramarathon, Marathon, Hörnerlauf oder Halbmarathon) jetzt noch bequem nach Hause bestellen – wir schicken es per Post.': 'If you do not yet have a model of your route, finishers can still order a personalized model of the ultramarathon, marathon, Hörnerlauf, or half-marathon and have it delivered by post.',
    'Für Veranstalter & Events': 'For event organizers',
    'Ob Marathonfinisher-Prämie, Siegertrophäe oder exklusives Messegeschenk – Peak Memory liefert Serien ': 'Whether as a marathon finisher’s award, winner’s trophy, or exclusive event gift, Peak Memory produces batches ',
    'ab 5 Stück': 'from 5 pieces',
    '. Jedes Modell zeigt die echte Strecke eurer Veranstaltung, individuell graviert mit dem Namen des Teilnehmers.': '. Each model shows your event’s actual route and can be engraved with the participant’s name.',
    'Ab 5 Stück': 'From 5 pieces',
    'Veranstalter-Logo auf Sockel möglich': 'Event logo can be added to the base',
    'Serienanfrage stellen': 'Request a batch order',
    'Die Köpfe hinter Peak Memory': 'Meet the people behind Peak Memory',
    'Peak Memory entstand aus einer einfachen Überzeugung: Jede außergewöhnliche Leistung verdient ein bleibendes Denkmal. Wir sind Sportler und Macher aus Baden-Württemberg, die moderne 3D-Drucktechnologie mit echtem Handwerk verbinden.': 'Peak Memory grew from a simple belief: every extraordinary achievement deserves a lasting keepsake. We are athletes and makers from Baden-Württemberg, combining modern 3D printing with skilled craftsmanship.',
    'Mitgründerin': 'Co-founder',
    'Mitgründer': 'Co-founder',
    'Caro verbindet ihre Leidenschaft für Outdoorsport und alpines Gelände mit technischem Know-how. Durch die Teilnahme an verschiedenen Läufen kennt sie die Bedeutung besonderer sportlicher Momente aus eigener Erfahrung. Bei Peak Memory kümmert sie sich um die Website, den Konfigurator und die Automatisierung – damit aus deiner Route unkompliziert ein persönliches Erinnerungsstück wird.': 'Caro combines her passion for outdoor sports and alpine terrain with technical expertise. Having taken part in several races, she understands firsthand how meaningful special sporting moments can be. At Peak Memory, she looks after the website, configurator, and automation, making it easy to turn your route into a personal keepsake.',
    'Alex ist Sportler und Macher aus Leonberg. Aufgewachsen in einer Handwerkerfamilie, verbindet er praktische Erfahrung mit einer Leidenschaft für den Outdoorsport. Bei Peak Memory steht für ihn die handwerkliche Umsetzung im Mittelpunkt: sorgfältig ausgewählte Materialien, saubere Verarbeitung und ein Blick für die kleinen Details, die jedes Modell besonders machen. Qualität und echte Handwerksarbeit stehen für ihn dabei an erster Stelle.': 'Alex is an athlete and hands-on maker from Leonberg. Raised in a family of craftspeople, he combines practical experience with a passion for outdoor sports. At Peak Memory, he focuses on making each piece with carefully chosen materials, precise workmanship, and attention to the details that make every model special. Quality and genuine craftsmanship come first.',
    'Präzision': 'Precision',
    'Nachhaltigkeit': 'Sustainability',
    'Handwerk': 'Craftsmanship',
    'Fragen, Sonderformate oder Event-Serien? Schreib uns hier. Dein Relief auf Eiche oder im Rahmen gestaltest und bestellst du direkt im Konfigurator, sobald der Direktkauf geöffnet ist.': 'Questions, custom sizes, or event batches? Send us a message here. Design your oak or framed relief in the configurator and order it directly as soon as direct purchase is available.',
    'Für ein Relief mit Route benötigen wir deine GPX-Datei. Eine Landschaft ohne Route wählst du als Kartenausschnitt im Konfigurator.': 'For a relief with a route, we need your GPX file. To create a landscape without a route, choose a map section in the configurator.',
    'Wie bekomme ich meine GPX-Datei? ↗': 'How do I get my GPX file? ↗',
    'Nutze für dein Relief den Konfigurator mit 3D-Vorschau. Für manuelle Unterstützung kannst du hier eine GPX-Datei beifügen oder uns an ': 'Use the configurator with its 3D preview to design your relief. If you need personal help, attach a GPX file here or email us at ',
    ' schreiben. Streckenlinks kannst du für eine persönliche Rücksprache teilen; für die Online-Vorschau brauchst du eine GPX-Datei.': '. You can share route links when discussing your project with us, but the online preview requires a GPX file.',
    'Route hochladen & in 3D gestalten': 'Upload your route & design it in 3D',
    '💡 Tipp: Du kannst die Datei direkt von Strava, Komoot oder Garmin Connect exportieren.': '💡 Tip: You can export the file directly from Strava, Komoot, or Garmin Connect.',
    'Kartenausschnitt aus Anfrage entfernen': 'Remove map section from inquiry',
    'Deine E-Mail-Adresse': 'Your email address',
    'Art der Anfrage': 'Type of inquiry',
    'Art der Anfrage wählen': 'Choose an inquiry type',
    'Frage zu einem individuellen Relief': 'Question about a custom relief',
    'Event-Anfrage (ab 5 Stück)': 'Event inquiry (5 pieces or more)',
    'Sonstiges': 'Other',
    'Deine Nachricht': 'Your message',
    'Zum Beispiel gewünschtes Format, Frage oder Event-Details': 'For example: preferred size, a question, or event details',
    'GPX-Dateien auswählen oder hinzufügen': 'Select or add GPX files',
    'Bis zu 10 GPX-Dateien · zusammen max. 5 MB, 100.000 Punkte und 100 Abschnitte. Bei mehreren Dateien senden wir auch eine kombinierte GPX an die Werkstatt (max. 5 MB).': 'Up to 10 GPX files · max. 5 MB combined, 100,000 points, and 100 segments. For multiple files, we also send a combined GPX to the workshop (max. 5 MB).',
    'Optionaler Anhang, max. 5 MB.': 'Optional attachment, max. 5 MB.',
    'GPX-Dateien für deine Anfrage': 'GPX files for your inquiry',
    'Nachricht senden': 'Send message',
    'Häufige Fragen': 'Frequently asked questions',
    'Alles, was du vor deiner Bestellung wissen möchtest.': 'Everything you need to know before placing an order.',
    'Wie funktioniert das mit der GPX-Datei?': 'How does the GPX file work?',
    'Du kannst deine GPX-Datei in unserem ': 'Upload your GPX file to our ',
    ' hochladen, dein Relief in 3D ansehen und deine Gravur gestalten. Der Direktkauf ist aktuell nur im Testbetrieb; echte Bestellungen werden dort noch nicht angenommen. Du kannst uns weiterhin unverbindlich anfragen. Wie du die Datei aus Strava, Komoot oder Garmin Connect bekommst, erklären wir in unserer ': ', view your relief in 3D, and design your engraving. Direct purchase is currently in test mode and real orders are not being accepted there yet. You can still send us a no-obligation inquiry. Our ',
    '. Die Online-Vorschau ist illustrativ. Beim Direktkauf sind deine Einstellungen final; es gibt keine zusätzliche Produktionsfreigabe.': ' explains how to get a file from Strava, Komoot, or Garmin Connect. The online preview is illustrative. For direct purchases, your settings are final and no further production approval is requested.',
    'Welche Routen eignen sich?': 'Which routes are suitable?',
    'Wanderungen, Trailruns, Mountainbike-Touren, Gravel- und Rennradrouten eignen sich grundsätzlich. Die Online-Vorschau lädt öffentliche Geländehöhen; Höhenangaben in deiner GPX-Datei sind nicht erforderlich. Unterstützt werden bis zu 5 MB, 100.000 Punkte und 100 Streckenabschnitte außerhalb der Polarregionen. Je mehr Höhenunterschied, desto markanter das Relief. Strecken in flachem Gelände können weniger plastisch wirken.': 'Hikes, trail runs, mountain bike rides, gravel routes, and road cycling routes are generally suitable. The online preview loads public elevation data; your GPX file does not need to include elevation. We support files up to 5 MB, 100,000 points, and 100 track segments outside polar regions. Greater elevation changes create more pronounced relief; routes across flat terrain may look less three-dimensional.',
    'Wo wird meine Gravur angebracht?': 'Where will my engraving go?',
    'Beim 11 × 13,5 cm Eiche-Holzsockel wird dein Text direkt auf Holz gelasert. Beim weißen Rahmen kommt die Gravur auf das weiße Passepartout. Du kannst bis zu drei Zeilen eingeben, zum Beispiel Name, Datum oder Streckenname. Der kompakte 11 × 11 cm Sockel wird ohne persönliche Gravur gefertigt.': 'On the 11 × 13.5 cm oak base, your text is laser-engraved directly into the wood. On the white frame, the engraving goes on the white mount. You can enter up to three lines, such as a name, date, or route name. The compact 11 × 11 cm base is made without personal engraving.',
    'Wie lange dauert die Lieferung?': 'How long does delivery take?',
    'Für alle drei Produkte im Konfigurator beträgt die Lieferzeit innerhalb Deutschlands bei einer echten, bestätigten Zahlung 5–10 Werktage. Für Sonderformate besprechen wir den Zeitplan persönlich. Testzahlungen lösen keine Produktion oder Lieferung aus.': 'For all three products, delivery within Germany takes 5–10 business days after a real payment is confirmed. We will discuss timing for custom sizes with you. Test payments do not trigger production or delivery.',
    'Kann ich das als Geschenk bestellen?': 'Can I order this as a gift?',
    'Ja! Beim Direktkauf kannst du bei Stripe eine Lieferadresse innerhalb Deutschlands angeben. Für eine persönliche Grußkarte oder besondere Wünsche kontaktiere uns bitte vor einer Bestellung. Alternativ kannst du über Etsy bestellen.': 'Yes! For direct purchases, you can enter a delivery address in Germany in Stripe. Please contact us before ordering if you would like a personal message card or have a special request. You can also order through Etsy.',
    'Wie pflege ich mein Modell?': 'How should I care for my model?',
    'Am besten schützt du dein Modell vor direkter Sonneneinstrahlung und starker Hitze, damit sich das PLA nicht verformt.': 'Keep your model away from direct sunlight and high heat to prevent the PLA from warping.',
    'Gibt es Mengenrabatte für Events oder Firmen?': 'Are volume discounts available for events or companies?',
    'Ja! Ab 5 Stück bieten wir Serienpreise für Veranstalter, Firmen und Events an. Jedes Modell kann individuell graviert werden – zum Beispiel mit dem Namen des Teilnehmers. Schreib uns über das ': 'Yes! We offer batch pricing for event organizers, companies, and events for orders of 5 pieces or more. Each model can be engraved individually, for example with a participant’s name. Contact us using the ',
    ' oder direkt auf Etsy.': ' or message us directly on Etsy.',
    'Impressum': 'Legal notice',
    'Datenschutz': 'Privacy',
    'Kauf & Widerruf': 'Purchase & withdrawal',
    'Kaufhinweise & Widerruf': 'Purchase information & withdrawal',
    'Datenschutzerklärung': 'Privacy policy',
    'Häufig gestellte Fragen': 'Frequently asked questions',
    'Ablauf in 5 Schritten': '5-step process',
    'Vorheriger Schritt': 'Previous step',
    'Nächster Schritt': 'Next step',
    'Schließen': 'Close',
    'Anleitung auswählen': 'Choose a guide',
    'Keine Aufzeichnung?': 'No recording?',
    'Wie bekomme ich meine GPX-Datei?': 'How do I get my GPX file?',
    'Deine Tour steckt in einer App oder auf deiner Sportuhr? Eine GPX-Datei macht daraus eine Route für dein Erinnerungsstück. Hier zeigen wir dir, wie du sie herunterlädst.': 'Is your route saved in an app or on your sports watch? A GPX file turns it into a route for your keepsake. Here’s how to download it.',
    'Was ist eine GPX-Datei?': 'What is a GPX file?',
    'Eine GPX-Datei enthält die GPS-Punkte deiner Strecke. So können wir den Verlauf deiner Route auf dem Gelände darstellen. Ein Screenshot, ein Foto der Karte oder ein Link zur Aktivität reicht für den Konfigurator nicht aus.': 'A GPX file contains the GPS points from your route. It lets us show the route across the terrain. A screenshot, photo of a map, or link to an activity is not enough for the configurator.',
    'Du brauchst eine Datei mit der Endung ': 'You need a file with the extension ',
    '. Höhendaten sind nicht erforderlich – die Landschaft laden wir für die Vorschau separat.': '. Elevation data is not required; we load the terrain separately for the preview.',
    'App oder Website': 'App or website',
    'Melde dich bei ': 'Sign in to ',
    ' an.': '.',
    'Öffne in deinem Profil eine gespeicherte Route oder eine abgeschlossene Aktivität.': 'Open a saved route or completed activity in your profile.',
    'Wähle ': 'Choose ',
    ' und speichere die Datei auf deinem Gerät.': ' and save the file to your device.',
    'Die Region, in der die Tour startet, muss in deinem Komoot-Konto freigeschaltet sein. Komoot weist dich darauf hin, falls sie fehlt.': 'The region where your tour starts must be unlocked in your Komoot account. Komoot will let you know if it is not.',
    'Export-Hilfe von Komoot ↗': 'Komoot export help ↗',
    'Im Webbrowser': 'In a web browser',
    'Melde dich auf ': 'Sign in to ',
    ' an – am einfachsten am Computer.': ' — using a computer is easiest.',
    'Öffne deine eigene aufgezeichnete Aktivität.': 'Open an activity you recorded yourself.',
    'Öffne das ': 'Open the ',
    ' und wähle ': ' and choose ',
    '.': '.',
    'Diese Anleitung bezieht sich auf deine eigenen Aktivitäten auf der Website, nicht auf die Strava-App. Am Handy kannst du die Desktop-Ansicht des Browsers versuchen.': 'These instructions are for your own activities on the website, not the Strava app. On a phone, you can try switching your browser to desktop view.',
    'Export-Hilfe von Strava ↗': 'Strava export help ↗',
    'Synchronisiere deine Uhr, damit die Tour in Garmin Connect erscheint.': 'Sync your watch so the activity appears in Garmin Connect.',
    ' im Browser an und öffne unter ': ' in your browser and open the activity under ',
    ' die gewünschte Tour.': ' and select the route you want.',
    'Wähle ausdrücklich GPX, nicht den Originalexport als FIT-Datei. Die Aktivität muss GPS-Daten enthalten; ein Indoor-Training ohne Strecke ist nicht geeignet.': 'Be sure to select GPX, not the original FIT file. The activity must contain GPS data; an indoor workout without a route will not work.',
    'Export-Hilfe von Garmin ↗': 'Garmin export help ↗',
    'Keine Aufzeichnung vorhanden?': 'No route recording?',
    'Auch ohne Sportuhr': 'Even without a sports watch',
    'Für eine Wettkampfstrecke findest du oft einen GPX-Download auf der Website des Veranstalters. Achte auf die richtige Distanz und das richtige Veranstaltungsjahr.': 'For a race route, you can often download a GPX file from the event organizer’s website. Make sure you choose the correct distance and event year.',
    'Du kannst deine Tour auch in einem Routenplaner nachzeichnen, zum Beispiel mit ': 'You can also draw your route in a route planner, for example with ',
    ': Route anlegen, den gewünschten Weg auf der Karte zeichnen und anschließend als GPX exportieren.': ': create a route, draw the path you want on the map, then export it as a GPX file.',
    'Das ist eine geplante oder nachgezeichnete Strecke, keine echte Aufzeichnung deiner Tour. Prüfe den Verlauf vor dem Upload. Der Peak Memory-Konfigurator selbst bietet keine Zeichenfunktion.': 'This is a planned or manually traced route, not a recording of your actual activity. Check the route before uploading. The Peak Memory configurator does not include a route-drawing tool.',
    'Datei gespeichert? Jetzt wird daraus dein Relief.': 'File saved? Now let’s turn it into your relief.',
    'Suche die Datei im Ordner ': 'Find the file in your ',
    '. Auf dem iPhone findest du sie je nach Speicherort in der App ': '. On an iPhone, depending on where you saved it, look in the ',
    '; speichere sie bei Bedarf über „In Dateien sichern“.': ' app; if needed, save it using “Save to Files”.',
    'Öffne den Peak Memory-Konfigurator und wähle ': 'Open the Peak Memory configurator and choose ',
    '. Am Computer kannst du Dateien auch in das Upload-Feld ziehen.': '. On a computer, you can also drag files into the upload area.',
    'Warte auf die Gelände-Vorschau und passe Gravur, Geländerand und Höhenüberhöhung an.': 'Wait for the terrain preview, then adjust the engraving, terrain margin, and vertical exaggeration.',
    'Bis zu 10 GPX-Dateien für ein Relief, zum Beispiel einzelne Triathlon-Teilstrecken oder Tagesetappen. Zusammen maximal 5 MB, 100.000 Punkte und 100 Abschnitte; auch die kombinierte GPX darf höchstens 5 MB groß sein. Alle Routen erscheinen rot auf einem gemeinsamen Gelände, ohne Verbindungslinien zwischen getrennten Abschnitten. Weit entfernte Etappen verkleinern die sichtbaren Details. Fehlende GPS-Strecken werden nicht ergänzt.': 'You can use up to 10 GPX files for one relief, for example individual triathlon legs or daily stages. Together, they may contain no more than 5 MB, 100,000 points, and 100 segments; the combined GPX file must also be no larger than 5 MB. All routes appear in red on the same terrain, without lines connecting separate segments. Distant stages reduce the visible detail. Missing GPS tracks are not added.',
    'FIT, TCX, ZIP und Kartenbilder werden nicht unterstützt. Eine andere Dateiendung einfach in .gpx umzubenennen wandelt die Datei nicht um. Strava, Komoot und Garmin werden weiterhin über den GPX-Export genutzt; eine direkte Konto-Verbindung wird derzeit nicht angeboten.': 'FIT, TCX, ZIP, and map images are not supported. Renaming another file extension to .gpx does not convert the file. Strava, Komoot, and Garmin are used through GPX export; direct account connections are not currently available.',
    'Prüfe vor dem Teilen sensible Orte wie deine Wohnadresse. Falls du einen Track in einem externen Tool bearbeitest, beachte dessen Datenschutzhinweise. Bei Peak Memory werden die GPX-Dateien für die Vorschau im Browser verarbeitet und erst mit deiner Bestellung oder Anfrage an uns gesendet. Dabei bleiben alle Originaldateien erhalten; bei mehreren Dateien entsteht zusätzlich eine kombinierte GPX. Die Geländekacheln verraten dem Datenanbieter die ungefähre Region.': 'Before sharing, check for sensitive locations such as your home address. If you edit a track using an external tool, review its privacy information. Peak Memory processes GPX files in your browser for the preview; they are sent to us only with your order or inquiry. All original files are kept, and multiple files also produce a combined GPX. Terrain tiles reveal the approximate region to the data provider.',
    'Route hochladen & gestalten': 'Upload your route & design your relief',
    'Du kommst nicht weiter?': 'Need more help?',
    'Menünamen können sich je nach App-Version und Sprache unterscheiden. Nutze die verlinkte Anbieter-Hilfe oder schreib uns, welche App du verwendest und an welcher Stelle es hakt. Schicke uns niemals dein Passwort oder deine Zugangsdaten.': 'Menu names may differ depending on the app version and language. Use the linked provider help or tell us which app you are using and where you are stuck. Never send us your password or login details.',
    'Zum Inhalt': 'Skip to content',
    'Peak Memory Startseite': 'Peak Memory homepage',
    'Navigation': 'Navigation',
    'DE': 'DE',
    'EN': 'EN',
    'Abenteuer als 3D-Relief': 'Adventure as a 3D relief',
    'Produkt ansehen': 'View product',
    'Karte zur Geländeauswahl': 'Map for choosing terrain',
    'Dein Relief': 'Your relief',
    'Geländedaten & Quellen': 'Terrain data & sources',
    'Öffentliche Terrarium-Höhendaten von ': 'Public Terrarium elevation data by ',
    ', bereitgestellt als 512 × 512 Pixel WebP-Kacheln. ': ', provided as 512 × 512 pixel WebP tiles. ',
    'Datenquellen und Attribution': 'Data sources and attribution',
    'Technische Informationen': 'Technical information',
    'Maße & Hinweise zur Vorschau': 'Dimensions & preview notes',
    '10 × 10 cm Relief auf 11 × 13,5 × 2 cm Eiche-Holzsockel.': '10 × 10 cm relief on an 11 × 13.5 × 2 cm oak base.',
    'Die Gelände-Vorschau nutzt öffentliche Höhendaten mit regional unterschiedlicher Auflösung. Höhen sind ': 'The terrain preview uses public elevation data with varying regional resolution. Elevation is scaled ',
    '-fach': '×',
    ' skaliert; lange oder komplexe Strecken werden nur für die Darstellung vereinfacht. Materialien, natürliche Holzmaserung, Rahmenprofil, Passepartout, Gravur und Geländedetails können vom gefertigten Produkt abweichen. Beim Kauf werden alle Original-GPX-Dateien und bei mehreren Dateien zusätzlich eine kombinierte GPX übermittelt. Bei Kartenausschnitten werden stattdessen die genauen Ausschnittskoordinaten gespeichert. Für eine unverbindliche GPX-Anfrage lade deine Dateien im Kontaktformular erneut hoch; einen bestätigten Kartenausschnitt kannst du über „Zum Kontakt“ übernehmen.': 'for preview only; long or complex routes are simplified for display. Materials, natural wood grain, frame profile, mount, engraving, and terrain details may differ from the finished product. For purchases, all original GPX files are sent, plus a combined GPX when multiple files are used. For map sections, the exact section coordinates are stored instead. For a no-obligation GPX inquiry, upload your files again in the contact form; you can transfer a confirmed map section using “Contact us”.',
    'Handgefertigt in Baden-Württemberg': 'Handmade in Baden-Württemberg',
    'Anschrift': 'Address',
    'Vertreten durch': 'Represented by',
    'Haftung für Inhalte': 'Liability for content',
    'Haftung für Links': 'Liability for links',
    'Urheberrecht': 'Copyright',
    'Präambel': 'Preamble',
    'Verantwortlicher': 'Controller',
    'Übersicht der Verarbeitungen': 'Overview of processing activities',
    'Maßgebliche Rechtsgrundlagen': 'Legal bases',
    'Sicherheitsmaßnahmen': 'Security measures',
    'Internationale Datentransfers': 'International data transfers',
    'Allgemeine Informationen zur Datenspeicherung und Löschung': 'General information on data storage and deletion',
    'Verkäufer und Kontakt': 'Seller and contact',
    'Produkt und Gesamtpreis': 'Product and total price',
    'Wandaufhängung und Schutzfüße bei Holzsockeln': 'Wall mount and protective feet for wood bases',
    'Bestellablauf und Vertragsschluss': 'Ordering process and conclusion of contract',
    'Zahlung, Fertigung und Lieferung': 'Payment, production, and delivery',
    'Kein gesetzliches Widerrufsrecht bei dieser Personalisierung': 'No statutory right of withdrawal for this personalized product',
    'Vertragssprache und Bestellbestätigung': 'Contract language and order confirmation',
    'Stand: 12. Oktober 2026. Diese Hinweise gelten für den personalisierten Direktkauf auf dieser Website.': 'Updated: October 12, 2026. This information applies to personalized direct purchases on this website.',
    'Angaben gemäß § 5 Digitale-Dienste-Gesetz (DDG).': 'Information pursuant to Section 5 of the German Digital Services Act (DDG).',
    'Peak Memory GbR': 'Peak Memory GbR',
    'Deutschland': 'Germany',
    'Telefon: ': 'Phone: ',
    'Für eigene Inhalte auf diesen Seiten sind wir nach den allgemeinen gesetzlichen Vorschriften verantwortlich. Wenn Sie auf rechtswidrige Inhalte aufmerksam werden, kontaktieren Sie uns bitte über die oben genannten Kontaktdaten.': 'We are responsible for our own content on these pages in accordance with general law. If you become aware of unlawful content, please contact us using the contact details above.',
    'Unser Angebot enthält Links zu externen Websites Dritter, deren Inhalte von den jeweiligen Anbietern verantwortet werden. Bei Hinweisen auf rechtswidrige Inhalte prüfen wir die betreffende Verlinkung. Unsere gesetzlichen Pflichten bleiben unberührt.': 'Our website contains links to external third-party websites whose content is the responsibility of their respective providers. If we receive information about unlawful content, we will review the relevant link. Our statutory obligations remain unaffected.',
    'Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.': 'The content and works created by the site operators on these pages are subject to German copyright law. Reproduction, adaptation, distribution, and any form of use beyond the limits of copyright law require the written consent of the respective author or creator.',
    'Diese Datenschutzerklärung erläutert die Verarbeitung personenbezogener Daten beim Besuch von peak-memory.de, bei der Nutzung der GPX-Vorschau, bei Anfragen und bei einem freigegebenen Direktkauf. Für externe Plattformen wie Etsy und Instagram gelten zusätzlich die Datenschutzhinweise des jeweiligen Anbieters; diese Erklärung ersetzt keine gesonderten Hinweise zu unseren dortigen Präsenzen.': 'This privacy policy explains how personal data is processed when visiting peak-memory.de, using the GPX preview, making inquiries, and placing an enabled direct order. The privacy information of external platforms such as Etsy and Instagram also applies; this policy does not replace separate notices for our profiles on those platforms.',
    'Die verwendeten Begriffe sind nicht geschlechtsspezifisch.': 'The terms used are gender-neutral.',
    'Stand: 12. Oktober 2026': 'Updated: October 12, 2026',
    'Vertreten durch Carolin Merz und Alexander Weimer.': 'Represented by Carolin Merz and Alexander Weimer.',
    'Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer Verarbeitung zusammen.': 'The following overview summarizes the types of data processed and the purposes of processing.',
    'Arten der verarbeiteten Daten:': 'Types of data processed:',
    'Name, E-Mail-Adresse, Nachrichten, GPX-Dateien mit Orts- und gegebenenfalls Zeitangaben, Gravur und Konfiguration, Vorschaubilder, Lieferadresse, Bestell- und Zahlungsreferenzen, Zahlungsstatus sowie IP-Adresse, technische Verbindungsdaten und Sicherheitsprotokolle.': 'Name, email address, messages, GPX files containing location and possibly time data, engraving and configuration, preview images, delivery address, order and payment references, payment status, IP address, technical connection data, and security logs.',
    'Kategorien betroffener Personen:': 'Categories of data subjects:',
    'Besucher, Anfragende und Käufer.': 'Visitors, people making inquiries, and buyers.',
    'Zwecke der Verarbeitung:': 'Purposes of processing:',
    'Website und Vorschau bereitstellen, Anfragen beantworten, Bestellungen und Zahlungen zuordnen, personalisierte Produkte fertigen und liefern, Bestätigungen versenden, Missbrauch verhindern und gesetzliche Pflichten erfüllen.': 'Providing the website and preview, responding to inquiries, matching orders and payments, making and delivering personalized products, sending confirmations, preventing misuse, and meeting legal obligations.',
    'Maßgebliche Rechtsgrundlagen nach der DSGVO:': 'Relevant legal bases under the GDPR:',
    'Im Folgenden erhalten Sie eine Übersicht der Rechtsgrundlagen der DSGVO, auf deren Basis wir personenbezogene Daten verarbeiten.': 'Below is an overview of the legal bases under the GDPR on which we process personal data.',
    'Zusätzlich gelten nationale Datenschutzregelungen in Deutschland, insbesondere das Bundesdatenschutzgesetz (BDSG).': 'Additional German data protection laws apply, in particular the Federal Data Protection Act (BDSG).',
    'Vertragserfüllung und vorvertragliche Anfragen (Art. 6 Abs. 1 lit. b DSGVO)': 'Contract performance and pre-contractual inquiries (Art. 6(1)(b) GDPR)',
    '– Insbesondere erforderliche steuer- und handelsrechtliche Dokumentation.': '– In particular, required tax and commercial records.',
    'Verarbeitung:': 'Processing:',
    'Informationen zur Auftragsverarbeitung': 'Data processing information',
    'Datenschutzhinweise der OpenStreetMap Foundation': 'OpenStreetMap Foundation privacy policy',
    'Stripe-Datenschutzcenter': 'Stripe Privacy Center',
    'WhatsApp-Datenschutzhinweise': 'WhatsApp privacy policy',
    'Rechtliche Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO)': 'Legal obligation (Art. 6(1)(c) GDPR)',
    'Berechtigte Interessen (Art. 6 Abs. 1 lit. f DSGVO)': 'Legitimate interests (Art. 6(1)(f) GDPR)',
    'Einwilligung (Art. 6 Abs. 1 lit. a DSGVO)': 'Consent (Art. 6(1)(a) GDPR)',
    '– Bearbeitung Ihrer Anfragen, angeforderte Personalisierung, Bestellabwicklung, Zahlung und Lieferung.': '– Handling your inquiries, requested personalization, order processing, payment, and delivery.',
    '– Sichere Bereitstellung der Website, Schutz vor Missbrauch und Nachweis sowie Abwehr von Ansprüchen.': '– Secure operation of the website, protection against misuse, and establishing and defending legal claims.',
    '– Soweit wir für eine gesonderte, freiwillige Verarbeitung eine Einwilligung einholen. Die Bestätigung Ihrer finalen Produktauswahl ist keine pauschale Datenschutz-Einwilligung.': '– Where we obtain consent for a separate, voluntary form of processing. Confirming your final product selection is not blanket consent to data processing.',
    'Im privaten Cloudflare-Checkout-Speicher beginnt die automatisierte Bereinigung unbezahlter Vorgänge nach 7 Tagen ab Checkout-Start. Bei bezahlten Vorgängen beginnt sie nach 90 Tagen ab Zahlungsbestätigung, sobald der E-Mail-Dienst beide Bestellbenachrichtigungen angenommen hat. Bei noch ausstehenden Benachrichtigungen bleiben die Daten für die erneute Zustellung erhalten; bei technischen Fehlern wird die Bereinigung wiederholt. Gelöscht werden dort insbesondere GPX, Vorschaubild, Kontakt-, Konfigurations- und Versanddaten. Ein technischer Restdatensatz mit Bestell- und Zahlungsreferenz, Status, Zeitangaben und Prüfdaten bleibt zur Vermeidung doppelter Zahlungen erhalten; seine Zuordenbarkeit wird durch diese Bereinigung nicht vollständig ausgeschlossen.': 'Automated cleanup of unpaid sessions in private Cloudflare checkout storage begins 7 days after checkout starts. For paid sessions, cleanup begins 90 days after payment is confirmed, once the email service has accepted both order notifications. Data remains available for redelivery while notifications are pending; cleanup is retried if a technical error occurs. The cleanup removes, in particular, GPX files, preview images, contact, configuration, and shipping data. A technical record containing the order and payment references, status, timestamps, and verification data remains to prevent duplicate payments; this cleanup does not fully eliminate the possibility of linking that record to an order.',
    'Für die Online-Vorschau wird Ihre GPX-Datei lokal im Browser gelesen und nicht dauerhaft im Browser gespeichert. Die vollständige Datei wird erst mit dem Absenden einer Anfrage oder dem Start des Checkouts an uns übermittelt. Zur Darstellung des Geländes fordert der Browser über unsere Cloudflare-Endpunkte öffentliche Mapterhorn-Höhenkacheln an. Die Kacheladressen lassen Rückschlüsse auf die ungefähre Region zu, enthalten aber nicht die vollständige Route. Cloudflare verarbeitet bei diesen Anfragen die IP-Adresse; Mapterhorn erhält die Kachelanfragen von unserem Server, nicht unmittelbar von Ihrem Browser. Es werden keine Routen-Konten oder öffentlich teilbaren Routen angelegt. Die Verarbeitung dient der von Ihnen angeforderten Produktvorschau und vorvertraglichen Personalisierung (Art. 6 Abs. 1 lit. b DSGVO); technische Absicherung und Ratenbegrenzung erfolgen nach Art. 6 Abs. 1 lit. f DSGVO.': 'For the online preview, your GPX file is read locally in your browser and is not stored there permanently. The complete file is sent to us only when you submit an inquiry or start checkout. To display the terrain, your browser requests public Mapterhorn elevation tiles through our Cloudflare endpoints. Tile addresses can reveal the approximate region, but not the complete route. Cloudflare processes the IP address for these requests; Mapterhorn receives tile requests from our server, not directly from your browser. No route accounts or publicly shareable routes are created. This processing provides the product preview and pre-contractual personalization you requested (Art. 6(1)(b) GDPR); technical security and rate limiting are based on Art. 6(1)(f) GDPR.',
    'Alternativ zur GPX-Route können Sie einen Kartenausschnitt ohne Route auswählen. Die Auswahl bleibt bis zum Absenden im Arbeitsspeicher Ihres Browsers. Erst beim Start des Checkouts speichern wir die genauen Ausschnittskoordinaten als Teil der Konfiguration; beim bewussten Übernehmen über „Zum Kontakt“ werden sie mit dem Absenden Ihrer Anfrage an unser Postfach übermittelt. Für Kartenausschnitte wird keine GPX-Datei erzeugt. Ausschnittskoordinaten unterliegen denselben oben beschriebenen Zwecken, Rechtsgrundlagen und Löschfristen wie andere Konfigurationsdaten und werden mit der Konfiguration an unsere Werkstatt übermittelt, nicht an Stripe.': 'Alternatively, you can choose a map section without a route. The selection remains in your browser memory until you submit it. We store the exact section coordinates as part of the configuration only when checkout starts; if you deliberately transfer them using “Contact us”, they are sent to our inbox when you submit your inquiry. No GPX file is created for map sections. Section coordinates are subject to the same purposes, legal bases, and deletion periods described above for other configuration data. They are sent to our workshop with the configuration, not to Stripe.',
    'Erst wenn Sie „Kartenausschnitt“ wählen, lädt Ihr Browser Kartenkacheln direkt von tile.openstreetmap.org, einem Dienst der OpenStreetMap Foundation. Dabei werden Ihre IP-Adresse, Browserdaten, unsere Website als Herkunft und die für die sichtbare Kartenregion erforderlichen Kacheladressen übermittelt. Es werden weder Ihre GPX-Dateien noch Gravuren an OpenStreetMap gesendet. Die Kartenansicht wird nur auf Ihre Anforderung bereitgestellt; Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO zur gewünschten vorvertraglichen Personalisierung. Kartenkacheln können nach den Cache-Vorgaben des Anbieters im Browser zwischengespeichert werden. Die Foundation hat ihren Sitz im Vereinigten Königreich; ihre technischen Dienste können international betrieben werden. Einzelheiten:': 'Your browser loads map tiles directly from tile.openstreetmap.org, a service of the OpenStreetMap Foundation, only when you choose “Map section”. This sends your IP address, browser data, our website as the referrer, and the tile addresses needed for the visible map area. Your GPX files and engravings are not sent to OpenStreetMap. The map is provided only at your request; the legal basis is Art. 6(1)(b) GDPR for the pre-contractual personalization you requested. Map tiles may be cached in your browser according to the provider’s cache rules. The Foundation is based in the United Kingdom; its technical services may operate internationally. Details:',
    '. Die Höhendaten für das Relief werden weiterhin über unseren Cloudflare-Endpunkt geladen.': '. Elevation data for the relief continues to be loaded through our Cloudflare endpoint.',
    'Ob der Direktkauf freigegeben ist und ob ein Test- oder Live-Modus vorliegt, wird im Konfigurator angezeigt. Bei einem freigegebenen Checkout speichern wir vor der Weiterleitung Name, E-Mail-Adresse, Original-GPX, Gravur und Konfiguration, Vorschaubild, Bestellreferenz, Bestätigung der finalen Auswahl sowie technische Zuordnungsdaten privat bei Cloudflare. Diese Angaben werden benötigt, um die personalisierte Bestellung zuzuordnen und abzuwickeln. Ohne die erforderlichen Kontakt- und Konfigurationsdaten kann der Checkout nicht gestartet werden; eine unverbindliche Anfrage bleibt möglich.': 'The configurator indicates whether direct purchase is enabled and whether it is in test or live mode. Before redirecting to an enabled checkout, we privately store your name, email address, original GPX file, engraving and configuration, preview image, order reference, confirmation of your final selection, and technical matching data with Cloudflare. This information is needed to identify and process your personalized order. Checkout cannot start without the required contact and configuration data; you can still submit a no-obligation inquiry.',
    'Für die Zahlung leiten wir auf die gehostete Stripe-Zahlungsseite weiter. Stripe erhält von uns E-Mail-Adresse, Bestellreferenz und Angaben zum Angebot, nicht die GPX-Datei oder das Vorschaubild. Stripe erfasst dort Liefer- und Zahlungsdaten sowie technische Verbindungsdaten. Kartennummern und Kartenprüfziffern werden nicht in unserem Website-Formular erfasst. Über authentifizierte Stripe-Mitteilungen erhalten und speichern wir Zahlungsstatus, Zahlungsreferenz sowie Käufer- und Versandinformationen. Diese dienen der Zahlungszuordnung und bei echten Bestellungen der Fertigung und Lieferung. Für die Lieferung werden die erforderlichen Empfänger- und Adressdaten an den beauftragten Versanddienstleister übermittelt, nicht die GPX-Datei.': 'For payment, we redirect you to Stripe’s hosted payment page. We send Stripe your email address, order reference, and offer details, but not your GPX file or preview image. Stripe collects delivery, payment, and technical connection data there. Our website form does not collect card numbers or security codes. Through authenticated Stripe messages, we receive and store payment status and reference, as well as buyer and shipping information. These details are used to match the payment and, for real orders, to make and deliver the product. The required recipient and address details are sent to the shipping provider; the GPX file is not.',
    'Nach verifizierter Zahlung versendet Resend Bestelldaten einschließlich GPX, Konfiguration und Vorschaubild an unser WEB.DE-Postfach und eine Bestätigung mit Bestell- und Versandinformationen an die angegebene Käufer-E-Mail-Adresse. Die Verarbeitung zur Vertragsanbahnung, Zahlung, Fertigung und Lieferung beruht auf Art. 6 Abs. 1 lit. b DSGVO, gesetzlich erforderliche Dokumentation auf Art. 6 Abs. 1 lit. c DSGVO und Sicherheits- sowie Doppelzahlungsschutz auf Art. 6 Abs. 1 lit. f DSGVO. Stripe verarbeitet Daten für bestimmte eigene Zwecke, etwa Betrugsprävention und gesetzliche Pflichten, auch in eigener Verantwortung; Einzelheiten erläutert Stripe in seinen Datenschutzhinweisen.': 'After payment is verified, Resend sends order data, including the GPX file, configuration, and preview image, to our WEB.DE inbox, and sends a confirmation with order and shipping information to the buyer’s email address. Processing for contract preparation, payment, production, and delivery is based on Art. 6(1)(b) GDPR; legally required records on Art. 6(1)(c) GDPR; and security and duplicate-payment prevention on Art. 6(1)(f) GDPR. Stripe also processes data independently for certain purposes, such as fraud prevention and legal obligations. See Stripe’s privacy policy for details.',
    'Wenn die interne WhatsApp-Benachrichtigung für echte Bestellungen aktiviert ist, übermitteln wir nach bestätigter Zahlung die Bestellreferenz, Produktbezeichnung und den Bestellnamen über die WhatsApp Business Platform an unsere eigene Empfangsnummer, damit wir die Fertigung beginnen können. Wir senden darüber keine Nachricht an Käufer und übermitteln dafür weder deren Telefonnummer noch Lieferadresse, GPX-Datei oder Konfiguration. Sandbox-Bestellungen lösen keine WhatsApp-Nachricht aus. Meta verarbeitet die Angaben zur Übermittlung der Nachricht; Einzelheiten und die für unseren Zugang geltende Meta-Gesellschaft prüfen wir bei der Einrichtung.': 'If internal WhatsApp notifications for real orders are enabled, after payment is confirmed we send the order reference, product name, and order name through the WhatsApp Business Platform to our own receiving number so we can begin production. We do not message buyers through this service or send their phone number, delivery address, GPX file, or configuration. Sandbox orders do not trigger WhatsApp messages. Meta processes the information to deliver the message; we will verify the details and the Meta entity applicable to our account during setup.',
    'Im ausdrücklich gekennzeichneten Sandbox-Testmodus werden keine echten Zahlungen oder Fertigungsaufträge ausgelöst. Verwenden Sie dort nur Testdaten und Stripe-Testkarten. E-Mails werden auch im Testmodus tatsächlich versendet. Test- und Live-Bestellspeicher sind getrennt; die beschriebenen technischen Bereinigungsfristen gelten für beide.': 'In the clearly labeled sandbox test mode, no real payments or production orders are triggered. Use only test data and Stripe test cards. Emails are sent even in test mode. Test and live order storage are separate; the technical cleanup periods described above apply to both.',
    'Cloudflare, Inc., USA, für Hosting, Anfrageverarbeitung, Sicherheitsfunktionen und privaten Bestellspeicher.': 'Cloudflare, Inc., USA, for hosting, inquiry processing, security features, and private order storage.',
    'Stripe-Gesellschaften entsprechend Dienst und Region, für Zahlungsabwicklung und eigene Sicherheits- und gesetzliche Zwecke. Welche Gesellschaft in welcher Rolle handelt, erläutert das': 'Stripe entities, depending on the service and region, for payment processing and their own security and legal purposes. Stripe explains which entity acts in which role in its',
    '; siehe auch ': '; see also ',
    'Plus Five Five, Inc., USA, für Versand von Anfrage- und Bestell-E-Mails einschließlich der beschriebenen Anhänge.': 'Plus Five Five, Inc., USA, for sending inquiry and order emails, including the attachments described above.',
    'und': 'and',
    'Übermittlung der bei einer aktivierten internen Live-Bestellbenachrichtigung genannten Bestellangaben an unsere eigene WhatsApp-Empfangsnummer. Die konkret zuständige Meta-Gesellschaft und die anwendbaren Bedingungen werden vor Aktivierung geprüft.': 'Sending the order details described above to our own WhatsApp receiving number when internal live-order notifications are enabled. The specific Meta entity and applicable terms will be checked before activation.',
    '1&1 Mail & Media GmbH, Deutschland, für Empfang und Speicherung unserer Anfrage- und Bestellkorrespondenz.': '1&1 Mail & Media GmbH, Germany, for receiving and storing our inquiry and order correspondence.',
    'Bereitstellung öffentlicher Geländekacheln, abgerufen durch unseren Server wie oben beschrieben.': 'Providing public terrain tiles, requested by our server as described above.',
    'Cloudflare, Resend und – bei aktivierter interner Live-Bestellbenachrichtigung – Meta werden für die Verarbeitung unserer Website- und Kommunikationsdaten als technische Dienstleister eingesetzt. Anbieter können zusätzlich Daten für eigene gesetzliche oder Sicherheitszwecke verarbeiten. Bestellinformationen können außerdem an Versanddienstleister und, soweit erforderlich, Steuerberatung oder Behörden gelangen. Wir veröffentlichen Ihre GPX-Datei und Bestelldaten nicht.': 'Cloudflare, Resend, and—if internal live-order notifications are enabled—Meta act as technical service providers processing our website and communications data. Providers may also process data for their own legal or security purposes. Order information may also be shared with shipping providers and, where necessary, tax advisers or authorities. We do not publish your GPX file or order data.',
    'Die Schriftarten Inter und Quicksand werden von unserer Website geladen. Für die Schriftarten werden keine Anfragen an Google Fonts gesendet. Dabei fallen dieselben technischen Verbindungsdaten an wie beim Abruf anderer Website-Dateien über unser Hosting.': 'The Inter and Quicksand fonts are loaded from our website. No requests are sent to Google Fonts for these fonts. The same technical connection data is processed as when other website files are retrieved through our hosting.',
    'Etsy und Instagram sind auf dieser Website als externe Links eingebunden, nicht als eingebettete Shop- oder Social-Media-Widgets. Wenn Sie einem Link folgen, gelten die Datenverarbeitung und Datenschutzhinweise der jeweiligen Plattform. Für einen Kauf auf Etsy gelten dessen eigener Bestell- und Zahlungsablauf und die zugehörigen Datenschutzhinweise.': 'Etsy and Instagram are provided as external links on this website, not as embedded shop or social media widgets. If you follow a link, the respective platform’s data processing and privacy policy apply. Purchases on Etsy follow Etsy’s own ordering and payment process and related privacy policy.',
    'Wir passen die Datenschutzerklärung an, sobald Änderungen der von uns durchgeführten Datenverarbeitungen dies erforderlich machen. Wir informieren Sie, sobald durch die Änderungen eine Mitwirkungshandlung Ihrerseits erforderlich wird.': 'We update this privacy policy when changes to our data processing make it necessary. We will inform you if any changes require action on your part.',
    'Personenbezogene Daten:': 'Personal data:',
    'Alle Informationen, die sich auf eine identifizierte oder identifizierbare natürliche Person beziehen.': 'Any information relating to an identified or identifiable natural person.',
    'Jeder Vorgang im Zusammenhang mit personenbezogenen Daten, z. B. Erheben, Speichern, Übermitteln oder Löschen.': 'Any operation performed on personal data, such as collecting, storing, transmitting, or deleting it.',
    'Verantwortlicher:': 'Controller:',
    'Die natürliche oder juristische Person, die über Zwecke und Mittel der Verarbeitung personenbezogener Daten entscheidet.': 'The natural or legal person who determines the purposes and means of processing personal data.',
    'Wir treffen nach Maßgabe der gesetzlichen Vorgaben geeignete technische und organisatorische Maßnahmen, um ein dem Risiko angemessenes Schutzniveau zu gewährleisten. Zu den Maßnahmen gehören insbesondere die Sicherung der Vertraulichkeit, Integrität und Verfügbarkeit von Daten. Online-Verbindungen werden durch TLS-/SSL-Verschlüsselungstechnologie (HTTPS) gesichert.': 'We implement appropriate technical and organizational measures in accordance with legal requirements to ensure a level of security appropriate to the risk. These measures include protecting the confidentiality, integrity, and availability of data. Online connections are secured using TLS/SSL encryption (HTTPS).',
    'impressum': 'legal notice',
    'datenschutz': 'privacy',
    'kontakt': 'contact',
    'konfigurator': 'configurator',
    'Produktion & Versand': 'Production & shipping',
    'Bestseller': 'Best seller',
    'Mehr Landschaft': 'More landscape',
    'Wenig Rand': 'Less margin',
    'Max. 3 Zeilen und insgesamt 120 Zeichen. Beispielwerte – bitte an deine Tour anpassen.': 'Max. 3 lines and 120 characters total. Example values — please adapt them to your route.',
    'Bis zu 10 Dateien · zusammen max. 5 MB, 100.000 Punkte und 100 Abschnitte. Auch die kombinierte GPX muss in 5 MB passen.': 'Up to 10 files · max. 5 MB combined, 100,000 points, and 100 segments. The combined GPX must also fit within 5 MB.',
    'Oder Dateien hierher ziehen.': 'Or drag files here.',
    'Noch keine Route ausgewählt.': 'No route selected yet.',
    'Beispielroute testen': 'Try a sample route',
    'Alle entfernen': 'Remove all',
    'Etappen oder Triathlon-Teilstrecken erscheinen gemeinsam auf einem Gelände. Alle Routen bleiben rot, getrennte Abschnitte werden nicht verbunden. Weit entfernte Strecken ergeben weniger Geländedetails. Fehlende GPS-Strecken werden nicht ergänzt.': 'Stages or triathlon legs appear together on one terrain model. All routes remain red; separate segments are not connected. Routes far apart result in less terrain detail. Missing GPS tracks are not added.',
    'Exportiere deine Tour zum Beispiel aus Komoot, Strava oder Garmin als GPX-Datei.': 'Export your activity from Komoot, Strava, or Garmin as a GPX file.',
    'Wie bekomme ich meine GPX-Datei? ↗': 'How do I get my GPX file? ↗',
    'Wandaufhängung': 'Wall mount',
    'Nein': 'No',
    'Ja (+1 €)': 'Yes (+€1)',
    'Deine Route\n100 km | 1000 hm | 10 h': 'Your route\n100 km | 1000 m elevation gain | 10 h',
    'Ausgewählte GPX-Dateien': 'Selected GPX files',
    'Schritt 1 von 5': 'Step 1 of 5',
    'Schritt 2 von 5': 'Step 2 of 5',
    'Schritt 3 von 5': 'Step 3 of 5',
    'Schritt 4 von 5': 'Step 4 of 5',
    'Schritt 5 von 5': 'Step 5 of 5',
    'Schritt 1: Route hochladen': 'Step 1: Upload route',
    'Schritt 2: Produkt auswählen': 'Step 2: Choose product',
    'Schritt 3: Personalisieren': 'Step 3: Personalize',
    'Schritt 4: Sicher bezahlen': 'Step 4: Secure payment',
    'Schritt 5: Produktion & Versand': 'Step 5: Production & shipping',
    'Aktivitäten': 'Activities',
    'Drei-Punkte-Menü': 'three-dot menu',
    'Zahnrad-Menü': 'gear menu',
    '3D-Relief mit Route. Zum Drehen ziehen, zum Zoomen Mausrad oder zwei Finger verwenden.': '3D terrain relief with route. Drag to rotate; use the mouse wheel or two fingers to zoom.',
    'Der kompakte Holzsockel wird ohne Gravur gefertigt. Geländerand und Höhenüberhöhung kannst du weiterhin anpassen.': 'The compact wood base is made without engraving. You can still adjust the terrain margin and vertical exaggeration.',
    'Bitte GPX-Dateien hineinziehen.': 'Please drop GPX files here.',
    'Deine GPX-Dateien werden geprüft …': 'Checking your GPX files…',
    'Noch keine Route ausgewählt.': 'No route selected yet.',
    'Wähle und bestätige einen Kartenausschnitt – ganz ohne Route.': 'Choose and confirm a map section — no route needed.',
    'Deine Landschaft': 'Your landscape',
    'Lade eine Route hoch': 'Upload a route',
    'Route wird geladen': 'Loading route',
    'Wird geladen': 'Loading',
    'Wird angepasst': 'Updating',
    'Nicht verfügbar': 'Unavailable',
    'Ohne Route': 'No route',
    'Beispielroute': 'Sample route',
    'Deine Routen': 'Your routes',
    'Die Gelände-Vorschau wird angepasst …': 'Updating the terrain preview…',
    'Öffentliche Höhendaten werden geladen und deine Landschaft wird geformt …': 'Loading public elevation data and shaping your landscape…',
    'Deine Gelände-Vorschau ist bereit. Drehe das Relief und gestalte deine Erinnerung.': 'Your terrain preview is ready. Rotate the relief and personalize your keepsake.',
    'Die 3D-Vorschau konnte nicht erstellt werden.': 'The 3D preview could not be created.',
    'Die 3D-Vorschau ist nicht verfügbar. Bitte erneut laden.': 'The 3D preview is unavailable. Please try loading it again.',
    'Bitte öffne das Kontaktformular auf der Startseite.': 'Please open the contact form on the homepage.',
    'Ausschnitt bereit. Bestätige das Quadrat, um dein Relief zu sehen.': 'Map section ready. Confirm the square to see your relief.',
    'Dieser Ausschnitt wird für dein Relief ohne Route verwendet.': 'This map section will be used to create your relief without a route.',
    'Die Karte wurde verändert. Bestätige deinen neuen Ausschnitt für die 3D-Vorschau.': 'The map has changed. Confirm your new section for the 3D preview.',
    'Ausschnitt bestätigen': 'Confirm map section',
    'Die Karte wird verschoben …': 'Moving the map…',
    'Karte vergrößern': 'Zoom in',
    'Karte verkleinern': 'Zoom out',
    'Entfernen': 'Remove',
    'Die Vorschau konnte nicht geladen werden.': 'The preview could not be loaded.',
    'Dein Kartenausschnitt': 'Your map section',
    'Landschaft ohne Route': 'Landscape without a route',
    'Bitte Kartenausschnitt bestätigen': 'Please confirm the map section',
    'Wähle einen Kartenausschnitt': 'Choose a map section',
    'Bitte einen Kartenausschnitt bestätigen.': 'Please confirm a map section.',
    'Max. 3 Zeilen': 'Max. 3 lines',
    'Gesamt:': 'Total:',
    'inkl. Versand innerhalb Deutschlands': 'incl. shipping within Germany',
    '5–10 Werktage': '5–10 business days',
    'Beispielwerte – bitte an deine Tour anpassen.': 'Example values — please adapt them to your route.',
    'Eiche-Holzsockel mit Gravur': 'Oak wood base with engraving',
    'Eiche-Holzsockel ohne Gravur': 'Oak wood base without engraving',
    'Weißer Rahmen mit graviertem Passepartout': 'White frame with engraved mount',
    'Eiche-Holzsockel': 'Oak wood base',
    'Weißer Rahmen / weißes Passepartout': 'White frame / white mount',
    '10 × 10 cm Relief auf Eiche, mit Lasergravur auf Holz.': '10 × 10 cm relief on oak, with laser engraving on the wood.',
    '10 × 10 cm Relief auf kompaktem Eiche-Holzsockel, ohne Gravur.': '10 × 10 cm relief on a compact oak base, without engraving.',
    '10 × 10 cm Relief im weißen Rahmen mit Gravur auf weißem Passepartout.': '10 × 10 cm relief in a white frame, with engraving on the white mount.',
    'Rand': 'Margin',
    'Höhen': 'Elevation',
    'Gravur:': 'Engraving:',
    'keine': 'none',
    'Wandaufhängung:': 'Wall mount:',
    'ja (+1 €)': 'yes (+€1)',
    'nein': 'no',
    '4 transparente Schutzfüße': '4 transparent protective feet',
    'Dieser Ausschnitt wird für dein Relief ohne Route verwendet.': 'This section will be used to create your relief without a route.',
    'Kartenausschnitt ohne Route · Nord oben · ca. ': 'Map section without a route · north at top · approx. ',
    ' breit · Nordwest: ': ' wide · northwest: ',
    ' · Südost: ': ' · southeast: ',
    'Deine GPX-Dateien werden geprüft …': 'Checking your GPX files…',
    'Datei(en) ausgewählt.': 'file(s) selected.',
    ' ausgewählt.': ' selected.',
    ' von 10 GPX-Dateien ausgewählt.': ' of 10 GPX files selected.',
    'Entfernen': 'Remove',
    'Für den Checkout brauchst du eine eigene GPX-Datei oder einen bestätigten Kartenausschnitt und eine verfügbare 3D-Vorschau.': 'Checkout requires your own GPX file or a confirmed map section, and an available 3D preview.',
    'Zur Testzahlung bei Stripe': 'Continue to Stripe test payment',
    'Zahlungspflichtig bestellen': 'Place order with obligation to pay',
    'Test-Checkout wird vorbereitet …': 'Preparing test checkout…',
    'Sicherer Checkout wird vorbereitet …': 'Preparing secure checkout…',
    'Du wirst zum sicheren Stripe-Test-Checkout weitergeleitet …': 'Redirecting you to secure Stripe test checkout…',
    'Du wirst zum sicheren Stripe-Checkout weitergeleitet …': 'Redirecting you to secure Stripe checkout…',
    'Der Checkout konnte nicht gestartet werden.': 'Checkout could not be started.',
    'Die Checkout-Antwort enthält keine gültige Stripe-Adresse.': 'The checkout response does not contain a valid Stripe URL.',
    'Checkout fehlgeschlagen:': 'Checkout failed:',
    'Verbindungsfehler': 'Connection error',
    'Der Shop-Status konnte nicht geladen werden.': 'Could not load shop status.',
    'Ungültiger Shop-Status.': 'Invalid shop status.',
    'Der Direktkauf ist ausschließlich zum Testen geöffnet. Es werden keine echten Bestellungen angenommen.': 'Direct purchase is available for testing only. Real orders are not being accepted.',
    'Der Live-Shop ist noch nicht vollständig freigegeben. Du kannst dein Relief weiterhin unverbindlich anfragen.': 'The live shop is not fully enabled yet. You can still request your relief without obligation.',
    'Der Direktkauf ist noch nicht aktiviert. Du kannst dein Relief weiterhin unverbindlich anfragen.': 'Direct purchase is not enabled yet. You can still request your relief without obligation.',
    'Shop nicht erreichbar': 'Shop unavailable',
    'Bitte nutze die unverbindliche Anfrage.': 'Please use the no-obligation inquiry form.',
    'Der Zahlungsstatus konnte nicht geprüft werden.': 'Could not verify payment status.',
    'Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.': 'Checking payment status. Returning from Stripe alone does not confirm payment.',
    'Test-Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.': 'Checking test payment status. Returning from Stripe alone does not confirm payment.',
    'Testzahlung bestätigt': 'Test payment confirmed',
    'Zahlung bestätigt': 'Payment confirmed',
    'Bestellreferenz:': 'Order reference:',
    'Wir senden dir und Peak Memory eine Bestellbestätigung.': 'An order confirmation will be sent to you and Peak Memory.',
    'Der Test-Checkout ist fehlgeschlagen oder abgelaufen. Es liegt keine bestätigte Zahlung für diese Bestellung vor.': 'The test checkout failed or expired. No payment has been confirmed for this order.',
    'Der Checkout ist fehlgeschlagen oder abgelaufen. Es liegt keine bestätigte Zahlung für diese Bestellung vor.': 'The checkout failed or expired. No payment has been confirmed for this order.',
    'Unbekannter Zahlungsstatus.': 'Unknown payment status.',
    'Die Testzahlung ist noch nicht bestätigt. Bitte kontaktiere uns mit deiner Bestellreferenz, statt erneut zu bezahlen:': 'The test payment is not confirmed yet. Please contact us with your order reference instead of paying again:',
    'Die Zahlung ist noch nicht bestätigt. Bitte kontaktiere uns mit deiner Bestellreferenz, statt erneut zu bezahlen:': 'The payment is not confirmed yet. Please contact us with your order reference instead of paying again:',
    'Bitte nicht erneut bezahlen. Bestellreferenz:': 'Please do not pay again. Order reference:',
    'Testzahlungen lösen keine Produktion oder Lieferung aus. Bei echten Bestellungen beginnt die Fertigung nach bestätigter Zahlung; die Lieferung erfolgt in 5–10 Werktagen.': 'Test payments do not trigger production or delivery. For real orders, production starts after confirmed payment; delivery takes 5–10 business days.',
    'Der Direktkauf ist ausschließlich im Stripe-Testmodus geöffnet. Testzahlungen lösen keine echte Bestellung aus.': 'Direct purchase is available in Stripe test mode only. Test payments do not create real orders.',
    'Für einen Kartenausschnitt ohne Route entferne bitte zuerst die GPX-Dateien aus der Anfrage und wähle danach erneut „Zum Kontakt“.': 'To inquire about a map section without a route, first remove the GPX files from your inquiry, then select “Contact us” again.',
    'Mit dieser Anfrage wird übermittelt: ': 'This inquiry will include: ',
    '. Änderungen im Konfigurator bitte erneut über „Zum Kontakt“ übernehmen.': '. If you make changes in the configurator, select “Contact us” again to transfer them.',
    'Bitte zuerst den Kartenausschnitt aus der Anfrage entfernen, bevor du GPX-Dateien hinzufügst.': 'Please remove the map section from your inquiry before adding GPX files.',
    'Bitte höchstens 10 GPX-Dateien auswählen.': 'Please select no more than 10 GPX files.',
    'Bitte nur nicht leere GPX-Dateien mit der Endung .gpx hochladen.': 'Please upload only non-empty GPX files with the .gpx extension.',
    'Alle GPX-Dateien zusammen dürfen maximal 5 MB groß sein.': 'All GPX files together must not exceed 5 MB.',
    'Deine bisherige Auswahl bleibt erhalten.': 'Your current selection will be kept.',
    'Ausgewählt: ': 'Selected: ',
    ' aus Anfrage entfernen': ' remove from inquiry',
    'Der Checkout konnte nicht gestartet werden.': 'Checkout could not be started.',
    'Die Zahlungsreferenz fehlt oder ist ungültig. Bitte kontaktiere uns; starte keine zweite Zahlung.': 'The payment reference is missing or invalid. Please contact us; do not make a second payment.',
    'Test-Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.': 'Checking test payment status. Returning from Stripe alone does not confirm payment.',
    'Keine Checkout-Bestätigung erhalten. Deine Auswahl bleibt erhalten. Erneut versuchen setzt denselben Checkout fort.': 'No checkout confirmation received. Your selection is saved. Trying again will resume the same checkout.',
    'Fehler beim Senden deiner Nachricht. Bitte versuche es erneut.': 'There was a problem sending your message. Please try again.',
    'Nachricht erfolgreich gesendet.': 'Message sent successfully.',
    'Der Upload dauert zu lange. Bitte versuche es erneut.': 'The upload is taking too long. Please try again.',
    'Bitte überprüfe deine Eingaben und versuche es erneut.': 'Please check your entries and try again.',
    'Keine Route ausgewählt.': 'No route selected.',
    'Karte zur Geländeauswahl': 'Map for choosing terrain',
    'Zurücksetzen': 'Reset',
    'Der Höhenmaßstab wird angepasst …': 'Adjusting the elevation scale…',
    'Die Geländevorschau konnte nicht geladen werden. Bitte erneut versuchen.': 'Could not load the terrain preview. Please try again.',
    'Bitte wähle ein kleineres Gebiet.': 'Please choose a smaller area.',
    'Ausschnitt zu klein. Bitte hineinzoomen.': 'Map section is too small. Please zoom in.',
    'Ausschnitt zu groß. Bitte herauszoomen.': 'Map section is too large. Please zoom out.',
    'Einstellungen': 'Settings',
    'Wähle deine Route': 'Choose your route',
    'Füge deine GPX-Datei hinzu': 'Add your GPX file',
    'Route konnte nicht geladen werden.': 'Could not load route.',
    'GPX-Datei konnte nicht gelesen werden.': 'Could not read the GPX file.',
    'Ungültige GPX-Datei.': 'Invalid GPX file.',
    'Keine GPS-Punkte gefunden.': 'No GPS points found.',
    'GPX-Datei ist zu groß.': 'The GPX file is too large.',
    'Maximal 10 GPX-Dateien erlaubt.': 'A maximum of 10 GPX files is allowed.',
    'Die kombinierte GPX-Datei ist zu groß.': 'The combined GPX file is too large.',
    'Bitte wähle einen kleineren Kartenausschnitt außerhalb der Polarregionen.': 'Please choose a smaller map section outside the polar regions.',
    'Ungültiger Kartenausschnitt. Bitte einen kleineren Ausschnitt außerhalb der Polarregion wählen.': 'Invalid map section. Please choose a smaller section outside the polar regions.',
    'Bitte einen Kartenausschnitt zwischen 300 m und 150 km Breite wählen.': 'Please choose a map section between 300 m and 150 km wide.',
    'Verkäufer und Kontakt': 'Seller and contact',
    'Produkt und Gesamtpreis': 'Product and total price',
    'Wandaufhängung und Schutzfüße bei Holzsockeln': 'Wall mount and protective feet for wood bases',
    'Bestellablauf und Vertragsschluss': 'Ordering process and conclusion of contract',
    'Zahlung, Fertigung und Lieferung': 'Payment, production, and delivery',
    'Kein gesetzliches Widerrufsrecht bei dieser Personalisierung': 'No statutory right of withdrawal for this personalized product',
    'Vertragssprache und Bestellbestätigung': 'Contract language and order confirmation',
    'Peak Memory GbR, Poststr. 29, 71229 Leonberg, Deutschland. Vertreten durch Carolin Merz und Alexander Weimer. E-Mail: peak.memory@web.de. Telefon: 0162 2701613.': 'Peak Memory GbR, Poststr. 29, 71229 Leonberg, Germany. Represented by Carolin Merz and Alexander Weimer. Email: peak.memory@web.de. Phone: 0162 2701613.',
    'Der Direktkauf umfasst ein individuell nach deiner GPX-Route oder deinem bestätigten Kartenausschnitt ohne Route und Konfiguration gefertigtes 3D-Geländerelief (10 × 10 cm). Du wählst eine von drei Ausführungen: Eiche-Holzsockel (11 × 13,5 × 2 cm) mit Gravur auf Holz für 50 EUR; kompakter Eiche-Holzsockel (11 × 11 × 2 cm) ohne Gravur für 45 EUR; weißer Rahmen (20 × 20 cm Außenmaß) mit weißem, graviertem Passepartout für 60 EUR. Ein Stück pro Bestellung. Alle Gesamtpreise enthalten den Versand innerhalb Deutschlands. Kein Umsatzsteuerausweis gemäß § 19 UStG. Holzmaserung, Rahmenprofil, Passepartout und Fertigungsdetails können von der illustrativen Online-Vorschau abweichen; die gesetzlichen Mängelrechte bleiben unberührt.': 'The direct purchase covers a 10 × 10 cm 3D terrain relief made to your GPX route or confirmed map section and configuration. Choose one of three options: an oak base (11 × 13.5 × 2 cm) with engraving on the wood for EUR 50; a compact oak base (11 × 11 × 2 cm) without engraving for EUR 45; or a white frame (20 × 20 cm outside dimensions) with an engraved white mount for EUR 60. One item per order. All totals include shipping within Germany. VAT is not itemized under Section 19 of the German VAT Act. Wood grain, frame profile, mount, and production details may differ from the illustrative online preview; statutory rights in the event of defects remain unaffected.',
    'Beide Eiche-Holzsockel haben vier transparente Schutzfüße auf der Unterseite. Optional kannst du eine gezahnte Wandaufhängung auf der Rückseite für 1 EUR Aufpreis wählen (Standard: Nein). Der Gesamtpreis beträgt dann 51 EUR für den Holzsockel mit Gravur bzw. 46 EUR für den kompakten Holzsockel ohne Gravur, jeweils inklusive Versand innerhalb Deutschlands. Die Option gilt nicht für den Rahmen. Form und Position der Aufhängung und Schutzfüße in der Online-Vorschau sind illustrativ.': 'Both oak bases have four transparent protective feet on the underside. You can optionally add a toothed wall hanger on the back for EUR 1 (default: no). The total is then EUR 51 for the engraved base or EUR 46 for the compact unengraved base, including shipping within Germany. This option is not available for the frame. The shape and position of the hanger and feet in the online preview are illustrative.',
    'Du lädst deine eigene GPX-Datei hoch oder wählst und bestätigst ein Quadrat auf der Karte für eine Landschaft ohne Route. Anschließend wählst du die Produktausführung, Gravur (soweit vorgesehen) und Einstellungen und prüfst die Zusammenfassung mit dem Gesamtpreis. Beim kompakten Holzsockel ohne Gravur wird kein Gravurtext gefertigt. Eingaben kannst du vor der Weiterleitung an Stripe ändern; nach einer Änderung musst du die finale Auswahl erneut bestätigen. Lieferadresse und verfügbare Zahlungsarten werden im gehosteten Stripe-Checkout angezeigt. Vor der abschließenden Zahlung kannst du den Checkout verlassen und deine Auswahl auf unserer Website neu bearbeiten. Mit dem abschließenden zahlungspflichtigen Bestellschritt bei Stripe gibst du ein verbindliches Kaufangebot ab. Wir nehmen dieses Angebot mit erfolgreicher Zahlungsbestätigung durch Stripe an; dann kommt der Vertrag zustande. Bei verzögerten Zahlungsarten gilt dies erst, wenn Stripe die Zahlung als erfolgreich bestätigt. Eine bloße Rückleitung auf unsere Website ist keine Zahlungsbestätigung.': 'Upload your own GPX file or select and confirm a square on the map for a landscape without a route. Then choose the product, engraving (where available), and settings, and review the summary and total price. No engraving is made on the compact wood base. You can change your entries before continuing to Stripe; after making a change, you must confirm your final selection again. Your delivery address and available payment methods are shown in Stripe Checkout. You may leave checkout before completing payment and revise your selection on our website. By completing the final order step with an obligation to pay in Stripe, you make a binding offer to purchase. We accept the offer once Stripe confirms successful payment, at which point the contract is concluded. For delayed payment methods, the contract is concluded only once Stripe confirms successful payment. A redirect back to our website alone does not confirm payment.',
    'Die Zahlung erfolgt über die im Stripe-Checkout angebotenen Zahlungsarten. Nach bestätigter Zahlung beginnt die Fertigung ohne weitere persönliche Produktionsfreigabe. Deine bestätigte Route oder dein Kartenausschnitt, Produktausführung, Gravur (soweit vorgesehen) und Konfiguration sind Grundlage der Fertigung. Die Lieferung erfolgt ausschließlich innerhalb Deutschlands in 5–10 Werktagen nach bestätigter Zahlung. Sonderformate und besondere Wünsche sind nicht Teil dieses Direktkaufs und müssen vorher separat angefragt werden.': 'Payment is made using the methods offered in Stripe Checkout. Production starts after payment is confirmed, without requiring further personal approval. Your confirmed route or map section, product, engraving (where applicable), and configuration form the basis for production. Delivery is available only within Germany and takes 5–10 business days after confirmed payment. Custom sizes and special requests are not part of this direct purchase and must be requested separately in advance.',
    'Das Relief wird nicht vorgefertigt, sondern nach deiner individuellen GPX-Route oder deinem ausgewählten Kartenausschnitt und Konfiguration hergestellt. Für solche Waren besteht gemäß § 312g Abs. 2 Nr. 1 BGB kein gesetzliches Widerrufsrecht. Dies ist kein Verzicht auf bestehende Rechte durch eine Checkbox, sondern die gesetzliche Ausnahme für individuell angefertigte Waren. Deine gesetzlichen Rechte bei Mängeln oder einer nicht vertragsgemäßen Lieferung bleiben uneingeschränkt bestehen. Bei Problemen kontaktiere uns über die oben genannten Kontaktdaten.': 'The relief is not prefabricated; it is made to your individual GPX route or selected map section and configuration. Under Section 312g(2)(1) of the German Civil Code (BGB), there is no statutory right of withdrawal for such goods. This is not a waiver of existing rights through a checkbox, but the statutory exception for individually made goods. Your statutory rights in the event of defects or delivery that does not conform to the contract remain unaffected. If you have a problem, contact us using the details above.',
    'Vertragssprache ist Deutsch. Nach verifizierter Zahlung erhältst du eine E-Mail mit Bestellreferenz, Konfiguration, Versandinformationen und diesen Kaufhinweisen. Du kannst diese Hinweise vor der Bestellung über die Druck- oder Speicherfunktion deines Browsers sichern. Die Bestelldaten werden intern gespeichert; es gibt kein Kundenkonto mit dauerhaft abrufbarer Vertragshistorie. Eine unverbindliche Anfrage ist keine Bestellung. Im ausdrücklich gekennzeichneten Stripe-Sandboxmodus entsteht kein Kaufvertrag und es erfolgt keine Fertigung.': 'The contract language is German. After payment is verified, you will receive an email with your order reference, configuration, shipping information, and these purchase notes. You can save or print these notes using your browser before ordering. Order data is stored internally; there is no customer account with a permanently accessible order history. A no-obligation inquiry is not an order. In the clearly identified Stripe sandbox mode, no purchase contract is concluded and no product is made.',
    'Für Zuhause': 'for home',
    'Rechte der betroffenen Personen': 'Rights of data subjects',
    'Bereitstellung des Onlineangebots und Webhosting': 'Website availability and web hosting',
    'Cookies und Speicherung auf Ihrem Endgerät': 'Cookies and storage on your device',
    'Kontakt- und Anfrageverwaltung': 'Contact and inquiry management',
    'GPX-Dateien und interaktive Gelände-Vorschau': 'GPX files and interactive terrain preview',
    'Stripe-Checkout und Bestelldaten': 'Stripe Checkout and order data',
    'OpenStreetMap-Karte': 'OpenStreetMap map',
    'Speicherung im Checkout': 'Storage during checkout',
    'Empfänger und eingesetzte Dienste': 'Recipients and services used',
    'Schriftarten und externe Links': 'Fonts and external links',
    'Änderung und Aktualisierung': 'Changes and updates',
    'Begriffsdefinitionen': 'Definitions',
    'Diese Datenschutzerklärung erläutert die Verarbeitung personenbezogener Daten beim Besuch von peak-memory.de, bei der Nutzung der GPX-Vorschau, bei Anfragen und bei einem freigegebenen Direktkauf. Für externe Plattformen wie Etsy und Instagram gelten zusätzlich die Datenschutzhinweise des jeweiligen Anbieters; diese Erklärung ersetzt keine gesonderten Hinweise zu unseren dortigen Präsenzen.': 'This privacy policy explains how personal data is processed when visiting peak-memory.de, using the GPX preview, making inquiries, and placing an enabled direct order. The privacy information of external platforms such as Etsy and Instagram also applies; this policy does not replace separate notices for our profiles on those platforms.',
    'Die verwendeten Begriffe sind nicht geschlechtsspezifisch.': 'The terms used are gender-neutral.',
    'Die nachfolgende Übersicht fasst die Arten der verarbeiteten Daten und die Zwecke ihrer Verarbeitung zusammen.': 'The following overview summarizes the types of data processed and the purposes of processing.',
    'Für ein Relief können bis zu zehn lokale GPX-Dateien gemeinsam ausgewählt werden. Die Vorschau verarbeitet sie im Browser. Erst beim Absenden einer Anfrage oder Bestellung erhalten wir die Originaldateien; bei mehreren Dateien erzeugen wir zusätzlich eine kombinierte GPX für die Fertigung. Originale und kombinierte Datei unterliegen denselben unten beschriebenen Speicher- und Löschregeln. Bestellbenachrichtigungen an unsere Werkstatt enthalten diese Dateien als Anhänge. Eine direkte Verbindung zu Sportplattform-Konten wird nicht angeboten.': 'You can select up to ten local GPX files together for one relief. The preview processes them in your browser. We receive the original files only when you submit an inquiry or order; when multiple files are used, we also create a combined GPX for production. The same retention and deletion rules below apply to the original and combined files. Order notifications sent to our workshop include these files as attachments. Direct connections to sports-platform accounts are not offered.',
    'Ihnen stehen als Betroffene nach der DSGVO folgende Rechte zu:': 'As a data subject, you have the following rights under the GDPR:',
    'Auskunft, Berichtigung, Löschung und Einschränkung': 'Access, rectification, erasure, and restriction',
    'nach Maßgabe der Art. 15 bis 18 DSGVO.': 'under Articles 15 to 18 GDPR.',
    'Datenübertragbarkeit': 'Data portability',
    'unter den Voraussetzungen des Art. 20 DSGVO.': 'subject to the conditions in Article 20 GDPR.',
    'Widerspruch': 'Right to object',
    'aus Gründen Ihrer besonderen Situation gegen Verarbeitungen auf Grundlage berechtigter Interessen (Art. 21 DSGVO); gegen Direktwerbung jederzeit.': 'on grounds relating to your particular situation against processing based on legitimate interests (Article 21 GDPR); you may object to direct marketing at any time.',
    'Widerruf einer Einwilligung': 'Withdrawal of consent',
    'jederzeit mit Wirkung für die Zukunft, ohne die Rechtmäßigkeit der vorherigen Verarbeitung zu berühren.': 'at any time with effect for the future, without affecting the lawfulness of processing before withdrawal.',
    'Beschwerde': 'Complaint',
    'bei einer Datenschutzaufsichtsbehörde, insbesondere am Aufenthaltsort, Arbeitsplatz oder Ort des vermuteten Verstoßes. Für Baden-Württemberg: ': 'with a data protection supervisory authority, in particular where you live, work, or where the alleged infringement occurred. For Baden-Württemberg: ',
    'Landesbeauftragter für den Datenschutz und die Informationsfreiheit': 'State Commissioner for Data Protection and Freedom of Information',
    'Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die oben genannten Kontaktdaten. Wir treffen im Website-Checkout keine ausschließlich automatisierte Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung im Sinne von Art. 22 DSGVO. Zahlungsdienstleister können eigene Sicherheits- und Betrugsprüfungen durchführen; hierzu informieren sie in ihren Datenschutzhinweisen.': 'To exercise your rights, please contact us using the details above. We do not make decisions in website checkout based solely on automated processing that produce legal or similarly significant effects within the meaning of Article 22 GDPR. Payment providers may conduct their own security and fraud checks; please refer to their privacy information.',
    'Die Speicherdauer richtet sich nach dem jeweiligen Zweck und gesetzlichen Aufbewahrungspflichten. Anfragekorrespondenz und Anhänge werden für die Bearbeitung und gegebenenfalls die anschließende Bestellung benötigt. Fertigungsdateien werden für die Herstellung und erforderliche Nachbearbeitung genutzt. Nach Wegfall dieser Zwecke werden Daten gelöscht, sofern keine gesetzlichen Pflichten oder die notwendige Geltendmachung, Ausübung oder Verteidigung von Ansprüchen eine weitere Speicherung erfordern.': 'We retain data for as long as needed for the relevant purpose and applicable statutory retention obligations. Inquiry correspondence and attachments are needed to handle your inquiry and, where applicable, a subsequent order. Production files are used to make the product and for any necessary rework. Once these purposes no longer apply, data is deleted unless statutory obligations or the establishment, exercise, or defense of legal claims require further retention.',
    'Diese Bereinigung löscht keine Kopien in E-Mail-Postfächern, beim Zahlungsdienst oder in Fertigungs- und Buchhaltungsunterlagen. Für diese gelten die jeweiligen Bearbeitungszwecke und gesetzlichen Aufbewahrungspflichten. Steuer- und handelsrechtlich erforderliche Unterlagen werden nicht durch die 90-Tage-Bereinigung ersetzt. Soweit eine Verarbeitung auf Einwilligung beruht, wirkt deren Widerruf für die Zukunft; andere gesetzliche Aufbewahrungsgründe bleiben unberührt.': 'This cleanup does not delete copies in email inboxes, with the payment service, or in production and accounting records. Those copies are subject to their respective processing purposes and statutory retention obligations. Records required under tax and commercial law are not replaced by the 90-day cleanup. Where processing is based on consent, withdrawal applies going forward; other statutory grounds for retention remain unaffected.',
    'Im eigenen Website-Code setzen wir keine Analyse- oder Werbe-Cookies und speichern die GPX-Datei nicht dauerhaft im Browser. Cloudflare kann abhängig von den eingesetzten Sicherheitsfunktionen Cookies verwenden; beim Wechsel auf die gehostete Stripe-Zahlungsseite gelten deren Hinweise zu Cookies und Endgerätespeicherung. Technisch erforderliche Speicherung oder Zugriffe für einen ausdrücklich gewünschten Dienst können unter § 25 Abs. 2 TDDDG fallen. Für nicht erforderliche Speicherung oder Zugriffe ist grundsätzlich eine vorherige Einwilligung nach § 25 Abs. 1 TDDDG notwendig. Die Rechtsgrundlage einer anschließenden Verarbeitung personenbezogener Daten ist gesondert nach der DSGVO zu beurteilen; berechtigte Interessen ersetzen keine erforderliche Einwilligung für den Endgerätezugriff.': 'Our website code does not set analytics or advertising cookies and does not permanently store GPX files in your browser. Cloudflare may use cookies depending on the security features in use; when you move to the hosted Stripe payment page, its information on cookies and device storage applies. Technically necessary storage or access for a service you explicitly request may fall under Section 25(2) TDDDG. Non-essential storage or access generally requires prior consent under Section 25(1) TDDDG. The legal basis for any subsequent processing of personal data must be assessed separately under the GDPR; legitimate interests do not replace consent required for access to your device.',
    'Unsere Website, Kontaktformulare, Gelände-Endpunkte und der private Bestellspeicher werden über Cloudflare bereitgestellt. Dabei werden IP-Adresse, angefragte URL, Zeit und technische Verbindungsdaten verarbeitet. Sicherheits- und Fehlerdaten dienen der Bereitstellung, Fehleranalyse und Missbrauchsabwehr. IP-Adressen werden außerdem als kurzlebige Schlüssel zur Ratenbegrenzung von Gelände-, Checkout- und Statusanfragen verwendet. Die Dauer der Speicherung technischer Protokolle richtet sich nach dem Sicherheits- und Fehleranalysezweck sowie den eingesetzten Cloudflare-Diensten; eine pauschale Höchstfrist von 30 Tagen wird hier nicht zugesichert. Rechtsgrundlage: Art. 6 Abs. 1 lit. f DSGVO, berechtigtes Interesse an einem sicheren und funktionsfähigen Onlineangebot.': 'Our website, contact forms, terrain endpoints, and private order storage are provided through Cloudflare. The IP address, requested URL, time, and technical connection data are processed. Security and error data are used to provide the service, diagnose errors, and prevent misuse. IP addresses are also used as short-lived keys to rate-limit terrain, checkout, and status requests. Technical log retention depends on the security and error-diagnosis purposes and the Cloudflare services in use; we do not promise a blanket maximum retention period of 30 days. Legal basis: Article 6(1)(f) GDPR, our legitimate interest in a secure and functional website.',
    'Bei der Kontaktaufnahme verarbeiten wir Name, E-Mail-Adresse, Nachrichteninhalt und gegebenenfalls die beigefügte GPX-Datei sowie Produkt- und Gravurwünsche zur Beantwortung Ihrer Anfrage. Bei einer Konfigurator-Anfrage mit verfügbarer Vorschau wird zusätzlich ein Bild der aktuellen 3D-Ansicht als E-Mail-Anhang übermittelt. Das Formular verarbeitet die Daten über Cloudflare und versendet sie mit Resend an unser WEB.DE-Postfach. Anders als beim Checkout legt der Kontakt-Endpunkt keine Bestellung in unserem Cloudflare-Bestellspeicher an. GPX-Dateien und Vorschaubilder können genaue Orts- und Bewegungsdaten enthalten; übermitteln Sie nur Dateien und Angaben, die für Ihre Anfrage oder Personalisierung benötigt werden, und keine fremden Daten ohne Berechtigung. Produktbezogene Anfragen werden nach Art. 6 Abs. 1 lit. b DSGVO verarbeitet; sonstige Korrespondenz nach Art. 6 Abs. 1 lit. f DSGVO mit dem berechtigten Interesse, eingehende Anliegen zu beantworten.': 'When you contact us, we process your name, email address, message, and, where applicable, attached GPX file and product or engraving preferences to respond to your inquiry. For a configurator inquiry with an available preview, an image of the current 3D view is also sent as an email attachment. The form processes data through Cloudflare and sends it via Resend to our WEB.DE mailbox. Unlike checkout, the contact endpoint does not create an order in our Cloudflare order store. GPX files and preview images may contain precise location and movement data; only send files and information needed for your inquiry or personalization, and do not send other people’s data without authorization. Product-related inquiries are processed under Article 6(1)(b) GDPR; other correspondence is processed under Article 6(1)(f) GDPR, based on our legitimate interest in responding to inquiries.',
    'Die unten genannten Dienste können Daten auch außerhalb des Europäischen Wirtschaftsraums verarbeiten, insbesondere in den USA. Ein europäischer Speicherstandort allein schließt Zugriffe aus Drittländern nicht aus. Angaben zu beteiligten Gesellschaften, Unterauftragnehmern und den von den Anbietern vorgesehenen Übermittlungsmechanismen finden Sie in deren verlinkten Datenschutz- und Vertragsinformationen. Informationen und gegebenenfalls Kopien der für die konkrete Verarbeitung maßgeblichen Garantien können Sie über unsere oben genannten Kontaktdaten anfordern. Die Nennung eines Anbieters bedeutet nicht, dass für sämtliche seiner Dienste eine Zertifizierung nach dem EU-US Data Privacy Framework besteht.': 'The services listed below may process data outside the European Economic Area, particularly in the United States. Storage in Europe alone does not rule out access from third countries. Information about the companies involved, subprocessors, and transfer mechanisms used by providers is available in their linked privacy and contractual information. You can request information and, where applicable, copies of the safeguards relevant to a specific processing activity using our contact details above. Naming a provider does not mean that all of its services are certified under the EU–US Data Privacy Framework.',
    'Lieber persönlich abstimmen?': 'Prefer to discuss it with us?',
    'Sonderformate und offene Fragen besprechen wir persönlich. Schreib uns über das Kontaktformular – unverbindlich und ohne Bestellung.': 'We are happy to discuss custom sizes and any questions personally. Send us a message using the contact form — with no obligation and no order required.',
    'Kontakt & Rechtliches': 'Contact & legal information',
    'Software-Lizenzen': 'Software licenses',
    '3D-Ansicht steuern': 'Control the 3D view',
    'Der Stripe-Checkout wurde verlassen. Eine Zahlung wird hier nicht bestätigt. Nach einem Neuladen bitte deine GPX-Datei erneut auswählen.': 'You left Stripe Checkout. No payment is confirmed here. After reloading, please select your GPX file again.',
    'Die Zahlungsreferenz fehlt oder ist ungültig. Bitte kontaktiere uns; starte keine zweite Zahlung.': 'The payment reference is missing or invalid. Please contact us; do not make a second payment.',
    'Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.': 'Checking payment status. Returning from Stripe alone does not confirm payment.',
    'Test-Zahlungsstatus wird geprüft. Die Rückkehr von Stripe allein bestätigt keine Zahlung.': 'Checking test payment status. Returning from Stripe alone does not confirm payment.',
    'Testzahlung bestätigt': 'Test payment confirmed',
    'Zahlung bestätigt': 'Payment confirmed',
    'Bestellreferenz: ': 'Order reference: ',
    'Wir senden dir und Peak Memory eine Bestellbestätigung.': 'An order confirmation will be sent to you and Peak Memory.',
    'Der Test-Checkout ist fehlgeschlagen oder abgelaufen. Es liegt keine bestätigte Zahlung für diese Bestellung vor.': 'The test checkout failed or expired. No payment has been confirmed for this order.',
    'Der Checkout ist fehlgeschlagen oder abgelaufen. Es liegt keine bestätigte Zahlung für diese Bestellung vor.': 'The checkout failed or expired. No payment has been confirmed for this order.',
    'Unbekannter Zahlungsstatus.': 'Unknown payment status.',
    'Die Testzahlung ist noch nicht bestätigt. Bitte kontaktiere uns mit deiner Bestellreferenz, statt erneut zu bezahlen: ': 'The test payment is not confirmed yet. Please contact us with your order reference instead of paying again: ',
    'Die Zahlung ist noch nicht bestätigt. Bitte kontaktiere uns mit deiner Bestellreferenz, statt erneut zu bezahlen: ': 'The payment is not confirmed yet. Please contact us with your order reference instead of paying again: ',
    'Statusprüfung fehlgeschlagen': 'Status check failed',
    'Bitte nicht erneut bezahlen. Bestellreferenz: ': 'Please do not pay again. Order reference: ',
    'Der Direktkauf ist ausschließlich zum Testen geöffnet. Es werden keine echten Bestellungen angenommen.': 'Direct purchase is available for testing only. Real orders are not being accepted.',
    'Der Live-Shop ist noch nicht vollständig freigegeben. Du kannst dein Relief weiterhin unverbindlich anfragen.': 'The live shop is not fully enabled yet. You can still request your relief without obligation.',
    'Der Direktkauf ist ausschließlich im Stripe-Testmodus geöffnet. Testzahlungen lösen keine echte Bestellung aus.': 'Direct purchase is available in Stripe test mode only. Test payments do not create real orders.',
    'Keine echte Zahlung, keine echte Bestellung und keine Produktion. Keine echten Kartendaten eingeben. Test-Bestelldaten werden privat gespeichert.': 'No real payment, order, or production. Do not enter real card details. Test order data is stored privately.',
    'Lieferadresse und Zahlung erfasst Stripe im nächsten Schritt.': 'Stripe will collect your delivery address and payment details in the next step.',
    'Ein Stück pro Bestellung. Sonderformate bitte separat anfragen.': 'One item per order. Please request custom sizes separately.',
    'Gesamtpreis für dein Erinnerungsstück': 'Total price for your keepsake',
    'Inkl. Versand innerhalb Deutschlands. Kein Umsatzsteuerausweis gemäß §19 UStG.': 'Shipping within Germany included. VAT is not itemized under §19 UStG.',
    'Gesamtpreis für dein Erinnerungsstück': 'Total price for your keepsake',
    'Beim Start des Checkouts werden deine Kontaktdaten, GPX-Dateien oder Ausschnittskoordinaten, Konfiguration und das Vorschaubild privat bei Cloudflare gespeichert. Stripe erhält E-Mail-Adresse und Bestellreferenz sowie anschließend deine Liefer- und Zahlungsdaten.': 'When checkout starts, your contact details, GPX files or map-section coordinates, configuration, and preview image are stored privately with Cloudflare. Stripe receives your email address and order reference, followed by your delivery and payment details.',
    'Kaufhinweise, Vertragsschluss & Widerruf': 'Purchase information, conclusion of contract & withdrawal',
    'Dein Relief wird individuell nach deiner GPX-Route oder deinem Kartenausschnitt und Konfiguration angefertigt (§ 312g Abs. 2 Nr. 1 BGB). Gesetzliche Mängelrechte bleiben unberührt.': 'Your relief is made to your GPX route or map section and configuration (Section 312g(2)(1) of the German Civil Code). Your statutory rights in the event of defects remain unaffected.',
    'Ein Abenteuer.': 'An adventure.',
    'Ein Stück für Zuhause.': 'A keepsake for home.',
    'Design your keepsake.': 'Design your keepsake.',
    'Peak Memory · Handgefertigt in Baden-Württemberg': 'Peak Memory · Handmade in Baden-Württemberg',
    'Updates zu unseren Produkten, dem Versand und den Vertragsbedingungen.': 'Updates to our products, shipping, and terms.',
    'Zahlungspflichtig bestellen': 'Place order with obligation to pay',
    'Zur Testzahlung bei Stripe': 'Continue to Stripe test payment',
    'Barrierefreiheit': 'Accessibility',
    'Carousel': 'Carousel',
    'Schritt': 'Step',
    'Karte wird geladen …': 'Loading map…',
    'Die Karte konnte nicht vollständig geladen werden. Bitte erneut laden.': 'The map could not be fully loaded. Please reload it.',
    'Du kannst deine Landschaft ohne Route über einen Kartenausschnitt gestalten.': 'You can create a landscape without a route by selecting a map section.',
    'Frage zu einem individuellen Relief': 'Question about a custom relief',
    'Keine Checkout-Bestätigung erhalten. Deine Auswahl bleibt erhalten. Erneut versuchen setzt denselben Checkout fort.': 'No checkout confirmation received. Your selection is saved. Trying again will resume the same checkout.',
    'Die GPX-Dateien konnten nicht gelesen werden.': 'Could not read the GPX files.',
    'Keine GPX-Datei ausgewählt.': 'No GPX file selected.',
    'Ungültige GPX-Datei:': 'Invalid GPX file:',
    'Die Strecke enthält keine GPS-Punkte.': 'The track contains no GPS points.',
    'Die Vorschau ist nicht verfügbar.': 'The preview is unavailable.',
    'Der Kartenausschnitt konnte nicht geladen werden.': 'Could not load the map section.',
    'Deine Route ist zu lang oder enthält zu viele Punkte.': 'Your route is too long or contains too many points.',
    'Die Vorschau konnte nicht geladen werden. Bitte erneut versuchen.': 'Could not load the preview. Please try again.',
    'Die Karte wird aktualisiert …': 'Updating the map…',
    'Dieser Ausschnitt ist zu groß. Bitte verkleinere ihn.': 'This map section is too large. Please make it smaller.',
    'Dieser Ausschnitt ist zu klein. Bitte vergrößere ihn.': 'This map section is too small. Please make it larger.',
    'Kontaktformular': 'Contact form',
    'Kontaktiere uns': 'Contact us',
    'Sende uns eine Nachricht': 'Send us a message',
    'Wähle deine Anfrage': 'Choose your inquiry',
    'Datei auswählen': 'Choose file',
    'Keine Datei ausgewählt': 'No file selected',
    'Dateien auswählen': 'Choose files',
    'Karte wird geladen': 'Loading map',
    'Weitere Details': 'More details',
    'Wähle eine Ausführung': 'Choose an option',
    'Datei hochladen': 'Upload file',
    'Noch keine Datei ausgewählt.': 'No file selected yet.',
    'Karte konnte nicht geladen werden.': 'Could not load the map.',
    'Die Karte konnte nicht geladen werden. Bitte erneut versuchen.': 'Could not load the map. Please try again.',
    'Daten werden geladen …': 'Loading data…',
    'Fehler beim Laden der Daten.': 'There was an error loading the data.',
    'Du hast noch keine GPX-Datei ausgewählt.': 'You have not selected a GPX file yet.',
    'Bitte eine GPX-Datei auswählen.': 'Please select a GPX file.',
    'Deine GPX-Datei enthält keine Route.': 'Your GPX file contains no route.',
    'Die Datei konnte nicht verarbeitet werden.': 'The file could not be processed.',
    'Laden fehlgeschlagen.': 'Loading failed.',
    'Bitte versuche es erneut.': 'Please try again.',
    'Bitte lade deine GPX-Datei erneut hoch.': 'Please upload your GPX file again.',
    'Zurück zum Konfigurator': 'Back to configurator',
    'Zur Startseite': 'Back to homepage',
    'Zum Konfigurator': 'Go to configurator',
    'Zum Kontakt': 'Contact us',
    'Zurück': 'Back',
    'Weiter': 'Next',
    'Abbrechen': 'Cancel',
    'Speichern': 'Save',
    'Bestätigen': 'Confirm',
    'Vorschau': 'Preview',
    'Konfiguration': 'Configuration',
    'Zusammenfassung': 'Summary',
    'Auswahl': 'Selection',
    'Höhenüberhöhung': 'Vertical exaggeration',
    'Geländerand': 'Terrain margin',
    'Gravur': 'Engraving',
    'Kartenausschnitt': 'Map section',
    'Deine Landschaft': 'Your landscape',
    'GPX-Datei': 'GPX file',
    'GPX-Dateien': 'GPX files',
    'Einblicke': 'Behind the scenes',
    'Unsere Arbeit': 'Our work',
    'Alle Preise': 'All prices',
    'Lieferzeit': 'Delivery time',
    'Handgefertigt': 'Handmade',
    'Sicher bezahlen': 'Pay securely',
    'Noch Fragen?': 'Any questions?',
    'Wir helfen dir gerne weiter.': 'We are happy to help.',
    'Bitte fülle alle Pflichtfelder aus.': 'Please fill in all required fields.',
    'Bitte gib eine gültige E-Mail-Adresse ein.': 'Please enter a valid email address.',
    'Deine Nachricht wird gesendet …': 'Sending your message…',
    '✓ Deine Nachricht wurde gesendet. Wir melden uns persönlich bei dir!': '✓ Your message has been sent. We will be in touch!',
    'Ein Fehler ist aufgetreten. Bitte versuche es erneut.': 'An error occurred. Please try again.',
    'Verbindungsfehler. Bitte versuche es erneut oder schreib direkt an peak.memory@web.de.': 'Connection error. Please try again or email peak.memory@web.de directly.',
    'Wird gesendet…': 'Sending…',
    'Telefon:': 'Phone:',
    'E-Mail:': 'Email:',
    'Software-Lizenzen': 'Software licenses',
    'Webbrowser': 'Web browser',
    'Außenmaß': 'Outside dimensions',
    'Rechtliches': 'Legal information',
    'Zur Produktübersicht': 'Back to products',
    'Für deine Route': 'For your route',
    'Für dein Relief': 'For your relief',
    'Sonderformate auf Anfrage': 'Custom sizes available on request',
    'Kontaktformular öffnen': 'Open contact form',
    'Mit freundlichen Grüßen': 'Kind regards',
    'Impressum und Datenschutz': 'Legal notice and privacy',
    'Alle Rechte vorbehalten': 'All rights reserved',
    'Keine Checkout-Bestätigung erhalten. Deine Auswahl bleibt erhalten. Erneut versuchen setzt denselben Checkout fort.': 'No checkout confirmation received. Your selection is saved. Trying again will resume the same checkout.',
    'Du bezahlst den angezeigten Gesamtpreis inklusive Versand innerhalb Deutschlands über Stripe. Für Holzsockel ist eine Wandaufhängung für 1 € zusätzlich wählbar. Die Lieferzeit beträgt 5–10 Werktage nach bestätigter Zahlung.': 'Pay the displayed total, including shipping within Germany, through Stripe. A wall mount can be added to wood bases for €1. Delivery takes 5–10 business days after confirmed payment.',
    'Nach bestätigter Zahlung fertigen wir dein Unikat und liefern innerhalb Deutschlands in 5–10 Werktagen.': 'After payment is confirmed, we make your unique piece and deliver within Germany in 5–10 business days.',
    'Der Stripe-Checkout wurde verlassen. Eine Zahlung wird hier nicht bestätigt. Nach einem Neuladen bitte deine GPX-Datei erneut auswählen.': 'You left Stripe Checkout. No payment is confirmed here. After reloading, please select your GPX file again.',
    'Dies ist keine echte Bestellung; es wird kein Produkt gefertigt.': 'This is not a real order; no product will be made.',
    'Nachricht konnte nicht gesendet werden. Bitte versuche es erneut.': 'Your message could not be sent. Please try again.',
    'Vielen Dank für deine Nachricht! Wir melden uns so schnell wie möglich.': 'Thank you for your message! We will get back to you as soon as possible.',
    'Upload fehlgeschlagen. Bitte versuche es erneut.': 'Upload failed. Please try again.',
    'Deine Auswahl ist nicht mehr verfügbar. Bitte lade die Seite neu.': 'Your selection is no longer available. Please reload the page.',
    'Das Laden dauert zu lange. Bitte versuche es erneut.': 'Loading is taking too long. Please try again.',
    'Bitte GPX-Dateien hineinziehen.': 'Please drop GPX files here.',
    'Die Karte konnte nicht vollständig geladen werden. Bitte erneut laden.': 'The map could not be fully loaded. Please reload it.',
    'Datenquelle der Karte': 'Map data source',
    'Kartenausschnitt wird geladen …': 'Loading map section…',
    'Kein gesetzliches Widerrufsrecht:': 'No statutory right of withdrawal:',
    'Du kannst deine Anfrage auch direkt per E-Mail senden.': 'You can also send your inquiry directly by email.',
    'Vielen Dank! Deine Anfrage wurde gesendet.': 'Thank you! Your inquiry has been sent.',
    'Dein Kartenausschnitt wird in die Anfrage übernommen.': 'Your map section will be included in the inquiry.',
    'Kartenausschnitt aus Anfrage entfernt': 'Map section removed from inquiry',
    'Karte erneut laden': 'Reload map',
    'Menü öffnen': 'Open menu',
    'Vorheriger Schritt': 'Previous step',
    'Nächster Schritt': 'Next step'
  });

  const enToDe = Object.fromEntries(Object.entries(deToEn).map(([de, en]) => [en, de]));

  function getPageTitle(lang) {
    const isConfigurator = /configurator\.html/i.test(window.location.pathname) || document.body.classList.contains('configurator');
    if (isConfigurator) {
      if (/gpx-hilfe/i.test(window.location.pathname)) {
        return lang === 'en' ? 'How do I get my GPX file? | Peak Memory' : 'Wie bekomme ich meine GPX-Datei? | Peak Memory';
      }
      return lang === 'en' ? 'Design your route | Peak Memory' : 'Deine Route gestalten | Peak Memory';
    }
    return lang === 'en'
      ? 'Peak Memory | Personalized 3D topography from your GPX route'
      : 'Peak Memory | Personalisierte 3D-Topografie aus deiner GPX-Route';
  }

  function updateRawAttributes(lang) {
    document.documentElement.lang = lang;
    const title = document.querySelector('title');
    if (title) title.textContent = getPageTitle(lang);

    document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
      const isActive = button.dataset.langToggle === lang;
      button.classList.toggle('is-active', isActive);
      button.setAttribute('aria-pressed', String(isActive));
    });

    const menuButton = document.getElementById('hamburger');
    if (menuButton) {
      menuButton.setAttribute('aria-label', lang === 'en' ? 'Open menu' : 'Menü öffnen');
    }
  }

  function translateTextNode(node, lang) {
    if (!node.nodeValue?.trim() || ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement?.tagName)) return;
    const value = node.nodeValue;
    const map = lang === 'en' ? deToEn : enToDe;
    if (Object.hasOwn(map, value)) {
      if (map[value] !== value) node.nodeValue = map[value];
      return;
    }

    const trimmed = value.trim();
    let translated = map[trimmed];
    if (translated === undefined) {
      translated = Object.entries(map).find(([from]) => from.trim() === trimmed)?.[1];
    }
    if (translated !== undefined) {
      const start = value.length - value.trimStart().length;
      const end = value.length - value.trimEnd().length;
      const replacement = `${value.slice(0, start)}${translated}${end && !/\s$/.test(translated) ? value.slice(-end) : ''}`;
      if (replacement !== value) node.nodeValue = replacement;
      return;
    }

    if (node.parentElement?.id === 'configurationSummary' || node.parentElement?.id === 'checkoutSummary') {
      const fragments = lang === 'en'
        ? [
            ['Eiche-Holzsockel mit Gravur', 'Oak wood base with engraving'],
            ['Eiche-Holzsockel ohne Gravur', 'Oak wood base without engraving'],
            ['Weißer Rahmen mit graviertem Passepartout', 'White frame with engraved mount'],
            ['Weißer Rahmen / weißes Passepartout', 'White frame / white mount'],
            ['11 × 13,5 × 2 cm', '11 × 13.5 × 2 cm'],
            ['Außenmaß', 'overall'],
            [' · Rand ', ' · Margin '],
            [' · Höhen ', ' · Elevation '],
            [' · Gravur: ', ' · Engraving: '],
            ['Gravur: keine', 'Engraving: none'],
            [' · Wandaufhängung: nein', ' · Wall mount: no'],
            [' · Wandaufhängung: ja (+1 €)', ' · Wall mount: yes (+€1)'],
            [' · 4 transparente Schutzfüße', ' · 4 transparent protective feet'],
            ['Landschaft ohne Route', 'Landscape without a route'],
            ['Gesamt:', 'Total:'],
            ['inkl. Versand innerhalb Deutschlands', 'including shipping within Germany']
          ]
        : [
            ['Oak wood base with engraving', 'Eiche-Holzsockel mit Gravur'],
            ['Oak wood base without engraving', 'Eiche-Holzsockel ohne Gravur'],
            ['White frame with engraved mount', 'Weißer Rahmen mit graviertem Passepartout'],
            ['White frame / white mount', 'Weißer Rahmen / weißes Passepartout'],
            ['11 × 13.5 × 2 cm', '11 × 13,5 × 2 cm'],
            ['overall', 'Außenmaß'],
            [' · Margin ', ' · Rand '],
            [' · Elevation ', ' · Höhen '],
            [' · Engraving: ', ' · Gravur: '],
            ['Engraving: none', 'Gravur: keine'],
            [' · Wall mount: no', ' · Wandaufhängung: nein'],
            [' · Wall mount: yes (+€1)', ' · Wandaufhängung: ja (+1 €)'],
            [' · 4 transparent protective feet', ' · 4 transparente Schutzfüße'],
            ['Landscape without a route', 'Landschaft ohne Route'],
            ['Total:', 'Gesamt:'],
            ['including shipping within Germany', 'inkl. Versand innerhalb Deutschlands']
          ];
      let updated = value;
      for (const [from, to] of fragments) updated = updated.split(from).join(to);
      if (updated !== value) node.nodeValue = updated;
    } else if (node.parentElement?.id === 'submitCheckout') {
      const buttonLabels = lang === 'en'
        ? [
            ['Zur Testzahlung bei Stripe', 'Continue to Stripe test payment'],
            ['Zahlungspflichtig bestellen', 'Place order with obligation to pay']
          ]
        : [
            ['Continue to Stripe test payment', 'Zur Testzahlung bei Stripe'],
            ['Place order with obligation to pay', 'Zahlungspflichtig bestellen']
          ];
      for (const [from, to] of buttonLabels) node.nodeValue = node.nodeValue.replace(from, to);
    }
  }

  function walkTextTranslations(lang, root = document.body) {
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root, lang);
      return;
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const value = node.nodeValue || '';
        if (!value.trim()) return NodeFilter.FILTER_REJECT;
        if (node.parentElement && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.parentElement.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    let current;
    while ((current = walker.nextNode())) translateTextNode(current, lang);
  }

  const translatableAttributes = ['alt', 'aria-label', 'aria-roledescription', 'placeholder', 'title'];

  function translateAttributes(lang, root = document.body) {
    const map = lang === 'en' ? deToEn : enToDe;
    const elements = root.nodeType === Node.ELEMENT_NODE
      ? [root, ...root.querySelectorAll('*')]
      : document.body.querySelectorAll('*');
    for (const element of elements) {
      for (const attribute of translatableAttributes) {
        const value = element.getAttribute(attribute);
        if (!value) continue;
        let translated = map[value];
        if (attribute === 'aria-label' && translated === undefined) {
          const suffixes = lang === 'en'
            ? [[' aus Anfrage entfernen', ' remove from inquiry'], [' entfernen', ' remove']]
            : [[' remove from inquiry', ' aus Anfrage entfernen'], [' remove', ' entfernen']];
          const suffix = suffixes.find(([from]) => value.endsWith(from));
          if (suffix) translated = `${value.slice(0, -suffix[0].length)}${suffix[1]}`;
        }
        if (translated !== undefined && translated !== value) element.setAttribute(attribute, translated);
      }
    }

    const engraving = document.getElementById('engraving');
    if (engraving && (engraving.value === 'Deine Route\n100 km | 1000 hm | 10 h'
      || engraving.value === 'Your route\n100 km | 1000 m elevation gain | 10 h')) {
      engraving.value = lang === 'en'
        ? 'Your route\n100 km | 1000 m elevation gain | 10 h'
        : 'Deine Route\n100 km | 1000 hm | 10 h';
    }
  }

  function updateMetaDescription(lang) {
    const meta = document.querySelector('meta[name="description"]');
    if (!meta) return;
    if (lang === 'en') {
      meta.setAttribute('content', /gpx-hilfe/i.test(window.location.pathname)
        ? 'Learn how to export a GPX file from Komoot, Strava, or Garmin Connect, or what to do if you did not record your route.'
        : 'Create your custom keepsake with Peak Memory: upload a GPX route, design a 3D relief, and request your personal piece without obligation. Handmade in Baden-Württemberg.');
      return;
    }
    meta.setAttribute('content', /gpx-hilfe/i.test(window.location.pathname)
      ? 'So bekommst du deine GPX-Datei für Peak Memory: Anleitungen für Komoot, Strava und Garmin Connect sowie Hilfe für Touren ohne Aufzeichnung.'
      : 'Gestalte dein Erinnerungsstück mit Peak Memory: GPX hochladen, 3D-Relief personalisieren und unverbindlich anfragen. Handgefertigt in Baden-Württemberg.');
  }

  function storeLanguage(lang) {
    try {
      localStorage.setItem('peakmemory-lang', lang);
    } catch (error) {
      // Ignore localStorage failures in restricted browsing modes.
    }
  }

  function readStoredLanguage() {
    try {
      const value = localStorage.getItem('peakmemory-lang');
      if (value === 'en' || value === 'de') return value;
    } catch (error) {
      // Ignore localStorage failures in restricted browsing modes.
    }
    return defaultLang;
  }

  function updateLanguage(lang) {
    walkTextTranslations(lang);
    translateAttributes(lang);
    updateRawAttributes(lang);
    updateMetaDescription(lang);
    storeLanguage(lang);
  }

  function initialize() {
    const lang = readStoredLanguage();
    updateLanguage(lang);

    const observerOptions = {
      attributes: true,
      attributeFilter: translatableAttributes,
      characterData: true,
      childList: true,
      subtree: true
    };
    document.querySelectorAll('[data-lang-toggle]').forEach((button) => {
      button.addEventListener('click', () => {
        const nextLang = button.dataset.langToggle === 'en' ? 'en' : 'de';
        observer.disconnect();
        try {
          updateLanguage(nextLang);
        } finally {
          observer.observe(document.body, observerOptions);
        }
      });
    });

    const observer = new MutationObserver((mutations) => {
      const currentLang = document.documentElement.lang;
      if (currentLang !== 'en') return;
      observer.disconnect();
      try {
        for (const mutation of mutations) {
          if (mutation.type === 'characterData' && mutation.target.parentElement) {
            translateTextNode(mutation.target, 'en');
          } else if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE) translateTextNode(node, 'en');
              else if (node.nodeType === Node.ELEMENT_NODE) {
                walkTextTranslations('en', node);
                translateAttributes('en', node);
              }
            });
          } else if (mutation.type === 'attributes' && translatableAttributes.includes(mutation.attributeName)) {
            translateAttributes('en', mutation.target);
          }
        }
      } finally {
        observer.observe(document.body, observerOptions);
      }
    });
    observer.observe(document.body, observerOptions);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
