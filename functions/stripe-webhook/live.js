import { handleStripeWebhook } from '../../src/server/checkout.js';
export const onRequest = ({ request, env }) => handleStripeWebhook(request, env, 'live');
