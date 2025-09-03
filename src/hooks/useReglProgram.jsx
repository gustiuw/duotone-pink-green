import { useEffect, useRef } from "react";
import createREGL from "regl";

export function useReglProgram(canvasRef) {
  const reglRef = useRef(null);
  const drawDuoRef = useRef(null);
  const drawTriRef = useRef(null);
  const textureRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const regl = createREGL({ canvas, attributes: { preserveDrawingBuffer: true } });
    reglRef.current = regl;

    const common = {
      attributes: { position: [-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1] },
      uniforms: {
        tex: () => textureRef.current,
        uTexSize: (_, p) => p.uTexSize,
        uCanvasSize: (_, p) => p.uCanvasSize,
      },
      viewport: { x: 0, y: 0, width: (_, p) => p.vw, height: (_, p) => p.vh },
      count: 6,
    };

    const vert = `
      precision mediump float;
      attribute vec2 position;
      varying vec2 vUv;
      uniform vec2 uTexSize, uCanvasSize;
      void main(){
        float texAspect = uTexSize.x / uTexSize.y;
        float canAspect = uCanvasSize.x / uCanvasSize.y;
        vec2 scale = (texAspect > canAspect)
          ? vec2(1.0, canAspect / texAspect)
          : vec2(texAspect / canAspect, 1.0);
        vUv = 0.5 * (position + 1.0);
        gl_Position = vec4(position * scale, 0.0, 1.0);
      }
    `;

    drawDuoRef.current = regl({
      ...common,
      vert,
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
        void main(){
          vec3 col = texture2D(tex, vUv).rgb;
          float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
          vec3 duo = mix(uShadow, uHighlight, lum);
          vec3 outCol = mix(col, duo, clamp(uStrength, 0.0, 1.0));
          outCol = applyBC(outCol, uBrightness, uContrast);
          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
      uniforms: {
        ...common.uniforms,
        uShadow: (_, p) => p.uShadow,
        uHighlight: (_, p) => p.uHighlight,
        uStrength: (_, p) => p.uStrength,
        uBrightness: (_, p) => p.uBrightness,
        uContrast: (_, p) => p.uContrast,
      }
    });

    drawTriRef.current = regl({
      ...common,
      vert,
      frag: `
        precision mediump float;
        varying vec2 vUv;
        uniform sampler2D tex;
        uniform vec3 uColorA, uColorB, uColorC;
        uniform float uT1, uT2, uSoft, uStrength, uBrightness, uContrast, uOrigMix;
        vec3 applyBC(vec3 c, float b, float ct){
          c = (c - 0.5) * (1.0 + ct) + 0.5;
          c += b * 0.5;
          return clamp(c, 0.0, 1.0);
        }
        void main(){
          vec3 src = texture2D(tex, vUv).rgb;
          float lum = dot(src, vec3(0.2126, 0.7152, 0.0722));
          float t1 = min(uT1, uT2 - 0.001);
          float t2 = max(uT2, uT1 + 0.001);
          float s = clamp(uSoft, 0.0, 0.5);
          float wA = 1.0 - smoothstep(t1 - s, t1 + s, lum);
          float wC = smoothstep(t2 - s, t2 + s, lum);
          float wB = clamp(1.0 - wA - wC, 0.0, 1.0);
          vec3 mapped = wA * uColorA + wB * uColorB + wC * uColorC;
          float nearBlack = 1.0 - smoothstep(0.0, s * 2.0, lum);
          float nearWhite = smoothstep(1.0 - s * 2.0, 1.0, lum);
          vec3 bw = mix(vec3(0.0), vec3(1.0), nearWhite);
          bw *= max(nearBlack, nearWhite);
          mapped = mix(mapped, bw, uOrigMix);
          vec3 outCol = mix(src, mapped, clamp(uStrength, 0.0, 1.0));
          outCol = applyBC(outCol, uBrightness, uContrast);
          gl_FragColor = vec4(outCol, 1.0);
        }
      `,
      uniforms: {
        ...common.uniforms,
        uColorA: (_, p) => p.uColorA,
        uColorB: (_, p) => p.uColorB,
        uColorC: (_, p) => p.uColorC,
        uT1: (_, p) => p.uT1,
        uT2: (_, p) => p.uT2,
        uSoft: (_, p) => p.uSoft,
        uStrength: (_, p) => p.uStrength,
        uBrightness: (_, p) => p.uBrightness,
        uContrast: (_, p) => p.uContrast,
        uOrigMix: (_, p) => p.uOrigMix,
      }
    });

    return () => { regl.destroy(); };
  }, [canvasRef]);

  return { reglRef, drawDuoRef, drawTriRef, textureRef };
}
