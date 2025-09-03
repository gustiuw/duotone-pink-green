import React, { useEffect, useRef } from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import { ToneStudioProvider, useToneStudio } from "../context/ToneStudioContext";

function PanelDuotone() {
  const { duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    setDuoShadow, setDuoHighlight, setDuoStrength, setDuoBrightness, setDuoContrast, swapColors } = useToneStudio();
  return (
    <>
      <Section title="Colors">
        <div className="row g-2">
          <div className="col"><ColorPicker label="Shadows" value={duoShadow} onChange={setDuoShadow} /></div>
          <div className="col"><ColorPicker label="Highlights" value={duoHighlight} onChange={setDuoHighlight} /></div>
        </div>
      </Section>
      <Section title="Intensity">
        <Slider label={`Strength: ${(duoStrength * 100).toFixed(0)}%`} min={0} max={1} step={0.01} value={duoStrength} onChange={setDuoStrength} />
      </Section>
      <Section title="Tone">
        <Slider label={`Brightness: ${duoBrightness}`} min={-100} max={100} step={1} value={duoBrightness} onChange={setDuoBrightness} />
        <Slider label={`Contrast: ${duoContrast}`} min={-100} max={100} step={1} value={duoContrast} onChange={setDuoContrast} />
      </Section>
      <div className="mt-2"><button onClick={swapColors} className="btn btn-outline-light w-100">Swap Colors</button></div>

    </>
  );
}

function PanelTritone() {
  const { triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    setTriA, setTriB, setTriC, setT1, setT2, setSoft, setTriStrength, setTriBrightness, setTriContrast, setOrigMix,
    cycleTriColors } = useToneStudio();
  return (
    <>
      <Section title="Colors">
        <div className="row g-2">
          <div className="col-12"><ColorPicker label="Shadows (A)" value={triA} onChange={setTriA} /></div>
          <div className="col-12"><ColorPicker label="Midtones (B)" value={triB} onChange={setTriB} /></div>
          <div className="col-12"><ColorPicker label="Highlights (C)" value={triC} onChange={setTriC} /></div>
        </div>
      </Section>
      <Section title="Mapping (Bands)">
        <Slider label={`Threshold 1 (A→B): ${t1.toFixed(2)}`} min={0.0} max={0.99} step={0.01} value={t1} onChange={setT1} />
        <Slider label={`Threshold 2 (B→C): ${t2.toFixed(2)}`} min={0.01} max={1.0} step={0.01} value={t2} onChange={setT2} />
        <Slider label={`Softness: ${soft.toFixed(2)}`} min={0.0} max={0.5} step={0.01} value={soft} onChange={setSoft} />
      </Section>
      <Section title="Look">
        <Slider label={`Effect Strength: ${(triStrength * 100).toFixed(0)}%`} min={0} max={1} step={0.01} value={triStrength} onChange={setTriStrength} />
        <Slider label={`Mix Original (BW edges): ${(origMix * 100).toFixed(0)}%`} min={0} max={1} step={0.01} value={origMix} onChange={setOrigMix} />
      </Section>
      <Section title="Tone">
        <Slider label={`Brightness: ${triBrightness}`} min={-100} max={100} step={1} value={triBrightness} onChange={setTriBrightness} />
        <Slider label={`Contrast: ${triContrast}`} min={-100} max={100} step={1} value={triContrast} onChange={setTriContrast} />
      </Section>
      <div className="mt-2"><button onClick={cycleTriColors} className="btn btn-outline-light w-100">Cycle Colors</button></div>
    </>
  );
}

function ToneStudioInner() {
  const inputRef = useRef(null);
  const { stageRef, canvasRef, imgEl, mode, setMode, onPickFile, exportGeneric, exportPNGHiRes } = useToneStudio();

  useEffect(() => { document.title = "Tone Studio — Duo/Tri (regl)"; }, []);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-light">
      <main className="flex-grow-1">
        <div className="container py-4">
          <div className="row mb-3 align-items-center">
            <div className="col">
              <h1 className="h4 text-white mb-1">Tone Studio — GPU (regl)</h1>
              <p className="text-secondary mb-0">Switch between Duotone & Tritone</p>
            </div>
            <div className="col-auto">
              <div className="btn-group" role="group">
                <input type="radio" className="btn-check" name="mode" id="mode-duo" autoComplete="off" checked={mode === 'duotone'} onChange={() => setMode('duotone')} />
                <label className="btn btn-outline-light" htmlFor="mode-duo">Duotone</label>
                <input type="radio" className="btn-check" name="mode" id="mode-tri" autoComplete="off" checked={mode === 'tritone'} onChange={() => setMode('tritone')} />
                <label className="btn btn-outline-light" htmlFor="mode-tri">Tritone</label>
              </div>
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
                <button onClick={() => exportGeneric({ format: 'image/webp', quality: 0.9, maxSide: 2000 })} className="btn btn-success" disabled={!imgEl}>Download</button>
                <button onClick={() => exportPNGHiRes(4096, 4096)} className="btn btn-outline-warning" disabled={!imgEl}>PNG Hi-Res</button>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card bg-secondary text-light">
                <div className="card-body">
                  {mode === 'duotone' ? <PanelDuotone /> : <PanelTritone />}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-3 text-muted bg-dark border-top border-secondary">
        Made with ❤️ 2025 | Tone Studio (regl)
      </footer>
    </div>
  );
}

export default function ToneStudioRegl() {
  return (
    <ToneStudioProvider>
      <ToneStudioInner />
    </ToneStudioProvider>
  );
}
