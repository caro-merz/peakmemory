import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three';
import { productLayout } from '../shared/product.js';

export function createFrame() {
  const { frameWidth: width, frameBorder: border, frameDepth: depth, matOpening: opening, reliefOffsetY } = productLayout('frame');
  const group = new Group();
  const frameMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 });
  const matMaterial = new MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
  const backingMaterial = new MeshStandardMaterial({ color: 0xf5f3ed, roughness: 1 });
  const add = (w, h, d, x, y, z, material) => {
    const mesh = new Mesh(new BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  };
  for (const sign of [-1, 1]) {
    add(width, depth, border, 0, 0.06 - depth / 2, sign * (width - border) / 2, frameMaterial);
    add(border, depth, width - border * 2, sign * (width - border) / 2, 0.06 - depth / 2, 0, frameMaterial);
  }
  const inner = width - border * 2;
  const matBorder = (inner - opening) / 2;
  for (const sign of [-1, 1]) {
    add(inner, 0.02, matBorder, 0, 0.01, sign * (opening / 2 + matBorder / 2), matMaterial);
    add(matBorder, 0.02, opening, sign * (opening / 2 + matBorder / 2), 0.01, 0, matMaterial);
  }
  add(inner, 0.02, inner, 0, reliefOffsetY + 0.01, 0, backingMaterial);
  return group;
}
