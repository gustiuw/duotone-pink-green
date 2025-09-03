export const hexToVec3 = (hex) => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "#000000");
  const r = m ? parseInt(m[1], 16) : 0;
  const g = m ? parseInt(m[2], 16) : 0;
  const b = m ? parseInt(m[3], 16) : 0;
  return [r / 255, g / 255, b / 255];
};