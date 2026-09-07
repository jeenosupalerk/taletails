/**
 * Image URL helpers.
 *
 * Supabase Storage can resize/compress images on the fly through the
 * `render/image` endpoint. We rewrite public object URLs to that endpoint with
 * a target width and quality so the browser downloads a much smaller file.
 * If the transformation endpoint is unavailable, callers fall back to the
 * original URL (see <SmartImage /> onError handling).
 */

const PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";
const RENDER_IMAGE_PATH = "/storage/v1/render/image/public/";

export interface ImageTransformOptions {
  width?: number;
  height?: number;
  /** 20-100, defaults to 70. */
  quality?: number;
  resize?: "cover" | "contain" | "fill";
}

export function isSupabaseStorageUrl(url: string): boolean {
  return url.includes(PUBLIC_OBJECT_PATH) && /^https?:\/\//.test(url);
}

export function optimizedImageUrl(
  url: string | undefined | null,
  { width, height, quality = 82, resize = "cover" }: ImageTransformOptions = {},
): string {
  if (!url) return "";
  if (!isSupabaseStorageUrl(url)) return url;

  try {
    const parsed = new URL(url);
    parsed.pathname = parsed.pathname.replace(PUBLIC_OBJECT_PATH, RENDER_IMAGE_PATH);
    if (width) parsed.searchParams.set("width", String(Math.round(width)));
    if (height) parsed.searchParams.set("height", String(Math.round(height)));
    parsed.searchParams.set("quality", String(quality));
    parsed.searchParams.set("resize", resize);
    return parsed.toString();
  } catch {
    return url;
  }
}
