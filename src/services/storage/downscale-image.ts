"use client";

/**
 * Downscale + compress a picked image to a small JPEG data URL.
 *
 * Profile photos are stored inline in the resume (base64) and duplicated across
 * every saved draft, so a raw multi-megabyte phone photo quickly blows the ~5MB
 * localStorage quota. Capping the longest edge (default 512px) and re-encoding as
 * JPEG keeps a photo around 30-90KB while staying sharp at avatar sizes.
 *
 * Resolves to a `data:image/jpeg` URL; rejects if the browser can't decode the
 * file (callers fall back to the original).
 */
export function downscaleImage(
  file: File,
  maxDim = 512,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const longest = Math.max(img.width, img.height) || 1;
      const scale = Math.min(1, maxDim / longest);
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image decode failed"));
    };
    img.src = url;
  });
}
