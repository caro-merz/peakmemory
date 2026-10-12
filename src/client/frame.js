import { BoxGeometry, ExtrudeGeometry, Group, Mesh, MeshStandardMaterial, Path, Shape } from 'three';
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
    return mesh;
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
  const rearY = 0.06 - depth;
  const boardMaterial = new MeshStandardMaterial({ color: 0xb98b58, roughness: 1 });
  const hardwareMaterial = new MeshStandardMaterial({ color: 0x202020, metalness: 0.5, roughness: 0.5 });
  const back = add(inner, 0.025, inner, 0, rearY + 0.0125, 0, boardMaterial);
  back.name = 'frame-backboard';

  const hangerShape = new Shape();
  hangerShape.moveTo(-0.055, -0.07);
  hangerShape.lineTo(0.055, -0.07);
  hangerShape.lineTo(0.055, 0.07);
  hangerShape.lineTo(-0.055, 0.07);
  hangerShape.closePath();
  const hole = new Path();
  hole.absellipse(0, 0, 0.018, 0.028, 0, Math.PI * 2, true);
  hangerShape.holes.push(hole);
  const hanger = new Mesh(new ExtrudeGeometry(hangerShape, { depth: 0.008, bevelEnabled: false }), hardwareMaterial);
  hanger.name = 'frame-hanger';
  hanger.rotation.x = Math.PI / 2;
  hanger.position.set(0, rearY - 0.004, -inner / 2 + 0.07);
  hanger.castShadow = true;
  group.add(hanger);

  const stand = new Group();
  stand.name = 'frame-stand';
  stand.position.set(0, rearY - 0.018, -0.05);
  stand.rotation.x = Math.PI / 6;
  const legShape = new Shape();
  legShape.moveTo(-0.15, 0);
  legShape.lineTo(0.15, 0);
  legShape.lineTo(0.18, 0.96);
  legShape.lineTo(0.12, 1.08);
  legShape.lineTo(-0.18, 1.08);
  legShape.closePath();
  const leg = new Mesh(new ExtrudeGeometry(legShape, { depth: 0.025, bevelEnabled: false }), boardMaterial);
  leg.rotation.x = Math.PI / 2;
  leg.castShadow = true;
  leg.receiveShadow = true;
  stand.add(leg);
  group.add(stand);
  const hinge = add(0.34, 0.028, 0.04, 0, rearY - 0.015, -0.05, hardwareMaterial);
  hinge.name = 'frame-stand-hinge';
  for (const sign of [-1, 1]) {
    add(0.065, 0.008, 0.025, sign * (inner / 2 - 0.025), rearY - 0.004, 0, hardwareMaterial);
  }
  add(0.025, 0.008, 0.065, 0, rearY - 0.004, inner / 2 - 0.025, hardwareMaterial);
  return group;
}
