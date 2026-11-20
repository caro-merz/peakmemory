import { areaPlan, terrainPlan, terrainGrid, limitedElevationScale, reliefHeightMm, reliefHeightTier } from '../shared/geometry.js';
import { RELIEF_HEIGHT_LIMITS_MM } from '../shared/product.js';
import { handleTerrain } from './terrain.js';
import { decodeTerrain } from './terrain-decoder.js';
import { CheckoutError } from './checkout-helpers.js';

export async function verifiedHeightTier(configuration, route, request, env, decode = decodeTerrain) {
  const plan = configuration.source === 'area' ? areaPlan(configuration.area) : terrainPlan(route, configuration.margin);
  const tiles = new Map();
  let cursor = 0;
  async function load() {
    while (cursor < plan.tiles.length) {
      const tile = plan.tiles[cursor++];
      const url = new URL(`/terrain/${tile.zoom}/${tile.wrappedX}/${tile.y}.webp`, request.url);
      const response = await handleTerrain(new Request(url, { headers: {
        'CF-Connecting-IP': request.headers.get('CF-Connecting-IP') || 'unknown',
      } }), env);
      if (!response.ok) throw new CheckoutError('Die Reliefhöhe konnte nicht überprüft werden. Bitte versuche es erneut.', 503);
      const image = await decode(await response.arrayBuffer());
      if (image.width !== 512 || image.height !== 512) throw new CheckoutError('Ungültige Geländedaten.', 503);
      tiles.set(`${tile.x},${tile.y}`, image.data);
    }
  }
  await Promise.all(Array.from({ length: Math.min(4, plan.tiles.length) }, load));
  const grid = terrainGrid(plan, tiles);
  const max = configuration.product === 'frame' ? RELIEF_HEIGHT_LIMITS_MM.frame : RELIEF_HEIGHT_LIMITS_MM.extraTall;
  const scale = limitedElevationScale(grid, configuration.elevationScale, max);
  return configuration.product === 'frame' ? max : reliefHeightTier(reliefHeightMm(grid, scale));
}
