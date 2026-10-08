export const GRID_SIZE = 129;
export const MAX_TILES = 16;
export const MAX_DRAW_POINTS = 12000;
export const DEFAULT_ELEVATION_SCALE = 2;
const EARTH_CIRCUMFERENCE = 40075016.686;

export function project({ lat, lon }) {
  const radians = lat * Math.PI / 180;
  return { x: ((lon + 180) / 360) % 1, y: (1 - Math.log(Math.tan(Math.PI / 4 + radians / 2)) / Math.PI) / 2 };
}

export function terrainPlan(route, margin) {
  const coordinates = route.segments.map(segment => segment.map(project));
  const xs = coordinates.flatMap(segment => segment.map(point => point.x)).sort((a, b) => a - b);
  let gap = -1;
  let start = xs[0];
  for (let index = 0; index < xs.length; index += 1) {
    const next = index + 1 < xs.length ? xs[index + 1] : xs[0] + 1;
    if (next - xs[index] > gap) {
      gap = next - xs[index];
      start = next % 1;
    }
  }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const segment of coordinates) for (const point of segment) {
    if (point.x < start - 1e-12) point.x += 1;
    minX = Math.min(minX, point.x); maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y); maxY = Math.max(maxY, point.y);
  }
  const centerLat = Math.atan(Math.sinh(Math.PI * (1 - minY - maxY))) * 180 / Math.PI;
  const metersPerWorld = EARTH_CIRCUMFERENCE * Math.cos(centerLat * Math.PI / 180);
  const size = Math.max(maxX - minX, maxY - minY, 300 / metersPerWorld) * (1 + 2 * margin);
  const left = (minX + maxX - size) / 2;
  const top = (minY + maxY - size) / 2;
  if (size >= 1 || top < 0 || top + size > 1) {
    throw new Error('Der Geländeausschnitt ist zu groß oder reicht in die Polarregion. Bitte eine kleinere Route oder weniger Rand wählen.');
  }
  for (let zoom = 14; zoom >= 0; zoom -= 1) {
    const scale = 2 ** zoom;
    const x0 = Math.floor(left * scale), x1 = Math.floor((left + size) * scale);
    const y0 = Math.floor(top * scale), y1 = Math.floor((top + size) * scale);
    if ((x1 - x0 + 1) * (y1 - y0 + 1) > MAX_TILES) continue;
    const tiles = [];
    for (let x = x0; x <= x1; x += 1) for (let y = y0; y <= y1; y += 1) {
      tiles.push({ x, y, wrappedX: ((x % scale) + scale) % scale, zoom });
    }
    return { left, top, size, zoom, tiles, coordinates, metersPerWorld, groundWidth: size * metersPerWorld };
  }
  throw new Error('Für diesen Ausschnitt konnte kein Gelände geladen werden.');
}

export const decodeHeight = (red, green, blue) => red * 256 + green + blue / 256 - 32768;

export function sampleTiles(plan, tiles, x, y) {
  const scale = 2 ** plan.zoom;
  // Pixels encode heights at their centers. Interpolation crosses tile boundaries.
  const px = x * scale * 256 - 0.5;
  const py = y * scale * 256 - 0.5;
  const ix = Math.floor(px), iy = Math.floor(py);
  function height(pixelX, pixelY) {
    const tx = Math.floor(pixelX / 256), ty = Math.floor(pixelY / 256);
    const tile = tiles.get(`${tx},${ty}`);
    if (!tile) {
      // At a requested outer edge, use the closest available pixel, never invented terrain.
      const nearestX = Math.max(plan.tileBounds.x0, Math.min(plan.tileBounds.x1, tx));
      const nearestY = Math.max(plan.tileBounds.y0, Math.min(plan.tileBounds.y1, ty));
      const edge = tiles.get(`${nearestX},${nearestY}`);
      if (!edge) throw new Error('Unvollständige Geländedaten.');
      const localX = Math.max(0, Math.min(255, pixelX - nearestX * 256));
      const localY = Math.max(0, Math.min(255, pixelY - nearestY * 256));
      const offset = (localY * 256 + localX) * 4;
      return decodeHeight(edge[offset], edge[offset + 1], edge[offset + 2]);
    }
    const offset = ((pixelY - ty * 256) * 256 + pixelX - tx * 256) * 4;
    return decodeHeight(tile[offset], tile[offset + 1], tile[offset + 2]);
  }
  const fx = px - ix, fy = py - iy;
  return (height(ix, iy) * (1 - fx) + height(ix + 1, iy) * fx) * (1 - fy)
    + (height(ix, iy + 1) * (1 - fx) + height(ix + 1, iy + 1) * fx) * fy;
}

export function terrainGrid(plan, tiles) {
  const heights = new Float32Array(GRID_SIZE * GRID_SIZE);
  plan.tileBounds = {
    x0: Math.min(...plan.tiles.map(tile => tile.x)), x1: Math.max(...plan.tiles.map(tile => tile.x)),
    y0: Math.min(...plan.tiles.map(tile => tile.y)), y1: Math.max(...plan.tiles.map(tile => tile.y)),
  };
  let minimum = Infinity;
  for (let row = 0; row < GRID_SIZE; row += 1) for (let column = 0; column < GRID_SIZE; column += 1) {
    const height = sampleTiles(plan, tiles, plan.left + column / (GRID_SIZE - 1) * plan.size,
      plan.top + row / (GRID_SIZE - 1) * plan.size);
    if (!Number.isFinite(height) || height < -12000 || height > 10000) {
      throw new Error('Die Geländedaten enthalten ungültige Höhen.');
    }
    heights[row * GRID_SIZE + column] = height;
    minimum = Math.min(minimum, height);
  }
  return { heights, minimum, plan };
}

export function surfaceHeight(grid, u, v) {
  const x = Math.max(0, Math.min(GRID_SIZE - 1, u * (GRID_SIZE - 1)));
  const y = Math.max(0, Math.min(GRID_SIZE - 1, v * (GRID_SIZE - 1)));
  const column = Math.min(GRID_SIZE - 2, Math.floor(x)), row = Math.min(GRID_SIZE - 2, Math.floor(y));
  const fx = x - column, fy = y - row;
  const a = grid.heights[row * GRID_SIZE + column], b = grid.heights[row * GRID_SIZE + column + 1];
  const d = grid.heights[(row + 1) * GRID_SIZE + column], c = grid.heights[(row + 1) * GRID_SIZE + column + 1];
  const height = fx + fy <= 1 ? a + (b - a) * fx + (d - a) * fy
    : c + (d - c) * (1 - fx) + (b - c) * (1 - fy);
  return 0.045 + (height - grid.minimum) / grid.plan.groundWidth * (grid.elevationScale ?? DEFAULT_ELEVATION_SCALE);
}

export function routePaths(grid) {
  const coordinates = grid.plan.coordinates;
  const total = coordinates.reduce((sum, segment) => sum + segment.length, 0);
  for (let stride = Math.max(1, Math.ceil(total / 3000)); stride <= total * 2; stride *= 2) {
    let count = 0;
    const paths = [];
    for (const segment of coordinates) {
      const anchors = segment.filter((_, index) => index % stride === 0 || index === segment.length - 1);
      const path = [];
      const local = point => ({ x: (point.x - grid.plan.left) / grid.plan.size * (GRID_SIZE - 1),
        y: (point.y - grid.plan.top) / grid.plan.size * (GRID_SIZE - 1) });
      const append = point => {
        const u = point.x / (GRID_SIZE - 1), v = point.y / (GRID_SIZE - 1);
        path.push({ x: u - 0.5, y: surfaceHeight(grid, u, v) + 0.003, z: v - 0.5 });
        count += 1;
      };
      append(local(anchors[0]));
      for (let index = 1; index < anchors.length && count <= MAX_DRAW_POINTS; index += 1) {
        const a = local(anchors[index - 1]), b = local(anchors[index]);
        const cuts = new Set([1]);
        // Split at every triangle boundary so the route cannot cut through a ridge.
        for (const [start, end] of [[a.x,b.x],[a.y,b.y],[a.x+a.y,b.x+b.y]]) {
          if (Math.abs(end - start) < 1e-10) continue;
          for (let boundary = Math.floor(Math.min(start, end)) + 1; boundary < Math.max(start, end); boundary += 1) {
            const t = (boundary - start) / (end - start);
            if (t > 1e-9 && t < 1 - 1e-9) cuts.add(t);
          }
        }
        for (const t of [...cuts].sort((x, y) => x - y)) {
          append({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
      paths.push(path);
      if (count > MAX_DRAW_POINTS) break;
    }
    if (count <= MAX_DRAW_POINTS && paths.length === coordinates.length) return paths;
  }
  throw new Error('Die Route ist zu komplex für die 3D-Vorschau. Du kannst sie trotzdem anfragen.');
}
