import { DataTexture, LinearFilter, LinearMipmapLinearFilter, Mesh, MeshStandardMaterial, RGBAFormat, SRGBColorSpace } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PRODUCT_LAYOUT } from '../shared/product.js';

function random(x, y) {
  const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function noise(x, y) {
  const ix = Math.floor(x), iy = Math.floor(y);
  const fx = x - ix, fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = random(ix, iy), b = random(ix + 1, iy);
  const c = random(ix, iy + 1), d = random(ix + 1, iy + 1);
  return (a + (b - a) * sx) * (1 - sy) + (c + (d - c) * sx) * sy;
}

export function woodTexturePixels(size, face) {
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const u = x / size * (face === 'end' ? 13.5 : 11);
    const v = y / size * (face === 'top' ? 13.5 : 2);
    const warp = noise(u * 0.2, v * 0.4) * 0.6 + Math.sin(u * 0.35) * 0.15;
    const grain = face === 'end' ? Math.hypot(u * 0.35 + 1.5, v + 3) : v + warp;
    const rings = Math.sin(grain * 22 + noise(u * 0.3, v * 2) * 2);
    const darkRing = Math.pow(Math.max(0, rings), 9);
    const fibers = noise(u * 1.2, grain * 65);
    const pore = Math.pow(Math.max(0, (noise(u * 5, grain * 30) - 0.6) / 0.4), 3);
    const tone = noise(u * 0.3, v * 0.8) * 14 + fibers * 8 - darkRing * 18 - pore * 26 + random(x, y) * 3;
    const offset = (y * size + x) * 4;
    pixels[offset] = 177 + tone;
    pixels[offset + 1] = 137 + tone;
    pixels[offset + 2] = 89 + tone * 0.8;
    pixels[offset + 3] = 255;
  }
  return pixels;
}

const textureSize = 512;
const pixelCache = new Map();
function woodMaterial(face) {
  if (!pixelCache.has(face)) pixelCache.set(face, woodTexturePixels(textureSize, face));
  const texture = new DataTexture(pixelCache.get(face), textureSize, textureSize, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return new MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: 0.0006, roughness: 0.85 });
}

export function createWoodBase() {
  const geometry = new RoundedBoxGeometry(PRODUCT_LAYOUT.woodWidth, PRODUCT_LAYOUT.woodThickness, PRODUCT_LAYOUT.woodDepth, 2, PRODUCT_LAYOUT.woodEdgeRadius);
  const top = woodMaterial('top'), side = woodMaterial('side'), end = woodMaterial('end');
  // BoxGeometry material order: +x, -x (end grain), +y, -y, +z, -z.
  const base = new Mesh(geometry, [end, end, top, top, side, side]);
  base.position.set(0, PRODUCT_LAYOUT.woodCenterY, PRODUCT_LAYOUT.woodCenterZ);
  return base;
}
