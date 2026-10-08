import { terrainGrid } from '../shared/geometry.js';

export async function loadTerrain(plan, signal) {
  const tiles = new Map();
  let cursor = 0;
  async function worker() {
    while (cursor < plan.tiles.length) {
      const tile = plan.tiles[cursor++];
      let response;
      try {
        response = await fetch(`/terrain/${tile.zoom}/${tile.wrappedX}/${tile.y}.png`, { signal });
      } catch (error) {
        signal.throwIfAborted();
        console.error('Terrain connection failed', error instanceof Error ? error.name : 'UnknownError');
        throw new Error('Keine Verbindung zum Vorschau-Server. Prüfe deine Internetverbindung. Bei einer lokalen Vorschau muss der Entwicklungsserver laufen. Starte ihn gegebenenfalls neu und klicke auf „Erneut laden“.');
      }
      if (!response.ok) {
        throw new Error(response.status === 429
          ? 'Zu viele Gelände-Anfragen. Bitte warte eine Minute und versuche es erneut.'
          : 'Das Gelände konnte nicht geladen werden. Bitte versuche es erneut oder sende deine Anfrage ohne Vorschau.');
      }
      if (!response.headers.get('content-type')?.includes('image/png')) {
        throw new Error('Der Server liefert keine gültigen Geländedaten.');
      }
      const bitmap = await createImageBitmap(await response.blob(), {
        colorSpaceConversion: 'none', premultiplyAlpha: 'none',
      });
      try {
        if (bitmap.width !== 256 || bitmap.height !== 256) throw new Error('Unerwartetes Format der Geländedaten.');
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 256;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Dein Browser unterstützt die Gelände-Auswertung nicht.');
        context.drawImage(bitmap, 0, 0);
        tiles.set(`${tile.x},${tile.y}`, context.getImageData(0, 0, 256, 256).data);
      } finally { bitmap.close(); }
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, plan.tiles.length) }, worker));
  signal.throwIfAborted();
  return terrainGrid(plan, tiles);
}
