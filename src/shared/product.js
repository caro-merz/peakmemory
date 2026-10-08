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
