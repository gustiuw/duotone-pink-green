import React, { createContext, useContext, useMemo } from "react";
import {useToneState} from "../hooks/useToneState";
import { useImageLoader } from "../hooks/useImageLoader";
import { useReglProgram } from "../hooks/useReglProgram";
import { useRenderer } from "../hooks/useRenderer";
import { useExporters } from "../hooks/useExporters";

const ToneCtx = createContext(null);
export const useToneStudio = () => {
  const ctx = useContext(ToneCtx);
  if (!ctx) throw new Error("useToneStudio must be used inside <ToneStudioProvider />");
  return ctx;
};

export function ToneStudioProvider({ children }) {
  // 1) state & actions
  const tone = useToneState();

  // 2) image loader
  useImageLoader(tone.fileUrl, tone.setImgEl);

  // 3) regl & programs
  const { reglRef, drawDuoRef, drawTriRef, textureRef } = useReglProgram(tone.canvasRef);

  // 4) renderer
  const { render } = useRenderer({ ...tone, reglRef, drawDuoRef, drawTriRef, textureRef });

  // 5) exporters (depend on render path + state)
  const { exportGeneric, exportPNGHiRes } = useExporters({
    ...tone, reglRef, drawDuoRef, drawTriRef
  });

  const value = useMemo(() => ({
    // refs
    stageRef: tone.stageRef,
    canvasRef: tone.canvasRef,

    // core state
    mode: tone.mode, setMode: tone.setMode,
    fileUrl: tone.fileUrl, imgEl: tone.imgEl,

    // duotone state
    duoShadow: tone.duoShadow, duoHighlight: tone.duoHighlight,
    duoStrength: tone.duoStrength, duoBrightness: tone.duoBrightness, duoContrast: tone.duoContrast,
    setDuoShadow: tone.setDuoShadow, setDuoHighlight: tone.setDuoHighlight,
    setDuoStrength: tone.setDuoStrength, setDuoBrightness: tone.setDuoBrightness, setDuoContrast: tone.setDuoContrast,

    // tritone state
    triA: tone.triA, triB: tone.triB, triC: tone.triC,
    t1: tone.t1, t2: tone.t2, soft: tone.soft,
    triStrength: tone.triStrength, triBrightness: tone.triBrightness, triContrast: tone.triContrast,
    origMix: tone.origMix,
    setTriA: tone.setTriA, setTriB: tone.setTriB, setTriC: tone.setTriC,
    setT1: tone.setT1, setT2: tone.setT2, setSoft: tone.setSoft,
    setTriStrength: tone.setTriStrength, setTriBrightness: tone.setTriBrightness, setTriContrast: tone.setTriContrast,
    setOrigMix: tone.setOrigMix,

    // actions
    onPickFile: tone.onPickFile,
    cycleTriColors: tone.cycleTriColors,
    swapColors: tone.swapColors,

    // exports
    exportGeneric, exportPNGHiRes,

    // low-level (if ever needed)
    _renderNow: render,
  }), [tone, exportGeneric, exportPNGHiRes, render]);

  return <ToneCtx.Provider value={value}>{children}</ToneCtx.Provider>;
}
