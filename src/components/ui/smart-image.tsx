import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { getRescaledImage } from "@/lib/image-compress";
import { isSupabaseStorageUrl, optimizedImageUrl, type ImageTransformOptions } from "@/lib/images";
import { cn } from "@/lib/utils";

export interface SmartImageProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> {
  src: string | undefined | null;
  alt: string;
  /** Target render width used for Supabase image transformation. */
  transformWidth?: number;
  transformHeight?: number;
  transformQuality?: number;
  transformResize?: ImageTransformOptions["resize"];
  /** Above-the-fold images should set priority to load eagerly. */
  priority?: boolean;
  /** Extra classes for the wrapper element. */
  wrapperClassName?: string;
  /** Rounded corners of the placeholder, matching the image container. */
  placeholderClassName?: string;
}

const MAX_TRANSFORM_EDGE = 2400;

/**
 * Image with a shimmering skeleton placeholder, lazy loading by default, and
 * automatic Supabase Storage compression/resizing.
 *
 * NOTE: the reveal is opacity-only on purpose. Animating `filter: blur()` or
 * `transform: scale()` on the image makes iOS Safari keep a low-resolution
 * rasterization of the layer until the next repaint, which showed up as a
 * "stuck blurry" main image on product/auction pages. Priority images (the
 * first/main image) skip the fade entirely and render as soon as they decode.
 */
export function SmartImage({
  src,
  alt,
  transformWidth,
  transformHeight,
  transformQuality,
  transformResize,
  priority = false,
  className,
  wrapperClassName,
  placeholderClassName,
  ...imgProps
}: SmartImageProps) {
  const buildUrl = (dpr: number) =>
    optimizedImageUrl(src, {
      ...(transformWidth
        ? { width: Math.min(Math.round(transformWidth * dpr), MAX_TRANSFORM_EDGE) }
        : {}),
      ...(transformHeight
        ? { height: Math.min(Math.round(transformHeight * dpr), MAX_TRANSFORM_EDGE) }
        : {}),
      ...(transformQuality ? { quality: transformQuality } : {}),
      ...(transformResize ? { resize: transformResize } : {}),
    });

  // Deterministic on server and client (no DPR-dependent hydration mismatch):
  // the browser picks the right density from srcSet.
  const canTransform = !!src && isSupabaseStorageUrl(src) && !!(transformWidth || transformHeight);
  const optimized = buildUrl(2);
  const srcSet = canTransform
    ? `${buildUrl(1)} 1x, ${buildUrl(2)} 2x, ${buildUrl(3)} 3x`
    : undefined;

  const [currentSrc, setCurrentSrc] = useState(optimized);
  const [useSrcSet, setUseSrcSet] = useState(canTransform);
  const [loaded, setLoaded] = useState(false);
  const triedOriginal = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    triedOriginal.current = false;
    setCurrentSrc(optimized);
    setUseSrcSet(canTransform);
    setLoaded(false);
  }, [optimized, canTransform]);

  // Cached images can finish loading before React attaches onLoad — check the
  // element directly so the placeholder never gets stuck.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setLoaded(true);
      return;
    }
    // Belt and braces for mobile browsers where the synthetic onLoad can be
    // missed: subscribe to the native events as well.
    const done = () => setLoaded(true);
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
    return () => {
      img.removeEventListener("load", done);
      img.removeEventListener("error", done);
    };
  }, [currentSrc]);

  // Very large camera photos (20+ megapixels) are subsampled by mobile Safari
  // and look blurry. Re-render them at a sane resolution in the browser.
  useEffect(() => {
    if (!loaded) return;
    const img = imgRef.current;
    if (!img || img.naturalWidth * img.naturalHeight <= 8_000_000) return;
    let cancelled = false;
    void getRescaledImage(img.currentSrc || currentSrc).then((next: string | null) => {
      if (!cancelled && next) {
        setUseSrcSet(false);
        setCurrentSrc(next);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [loaded, currentSrc]);

  if (!src) {
    return (
      <div
        className={cn(
          "h-full w-full animate-pulse bg-muted",
          placeholderClassName,
          wrapperClassName,
        )}
        aria-hidden
      />
    );
  }

  return (
    <span className={cn("relative block h-full w-full overflow-hidden", wrapperClassName)}>
      {!loaded && (
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 animate-pulse bg-gradient-to-br from-muted via-secondary/60 to-muted",
            placeholderClassName,
          )}
        />
      )}
      <img
        {...imgProps}
        // Re-mount whenever the source URL changes so the browser always fires
        // a fresh load event for the new picture.
        key={optimized}
        ref={imgRef}
        src={currentSrc}
        {...(useSrcSet && srcSet ? { srcSet } : {})}
        alt={alt}
        loading={priority ? "eager" : "lazy"}
        decoding={priority ? "sync" : "async"}
        {...(priority ? { fetchPriority: "high" as const } : {})}
        onLoad={(e) => {
          setLoaded(true);
          imgProps.onLoad?.(e);
        }}
        onError={(e) => {
          // Transformation endpoint unavailable → retry with the original URL.
          if (!triedOriginal.current && src && currentSrc !== src) {
            triedOriginal.current = true;
            setUseSrcSet(false);
            setCurrentSrc(src);
            return;
          }
          setLoaded(true);
          imgProps.onError?.(e);
        }}
        className={cn(
          "h-full w-full",
          // Main/first images: no fade, no filter — show crisp immediately.
          // Lazy images: opacity-only fade (never blur/scale, see note above).
          priority
            ? "opacity-100"
            : cn("transition-opacity duration-300 ease-out", loaded ? "opacity-100" : "opacity-0"),
          className,
        )}
      />
    </span>
  );
}
