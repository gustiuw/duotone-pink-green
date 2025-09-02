// src/pages/DuotoneStudioRegl.jsx
import React, { useEffect, useRef, useState } from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import createREGL from "regl";

export default function DuotoneStudioRegl() {
  const [fileUrl, setFileUrl] = useState(null);
  const [imgEl, setImgEl] = useState(null);
  const [shadowColor, setShadowColor] = useState("#1b602f");
  const [highlightColor, setHighlightColor] = useState("#f784c5");
  const [strength, setStrength] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);

  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const reglRef = useRef(null);
  const drawRef = useRef(null);
  const textureRef = useRef(null);

  useEffect(() => { document.title = "Duotone Studio — GPU (regl)"; }, []);

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

  function readPixelsToCanvas(regl, framebuffer, w, h) {
    const pixels = new Uint8Array(w * h * 4);
    regl.read({ framebuffer, data: pixels });

    const row = w * 4;
    const flipped = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) {
      flipped.set(pixels.subarray((h - 1 - y) * row, (h - y) * row), y * row);
    }

    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const ctx = out.getContext("2d");
    const imgData = new ImageData(flipped, w, h);
    ctx.putImageData(imgData, 0, 0);
    return out; // bisa langsung toDataURL dari sini
  }

  async function exportPNGHiRes(maxW = 4096, maxH = 4096) {
    const regl = reglRef.current;
    const draw = drawRef.current;
    if (!regl || !draw || !textureRef.current || !imgEl) return;

    // target ukuran export (pakai ukuran asli tapi dibatasi)
    const scale = Math.min(maxW / imgEl.width, maxH / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));

    // FBO untuk render offscreen
    const fbo = regl.framebuffer({ width: W, height: H });

    // render ke FBO (perhatikan uniform ukuran kanvas = W,H dan viewport)
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
        vw: W,
        vh: H,
      });
    });

    // ambil pixel → 2D canvas → dataURL → download
    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const url = outCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "duotone.png";
    a.click();

    // optional: cleanup fbo
    fbo.destroy && fbo.destroy();
  }


  // Init regl & pipeline (sekali)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const regl = createREGL({
      canvas,
      attributes: { preserveDrawingBuffer: true }
    });
    reglRef.current = regl;

    // Quad fullscreen + shader duotone
    const draw = regl({
      vert: `
        precision mediump float;
        attribute vec2 position;
        varying vec2 vUv;
        uniform vec2 uTexSize;        // [w,h] foto
        uniform vec2 uCanvasSize;     // [w,h] canvas (pixels)
        void main() {
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

        void main() {
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
      // Penting: viewport mengikuti ukuran pixel canvas
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

  // Saat gambar baru: set ukuran canvas sesuai rasio image, upload texture, render
  useEffect(() => {
    const regl = reglRef.current;
    if (!regl) return;
    if (!imgEl) { textureRef.current = null; return; }

    const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl);
    // textureRef.current = regl.texture(imgEl);
    textureRef.current = regl.texture({
      data: imgEl,
      flipY: true,        // ← penting: balik sumbu Y saat upload
    });
    render({ canvasW: pixelW, canvasH: pixelH });
  }, [imgEl]);

  // Resize window → ukur ulang berdasarkan image yang sama
  useEffect(() => {
    const onResize = () => {
      if (!imgEl) return;
      const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl);
      render({ canvasW: pixelW, canvasH: pixelH });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [imgEl]);

  const hexToVec3 = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#000000");
    const r = m ? parseInt(m[1], 16) : 0;
    const g = m ? parseInt(m[2], 16) : 0;
    const b = m ? parseInt(m[3], 16) : 0;
    return [r / 255, g / 255, b / 255];
  };

  function render({ canvasW, canvasH } = {}) {
    const draw = drawRef.current;
    const regl = reglRef.current;
    if (!draw || !regl || !textureRef.current || !imgEl) return;

    const w = canvasW ?? canvasRef.current.width;
    const h = canvasH ?? canvasRef.current.height;

    regl.clear({ color: [0, 0, 0, 1], depth: 1 });
    draw({
      uShadow: hexToVec3(shadowColor),
      uHighlight: hexToVec3(highlightColor),
      uStrength: strength,
      uBrightness: brightness / 100,
      uContrast: contrast / 100,
      uTexSize: [imgEl.width, imgEl.height],
      uCanvasSize: [w, h],
      vw: w,
      vh: h,
    });
  }

  // Render ulang di resolusi target (FBO), lalu kompres ke format yang dipilih
  async function exportImage({ format = "image/webp", quality = 0.85, maxSide = 2000 } = {}) {
    const regl = reglRef.current;
    const draw = drawRef.current;
    if (!regl || !draw || !textureRef.current || !imgEl) return;

    // Hitung target W,H dengan menjaga rasio + batas sisi terpanjang
    const scale = Math.min(maxSide / imgEl.width, maxSide / imgEl.height, 1);
    const W = Math.max(1, Math.floor(imgEl.width * scale));
    const H = Math.max(1, Math.floor(imgEl.height * scale));

    // Render ke FBO pada ukuran target
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
        vw: W,
        vh: H,
      });
    });

    // Baca pixel dari FBO → 2D canvas (flip Y) → kompres via toBlob
    const outCanvas = readPixelsToCanvas(regl, fbo, W, H);
    const mime = format; // "image/webp" | "image/jpeg" | "image/png"

    // toBlob lebih fleksibel (bisa set quality). Fallback ke toDataURL kalau perlu.
    const blob = await new Promise((resolve) => {
      if (outCanvas.toBlob) outCanvas.toBlob(resolve, mime, quality);
      else {
        const url = outCanvas.toDataURL(mime, quality);
        fetch(url).then(r => r.blob()).then(resolve);
      }
    });

    // Download
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `duotone.${extFromMime(mime)}`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);

    fbo.destroy && fbo.destroy();
  }

  // Baca pixel FBO dan susun ke canvas 2D sambil flip vertikal
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
    // smoothing high untuk downscale halus
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    const imgData = new ImageData(flipped, w, h);
    ctx.putImageData(imgData, 0, 0);
    return out;
  }

  function extFromMime(m) {
    if (m === "image/jpeg") return "jpg";
    if (m === "image/png") return "png";
    if (m === "image/avif") return "avif";
    return "webp";
  }


  // Re-render saat parameter berubah
  useEffect(() => { render(); },
    [shadowColor, highlightColor, strength, brightness, contrast]);

  const swapColors = () => {
    setShadowColor((prev) => { const next = highlightColor; setHighlightColor(prev); return next; });
  };

  // const downloadPNG = () => {
  //   const canvas = canvasRef.current;
  //   if (!canvas) return;
  //   const a = document.createElement("a");
  //   a.href = canvas.toDataURL("image/png");
  //   a.download = "duotone.png";
  //   a.click();
  // };

  const downloadCompressed = () => {
    // Contoh default hemat ukuran:
    // format: WebP, quality: 0.85, max long side: 2000px
    exportImage({ format: "image/webp", quality: 0.9, maxSide: 2000 });
  };

  const downloadPNG = () => {
    // export resolusi asli (dibatasi 4096×4096 biar aman)
    exportPNGHiRes(4096, 4096);
  };

  // Set ukuran canvas mengikuti rasio image (CSS & pixel size)
  function sizeCanvasToImage(canvas, img, maxW = 1000, maxH = 700) {
    const dpr = window.devicePixelRatio || 1;
    const scale = Math.min(maxW / img.width, maxH / img.height, 1);
    const cssW = Math.round(img.width * scale);
    const cssH = Math.round(img.height * scale);
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    return { pixelW: canvas.width, pixelH: canvas.height };
  }

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-light">
      <main className="flex-grow-1">
        <div className="container py-4">
          <div className="row mb-3">
            <div className="col">
              <h1 className="h4 text-white">Duotone Filter — GPU (regl)</h1>
              <p className="text-secondary mb-0">Real-time duotone via WebGL, kompatibel React 19.</p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8 mb-3 text-center">
              <canvas ref={canvasRef} className="border border-secondary rounded" />
              <div className="mt-3 d-flex flex-wrap gap-2 justify-content-center">
                <button onClick={() => inputRef.current?.click()} className="btn btn-primary">Upload</button>
                <input ref={inputRef} type="file" accept="image/*" onChange={onPickFile} className="d-none" />
                <button onClick={downloadCompressed} className="btn btn-success" disabled={!imgEl}>Download</button>
                <button onClick={swapColors} className="btn btn-outline-light">Swap Colors</button>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card bg-secondary text-light">
                <div className="card-body">
                  <Section title="Colors">
                    <div className="row g-2">
                      <div className="col"><ColorPicker label="Shadows" value={shadowColor} onChange={setShadowColor} /></div>
                      <div className="col"><ColorPicker label="Highlights" value={highlightColor} onChange={setHighlightColor} /></div>
                    </div>
                  </Section>
                  <Section title="Intensity">
                    <Slider label={`Strength: ${(strength * 100).toFixed(0)}%`} min={0} max={1} step={0.01} value={strength} onChange={setStrength} />
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
        Made with ❤️ 2025 A.C.A.B
      </footer>
    </div>
  );
}
