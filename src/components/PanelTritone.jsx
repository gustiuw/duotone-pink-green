import React from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import { useToneStudio } from "../context/ToneStudioContext";

export default function PanelTritone() {
  const {
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    setTriA, setTriB, setTriC, setT1, setT2, setSoft, setTriStrength, setTriBrightness, setTriContrast, setOrigMix,
    cycleTriColors
  } = useToneStudio();

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
        <Slider label={`Threshold 1 (A→B): ${t1.toFixed(2)}`} min={0.0} max={0.99} step={0.01}
                value={t1} onChange={setT1} />
        <Slider label={`Threshold 2 (B→C): ${t2.toFixed(2)}`} min={0.01} max={1.0} step={0.01}
                value={t2} onChange={setT2} />
        <Slider label={`Softness: ${soft.toFixed(2)}`} min={0.0} max={0.5} step={0.01}
                value={soft} onChange={setSoft} />
      </Section>

      <Section title="Look">
        <Slider label={`Effect Strength: ${(triStrength * 100).toFixed(0)}%`} min={0} max={1} step={0.01}
                value={triStrength} onChange={setTriStrength} />
        <Slider label={`Mix Original (BW edges): ${(origMix * 100).toFixed(0)}%`} min={0} max={1} step={0.01}
                value={origMix} onChange={setOrigMix} />
      </Section>

      <Section title="Tone">
        <Slider label={`Brightness: ${triBrightness}`} min={-100} max={100} step={1}
                value={triBrightness} onChange={setTriBrightness} />
        <Slider label={`Contrast: ${triContrast}`} min={-100} max={100} step={1}
                value={triContrast} onChange={setTriContrast} />
      </Section>

      <div className="mt-2">
        <button onClick={cycleTriColors} className="btn btn-outline-light w-100">Cycle Colors</button>
      </div>
    </>
  );
}