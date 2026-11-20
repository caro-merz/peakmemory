import { configurationPrice } from './product.js';

export const UTH_PICKUP_CUTOFF = 1807869600;
export const UTH_DISCOUNT_END = 1809208800;
export const UTH_ROUTES = Object.freeze({
  UTH5: 'c378d37f50d61000f59e8462e61cb7eba0b131fe3fde19612dceab158a35496e',
  UTH10: '34eab9d90cfcc56b4aa9f5a62fae941ace38e1493eb42e2bd64fae1b1d60f4b5',
  UTH25: '853a1a1e1cb5cbb7e7e359b9bbd8caa1f23c2ac2920c09b65d0cdacc1da65923',
  UTH50: '922f3dbcd8d5385abe41a4e674bbd5964ff7440c7c9a36d5b2b029c21b9153e0',
});

export function offerFor(configuration, code, timestamp, route = '') {
  const normalized = code.trim().toUpperCase();
  if (normalized && (normalized !== 'UTH' || timestamp >= UTH_DISCOUNT_END)) {
    throw new Error('Der Rabattcode ist ungültig oder abgelaufen.');
  }
  const full = configurationPrice(configuration) * 100;
  const base = configurationPrice({ ...configuration, wallMount: false }) * 100;
  const discount = normalized ? Math.round(base * 0.1) : 0;
  return { route, code: normalized, full, discount, amount: full - discount };
}

export function uthFulfillment(route, paidTimestamp) {
  if (!route) return 'shipping';
  return paidTimestamp <= UTH_PICKUP_CUTOFF ? 'pickup' : 'shipping';
}
