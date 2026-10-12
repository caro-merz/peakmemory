import { handleCheckout } from '../src/server/checkout.js';
export const onRequest = ({ request, env }) => handleCheckout(request, env);
