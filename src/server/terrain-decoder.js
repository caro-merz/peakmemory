import decode, { init } from '@jsquash/webp/decode.js';

let ready;

export async function decodeTerrain(bytes) {
  if (!ready) {
    ready = import('@jsquash/webp/codec/dec/webp_dec.wasm').then(({ default: wasm }) => init(wasm));
  }
  await ready;
  return decode(bytes);
}
