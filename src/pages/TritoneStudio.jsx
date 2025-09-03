// src/pages/TritoneStudioRegl.jsx
import React, { useEffect, useRef, useState } from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import createREGL from "regl";

export default function TritoneStudioRegl() {
  const stageRef = useRef(null);

  const [fileUrl, setFileUrl] = useState(null);
  const [imgEl, setImgEl] = useState(null);

  // Tritone colors (defaults: navy, pink, green)
  const [colA, setColA] = useState("#0c1e6b"); // shadows (navy)
  const [colB, setColB] = useState("#f15a94"); // midtones (pink)
  const [colC, setColC] = useState("#00a63f"); // highlights (green)

  // Mapping controls
  const [t1, setT1] = useState(0.40); // threshold 1 (shadow→mid)
  const [t2, setT2] = useState(0.75); // threshold 2 (mid→highlight)
  const [soft, setSoft] = useState(0.12); // edge softness (0 = hard posterize)
  const [strength, setStrength] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [origMix, setOrigMix] = useState(0.0); // 0..1 mix back the original colors

  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const reglRef = useRef(null);
  const drawRef = useRef(null);
  const textureRef = useRef(null);

  useEffect(() => { document.title = "Tritone Studio — GPU (regl)"; }, []);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileUrl(URL.createObjectURL(f));
  };

  useEffect(() => {
    if (!fileUrl) { setImgEl(null); return; }
    const img = new Image();
    if (/^https?:/.test(fileUrl)) img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.src = fileUrl;
  }, [fileUrl]);

  // Helpers ------------------------------------------------------------
  const hexToVec3 = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#000000");
    const r = m ? parseInt(m[1], 16) : 0;
    const g = m ? parseInt(m[2], 16) : 0;
    const b = m ? parseInt(m[3], 16) : 0;
    return [r / 255, g / 255, b / 255];
  };

  function sizeCanvasToImage(canvas, img, stageEl, maxDesk = 1000, maxMob = 600) {
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
  }

  function extFromMime(m) {
    if (m === "image/jpeg") return "jpg";
    if (m === "image/png") return "png";
    if (m === "image/avif") return "avif";
    return "webp";
  }

  function readPixelsToCanvas(regl, framebuffer, w, h) {
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
  }

  async function exportImage({ format = "image/webp", quality = 0.9, maxSide = 2000 } = {}) {
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
        uColorA: hexToVec3(colA),
        uColorB: hexToVec3(colB),
        uColorC: hexToVec3(colC),
        uT1: Math.min(t1, t2 - 0.001),
        uT2: Math.max(t2, t1 + 0.001),
        uSoft: soft,
        uStrength: strength,
        uBrightness: brightness / 100,
        uContrast: contrast / 100,
        uOrigMix: origMix,
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
    a.download = `tritone.${extFromMime(format)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);

    fbo.destroy && fbo.destroy();
  }

  async function exportPNGHiRes(maxW = 4096, maxH = 4096) {
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
        uColorA: hexToVec3(colA),
        uColorB: hexToVec3(colB),
        uColorC: hexToVec3(colC),
        uT1: Math.min(t1, t2 - 0.001),
        uT2: Math.max(t2, t1 + 0.001),
        uSoft: soft,
        uStrength: strength,
        uBrightness: brightness / 100,
        uContrast: contrast / 100,
        uOrigMix: origMix,
        uTexSize: [imgEl.width, imgEl.height],
        uCanvasSize: [W, H],
        vw: W, vh: H,
      });
    });

    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const a = document.createElement("a");
    a.href = outCanvas.toDataURL("image/png");
    a.download = "tritone.png";
    a.click();
    fbo.destroy && fbo.destroy();
  }

  // Init regl & pipeline ------------------------------------------------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const regl = createREGL({
      canvas,
      attributes: { preserveDrawingBuffer: true },
    });
    reglRef.current = regl;

    const draw = regl({
      vert: `
        precision mediump float;
        attribute vec2 position;
        varying vec2 vUv;
        uniform vec2 uTexSize;
        uniform vec2 uCanvasSize;
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
        uniform vec3 uColorA, uColorB, uColorC; // shadow, mid, highlight
        uniform float uT1, uT2;  // thresholds (0..1)
        uniform float uSoft;     // softness width (0..0.5 recommended)
        uniform float uStrength; // mix of effect vs original
        uniform float uBrightness, uContrast; // -1..1 roughly
        uniform float uOrigMix;  // blend back original colors 0..1

        vec3 applyBC(vec3 c, float b, float ct){
          c = (c - 0.5) * (1.0 + ct) + 0.5;
          c += b * 0.5;
          return clamp(c, 0.0, 1.0);
        }

        void main(){
          vec3 src = texture2D(tex, vUv).rgb;
          float lum = dot(src, vec3(0.2126, 0.7152, 0.0722));

          // ensure ordering
          float t1 = min(uT1, uT2 - 0.001);
          float t2 = max(uT2, uT1 + 0.001);
          float s = clamp(uSoft, 0.0, 0.5);

          // smooth weights for 3 bands
          float wA = 1.0 - smoothstep(t1 - s, t1 + s, lum); // shadows
          float wC = smoothstep(t2 - s, t2 + s, lum);       // highlights
          float wB = 1.0 - wA - wC;                          // midtones
          wB = clamp(wB, 0.0, 1.0);

          vec3 mapped = wA * uColorA + wB * uColorB + wC * uColorC;

          // optional: reintroduce original blacks/whites via uOrigMix
          float nearBlack = 1.0 - smoothstep(0.0, s * 2.0, lum);
          float nearWhite = smoothstep(1.0 - s * 2.0, 1.0, lum);
          vec3 bw = mix(vec3(0.0), vec3(1.0), nearWhite);
          bw *= max(nearBlack, nearWhite);
          mapped = mix(mapped, bw, uOrigMix);

          // Mix with original image per strength, then BC
          vec3 outCol = mix(src, mapped, clamp(uStrength, 0.0, 1.0));
          outCol = applyBC(outCol, uBrightness, uContrast);
          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
      attributes: { position: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1] },
      uniforms: {
        tex: () => textureRef.current,
        uColorA: (_, p) => p.uColorA,
        uColorB: (_, p) => p.uColorB,
        uColorC: (_, p) => p.uColorC,
        uT1:    (_, p) => p.uT1,
        uT2:    (_, p) => p.uT2,
        uSoft:  (_, p) => p.uSoft,
        uStrength: (_, p) => p.uStrength,
        uBrightness: (_, p) => p.uBrightness,
        uContrast:   (_, p) => p.uContrast,
        uOrigMix:    (_, p) => p.uOrigMix,
        uTexSize:    (_, p) => p.uTexSize,
        uCanvasSize: (_, p) => p.uCanvasSize,
      },
      viewport: { x: 0, y: 0, width: (_, p) => p.vw, height: (_, p) => p.vh },
      count: 6,
    });

    drawRef.current = draw;
    return () => { regl.destroy(); };
  }, []);

  // Image upload / texture & initial render ----------------------------
  useEffect(() => {
    const regl = reglRef.current;
    if (!regl) return;
    if (!imgEl) { textureRef.current = null; return; }

    const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
    textureRef.current = regl.texture({ data: imgEl, flipY: true });
    render({ canvasW: pixelW, canvasH: pixelH });
  }, [imgEl]);

  // Handle window resize
  useEffect(() => {
    const onResize = () => {
      if (!imgEl) return;
      const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
      render({ canvasW: pixelW, canvasH: pixelH });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [imgEl]);

  function render({ canvasW, canvasH } = {}) {
    const draw = drawRef.current;
    const regl = reglRef.current;
    if (!draw || !regl || !textureRef.current || !imgEl) return;

    const w = canvasW ?? canvasRef.current.width;
    const h = canvasH ?? canvasRef.current.height;

    regl.clear({ color: [0, 0, 0, 1], depth: 1 });
    draw({
      uColorA: hexToVec3(colA),
      uColorB: hexToVec3(colB),
      uColorC: hexToVec3(colC),
      uT1: Math.min(t1, t2 - 0.001),
      uT2: Math.max(t2, t1 + 0.001),
      uSoft: soft,
      uStrength: strength,
      uBrightness: brightness / 100,
      uContrast: contrast / 100,
      uOrigMix: origMix,
      uTexSize: [imgEl.width, imgEl.height],
      uCanvasSize: [w, h],
      vw: w, vh: h,
    });
  }

  // Re-render on param change
  useEffect(() => { render(); }, [colA, colB, colC, t1, t2, soft, strength, brightness, contrast, origMix]);

  const cycleColors = () => {
    setColA((prev) => {
      const A = colA, B = colB, C = colC;
      setColB(A); setColC(B);
      return C;
    });
  };

  const downloadCompressed = () => {
    exportImage({ format: "image/webp", quality: 0.9, maxSide: 2000 });
  };
  const downloadPNG = () => { exportPNGHiRes(4096, 4096); };

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-light">
      <main className="flex-grow-1">
        <div className="container py-4">
          <div className="row mb-3">
            <div className="col">
              <h1 className="h4 text-white">Tritone Filter — GPU (regl)</h1>
              <p className="text-secondary mb-0">Bold tritone threshold with controllable bands</p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8 mb-3 text-center">
              <div ref={stageRef} className="mx-auto" style={{ maxWidth: "100%", overflow: "hidden" }}>
                <canvas ref={canvasRef} className="border border-secondary rounded d-block mx-auto" />
              </div>
              <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
                <button onClick={() => inputRef.current?.click()} className="btn btn-primary">Upload</button>
                <input ref={inputRef} type="file" accept="image/*" onChange={onPickFile} className="d-none" />
                <button onClick={downloadCompressed} className="btn btn-success" disabled={!imgEl}>Download</button>
                <button onClick={cycleColors} className="btn btn-outline-light">Cycle Colors</button>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card bg-secondary text-light">
                <div className="card-body">
                  <Section title="Colors">
                    <div className="row g-2">
                      <div className="col-12"><ColorPicker label="Shadows (A)" value={colA} onChange={setColA} /></div>
                      <div className="col-12"><ColorPicker label="Midtones (B)" value={colB} onChange={setColB} /></div>
                      <div className="col-12"><ColorPicker label="Highlights (C)" value={colC} onChange={setColC} /></div>
                    </div>
                  </Section>

                  <Section title="Mapping (Bands)">
                    <Slider label={`Threshold 1 (A→B): ${t1.toFixed(2)}`} min={0.0} max={0.99} step={0.01} value={t1} onChange={setT1} />
                    <Slider label={`Threshold 2 (B→C): ${t2.toFixed(2)}`} min={0.01} max={1.0} step={0.01} value={t2} onChange={setT2} />
                    <Slider label={`Softness: ${soft.toFixed(2)}`} min={0.0} max={0.5} step={0.01} value={soft} onChange={setSoft} />
                  </Section>

                  <Section title="Look">
                    <Slider label={`Effect Strength: ${(strength * 100).toFixed(0)}%`} min={0} max={1} step={0.01} value={strength} onChange={setStrength} />
                    <Slider label={`Mix Original (BW edges): ${(origMix * 100).toFixed(0)}%`} min={0} max={1} step={0.01} value={origMix} onChange={setOrigMix} />
                  </Section>

                  <Section title="Tone">
                    <Slider label={`Brightness: ${brightness}`} min={-100} max={100} step={1} value={brightness} onChange={setBrightness} />
                    <Slider label={`Contrast: ${contrast}`} min={-100} max={100} step={1} value={contrast} onChange={setContrast} />
                  </Section>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-3 text-muted bg-dark border-top border-secondary">
        Made with ❤️ 2025 | Tritone Studio (regl)
      </footer>
    </div>
  );
}
