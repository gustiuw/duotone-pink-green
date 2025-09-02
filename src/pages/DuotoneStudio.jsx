import React, { useEffect, useRef, useState } from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import { hexToRgb, lerp, clamp } from "../utils/colorUtils";

export default function DuotoneStudio() {

  useEffect(() => {
    document.title = "Duotone Studio — Bootstrap Version (G)";
  }, []);

  const [fileUrl, setFileUrl] = useState(null);
  const [shadowColor, setShadowColor] = useState("#1b602f");
  const [highlightColor, setHighlightColor] = useState("#f784c5");
  const [strength, setStrength] = useState(1);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [downloadHref, setDownloadHref] = useState("");

  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const workingRef = useRef(null);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    setFileUrl(url);
  };

  const reset = () => {
    setStrength(1);
    setBrightness(0);
    setContrast(0);
    setShadowColor("#1b602f");
    setHighlightColor("#f784c5");
  };

  useEffect(() => {
    if (!fileUrl) return;

    let cancelled = false;

    (async () => {
      try {
        const img = new Image();
        // For local blob URLs from input, crossOrigin is not needed and can cause issues in some setups
        if (typeof fileUrl === "string" && /^https?:/.test(fileUrl)) {
          img.crossOrigin = "anonymous";
        }
        img.src = fileUrl;

        // Ensure decode completes before drawing (fixes intermittent black frames on some browsers)
        if (img.decode) {
          await img.decode();
        } else {
          await new Promise((res) => (img.onload = res));
        }
        if (cancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const work = (workingRef.current ||= document.createElement("canvas"));

        const maxW = 1600; // allow a bit larger, still safe
        const scale = img.width > maxW ? maxW / img.width : 1;
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        canvas.width = w;
        canvas.height = h;
        work.width = w;
        work.height = h;

        // Context with graceful fallback if options unsupported
        let wctx = work.getContext("2d", { willReadFrequently: true });
        if (!wctx) wctx = work.getContext("2d");
        const ctx = canvas.getContext("2d");
        if (!wctx || !ctx) return;

        // Clear both canvases
        wctx.clearRect(0, 0, w, h);
        ctx.clearRect(0, 0, w, h);

        // Draw
        wctx.drawImage(img, 0, 0, w, h);

        const imgData = wctx.getImageData(0, 0, w, h);
        const data = imgData.data;

        const sc = hexToRgb(shadowColor || "#1b602f");
        const hc = hexToRgb(highlightColor || "#f784c5");

        const b = isFinite(brightness) ? brightness / 100 : 0; // -1..1
        const c = isFinite(contrast) ? contrast / 100 : 0;     // -1..1
        const s = Math.min(1, Math.max(0, Number(strength) || 0));
        const cFactor = 1 + c;
        const cBias = 128 * (1 - cFactor);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const bl = data[i + 2];
          const lum = 0.2126 * r + 0.7152 * g + 0.0722 * bl;

          const t = lum / 255;
          const dr = lerp(sc.r, hc.r, t);
          const dg = lerp(sc.g, hc.g, t);
          const db = lerp(sc.b, hc.b, t);

          const br = Math.round(lerp(r, dr, s));
          const bg = Math.round(lerp(g, dg, s));
          const bb = Math.round(lerp(bl, db, s));

          data[i] = clamp(br * cFactor + cBias + 255 * b * 0.5);
          data[i + 1] = clamp(bg * cFactor + cBias + 255 * b * 0.5);
          data[i + 2] = clamp(bb * cFactor + cBias + 255 * b * 0.5);
          data[i + 3] = 255; // ensure opaque pixel
        }

        ctx.putImageData(imgData, 0, 0);
        setDownloadHref(canvas.toDataURL("image/png"));
      } catch (err) {
        console.error("Duotone render error", err);
      }
    })();

    return () => { cancelled = true; };
  }, [fileUrl, shadowColor, highlightColor, strength, brightness, contrast]);

  return (
    <div className="d-flex flex-column min-vh-100">
      <main className="flex-grow-1">

        <div className="container py-4">
          <div className="row mb-4">
            <div className="col">
              <h1 className="h3">Duotone Filter — Pink/Green</h1>
              <p className="text-muted">Upload a photo, then tune the duotone to mimic the pink/green look.</p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-8 mb-3">
              <div className="card">
                <div className="card-body d-flex justify-content-center align-items-center" style={{ minHeight: "300px" }}>
                  {fileUrl ? (
                    <canvas ref={canvasRef} className="img-fluid" />
                  ) : (
                    <div className="text-muted text-center">
                      <p className="fw-bold">No image yet</p>
                      <p>Choose a photo to begin.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="mt-3 d-flex gap-2">
                <button onClick={() => inputRef.current?.click()} className="btn btn-primary">Upload image</button>
                <input ref={inputRef} type="file" accept="image/*" onChange={onPickFile} className="d-none" />
                {downloadHref && (
                  <a href={downloadHref} download="duotone.png" className="btn btn-success">Download PNG</a>
                )}
                <button onClick={reset} className="btn btn-secondary">Reset</button>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card">
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
      <footer className="text-center py-3 text-muted bg-light">
        © 2025 A.C.A.B
      </footer>
    </div>
  );
}
