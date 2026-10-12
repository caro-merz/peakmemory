import { CylinderGeometry, ExtrudeGeometry, Group, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, Shape, SphereGeometry, BoxGeometry } from 'three';

export function createWoodHardware(layout, wallMount = false) {
  const group = new Group();
  group.name = 'wood-hardware';
  const underside = layout.woodCenterY - layout.woodThickness / 2;
  const feet = new Group();
  feet.name = 'protective-feet';
  const footMaterial = new MeshPhysicalMaterial({
    color: 0xffffff, transparent: true, opacity: 0.5, roughness: 0.15,
    metalness: 0, clearcoat: 1, depthWrite: false,
  });
  const footGeometry = new SphereGeometry(1, 24, 12);
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const foot = new Mesh(footGeometry, footMaterial);
    foot.scale.set(0.035, 0.012, 0.035);
    foot.position.set(x * (layout.woodWidth / 2 - 0.075), underside - 0.008,
      layout.woodCenterZ + z * (layout.woodDepth / 2 - 0.075));
    feet.add(foot);
  }
  group.add(feet);
  if (!wallMount) return group;
  const hanger = new Group();
  hanger.name = 'wall-mount';
  hanger.position.set(0, underside - 0.012, layout.woodCenterZ - layout.woodDepth / 2 + 0.12);
  const shape = new Shape();
  shape.moveTo(-0.16, -0.025);
  shape.lineTo(0.16, -0.025);
  shape.lineTo(0.16, 0.025);
  shape.lineTo(0.11, 0.025);
  for (let tooth = 0; tooth < 8; tooth += 1) {
    shape.lineTo(0.11 - (tooth + 0.5) * 0.0275, 0.004);
    shape.lineTo(0.11 - (tooth + 1) * 0.0275, 0.025);
  }
  shape.lineTo(-0.16, 0.025);
  shape.closePath();
  const bracket = new Mesh(new ExtrudeGeometry(shape, {
    depth: 0.006, bevelEnabled: false,
  }), new MeshStandardMaterial({ color: 0x202020, metalness: 0.65, roughness: 0.4 }));
  bracket.rotation.x = Math.PI / 2;
  hanger.add(bracket);
  const screwMaterial = new MeshStandardMaterial({ color: 0xc6c8ca, metalness: 0.85, roughness: 0.25 });
  const slotMaterial = new MeshStandardMaterial({ color: 0x444444, roughness: 0.8 });
  for (const x of [-0.135, 0.135]) {
    const screw = new Mesh(new CylinderGeometry(0.016, 0.016, 0.006, 20), screwMaterial);
    screw.position.set(x, -0.008, 0);
    hanger.add(screw);
    for (const angle of [0, Math.PI / 2]) {
      const slot = new Mesh(new BoxGeometry(0.022, 0.001, 0.003), slotMaterial);
      slot.position.set(x, -0.0115, 0);
      slot.rotation.y = angle;
      hanger.add(slot);
    }
  }
  group.add(hanger);
  return group;
}
