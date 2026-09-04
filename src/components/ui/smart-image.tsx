import { useEffect, useRef, useState, type ImgHTMLAttributes } from "react";

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
  const optimized = optimizedImageUrl(src, {
    ...(transformWidth ? { width: transformWidth } : {}),
    ...(transformHeight ? { height: transformHeight } : {}),
    ...(transformQuality ? { quality: transformQuality } : {}),
    ...(transformResize ? { resize: transformResize } : {}),
  });

  const [currentSrc, setCurrentSrc] = useState(optimized);
  const [loaded, setLoaded] = useState(false);
  const triedOriginal = useRef(false);

  useEffect(() => {
    triedOriginal.current = false;
    setCurrentSrc(optimized);
    setLoaded(false);
  }, [optimized]);

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
