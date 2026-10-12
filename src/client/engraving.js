import { validateEngraving } from '../shared/configuration.js';
import { PRODUCT_DIMENSIONS_CM } from '../shared/product.js';

export async function loadEngravingFont() {
  const font = new FontFace('Quicksand Book', 'url("/fonts/Quicksand_Book.otf")', { weight: '400' });
  try {
    await font.load();
  } catch {
    throw new Error('Die Gravurschrift Quicksand Book konnte nicht geladen werden. Bitte lade die Vorschau erneut.');
  }
  document.fonts.add(font);
}

export function drawEngraving(context, engraving, width, height, engravingWidthCm = PRODUCT_DIMENSIONS_CM.engravingWidth) {
  const text = validateEngraving(engraving);
  context.clearRect(0, 0, width, height);
  if (!text) return;
  const lines = text.split('\n');
  const defaultSize = width * PRODUCT_DIMENSIONS_CM.engravingFontSize / engravingWidthCm;
  context.font = `400 ${defaultSize}px "Quicksand Book"`;
  const longestWidth = Math.max(...lines.map(line => context.measureText(line).width));
  const strokeRatio = 0.025;
  const fontSize = defaultSize * Math.min(1, width / (longestWidth + defaultSize * strokeRatio));
  context.font = `400 ${fontSize}px "Quicksand Book"`;
  context.fillStyle = '#493120';
  context.strokeStyle = context.fillStyle;
  context.lineWidth = fontSize * strokeRatio;
  context.lineJoin = 'round';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  lines.forEach((line, index) => {
    const y = height / 2 + (index - (lines.length - 1) / 2) * fontSize * 1.1;
    context.strokeText(line, width / 2, y);
    context.fillText(line, width / 2, y);
  });
}
