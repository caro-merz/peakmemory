import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseArea, describeArea, geographicPoint } from '../shared/area.js';

export function createAreaPicker({ container, frame, onChange, onMoving }) {
  const map = L.map(container, {
    center: [47.55, 10.3], zoom: 11, zoomSnap: 0, zoomDelta: 1,
    minZoom: 3, maxZoom: 18, worldCopyJump: true,
    attributionControl: true, zoomAnimation: false, fadeAnimation: false, zoomControl: false, trackResize: false,
    inertia: !matchMedia('(prefers-reduced-motion: reduce)').matches,
  });
  L.control.zoom({ position: 'topright', zoomInTitle: 'Karte vergrößern', zoomOutTitle: 'Karte verkleinern' }).addTo(map);
  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    maxZoom: 19, keepBuffer: 0, updateWhenIdle: true, referrerPolicy: 'strict-origin-when-cross-origin',
  });
  let busy = false, loading = true, failed = false, side = frame.getBoundingClientRect().width;
  let latestArea = null, alignedArea = null, resizing = false, moving = false, width = 0, height = 0;
  function selection() {
    if (resizing || moving) return;
    try {
      const zoom = map.getZoom(), scale = 256 * 2 ** zoom;
      const bounds = frame.getBoundingClientRect(), viewport = container.getBoundingClientRect();
      const corner = map.project(map.containerPointToLatLng([bounds.left - viewport.left, bounds.top - viewport.top]), zoom);
      const size = bounds.width / scale;
      const area = alignedArea ?? parseArea({
        left: (((corner.x / scale) % 1) + 1) % 1,
        top: corner.y / scale, size,
      });
      latestArea = area;
      onChange(area, failed ? 'Die Karte konnte nicht vollständig geladen werden. Bitte erneut laden.'
        : loading ? 'Karte wird geladen …' : '', describeArea(area));
    } catch (error) {
      latestArea = null;
      onChange(null, error.message, '');
    }
  }
  tiles.on('loading', () => { loading = true; failed = false; selection(); });
  tiles.on('tileerror', () => { failed = true; selection(); });
  tiles.on('load', () => { loading = false; selection(); });
  map.on('movestart zoomstart', () => {
    if (busy || resizing) return;
    moving = true;
    alignedArea = null;
    frame.style.left = frame.style.top = '';
    onMoving();
  });
  map.on('moveend', () => { moving = false; selection(); });
  tiles.addTo(map);
  function resize() {
    const nextSide = frame.getBoundingClientRect().width;
    if (!nextSide || !container.clientWidth || busy) return;
    if (width === container.clientWidth && height === container.clientHeight) return;
    width = container.clientWidth; height = container.clientHeight;
    const retained = latestArea;
    resizing = true;
    try {
      const center = retained ? geographicPoint(retained.left + retained.size / 2, retained.top + retained.size / 2) : null;
      const zoom = retained ? Math.log2(nextSide / (256 * retained.size)) : map.getZoom() + Math.log2(nextSide / side);
      map.invalidateSize({ pan: false, animate: false });
      if (center) {
        map.setView([center.lat, center.lon], zoom, { animate: false });
        const scale = 256 * 2 ** map.getZoom();
        const origin = map.project(map.containerPointToLatLng([0, 0]), map.getZoom());
        let x = (retained.left + retained.size / 2) * scale;
        x += Math.round((origin.x + width / 2 - x) / scale) * scale;
        // Compensate Leaflet's pixel-rounded origin so resize retains the exact footprint.
        frame.style.left = `${x - origin.x}px`;
        frame.style.top = `${(retained.top + retained.size / 2) * scale - origin.y}px`;
        alignedArea = retained;
      }
      side = nextSide;
    } finally {
      resizing = false;
    }
    selection();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  function keyboard(event) {
    if (busy || event.target !== container) return;
    const directions = { ArrowLeft: [-80, 0], ArrowRight: [80, 0], ArrowUp: [0, -80], ArrowDown: [0, 80] };
    if (!directions[event.key] && !['+', '=', '-'].includes(event.key)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (directions[event.key]) map.panBy(directions[event.key], { animate: false });
    else map.setZoom(map.getZoom() + (event.key === '-' ? -1 : 1), { animate: false });
  }
  container.addEventListener('keydown', keyboard, true);
  selection();
  return {
    refresh() { resize(); selection(); },
    retry() { failed = false; tiles.redraw(); selection(); },
    setBusy(value) {
      busy = value;
      container.inert = value;
      for (const handler of [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom, map.keyboard]) {
        if (value) handler.disable(); else handler.enable();
      }
      if (!value) resize();
    },
    dispose() { observer.disconnect(); container.removeEventListener('keydown', keyboard, true); map.remove(); },
  };
}
