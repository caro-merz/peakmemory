import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GRID_SIZE, surfaceHeight, routePaths } from '../shared/geometry.js';
import { drawEngraving, loadEngravingFont } from './engraving.js';
import { PRODUCT_LAYOUT } from '../shared/product.js';
import { loadLogoCanvas } from './logo.js';
import { createWoodBase } from './wood.js';
import { MAX_PREVIEW_SIZE, MAX_PREVIEW_DIMENSION } from '../shared/preview.js';

function terrainMesh(grid) {
  const positions = [], indices = [];
  for (let row = 0; row < GRID_SIZE; row += 1) for (let column = 0; column < GRID_SIZE; column += 1) {
    const u = column / (GRID_SIZE - 1), v = row / (GRID_SIZE - 1);
    positions.push(u - 0.5, surfaceHeight(grid, u, v), v - 0.5);
  }
  for (let row = 0; row < GRID_SIZE - 1; row += 1) for (let column = 0; column < GRID_SIZE - 1; column += 1) {
    const a = row * GRID_SIZE + column, b = a + 1, d = a + GRID_SIZE, c = d + 1;
    indices.push(a, d, b, b, d, c);
  }
  const boundary = [];
  for (let column = 0; column < GRID_SIZE; column += 1) boundary.push(column);
  for (let row = 1; row < GRID_SIZE; row += 1) boundary.push(row * GRID_SIZE + GRID_SIZE - 1);
  for (let column = GRID_SIZE - 2; column >= 0; column -= 1) boundary.push((GRID_SIZE - 1) * GRID_SIZE + column);
  for (let row = GRID_SIZE - 2; row > 0; row -= 1) boundary.push(row * GRID_SIZE);
  for (let index = 0; index < boundary.length; index += 1) {
    const a = boundary[index], b = boundary[(index + 1) % boundary.length];
    const start = positions.length / 3;
    positions.push(positions[a * 3], 0.02, positions[a * 3 + 2],
      positions[b * 3], 0.02, positions[b * 3 + 2]);
    indices.push(a, b, start, b, start + 1, start);
  }
  const bottom = positions.length / 3;
  positions.push(-0.5, 0.02, -0.5, 0.5, 0.02, -0.5, 0.5, 0.02, 0.5, -0.5, 0.02, 0.5);
  indices.push(bottom, bottom + 1, bottom + 2, bottom, bottom + 2, bottom + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
    color: 0xbcbba8, roughness: 0.9, side: THREE.DoubleSide,
  }));
}

function routeMesh(path) {
  const positions = [], indices = [], sides = 6, radius = 0.0028;
  for (let index = 0; index < path.length; index += 1) {
    const point = path[index];
    const previous = path[Math.max(0, index - 1)], next = path[Math.min(path.length - 1, index + 1)];
    const tangent = new THREE.Vector3(next.x - previous.x, next.y - previous.y, next.z - previous.z).normalize();
    const normal = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
    const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
    for (let side = 0; side < sides; side += 1) {
      const angle = side / sides * Math.PI * 2;
      const offset = normal.clone().multiplyScalar(Math.cos(angle) * radius).addScaledVector(binormal, Math.sin(angle) * radius);
      positions.push(point.x + offset.x, point.y + 0.003 + offset.y, point.z + offset.z);
      if (index) {
        const a = (index - 1) * sides + side, b = (index - 1) * sides + (side + 1) % sides;
        const c = index * sides + side, d = index * sides + (side + 1) % sides;
        indices.push(a, c, b, b, c, d);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0xa9432c, roughness: 0.6, side: THREE.DoubleSide }));
}

function dispose(object) {
  const textures = new Set(), materials = new Set();
  object.traverse(child => {
    child.geometry?.dispose();
    for (const material of child.material ? (Array.isArray(child.material) ? child.material : [child.material]) : []) {
      materials.add(material);
      if (material.map) textures.add(material.map);
      if (material.bumpMap) textures.add(material.bumpMap);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
}

export async function createViewer(container, onUnavailable) {
  const [logoCanvas] = await Promise.all([loadLogoCanvas(), loadEngravingFont()]);
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0xf0efe9);
  renderer.domElement.setAttribute('aria-label', '3D-Relief mit Route. Nutze die Ansichtsbuttons zum Drehen und Zoomen.');
  renderer.domElement.setAttribute('role', 'img');
  container.append(renderer.domElement);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x706b58, 1.8));
  const light = new THREE.DirectionalLight(0xffffff, 1.8);
  light.position.set(-2, 4, 2);
  scene.add(light);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.minDistance = 1.1;
  controls.maxDistance = 6;
  controls.maxPolarAngle = Math.PI / 2 - 0.05;
  let model = null, grid = null, visible = true, disposed = false;
  const render = () => { if (visible && !disposed) renderer.render(scene, camera); };
  function resize() {
    const { width, height } = container.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; render(); });
  observer.observe(container);
  controls.addEventListener('change', render);
  function reset() {
    let maxHeight = 0.1;
    if (grid) for (const height of grid.heights) {
      maxHeight = Math.max(maxHeight, 0.045 + (height - grid.minimum) / grid.plan.groundWidth * grid.elevationScale);
    }
    controls.target.set(0, maxHeight / 3, PRODUCT_LAYOUT.woodCenterZ);
    const offset = new THREE.Vector3(1.4, 1.4 + maxHeight, 1.8);
    const distance = offset.length();
    controls.maxDistance = Math.max(6, distance * 2);
    camera.far = Math.max(100, distance * 4);
    camera.position.copy(controls.target).add(offset);
    controls.update();
    resize();
    render();
  }
  function clear() {
    if (model) { scene.remove(model); dispose(model); model = null; }
    grid = null;
    render();
  }
  function personalize(engraving) {
    if (!model) return;
    const old = model.getObjectByName('product');
    if (old) { model.remove(old); dispose(old); }
    const group = new THREE.Group();
    group.name = 'product';
    group.add(createWoodBase());
    const logoTexture = new THREE.CanvasTexture(logoCanvas);
    logoTexture.colorSpace = THREE.SRGBColorSpace;
    const logo = new THREE.Mesh(new THREE.PlaneGeometry(PRODUCT_LAYOUT.logoWidth, PRODUCT_LAYOUT.logoHeight),
      new THREE.MeshStandardMaterial({ map: logoTexture, transparent: true, depthWrite: false, roughness: 0.85 }));
    logo.position.set(PRODUCT_LAYOUT.logoCenterX, PRODUCT_LAYOUT.logoCenterY, PRODUCT_LAYOUT.logoFrontZ);
    group.add(logo);
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Der Gravurtext konnte nicht dargestellt werden.');
    drawEngraving(context, engraving, canvas.width, canvas.height);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const label = new THREE.Mesh(new THREE.PlaneGeometry(PRODUCT_LAYOUT.engravingWidth, PRODUCT_LAYOUT.engravingDepth),
      new THREE.MeshStandardMaterial({ map: texture, transparent: true, depthWrite: false, roughness: 0.85 }));
    label.rotation.x = -Math.PI / 2;
    label.position.set(0, 0.021, PRODUCT_LAYOUT.engravingCenterZ);
    group.add(label);
    model.add(group);
    render();
  }
  function show(nextGrid, elevationScale, engraving) {
    clear();
    grid = { ...nextGrid, elevationScale };
    model = new THREE.Group();
    model.add(terrainMesh(grid));
    for (const path of routePaths(grid)) model.add(routeMesh(path));
    scene.add(model);
    personalize(engraving);
    reset();
  }
  const lost = event => { event.preventDefault(); onUnavailable('Die 3D-Grafik ist nicht mehr verfügbar. Bitte lade die Vorschau erneut.'); };
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize(); reset();
  return {
    show, personalize, clear, reset,
    async screenshot() {
      renderer.render(scene, camera);
      const canvas = document.createElement('canvas');
      const source = renderer.domElement;
      const scale = Math.min(1, MAX_PREVIEW_DIMENSION / Math.max(source.width, source.height));
      canvas.width = Math.max(1, Math.round(source.width * scale));
      canvas.height = Math.max(1, Math.round(source.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Das Vorschaubild konnte nicht erstellt werden.');
      context.drawImage(source, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob || blob.size > MAX_PREVIEW_SIZE) throw new Error('Das Vorschaubild konnte nicht erstellt werden oder ist zu groß. Bitte verkleinere die Vorschau und versuche es erneut.');
      return blob;
    },
    setElevationScale(elevationScale, engraving) {
      if (grid) show(grid, elevationScale, engraving);
    },
    rotate() {
      const offset = camera.position.clone().sub(controls.target);
      offset.applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 6);
      camera.position.copy(controls.target).add(offset); controls.update(); render();
    },
    zoom(factor) {
      const offset = camera.position.clone().sub(controls.target);
      offset.setLength(Math.max(controls.minDistance, Math.min(controls.maxDistance, offset.length() * factor)));
      camera.position.copy(controls.target).add(offset); controls.update(); render();
    },
    dispose() {
      clear(); disposed = true; resizeObserver.disconnect(); observer.disconnect(); controls.dispose();
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.dispose(); renderer.domElement.remove();
    },
  };
}
