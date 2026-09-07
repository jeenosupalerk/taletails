/**
 * Client-side image downscaling.
 *
 * Phone cameras produce 20–25 megapixel JPEGs (3–5 MB). iOS Safari refuses to
 * decode images above roughly 16 MP at full resolution and shows a subsampled
 * (visibly blurry) version instead, so we shrink pictures before upload and,
 * as a safety net, re-render oversized existing images in the browser.
 */

const MAX_EDGE = 1800;
const MAX_PIXELS = 8_000_000;

async function drawToBlob(
  bitmap: ImageBitmap,
  width: number,
  height: number,
  quality = 0.88,
): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function fit(w: number, h: number, maxEdge = MAX_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale), scale };
}

/** Shrinks a picked file to a web-friendly size. Returns the original on failure. */
export async function compressImageFile(file: File, maxEdge = MAX_EDGE): Promise<File> {
  if (typeof window === "undefined" || !file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height, scale } = fit(bitmap.width, bitmap.height, maxEdge);
    if (scale >= 1 && file.size < 1_200_000) {
      bitmap.close?.();
      return file;
    }
    const blob = await drawToBlob(bitmap, width, height);
    bitmap.close?.();
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/**
 * Re-renders an already uploaded, oversized image at a sane resolution and
 * returns a local object URL. Returns null when no rescale is needed.
 */
export async function rescaleOversizedImage(url: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    const bitmap = await createImageBitmap(blob);
    if (bitmap.width * bitmap.height <= MAX_PIXELS) {
      bitmap.close?.();
      return null;
    }
    const { width, height } = fit(bitmap.width, bitmap.height);
    const out = await drawToBlob(bitmap, width, height, 0.9);
    bitmap.close?.();
    return out ? URL.createObjectURL(out) : null;
  } catch {
    return null;
  }
}
