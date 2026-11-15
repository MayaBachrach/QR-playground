"use strict";
// Reuse the exact generator/decoder and bounded region-search implementation.
// Rasterize whole modules at the same 8px scale and palette as UI validation.
self.window = self; // The unchanged browser bundle exports through window.
importScripts("qr-engine.js", "regions.js");
self.onmessage = async ({ data: { size, reserved, dark, payload } }) => {
  try {
    const width = (size + 8) * 8;
    const pixels = new Uint8ClampedArray(width * width * 4);
    function verify(region) {
      for (let py = 0; py < width; py++) {
        const y = Math.floor(py / 8) - 4;
        for (let px = 0; px < width; px++) {
          const x = Math.floor(px / 8) - 4;
          const erased = region && x >= region.x && x < region.x + region.w &&
            y >= region.y && y < region.y + region.h;
          const black = x >= 0 && y >= 0 && x < size && y < size &&
            dark[y * size + x] && !erased;
          const i = (py * width + px) * 4;
          pixels[i] = black ? 0 : 255;
          pixels[i + 1] = 0;
          pixels[i + 2] = black ? 0 : 136;
          pixels[i + 3] = 255;
        }
      }
      return QREngine.decode(pixels, width, width)?.data === payload;
    }
    if (!verify(null)) throw new Error("Current QR is not readable");
    const result = await QRRegions.search({
      size, reserved, dark, verify,
      progress: count => { if (count % 12 === 0) self.postMessage({ progress: count }); }
    });
    self.postMessage({ result });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
