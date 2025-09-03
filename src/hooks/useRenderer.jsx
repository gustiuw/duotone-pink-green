import { useCallback, useEffect } from "react";
import { sizeCanvasToImage } from "../utils/canvas";
import { hexToVec3 } from "../utils/color";

export function useRenderer(deps) {
  const {
    // mount
    stageRef, canvasRef,
    // state
    mode, imgEl, duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix,
    // mirror refs
    refs,
    // regl
    reglRef, drawDuoRef, drawTriRef, textureRef,
  } = deps;

  // Upload texture + first render
  useEffect(() => {
    const regl = reglRef.current;
    if (!regl) return;
    if (!imgEl) { textureRef.current = null; return; }
    const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
    textureRef.current = regl.texture({ data: imgEl, flipY: true });
    render({ canvasW: pixelW, canvasH: pixelH });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl, reglRef, textureRef]);

  // Resize
  useEffect(() => {
    const onResize = () => {
      if (!imgEl) return;
      const { pixelW, pixelH } = sizeCanvasToImage(canvasRef.current, imgEl, stageRef.current);
      render({ canvasW: pixelW, canvasH: pixelH });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgEl]);

  const render = useCallback(({ canvasW, canvasH } = {}) => {
    const regl = reglRef.current;
    const drawDuo = drawDuoRef.current;
    const drawTri = drawTriRef.current;
    const texture = textureRef.current;
    const img = refs.imgEl.current;
    if (!regl || !texture || !img) return;

    const w = canvasW ?? canvasRef.current.width;
    const h = canvasH ?? canvasRef.current.height;

    regl.clear({ color: [0, 0, 0, 1], depth: 1 });

    if (refs.mode.current === "duotone" && drawDuo) {
      drawDuo({
        uShadow: hexToVec3(refs.duoShadow.current),
        uHighlight: hexToVec3(refs.duoHighlight.current),
        uStrength: refs.duoStrength.current,
        uBrightness: refs.duoBrightness.current / 100,
        uContrast: refs.duoContrast.current / 100,
        uTexSize: [img.width, img.height],
        uCanvasSize: [w, h],
        vw: w, vh: h,
      });
    } else if (refs.mode.current === "tritone" && drawTri) {
      const t1Safe = Math.min(refs.t1.current, refs.t2.current - 0.001);
      const t2Safe = Math.max(refs.t2.current, refs.t1.current + 0.001);
      drawTri({
        uColorA: hexToVec3(refs.triA.current),
        uColorB: hexToVec3(refs.triB.current),
        uColorC: hexToVec3(refs.triC.current),
        uT1: t1Safe,
        uT2: t2Safe,
        uSoft: refs.soft.current,
        uStrength: refs.triStrength.current,
        uBrightness: refs.triBrightness.current / 100,
        uContrast: refs.triContrast.current / 100,
        uOrigMix: refs.origMix.current,
        uTexSize: [img.width, img.height],
        uCanvasSize: [w, h],
        vw: w, vh: h,
      });
    }
  }, [canvasRef, drawDuoRef, drawTriRef, refs, reglRef, textureRef]);

  // re-render when params change
  useEffect(() => {
    if (!imgEl) return;
    const id = requestAnimationFrame(() => render());
    return () => cancelAnimationFrame(id);
  }, [
    imgEl, mode,
    duoShadow, duoHighlight, duoStrength, duoBrightness, duoContrast,
    triA, triB, triC, t1, t2, soft, triStrength, triBrightness, triContrast, origMix, render
  ]);

  return { render };
}