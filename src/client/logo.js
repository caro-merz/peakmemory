export function laserLogoPixels(pixels) {
  for (let index = 0; index < pixels.length; index += 4) {
    const darkness = 255 - (pixels[index] + pixels[index + 1] + pixels[index + 2]) / 3;
    pixels[index] = 73;
    pixels[index + 1] = 49;
    pixels[index + 2] = 32;
    pixels[index + 3] = Math.round(pixels[index + 3] * darkness / 255);
  }
  return pixels;
}

export async function loadLogoCanvas() {
  const image = new Image();
  image.src = '/images/logo_new.jpeg';
  try {
    await image.decode();
  } catch {
    throw new Error('Das PeakMemory-Logo konnte nicht geladen werden. Bitte lade die Vorschau erneut.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Das PeakMemory-Logo konnte nicht dargestellt werden.');
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  laserLogoPixels(data.data);
  context.putImageData(data, 0, 0);
  return canvas;
}
