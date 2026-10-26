const get = id => document.getElementById(id);
const loopback = () => ['localhost', '127.0.0.1'].includes(location.hostname);

export async function initializeStrava() {
  if (!loopback()) return;
  const section = get('stravaLocal');
  const output = get('stravaStatus');
  const connect = get('stravaConnect'), disconnect = get('stravaDisconnect');
  const picker = get('stravaPicker'), activity = get('stravaActivity');
  const generate = get('stravaGenerate'), download = get('stravaDownload');
  const previous = get('stravaPrevious'), next = get('stravaNext');
  let page = 1, busy = false, connected = false, configured = false, hasMore = false;
  let popup = null, poll = null, objectUrl = null;
  const message = (text, error = false) => {
    output.textContent = text;
    output.classList.toggle('error', error);
  };
  const clearDownload = () => {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    download.removeAttribute('href');
    download.hidden = true;
  };
  function controls() {
    connect.disabled = busy || !configured;
    connect.hidden = connected;
    disconnect.hidden = !connected;
    disconnect.disabled = busy;
    get('stravaPrivate').disabled = busy || connected;
    activity.disabled = busy;
    generate.disabled = busy || !activity.value;
    previous.disabled = busy || page <= 1;
    next.disabled = busy || !hasMore;
  }
  async function request(path, options) {
    const response = await fetch(path, { ...options, signal: AbortSignal.timeout(15000), cache: 'no-store' });
    if (!response.ok) {
      const result = await response.json();
      if (response.status === 401) {
        connected = false; picker.hidden = true; clearDownload(); controls();
      }
      throw new Error(result.error || 'Strava-Anfrage fehlgeschlagen. Bitte erneut versuchen.');
    }
    return response;
  }
  async function loadActivities(target = 1) {
    busy = true; controls(); clearDownload();
    try {
      message('Deine Aktivitäten werden geladen …');
      const result = await (await request(`/strava/activities?page=${target}`)).json();
      if (!Array.isArray(result.activities) || typeof result.hasMore !== 'boolean'
        || result.activities.some(item => typeof item.id !== 'string' || typeof item.name !== 'string')) {
        throw new Error('Strava hat eine ungültige Aktivitätenliste geliefert.');
      }
      activity.replaceChildren();
      for (const item of result.activities) {
        const option = document.createElement('option');
        option.value = item.id;
        const date = new Date(item.startDate);
        const label = Number.isFinite(date.getTime()) ? `${date.toLocaleDateString('de-DE')} · ` : '';
        option.textContent = `${label}${item.name}`;
        activity.append(option);
      }
      page = target; hasMore = result.hasMore; picker.hidden = false;
      message(result.activities.length ? 'Wähle eine Aktivität mit GPS-Aufzeichnung aus.' : 'Auf dieser Seite sind keine Aktivitäten vorhanden.');
    } catch (error) {
      message(error.message || 'Aktivitäten konnten nicht geladen werden.', true);
    } finally { busy = false; controls(); }
  }
  async function status() {
    const response = await request('/strava/status');
    const result = await response.json();
    if (result.available !== true || typeof result.configured !== 'boolean' || typeof result.connected !== 'boolean') {
      throw new Error('Der lokale Strava-Status ist ungültig.');
    }
    configured = result.configured; connected = result.connected; controls();
    return result;
  }
  async function finishConnection() {
    clearInterval(poll); poll = null;
    popup?.close(); popup = null; busy = false;
    if (connected) await loadActivities();
    else {
      controls();
      message('Verbindung nicht hergestellt. Autorisierung abgebrochen oder fehlgeschlagen. Bitte erneut verbinden.', true);
    }
  }
  connect.addEventListener('click', () => {
    if (busy) return;
    if (location.hostname !== 'localhost') {
      message('Bitte öffne diese Seite über localhost statt 127.0.0.1, damit der Strava-Callback dieselbe Sitzung verwendet.', true);
      return;
    }
    busy = true; controls(); clearDownload();
    popup = window.open(`/strava/connect?private=${get('stravaPrivate').checked}`, 'peakmemory-strava', 'popup,width=650,height=780');
    if (!popup) {
      busy = false; controls();
      message('Das Verbindungsfenster wurde blockiert. Erlaube Pop-ups für localhost und versuche es erneut.', true);
      return;
    }
    message('Bestätige den Zugriff im Strava-Fenster. Deine aktuelle Konfiguration bleibt hier erhalten.');
    const deadline = Date.now() + 10 * 60 * 1000;
    let checking = false;
    poll = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        await status();
        if (connected || popup?.closed || Date.now() > deadline) await finishConnection();
      } catch (error) {
        clearInterval(poll); poll = null;
        popup?.close(); popup = null; busy = false; controls();
        message(error.message || 'Verbindungsstatus konnte nicht geladen werden.', true);
      } finally { checking = false; }
    }, 2000);
  });
  disconnect.addEventListener('click', async () => {
    busy = true; controls();
    try {
      await request('/strava/disconnect', { method: 'POST' });
      connected = false; picker.hidden = true; activity.replaceChildren(); clearDownload();
      message('Lokale Sitzung entfernt. Eine dauerhafte App-Freigabe kannst du zusätzlich in deinen Strava-Einstellungen widerrufen.');
    } catch (error) { message(error.message, true); }
    finally { busy = false; controls(); }
  });
  previous.addEventListener('click', () => loadActivities(page - 1));
  next.addEventListener('click', () => loadActivities(page + 1));
  activity.addEventListener('change', clearDownload);
  generate.addEventListener('click', async () => {
    if (!activity.value || busy) return;
    busy = true; controls(); clearDownload();
    try {
      message('GPS-Punkte werden gelesen und deine GPX wird erzeugt …');
      const response = await request(`/strava/gpx?id=${encodeURIComponent(activity.value)}`);
      if (!response.headers.get('content-type')?.includes('application/gpx+xml')) {
        throw new Error('Die Antwort enthält keine GPX-Datei.');
      }
      const blob = await response.blob();
      if (!blob.size || blob.size > 5 * 1024 * 1024) throw new Error('Die generierte GPX ist leer oder größer als 5 MB.');
      objectUrl = URL.createObjectURL(blob);
      download.href = objectUrl;
      download.download = `strava-${activity.value}-generiert.gpx`;
      download.hidden = false;
      message('GPX bereit. Aus Strava-Koordinaten generiert, kein Originalexport. Nur für deinen persönlichen lokalen Test; keine Bestellung.');
      download.focus();
    } catch (error) { message(error.message || 'GPX konnte nicht erzeugt werden.', true); }
    finally { busy = false; controls(); }
  });
  window.addEventListener('pagehide', () => {
    clearInterval(poll); popup?.close(); clearDownload();
  });
  try {
    const response = await fetch('/strava/status', { cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (response.status === 404) return;
    if (!response.ok) throw new Error('Der lokale Strava-Dienst ist nicht erreichbar.');
    const result = await response.json();
    if (result.available !== true) throw new Error('Der lokale Strava-Dienst ist nicht verfügbar.');
    section.hidden = false;
    configured = result.configured === true; connected = result.connected === true;
    if (location.hostname !== 'localhost') {
      const local = new URL(location.href); local.hostname = 'localhost';
      const link = document.createElement('a'); link.href = local.href; link.textContent = 'Zu localhost wechseln';
      message('Für Strava bitte localhost verwenden. ');
      output.append(link); connect.disabled = true; return;
    }
    const returned = new URL(location.href);
    const callback = returned.searchParams.get('strava');
    if (callback) {
      returned.searchParams.delete('strava');
      history.replaceState(null, '', returned.pathname + returned.search + returned.hash);
    }
    controls();
    if (!configured) message('Trage STRAVA_CLIENT_ID und STRAVA_CLIENT_SECRET in .env.local ein. Starte danach den lokalen Server neu.', true);
    else if (connected) await loadActivities();
    else message(callback && callback !== 'connected'
      ? 'Strava-Verbindung abgebrochen oder fehlgeschlagen. Bitte erneut verbinden.'
      : 'Der Zugriff ist freiwillig. Tokens bleiben nur kurzzeitig im Speicher des lokalen Servers.', Boolean(callback));
  } catch (error) {
    section.hidden = false;
    configured = false; controls();
    message(error.message || 'Strava konnte nicht initialisiert werden.', true);
  }
}
