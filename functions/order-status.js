import { handleOrderStatus } from '../src/server/checkout.js';
export const onRequest = ({ request, env }) => handleOrderStatus(request, env);
