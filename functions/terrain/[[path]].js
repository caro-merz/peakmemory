import { handleTerrain } from '../../src/server/terrain.js';

export function onRequest(context) {
  return handleTerrain(context.request, context.env, context);
}
