import { handleShopStatus } from '../src/server/checkout.js';
export const onRequest = ({ request, env }) => handleShopStatus(request, env);
