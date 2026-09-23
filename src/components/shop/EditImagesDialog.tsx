import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Images, Loader2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ImagePicker } from "@/components/shop/ImagePicker";
import { Button } from "@/components/ui/button";
import { useUpdateCardImages, type PickedImage } from "@/hooks/useAdmin";

/**
 * แก้ไขรูปของการ์ดที่ลงไว้แล้ว — ครอบใหม่ / เพิ่ม / ลบ / เรียงลำดับ แล้วกดบันทึก
 */
export function EditImagesButton({ cardId, cardName, images }: { cardId: string; cardName: string; images: string[] }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<PickedImage[] | null>(null);
  const save = useUpdateCardImages();

  const close = () => {
    setOpen(false);
    setPicked(null);
  };

  const onSave = () => {
    if (!picked) {
      close();
      return;
    }
    if (!picked.length) {
      toast.error("ต้องมีรูปอย่างน้อย 1 รูป");
      return;
    }
    save.mutate(
      { cardId, images: picked },
      {
        onSuccess: () => {
          toast.success("บันทึกรูปแล้ว", { description: cardName });
          close();
        },
        onError: (e) => toast.error(e instanceof Error ? e.message : "บันทึกรูปไม่สำเร็จ"),
      },
    );
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => (o ? setOpen(true) : !save.isPending && close())}>
      <DialogPrimitive.Trigger asChild>
        <Button
          variant="secondary"
          className="min-h-10 flex-1 rounded-xl px-3 text-xs sm:flex-none"
          title="แก้ไขรูป: ครอบใหม่ เพิ่ม ลบ เรียงลำดับ"
        >
          <Images className="h-4 w-4" /> แก้ไขรูป
        </Button>
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          // มีการแก้ไขค้างอยู่ → คลิกนอกกล่อง/กด Esc/แตะ toast จะไม่ปิดทิ้ง
          onInteractOutside={(e) => {
            const t = e.target as HTMLElement | null;
            if (picked || t?.closest?.("[data-sonner-toaster]")) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (picked) e.preventDefault();
          }}
          className="fixed inset-0 z-[60] flex flex-col bg-card outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90vh] sm:w-[min(640px,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:shadow-2xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:pt-3">
            <div className="min-w-0">
              <DialogPrimitive.Title className="font-display text-base font-semibold">แก้ไขรูปสินค้า</DialogPrimitive.Title>
              <p className="truncate text-xs text-muted-foreground">{cardName}</p>
            </div>
            <DialogPrimitive.Close
              aria-label="ปิด"
              disabled={save.isPending}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <p className="text-xs text-muted-foreground">
              กดไอคอนครอบที่รูปเดิมเพื่อปรับให้พอดีกรอบการ์ด 5:7 · รูปเดิมที่ไม่ได้แก้จะไม่ถูกอัปโหลดซ้ำ
            </p>
            {open && <ImagePicker initialUrls={images} onChangeImages={setPicked} />}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-3">
            <Button variant="ghost" className="rounded-xl" onClick={close} disabled={save.isPending}>
              ยกเลิก
            </Button>
            <Button
              onClick={onSave}
              disabled={save.isPending || !picked}
              className="rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
            >
              {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {save.isPending ? "กำลังบันทึก…" : "บันทึกรูป"}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
