import { useEffect, useRef, useState, useCallback } from "react";

export function useToneState() {
  // Mount refs
  const stageRef = useRef(null);
  const canvasRef = useRef(null);

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

  // -------- Mirror refs at TOP-LEVEL (allowed) --------
  const modeRef = useRef(mode);
  const imgElRef = useRef(imgEl);

  const duoShadowRef = useRef(duoShadow);
  const duoHighlightRef = useRef(duoHighlight);
  const duoStrengthRef = useRef(duoStrength);
  const duoBrightnessRef = useRef(duoBrightness);
  const duoContrastRef = useRef(duoContrast);

  const triARef = useRef(triA);
  const triBRef = useRef(triB);
  const triCRef = useRef(triC);
  const t1Ref = useRef(t1);
  const t2Ref = useRef(t2);
  const softRef = useRef(soft);
  const triStrengthRef = useRef(triStrength);
  const triBrightnessRef = useRef(triBrightness);
  const triContrastRef = useRef(triContrast);
  const origMixRef = useRef(origMix);

  // Keep refs in sync
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { imgElRef.current = imgEl; }, [imgEl]);

  useEffect(() => { duoShadowRef.current = duoShadow; }, [duoShadow]);
  useEffect(() => { duoHighlightRef.current = duoHighlight; }, [duoHighlight]);
  useEffect(() => { duoStrengthRef.current = duoStrength; }, [duoStrength]);
  useEffect(() => { duoBrightnessRef.current = duoBrightness; }, [duoBrightness]);
  useEffect(() => { duoContrastRef.current = duoContrast; }, [duoContrast]);

  useEffect(() => { triARef.current = triA; }, [triA]);
  useEffect(() => { triBRef.current = triB; }, [triB]);
  useEffect(() => { triCRef.current = triC; }, [triC]);
  useEffect(() => { t1Ref.current = t1; }, [t1]);
  useEffect(() => { t2Ref.current = t2; }, [t2]);
  useEffect(() => { softRef.current = soft; }, [soft]);
  useEffect(() => { triStrengthRef.current = triStrength; }, [triStrength]);
  useEffect(() => { triBrightnessRef.current = triBrightness; }, [triBrightness]);
  useEffect(() => { triContrastRef.current = triContrast; }, [triContrast]);
  useEffect(() => { origMixRef.current = origMix; }, [origMix]);

  // Actions
  const onPickFile = useCallback((e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileUrl(URL.createObjectURL(f));
  }, []);

  const cycleTriColors = useCallback(() => {
    setTriA((prev) => { const A = triA, B = triB, C = triC; setTriB(A); setTriC(B); return C; });
  }, [triA, triB, triC]);

  const swapColors = useCallback(() => {
    setDuoShadow((prev) => { const next = duoHighlight; setDuoHighlight(prev); return next; });
  }, [duoHighlight]);

  return {
    // mount refs
    stageRef, canvasRef,

    // state
    mode, setMode,
    fileUrl, setFileUrl, imgEl, setImgEl,
    duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    setDuoShadow, setDuoHighlight, setDuoStrength, setDuoBrightness, setDuoContrast,
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    setTriA, setTriB, setTriC, setT1, setT2, setSoft, setTriStrength, setTriBrightness, setTriContrast, setOrigMix,

    // mirror refs (safe in render loops)
    refs: {
      mode: modeRef,
      imgEl: imgElRef,
      duoShadow: duoShadowRef,
      duoHighlight: duoHighlightRef,
      duoStrength: duoStrengthRef,
      duoBrightness: duoBrightnessRef,
      duoContrast: duoContrastRef,
      triA: triARef,
      triB: triBRef,
      triC: triCRef,
      t1: t1Ref,
      t2: t2Ref,
      soft: softRef,
      triStrength: triStrengthRef,
      triBrightness: triBrightnessRef,
      triContrast: triContrastRef,
      origMix: origMixRef,
    },

    // actions
    onPickFile, cycleTriColors, swapColors,
  };
}
