import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import createREGL from "regl";

const ToneCtx = createContext(null);
export const useToneStudio = () => {
  const ctx = useContext(ToneCtx);
  if (!ctx) throw new Error("useToneStudio must be used inside <ToneStudioProvider />");
  return ctx;
};

export function ToneStudioProvider({ children }) {
  // Refs to mount
  const stageRef = useRef(null);
  const canvasRef = useRef(null);

  // regl machinery
  const reglRef = useRef(null);
  const drawDuoRef = useRef(null);
  const drawTriRef = useRef(null);
  const textureRef = useRef(null);

  // Shared state
  const [mode, setMode] = useState("duotone"); // 'duotone' | 'tritone'
  const [fileUrl, setFileUrl] = useState(null);
  const [imgEl, setImgEl] = useState(null);

  // Duotone state
  const [duoShadow, setDuoShadow] = useState("#1b602f");
  const [duoHighlight, setDuoHighlight] = useState("#f784c5");
  const [duoStrength, setDuoStrength] = useState(1);
  const [duoBrightness, setDuoBrightness] = useState(0);
  const [duoContrast, setDuoContrast] = useState(0);

  // Tritone state
  const [triA, setTriA] = useState("#0c1e6b");
  const [triB, setTriB] = useState("#f15a94");
  const [triC, setTriC] = useState("#00a63f");
  const [t1, setT1] = useState(0.40);
  const [t2, setT2] = useState(0.75);
  const [soft, setSoft] = useState(0.12);
  const [triStrength, setTriStrength] = useState(1);
  const [triBrightness, setTriBrightness] = useState(0);
  const [triContrast, setTriContrast] = useState(0);
  const [origMix, setOrigMix] = useState(0.0);

  // Utils
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

  // Init regl + programs (once)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const regl = createREGL({ canvas, attributes: { preserveDrawingBuffer: true } });
    reglRef.current = regl;

    const common = {
      attributes: { position: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1] },
      uniforms: {
        tex: () => textureRef.current,
        uTexSize: (_, p) => p.uTexSize,
        uCanvasSize: (_, p) => p.uCanvasSize,
      },
      viewport: { x: 0, y: 0, width: (_, p) => p.vw, height: (_, p) => p.vh },
      count: 6,
    };

    const vert = `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUv;
      uniform vec2 uTexSize, uCanvasSize;
      void main(){
        float texAspect = uTexSize.x / uTexSize.y;
        float canAspect = uCanvasSize.x / uCanvasSize.y;
        vec2 scale = (texAspect > canAspect)
          ? vec2(1.0, canAspect / texAspect)
          : vec2(texAspect / canAspect, 1.0);
        vUv = 0.5 * (position + 1.0);
        gl_Position = vec4(position * scale, 0.0, 1.0);
      }
    `;

    drawDuoRef.current = regl({
      ...common,
      vert,
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
      uniforms: {
        ...common.uniforms,
        uShadow: (_, p) => p.uShadow,
        uHighlight: (_, p) => p.uHighlight,
        uStrength: (_, p) => p.uStrength,
        uBrightness: (_, p) => p.uBrightness,
        uContrast: (_, p) => p.uContrast,
      }
    });

    drawTriRef.current = regl({
      ...common,
      vert,
      frag: `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D tex;
        uniform vec3 uColorA, uColorB, uColorC;
        uniform float uT1, uT2, uSoft, uStrength, uBrightness, uContrast, uOrigMix;
        vec3 applyBC(vec3 c, float b, float ct){
          c = (c - 0.5) * (1.0 + ct) + 0.5;
          c += b * 0.5;
          return clamp(c, 0.0, 1.0);
        }
        void main(){
          vec3 src = texture2D(tex, vUv).rgb;
          float lum = dot(src, vec3(0.2126, 0.7152, 0.0722));
          float t1 = min(uT1, uT2 - 0.001);
          float t2 = max(uT2, uT1 + 0.001);
          float s = clamp(uSoft, 0.0, 0.5);
          float wA = 1.0 - smoothstep(t1 - s, t1 + s, lum);
          float wC = smoothstep(t2 - s, t2 + s, lum);
          float wB = clamp(1.0 - wA - wC, 0.0, 1.0);
          vec3 mapped = wA * uColorA + wB * uColorB + wC * uColorC;
          float nearBlack = 1.0 - smoothstep(0.0, s * 2.0, lum);
          float nearWhite = smoothstep(1.0 - s * 2.0, 1.0, lum);
          vec3 bw = mix(vec3(0.0), vec3(1.0), nearWhite);
          bw *= max(nearBlack, nearWhite);
          mapped = mix(mapped, bw, uOrigMix);
          vec3 outCol = mix(src, mapped, clamp(uStrength, 0.0, 1.0));
          outCol = applyBC(outCol, uBrightness, uContrast);
          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
      uniforms: {
        ...common.uniforms,
        uColorA: (_, p) => p.uColorA,
        uColorB: (_, p) => p.uColorB,
        uColorC: (_, p) => p.uColorC,
        uT1: (_, p) => p.uT1,
        uT2: (_, p) => p.uT2,
        uSoft: (_, p) => p.uSoft,
        uStrength: (_, p) => p.uStrength,
        uBrightness: (_, p) => p.uBrightness,
        uContrast: (_, p) => p.uContrast,
        uOrigMix: (_, p) => p.uOrigMix,
      }
    });

    return () => { regl.destroy(); };
  }, []);

  // Load image
  useEffect(() => {
    if (!fileUrl) { setImgEl(null); return; }
    const img = new Image();
    if (/^https?:/.test(fileUrl)) img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.src = fileUrl;
  }, [fileUrl]);

  // Upload texture + first render
  useEffect(() => {
    const regl = reglRef.current;
    if (!regl) return;
    if (!imgEl) { textureRef.current = null; return; }
    const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
    textureRef.current = regl.texture({ data: imgEl, flipY: true });
    render({ canvasW: pixelW, canvasH: pixelH });
  }, [imgEl, sizeCanvasToImage]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (!imgEl) return;
      const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
      render({ canvasW: pixelW, canvasH: pixelH });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [imgEl, sizeCanvasToImage]);

  // Core render (switch on mode)
  const render = useCallback(({ canvasW, canvasH } = {}) => {
    const regl = reglRef.current;
    const drawDuo = drawDuoRef.current;
    const drawTri = drawTriRef.current;
    if (!regl || !textureRef.current || !imgEl) return;

    const w = canvasW ?? canvasRef.current.width;
    const h = canvasH ?? canvasRef.current.height;

    regl.clear({ color: [0, 0, 0, 1], depth: 1 });

    if (mode === "duotone" && drawDuo) {
      drawDuo({
        uShadow: hexToVec3(duoShadow),
        uHighlight: hexToVec3(duoHighlight),
        uStrength: duoStrength,
        uBrightness: duoBrightness / 100,
        uContrast: duoContrast / 100,
        uTexSize: [imgEl.width, imgEl.height],
        uCanvasSize: [w, h],
        vw: w, vh: h,
      });
    } else if (mode === "tritone" && drawTri) {
      drawTri({
        uColorA: hexToVec3(triA),
        uColorB: hexToVec3(triB),
        uColorC: hexToVec3(triC),
        uT1: Math.min(t1, t2 - 0.001),
        uT2: Math.max(t2, t1 + 0.001),
        uSoft: soft,
        uStrength: triStrength,
        uBrightness: triBrightness / 100,
        uContrast: triContrast / 100,
        uOrigMix: origMix,
        uTexSize: [imgEl.width, imgEl.height],
        uCanvasSize: [w, h],
        vw: w, vh: h,
      });
    }
  }, [mode, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast, triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix, hexToVec3]);

  // re-render when params change
  useEffect(() => { render(); }, [render]);

  // Export helpers — reuse current mode render path into FBO
  const exportGeneric = useCallback(async ({ format = "image/webp", quality = 0.9, maxSide = 2000 } = {}) => {
    const regl = reglRef.current;
    if (!regl || !textureRef.current || !imgEl) return;
    const scale = Math.min(maxSide / imgEl.width, maxSide / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));
    const fbo = regl.framebuffer({ width: W, height: H });

    fbo.use(() => {
      regl.clear({ color: [0, 0, 0, 0], depth: 1 });
      // call the same draw with uniforms as in render()
      if (mode === "duotone") {
        drawDuoRef.current({
          uShadow: hexToVec3(duoShadow),
          uHighlight: hexToVec3(duoHighlight),
          uStrength: duoStrength,
          uBrightness: duoBrightness / 100,
          uContrast: duoContrast / 100,
          uTexSize: [imgEl.width, imgEl.height],
          uCanvasSize: [W, H],
          vw: W, vh: H,
        });
      } else {
        drawTriRef.current({
          uColorA: hexToVec3(triA),
          uColorB: hexToVec3(triB),
          uColorC: hexToVec3(triC),
          uT1: Math.min(t1, t2 - 0.001),
          uT2: Math.max(t2, t1 + 0.001),
          uSoft: soft,
          uStrength: triStrength,
          uBrightness: triBrightness / 100,
          uContrast: triContrast / 100,
          uOrigMix: origMix,
          uTexSize: [imgEl.width, imgEl.height],
          uCanvasSize: [W, H],
          vw: W, vh: H,
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
    a.download = `tone.${format === "image/jpeg" ? "jpg" : format === "image/png" ? "png" : format === "image/avif" ? "avif" : "webp"}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    fbo.destroy && fbo.destroy();
  }, [mode, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast, triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix, hexToVec3, readPixelsToCanvas]);

  const exportPNGHiRes = useCallback((maxW = 4096, maxH = 4096) => {
    const regl = reglRef.current;
    if (!regl || !textureRef.current || !imgEl) return;
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
  }, [mode, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast, triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix, hexToVec3, readPixelsToCanvas]);

  // Public actions
  const onPickFile = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return; setFileUrl(URL.createObjectURL(f));
  }, []);

  const cycleTriColors = useCallback(() => {
    setTriA((prev) => { const A = triA, B = triB, C = triC; setTriB(A); setTriC(B); return C; });
  }, [triA, triB, triC]);

  const swapColors = useCallback(() => {
    setDuoShadow((prev) => { const next = duoHighlight; setDuoHighlight(prev); return next; });
  }, [duoHighlight]);


  const value = useMemo(() => ({
    // refs
    stageRef, canvasRef,

    // core
    mode, setMode,
    fileUrl, imgEl,

    // duotone
    duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    setDuoShadow, setDuoHighlight, setDuoStrength, setDuoBrightness, setDuoContrast,

    // tritone
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    setTriA, setTriB, setTriC, setT1, setT2, setSoft, setTriStrength, setTriBrightness, setTriContrast, setOrigMix,

    // actions
    onPickFile, cycleTriColors, swapColors,
    exportGeneric, exportPNGHiRes,
  }), [mode, fileUrl, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast, triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix, onPickFile, cycleTriColors, swapColors, exportGeneric, exportPNGHiRes]);

  return <ToneCtx.Provider value={value}>{children}</ToneCtx.Provider>;
}
