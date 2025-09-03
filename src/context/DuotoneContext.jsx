
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import createREGL from "regl";

const DuotoneCtx = createContext(null);
export const useDuotone = () => {
  const ctx = useContext(DuotoneCtx);
  if (!ctx) throw new Error("useDuotone must be used inside <DuotoneProvider />");
  return ctx;
};

export function DuotoneProvider({ children }) {

  // UI Refs (attached by the consumer component)
  const stageRef = useRef(null);
  const canvasRef = useRef(null);

  // regl pipeline refs
  const reglRef = useRef(null);
  const drawRef = useRef(null);
  const textureRef = useRef(null);

  // App state
  const [fileUrl, setFileUrl] = useState(null);
  const [imgEl, setImgEl] = useState(null);
  const [shadowColor, setShadowColor] = useState("#1b602f");
  const [highlightColor, setHighlightColor] = useState("#f784c5");
  const [strength, setStrength] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  const shadowRef = useRef(shadowColor);
  const highlightRef = useRef(highlightColor);
  const strengthRef = useRef(strength);
  const brightRef = useRef(brightness);
  const contrastRef = useRef(contrast);
  const imgElRef = useRef(null);
  useEffect(() => { imgElRef.current = imgEl; }, [imgEl]);

  useEffect(() => { shadowRef.current = shadowColor; }, [shadowColor]);
  useEffect(() => { highlightRef.current = highlightColor; }, [highlightColor]);
  useEffect(() => { strengthRef.current = strength; }, [strength]);
  useEffect(() => { brightRef.current = brightness; }, [brightness]);
  useEffect(() => { contrastRef.current = contrast; }, [contrast]);
  // ---------- Utils ----------
  const hexToVec3 = useCallback((hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#000000");
    const r = m ? parseInt(m[1], 16) : 0;
    const g = m ? parseInt(m[2], 16) : 0;
    const b = m ? parseInt(m[3], 16) : 0;
    return [r / 255, g / 255, b / 255];
  }, []);

  const sizeCanvasToImage = useCallback((canvas, img, stageEl, maxDesk = 1000, maxMob = 600) => {
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
  }, []);

  const readPixelsToCanvas = useCallback((regl, framebuffer, w, h) => {
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
  }, []);

  // ---------- Pipeline init (once) ----------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const regl = createREGL({ canvas, attributes: { preserveDrawingBuffer: true } });
    reglRef.current = regl;

    const draw = regl({
      vert: `
        precision mediump float;
        attribute vec2 position;
        varying vec2 vUv;
        uniform vec2 uTexSize;        // image [w,h]
        uniform vec2 uCanvasSize;     // canvas [w,h]
        void main(){
          float texAspect = uTexSize.x / uTexSize.y;
          float canAspect = uCanvasSize.x / uCanvasSize.y;
          vec2 scale = (texAspect > canAspect)
            ? vec2(1.0, canAspect / texAspect)
            : vec2(texAspect / canAspect, 1.0);
          vUv = 0.5 * (position + 1.0);
          gl_Position = vec4(position * scale, 0.0, 1.0);
        }
      `,
      frag: `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D tex;
        uniform vec3 uShadow, uHighlight;
        uniform float uStrength, uBrightness, uContrast;
        vec3 applyBC(vec3 c, float b, float ct){
          c = (c - 0.5) * (1.0 + ct) + 0.5;
          c += b * 0.5;
          return clamp(c, 0.0, 1.0);
        }
        void main(){
          vec3 col = texture2D(tex, vUv).rgb;
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          vec3 duo = mix(uShadow, uHighlight, lum);
          vec3 outCol = mix(col, duo, clamp(uStrength, 0.0, 1.0));
          outCol = applyBC(outCol, uBrightness, uContrast);
          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
      attributes: {
        position: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1],
      },
      uniforms: {
        tex: () => textureRef.current,
        uShadow: (_, p) => p.uShadow,
        uHighlight: (_, p) => p.uHighlight,
        uStrength: (_, p) => p.uStrength,
        uBrightness: (_, p) => p.uBrightness,
        uContrast: (_, p) => p.uContrast,
        uTexSize: (_, p) => p.uTexSize,
        uCanvasSize: (_, p) => p.uCanvasSize,
      },
      viewport: {
        x: 0, y: 0,
        width: (_, p) => p.vw,
        height: (_, p) => p.vh,
      },
      count: 6,
    });

    drawRef.current = draw;
    return () => { regl.destroy(); };
  }, []);

  // ---------- Image load / texture upload ----------
  useEffect(() => {
    if (!fileUrl) { setImgEl(null); return; }
    const img = new Image();
    if (/^https?:/.test(fileUrl)) img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.src = fileUrl;
  }, [fileUrl]);

  useEffect(() => {
    const regl = reglRef.current;
    if (!regl) return;
    if (!imgEl) { textureRef.current = null; return; }

    const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
    textureRef.current = regl.texture({ data: imgEl, flipY: true });
    render({ canvasW: pixelW, canvasH: pixelH });
  }, [imgEl, sizeCanvasToImage]);

  useEffect(() => {
    console.log(brightRef.current);
  }, [brightness, setBrightness]);

  // window resize
  useEffect(() => {
    const onResize = () => {
      if (!imgEl) return;
      const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
      render({ canvasW: pixelW, canvasH: pixelH });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [imgEl, sizeCanvasToImage]);

  // ---------- Core render ----------
  const render = useCallback(({ canvasW, canvasH } = {}) => {
    const draw = drawRef.current;
    const regl = reglRef.current;
    const imgEl = imgElRef.current; // <- kalau perlu, mirror juga imgEl ke ref
    const texture = textureRef.current;
    if (!draw || !regl || !texture || !imgEl) return;

    const w = canvasW ?? canvasRef.current.width;
    const h = canvasH ?? canvasRef.current.height;

    regl.clear({ color: [0, 0, 0, 1], depth: 1 });
    draw({
      uShadow: hexToVec3(shadowRef.current),
      uHighlight: hexToVec3(highlightRef.current),
      uStrength: strengthRef.current,
      uBrightness: brightRef.current / 100,
      uContrast: contrastRef.current / 100,
      uTexSize: [imgEl.width, imgEl.height],
      uCanvasSize: [w, h],
      vw: w, vh: h,
    });
  }, []);
  // Re-render on param changes
  useEffect(() => { render(); }, [render]);

  useEffect(() => {
    if (!imgEl) return;
    const id = requestAnimationFrame(() => render());
    return () => cancelAnimationFrame(id);
  }, [imgEl, shadowColor, highlightColor, strength, brightness, contrast]);

  // ---------- Export helpers ----------
  const exportPNGHiRes = useCallback((maxW = 4096, maxH = 4096) => {
    const regl = reglRef.current;
    const draw = drawRef.current;
    if (!regl || !draw || !textureRef.current || !imgEl) return;

    const scale = Math.min(maxW / imgEl.width, maxH / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));

    const fbo = regl.framebuffer({ width: W, height: H });
    fbo.use(() => {
      regl.clear({ color: [0, 0, 0, 0], depth: 1 });
      draw({
        uShadow: hexToVec3(shadowColor),
        uHighlight: hexToVec3(highlightColor),
        uStrength: strength,
        uBrightness: brightness / 100,
        uContrast: contrast / 100,
        uTexSize: [imgEl.width, imgEl.height],
        uCanvasSize: [W, H],
        vw: W, vh: H,
      });
    });

    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const url = outCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url; a.download = "duotone.png"; a.click();
    fbo.destroy && fbo.destroy();
  }, [imgEl, brightness, contrast, highlightColor, shadowColor, strength, hexToVec3, readPixelsToCanvas]);

  const exportImage = useCallback(async ({ format = "image/webp", quality = 0.9, maxSide = 2000 } = {}) => {
    const regl = reglRef.current;
    const draw = drawRef.current;
    if (!regl || !draw || !textureRef.current || !imgEl) return;

    const scale = Math.min(maxSide / imgEl.width, maxSide / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));

    const fbo = regl.framebuffer({ width: W, height: H });
    fbo.use(() => {
      regl.clear({ color: [0, 0, 0, 0], depth: 1 });
      draw({
        uShadow: hexToVec3(shadowColor),
        uHighlight: hexToVec3(highlightColor),
        uStrength: strength,
        uBrightness: brightness / 100,
        uContrast: contrast / 100,
        uTexSize: [imgEl.width, imgEl.height],
        uCanvasSize: [W, H],
        vw: W, vh: H,
      });
    });

    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const blob = await new Promise((resolve) => {
      if (outCanvas.toBlob) outCanvas.toBlob(resolve, format, quality);
      else {
        const url = outCanvas.toDataURL(format, quality);
        fetch(url).then(r => r.blob()).then(resolve);
      }
    });

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `duotone.${format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : format === "image/avif" ? "avif" : "webp"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    fbo.destroy && fbo.destroy();
  }, [imgEl, brightness, contrast, highlightColor, shadowColor, strength, hexToVec3, readPixelsToCanvas]);

  // ---------- Public actions ----------
  const onPickFile = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileUrl(URL.createObjectURL(f));
  }, []);

  const swapColors = useCallback(() => {
    setShadowColor((prev) => { const next = highlightColor; setHighlightColor(prev); return next; });
  }, [highlightColor]);

  const downloadCompressed = useCallback(() => {
    exportImage({ format: "image/webp", quality: 0.9, maxSide: 2000 });
  }, [exportImage]);

  const downloadPNG = useCallback(() => { exportPNGHiRes(4096, 4096); }, [exportPNGHiRes]);

  const value = useMemo(() => ({
    // refs to attach from UI
    stageRef, canvasRef,

    // state (read/write)
    fileUrl, imgEl,
    shadowColor, highlightColor, strength, brightness, contrast,
    setShadowColor, setHighlightColor, setStrength, setBrightness, setContrast,

    // actions
    onPickFile, swapColors, downloadCompressed, downloadPNG,
  }), [fileUrl, imgEl, shadowColor, highlightColor, strength, brightness, contrast, onPickFile, swapColors, downloadCompressed, downloadPNG]);

  return <DuotoneCtx.Provider value={value}>{children}</DuotoneCtx.Provider>;
}
