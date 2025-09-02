export function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
}


export function lerp(a, b, t) {
  return a + (b - a) * t;
}


export function clamp(x) {
  return Math.max(0, Math.min(255, Math.round(x)));
}