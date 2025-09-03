import { useCallback } from "react";
import { hexToVec3 } from "../utils/color";
import { readPixelsToCanvas } from "../utils/canvas";

export function useExporters(ctx) {
  const {
    mode, imgEl,
    duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    reglRef, drawDuoRef, drawTriRef
  } = ctx;

  const exportGeneric = useCallback(async ({ format = "image/webp", quality = 0.9, maxSide = 2000 } = {}) => {
    const regl = reglRef.current;
    if (!regl || !imgEl) return;
    const scale = Math.min(maxSide / imgEl.width, maxSide / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));
    const fbo = regl.framebuffer({ width: W, height: H });

    fbo.use(() => {
      regl.clear({ color: [0, 0, 0, 0], depth: 1 });
      if (mode === "duotone") {
        drawDuoRef.current({
          uShadow: hexToVec3(duoShadow), uHighlight: hexToVec3(duoHighlight),
          uStrength: duoStrength, uBrightness: duoBrightness / 100, uContrast: duoContrast / 100,
          uTexSize: [imgEl.width, imgEl.height], uCanvasSize: [W, H], vw: W, vh: H,
        });
      } else {
        drawTriRef.current({
          uColorA: hexToVec3(triA), uColorB: hexToVec3(triB), uColorC: hexToVec3(triC),
          uT1: Math.min(t1, t2 - 0.001), uT2: Math.max(t2, t1 + 0.001), uSoft: soft,
          uStrength: triStrength, uBrightness: triBrightness / 100, uContrast: triContrast / 100, uOrigMix: origMix,
          uTexSize: [imgEl.width, imgEl.height], uCanvasSize: [W, H], vw: W, vh: H,
        });
      }
    });

    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const blob = await new Promise((resolve) => {
      if (outCanvas.toBlob) outCanvas.toBlob(resolve, format, quality);
      else { const url = outCanvas.toDataURL(format, quality); fetch(url).then(r => r.blob()).then(resolve); }
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `download-${Date.now()}.${format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : format === "image/avif" ? "avif" : "webp"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    fbo.destroy && fbo.destroy();
  }, [
    mode, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    reglRef, drawDuoRef, drawTriRef
  ]);

  const exportPNGHiRes = useCallback((maxW = 4096, maxH = 4096) => {
    const regl = reglRef.current;
    if (!regl || !imgEl) return;
    const scale = Math.min(maxW / imgEl.width, maxH / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));
    const fbo = regl.framebuffer({ width: W, height: H });
    fbo.use(() => {
      regl.clear({ color: [0, 0, 0, 0], depth: 1 });
      if (mode === "duotone") {
        drawDuoRef.current({
          uShadow: hexToVec3(duoShadow), uHighlight: hexToVec3(duoHighlight),
          uStrength: duoStrength, uBrightness: duoBrightness / 100, uContrast: duoContrast / 100,
          uTexSize: [imgEl.width, imgEl.height], uCanvasSize: [W, H], vw: W, vh: H,
        });
      } else {
        drawTriRef.current({
          uColorA: hexToVec3(triA), uColorB: hexToVec3(triB), uColorC: hexToVec3(triC),
          uT1: Math.min(t1, t2 - 0.001), uT2: Math.max(t2, t1 + 0.001), uSoft: soft,
          uStrength: triStrength, uBrightness: triBrightness / 100, uContrast: triContrast / 100, uOrigMix: origMix,
          uTexSize: [imgEl.width, imgEl.height], uCanvasSize: [W, H], vw: W, vh: H,
        });
      }
    });
    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const a = document.createElement("a");
    a.href = outCanvas.toDataURL("image/png");
    a.download = `tone.png`;
    a.click();
    fbo.destroy && fbo.destroy();
  }, [
    mode, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    reglRef, drawDuoRef, drawTriRef
  ]);

  return { exportGeneric, exportPNGHiRes };
}
