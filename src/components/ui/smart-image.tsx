import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

import { getRescaledImage } from "@/lib/image-compress";
import { optimizedImageUrl, type ImageTransformOptions } from "@/lib/images";
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

/**
 * Image with a shimmering skeleton placeholder, blur-up reveal, lazy loading
 * by default, and automatic Supabase Storage compression/resizing.
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
  // Request a source that matches the device pixel density, otherwise the
  // downscaled file looks soft/blurry on 2x–3x phone screens.
  const dpr =
    typeof window !== "undefined" ? Math.min(Math.max(window.devicePixelRatio || 1, 1), 3) : 2;
  const scale = (v: number) => Math.min(Math.round(v * dpr), 2400);

  const optimized = optimizedImageUrl(src, {
    ...(transformWidth ? { width: scale(transformWidth) } : {}),
    ...(transformHeight ? { height: scale(transformHeight) } : {}),
    ...(transformQuality ? { quality: transformQuality } : {}),
    ...(transformResize ? { resize: transformResize } : {}),
  });

  const [currentSrc, setCurrentSrc] = useState(optimized);
  const [loaded, setLoaded] = useState(false);
  const triedOriginal = useRef(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    triedOriginal.current = false;
    setCurrentSrc(optimized);
    setLoaded(false);
  }, [optimized]);

  // Cached images can finish loading before React attaches onLoad — check the
  // element directly so the blur placeholder never gets stuck.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) setLoaded(true);
  }, [currentSrc]);

  // Very large camera photos (20+ megapixels) are subsampled by mobile Safari
  // and look blurry. Re-render them at a sane resolution in the browser.
  useEffect(() => {
    if (!loaded) return;
    const img = imgRef.current;
    if (!img || img.naturalWidth * img.naturalHeight <= 8_000_000) return;
    let cancelled = false;
    void getRescaledImage(currentSrc).then((next: string | null) => {
      if (!cancelled && next) setCurrentSrc(next);
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
        ref={imgRef}
        src={currentSrc}
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
            setCurrentSrc(src);
            return;
          }
          setLoaded(true);
          imgProps.onError?.(e);
        }}
        className={cn(
          "h-full w-full transition-[opacity,filter] duration-500 ease-out",
          loaded ? "opacity-100 blur-0" : "opacity-0 blur-md",
          className,
        )}
      />
    </span>
  );
}
