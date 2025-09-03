import { useEffect } from "react";

export function useImageLoader(fileUrl, setImgEl) {
  useEffect(() => {
    if (!fileUrl) { setImgEl(null); return; }
    const img = new Image();
    if (/^https?:/.test(fileUrl)) img.crossOrigin = "anonymous";
    img.onload = () => setImgEl(img);
    img.src = fileUrl;
    return () => { /* let browser GC the Image */ };
  }, [fileUrl, setImgEl]);
}