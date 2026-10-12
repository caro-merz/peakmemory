import { handleContact } from './src/server/contact.js';
import { handleTerrain } from './src/server/terrain.js';
import { handleCheckout, handleOrderStatus, handleShopStatus, handleStripeWebhook, checkoutMaintenance } from './src/server/checkout.js';

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    if (url.hostname === 'www.peak-memory.de') {
      url.hostname = 'peak-memory.de';
      return Response.redirect(url.toString(), 301);
    }
    if (['/configurator', '/configurator.html', '/configurator/'].includes(url.pathname)) {
      url.pathname = '/';
      url.hash = 'konfigurator';
      return Response.redirect(url.toString(), 301);
    }
    if (url.pathname === '/contact') return handleContact(request, env);
    if (url.pathname === '/checkout') return handleCheckout(request, env, 'test');
    if (url.pathname === '/checkout/live') return handleCheckout(request, env, 'live');
    if (url.pathname === '/order-status') return handleOrderStatus(request, env);
    if (url.pathname === '/shop-status') return handleShopStatus(request, env);
    if (url.pathname === '/stripe-webhook') return handleStripeWebhook(request, env, 'test');
    if (url.pathname === '/stripe-webhook/live') return handleStripeWebhook(request, env, 'live');
    if (url.pathname === '/terrain' || url.pathname.startsWith('/terrain/')) {
      return handleTerrain(request, env, context);
    }
    return env.ASSETS.fetch(request);
  },
  async scheduled(_event, env, context) {
    context.waitUntil(Promise.all([checkoutMaintenance(env, 'test'), checkoutMaintenance(env, 'live')]));
  },
};
