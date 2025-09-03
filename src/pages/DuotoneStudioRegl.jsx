import React, { useEffect, useRef } from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import { DuotoneProvider, useDuotone } from "../context/DuotoneContext";

function DuotonePageInner() {
  const inputRef = useRef(null);
  const {
    stageRef, canvasRef,
    imgEl,
    shadowColor, highlightColor, strength, brightness, contrast,
    setShadowColor, setHighlightColor, setStrength, setBrightness, setContrast,
    onPickFile, swapColors, downloadCompressed, downloadPNG,
  } = useDuotone();

  useEffect(() => { document.title = "Duotone Studio — GPU (regl)"; }, []);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-light">
      <main className="flex-grow-1">
        <div className="container py-4">
          <div className="row mb-3">
            <div className="col">
              <h1 className="h4 text-white">Duotone Filter — GPU (regl)</h1>
              <p className="text-secondary mb-0">Duotone via WEBGL</p>
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
        Made with ❤️ 2025 | Omke Gams Omke Gams | kersane ._.
      </footer>
    </div>
  );
}

export default function DuotoneStudioRegl() {
  return (
    <DuotoneProvider>
      <DuotonePageInner />
    </DuotoneProvider>
  );
}