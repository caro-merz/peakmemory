export const PRODUCTS = Object.freeze({
  base: Object.freeze({
    id: 'base', name: 'Eiche-Holzsockel mit Gravur', priceEur: 50, engraving: true,
    dimensions: '11 × 13,5 × 2 cm', support: 'Eiche-Holzsockel',
    description: '10 × 10 cm Relief auf Eiche, mit Lasergravur auf Holz.',
  }),
  compact: Object.freeze({
    id: 'compact', name: 'Eiche-Holzsockel ohne Gravur', priceEur: 45, engraving: false,
    dimensions: '11 × 11 × 2 cm', support: 'Eiche-Holzsockel',
    description: '10 × 10 cm Relief auf kompaktem Eiche-Holzsockel, ohne Gravur.',
  }),
  frame: Object.freeze({
    id: 'frame', name: 'Weißer Rahmen mit graviertem Passepartout', priceEur: 55, engraving: true,
    dimensions: '20 × 20 cm Außenmaß', support: 'Weißer Rahmen / weißes Passepartout',
    description: '10 × 10 cm Relief im weißen Rahmen mit Gravur auf weißem Passepartout.',
  }),
});

export function getProduct(id) {
  if (!Object.hasOwn(PRODUCTS, id)) throw new Error('Unbekanntes Produkt.');
  return PRODUCTS[id];
}

export function formatPrice(priceEur) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(priceEur);
}

export const WALL_MOUNT_PRICE_EUR = 1;

export function configurationPrice(configuration) {
  const product = getProduct(configuration.product);
  return product.priceEur + (configuration.version >= 4 && configuration.wallMount === true
    && product.id !== 'frame' ? WALL_MOUNT_PRICE_EUR : 0);
}

export const PRODUCT_DIMENSIONS_CM = Object.freeze({
  relief: 10,
  woodWidth: 11,
  woodDepth: 13.5,
  topBorder: 0.5,
  woodThickness: 2,
  woodEdgeRadius: 0.2,
  engravingWidth: 8,
  engravingFontSize: 0.5,
});

const { relief, woodWidth, woodDepth, topBorder } = PRODUCT_DIMENSIONS_CM;
// The terrain footprint spans one scene unit, with its top edge at z = -0.5.
const woodTop = -0.5 - topBorder / relief;
const woodBottom = woodTop + woodDepth / relief;

export const PRODUCT_LAYOUT = Object.freeze({
  woodWidth: woodWidth / relief,
  woodDepth: woodDepth / relief,
  woodCenterZ: (woodTop + woodBottom) / 2,
  engravingCenterZ: (0.5 + woodBottom) / 2,
  engravingWidth: PRODUCT_DIMENSIONS_CM.engravingWidth / relief,
  engravingDepth: 0.2,
  woodThickness: PRODUCT_DIMENSIONS_CM.woodThickness / relief,
  woodEdgeRadius: PRODUCT_DIMENSIONS_CM.woodEdgeRadius / relief,
  woodCenterY: 0.02 - PRODUCT_DIMENSIONS_CM.woodThickness / relief / 2,
  logoWidth: 0.22,
  logoHeight: 0.22 * 323 / 708,
  logoCenterX: -woodWidth / relief / 2 + 0.06 + 0.22 / 2,
  logoCenterY: 0.02 - PRODUCT_DIMENSIONS_CM.woodThickness / relief / 2,
  logoFrontZ: woodBottom + 0.001,
});

export function productLayout(id) {
  getProduct(id);
  if (id === 'base') return PRODUCT_LAYOUT;
  if (id === 'compact') return {
    ...PRODUCT_LAYOUT, woodDepth: 1.1, woodCenterZ: 0, logoFrontZ: 0.551,
  };
  return {
    ...PRODUCT_LAYOUT, woodCenterZ: 0, engravingCenterZ: 0.7775,
    engravingWidth: 1.12, engravingDepth: 0.2,
    frameWidth: 2, frameBorder: 0.12, frameDepth: 0.18,
    matOpening: 1.35, reliefOffsetY: -0.08,
  };
}
