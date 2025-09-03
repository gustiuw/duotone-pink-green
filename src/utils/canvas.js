export const sizeCanvasToImage = (canvas, img, stageEl, maxDesk = 1000, maxMob = 600) => {
  if (!canvas || !img) return { pixelW: 1, pixelH: 1 };
  const dpr = window.devicePixelRatio || 1;
  const stageW = Math.max(1, (stageEl?.clientWidth || window.innerWidth));
  const isMobile = stageW < 576;
  const maxCssW = Math.min(stageW, isMobile ? maxMob : maxDesk);
  const scale = Math.min(maxCssW / img.width, 1);
  const cssW = Math.round(img.width * scale);
  const cssH = Math.round(img.height * scale);
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  return { pixelW: canvas.width, pixelH: canvas.height };
};

export const readPixelsToCanvas = (regl, framebuffer, w, h) => {
  const pixels = new Uint8Array(w * h * 4);
  regl.read({ framebuffer, data: pixels });
  const row = w * 4;
  const flipped = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    flipped.set(pixels.subarray((h - 1 - y) * row, (h - y) * row), y * row);
  }
  const out = document.createElement("canvas");
  out.width = w; out.height = h;
  const ctx = out.getContext("2d", { willReadFrequently: false });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const imgData = new ImageData(flipped, w, h);
  ctx.putImageData(imgData, 0, 0);
  return out;
};