import { Camera, Loader2, RefreshCw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ImageCropDialog, type CropTarget } from "@/components/shop/ImageCropDialog";
import { UserAvatar } from "@/components/site/UserAvatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { compressImageFile } from "@/lib/image-compress";
import { uid } from "@/lib/utils";

const AVATAR_BUCKET = "avatars";
const MAX_EDGE = 512;

/** อัปโหลดรูปโปรไฟล์ขึ้น bucket avatars (โฟลเดอร์ตาม user id ตามที่ policy กำหนด) */
async function uploadAvatar(userId: string, file: File): Promise<string> {
  const small = await compressImageFile(file, MAX_EDGE);
  const ext = (small.type.split("/")[1] ?? "jpg").replace("jpeg", "jpg");
  const path = `${userId}/${uid()}.${ext}`;
  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, small, { contentType: small.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;
}

/**
 * ส่วนหัวหน้าบัญชี: รูปโปรไฟล์ + ชื่อ + อีเมล
 * กดปุ่มกล้องเพื่อเปลี่ยนรูป (ครอบเป็นวงกลมก่อนอัปโหลด)
 * ถ้าเข้าสู่ระบบด้วย Google/Facebook จะมีปุ่มกลับไปใช้รูปจากบัญชีนั้น
 */
export function ProfileIdentity() {
  const { user, updateProfile } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<CropTarget[]>([]);
  const [busy, setBusy] = useState(false);
  const objectUrls = useRef<string[]>([]);

  // คืนหน่วยความจำของ object URL ที่สร้างไว้ตอนเปิดหน้าครอบ
  useEffect(
    () => () => {
      objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
      objectUrls.current = [];
    },
    [],
  );

  if (!user) return null;

  const social = user.socialAvatarUrl ?? "";
  const canRestoreSocial = !!social && user.avatarUrl !== social;

  const closeCrop = () => {
    objectUrls.current.forEach((u) => URL.revokeObjectURL(u));
    objectUrls.current = [];
    setQueue([]);
  };

  const save = async (file: File) => {
    setBusy(true);
    try {
      const url = await uploadAvatar(user.id, file);
      await updateProfile({ avatarUrl: url });
      toast.success("เปลี่ยนรูปโปรไฟล์แล้ว");
    } catch (e) {
      toast.error("อัปโหลดรูปไม่สำเร็จ", e instanceof Error ? { description: e.message } : {});
    } finally {
      setBusy(false);
    }
  };

  const restoreSocial = async () => {
    setBusy(true);
    try {
      await updateProfile({ avatarUrl: social });
      toast.success("กลับไปใช้รูปจากบัญชีที่ล็อกอินแล้ว");
    } catch (e) {
      toast.error("เปลี่ยนรูปไม่สำเร็จ", e instanceof Error ? { description: e.message } : {});
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="relative shrink-0">
        <UserAvatar
          name={user.name}
          src={user.avatarUrl}
          className="h-16 w-16 border-2 border-primary/20"
          fallbackClassName="text-lg"
        />
        <button
          type="button"
          aria-label="เปลี่ยนรูปโปรไฟล์"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="absolute -right-1 -bottom-1 grid h-7 w-7 place-items-center rounded-full bg-gradient-ember text-primary-foreground shadow-md ring-2 ring-card disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const url = URL.createObjectURL(file);
            objectUrls.current.push(url);
            setQueue([{ id: uid(), url, fileName: file.name }]);
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-bold">{user.name}</h2>
        <p className="truncate text-sm text-muted-foreground">{user.email}</p>
        {canRestoreSocial && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={busy}
            onClick={() => void restoreSocial()}
            className="mt-1 -ml-2 h-7 rounded-full px-2 text-[11px] font-semibold text-muted-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" /> ใช้รูปจากบัญชีที่ล็อกอิน
          </Button>
        )}
      </div>

      {queue.length > 0 && (
        <ImageCropDialog
          key={queue[0]!.id}
          queue={queue}
          title="ปรับรูปโปรไฟล์"
          ratioKeys={["square"]}
          defaultRatio="square"
          cropShape="round"
          allowSkip={false}
          applyLabel="ใช้รูปนี้"
          onResult={(_, file) => {
            if (file) void save(file);
            // ครอบไม่สำเร็จ (เช่นไฟล์ HEIC ที่เบราว์เซอร์นี้เปิดไม่ได้) — ไม่มีรูปเดิมให้ใช้แทน
            else toast.error("ใช้รูปนี้ไม่ได้ ลองเลือกไฟล์ JPG หรือ PNG แทน");
          }}
          onClose={closeCrop}
        />
      )}
    </div>
  );
}
