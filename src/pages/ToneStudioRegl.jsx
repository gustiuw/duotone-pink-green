import React, { useEffect, useRef } from "react";
import { ToneStudioProvider, useToneStudio } from "../context/ToneStudioContext";
import PanelDuotone from "../components/PanelDuotone";
import PanelTritone from "../components/PanelTritone";

function ToneStudioInner() {
  const inputRef = useRef(null);
  const { stageRef, canvasRef, imgEl, mode, setMode, onPickFile, exportGeneric, cycleTriColors } = useToneStudio();

  useEffect(() => { document.title = "Tone Studio — Duo/Tri (regl)"; }, []);

  return (
    <div className="d-flex flex-column min-vh-100 bg-dark text-light">
      <main className="flex-grow-1">
        <div className="container py-4">
          <div className="row mb-3 align-items-center">
            <div className="col">
              <h1 className="h4 text-white mb-1">Tone Studio — GPU (regl)</h1>
              <p className="text-secondary mb-0">Duotone & Tritone with GPU acceleration</p>
            </div>
            <div className="col-auto">
              <div className="btn-group" role="group">
                <input type="radio" className="btn-check" name="mode" id="mode-duo" autoComplete="off"
                       checked={mode === 'duotone'} onChange={() => setMode('duotone')} />
                <label className="btn btn-outline-light" htmlFor="mode-duo">Duotone</label>
                <input type="radio" className="btn-check" name="mode" id="mode-tri" autoComplete="off"
                       checked={mode === 'tritone'} onChange={() => setMode('tritone')} />
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
                <button onClick={() => exportGeneric({ format: 'image/webp', quality: 0.9, maxSide: 2000 })}
                        className="btn btn-success" disabled={!imgEl}>Download</button>
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
         Warga bantu warga | GS 
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
