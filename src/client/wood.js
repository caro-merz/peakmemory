import { BoxGeometry, Mesh, MeshStandardMaterial } from 'three';
import { PRODUCT_LAYOUT } from '../shared/product.js';

export function createWoodBase() {
  const geometry = new BoxGeometry(PRODUCT_LAYOUT.woodWidth, PRODUCT_LAYOUT.woodThickness, PRODUCT_LAYOUT.woodDepth);
  const material = new MeshStandardMaterial({ color: 0xb88b58, roughness: 0.85 });
  const base = new Mesh(geometry, material);
  base.position.set(0, PRODUCT_LAYOUT.woodCenterY, PRODUCT_LAYOUT.woodCenterZ);
  return base;
}
