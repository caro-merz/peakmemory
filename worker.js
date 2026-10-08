import { handleContact } from './src/server/contact.js';
import { handleTerrain } from './src/server/terrain.js';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.hostname === 'www.peak-memory.de') {
      url.hostname = 'peak-memory.de';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/contact') return handleContact(request, env);
    if (url.pathname === '/terrain' || url.pathname.startsWith('/terrain/')) {
      return handleTerrain(request, env, context);
    }
    return env.ASSETS.fetch(request);
  },
};
