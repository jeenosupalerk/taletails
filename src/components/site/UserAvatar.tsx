import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

/** ตัวย่อจากชื่อ ใช้ตอนไม่มีรูปโปรไฟล์ */
export function initialsOf(name?: string | null) {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "TT";
  if (parts.length === 1) return (parts[0]?.slice(0, 2) ?? "TT").toUpperCase();
  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}

/**
 * รูปโปรไฟล์ผู้ใช้ — มีรูปก็แสดงรูป ไม่มีก็แสดงตัวย่อบนพื้นไล่สีส้ม
 * referrerPolicy="no-referrer" จำเป็นสำหรับรูปจาก Google (lh3.googleusercontent.com)
 * เพราะบางครั้งจะตอบ 403 ถ้าเบราว์เซอร์ส่ง referrer ไปด้วย
 */
export function UserAvatar({
  name,
  src,
  className,
  fallbackClassName,
}: {
  name?: string | null;
  src?: string | null | undefined;
  className?: string | undefined;
  fallbackClassName?: string | undefined;
}) {
  return (
    <Avatar className={cn("h-9 w-9 min-h-0", className)}>
      {src ? (
        <AvatarImage
          src={src}
          alt={name ?? "รูปโปรไฟล์"}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="object-cover"
        />
      ) : null}
      <AvatarFallback
        className={cn("bg-gradient-ember text-xs font-bold text-primary-foreground", fallbackClassName)}
      >
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}
