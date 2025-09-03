// ================================
// src/components/PanelDuotone.jsx
// ================================
import React from "react";
import Section from "../components/Section";
import Slider from "../components/Slider";
import ColorPicker from "../components/ColorPicker";
import { useToneStudio } from "../context/ToneStudioContext";

export default function PanelDuotone() {
  const {
    duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    setDuoShadow, setDuoHighlight, setDuoStrength, setDuoBrightness, setDuoContrast,
    swapColors
  } = useToneStudio();

  return (
    <>
      <Section title="Colors">
        <div className="row g-2">
          <div className="col"><ColorPicker label="Shadows" value={duoShadow} onChange={setDuoShadow} /></div>
          <div className="col"><ColorPicker label="Highlights" value={duoHighlight} onChange={setDuoHighlight} /></div>
        </div>
      </Section>

      <Section title="Intensity">
        <Slider label={`Strength: ${(duoStrength * 100).toFixed(0)}%`} min={0} max={1} step={0.01}
                value={duoStrength} onChange={setDuoStrength} />
      </Section>

      <Section title="Tone">
        <Slider label={`Brightness: ${duoBrightness}`} min={-100} max={100} step={1}
                value={duoBrightness} onChange={setDuoBrightness} />
        <Slider label={`Contrast: ${duoContrast}`} min={-100} max={100} step={1}
                value={duoContrast} onChange={setDuoContrast} />
      </Section>

      <div className="mt-2">
        <button onClick={swapColors} className="btn btn-outline-light w-100">Swap Colors</button>
      </div>
    </>
  );
}