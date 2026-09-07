import { motion } from "framer-motion";
import loaderAsset from "@/assets/taletails-loader.jpg.asset.json";
import { cn } from "@/lib/utils";

type LogoLoaderProps = {
  /** ขนาดรูปโลโก้ (px) แนะนำ 64–80 */
  size?: number;
  label?: string;
  className?: string;
  /** จัดกึ่งกลางเต็มหน้าจอ */
  fullscreen?: boolean;
};

export function LogoLoader({ size = 72, label, className, fullscreen = false }: LogoLoaderProps) {
  const content = (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <motion.img
        src={loaderAsset.url}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="rounded-2xl object-contain drop-shadow-xl"
        animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.65, 1, 0.65] }}
        transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
      />
      {label ? <span className="text-sm text-muted-foreground">{label}</span> : null}
      <span className="sr-only">กำลังโหลด</span>
    </div>
  );

  if (!fullscreen) return content;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      {content}
    </div>
  );
}

export default LogoLoader;
