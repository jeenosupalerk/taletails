import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Loader2, Minus, Plus, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cropImageToFile, imageAspect } from "@/lib/crop-image";
import { cn } from "@/lib/utils";

export interface CropTarget {
  id: string;
  /** รูปต้นฉบับ (object URL) — ครอบใหม่ได้ทุกครั้งโดยไม่เสียความคมชัด */
  url: string;
  fileName: string;
}

type RatioKey = "card" | "slab" | "square" | "original";

const RATIOS: { key: RatioKey; label: string; hint: string; value: number | null }[] = [
  { key: "card", label: "การ์ด 5:7", hint: "การ์ดเปล่า 63×88 มม.", value: 5 / 7 },
  { key: "slab", label: "สแลบเกรด", hint: "กล่องเกรด PSA / BGS / CGC", value: 3 / 5 },
  { key: "square", label: "สี่เหลี่ยม", hint: "1:1 เช่น กล่องสุ่ม", value: 1 },
  { key: "original", label: "ต้นฉบับ", hint: "ใช้สัดส่วนเดิมของรูป", value: null },
];

/**
 * หน้าครอบรูปทีละรูป (ล็อกสัดส่วนการ์ด 5:7 เป็นค่าเริ่มต้น)
 * - ใช้รูปนี้ → ส่งไฟล์ที่ครอบแล้ว · ข้ามรูปนี้ → ใช้รูปเดิม · ปิด → ข้ามรูปที่เหลือทั้งหมด
 */
export function ImageCropDialog({
  queue,
  onResult,
  onClose,
  title = "ครอบรูป",
  ratioKeys,
  defaultRatio = "card",
  cropShape = "rect",
  allowSkip = true,
  applyLabel,
}: {
  queue: CropTarget[];
  /** file = null คือข้าม (ใช้รูปเดิม) */
  onResult: (id: string, file: File | null) => void;
  onClose: () => void;
  title?: string | undefined;
  /** จำกัดสัดส่วนที่เลือกได้ (ไม่ใส่ = ครบทุกแบบ) ถ้าเหลือแบบเดียวจะซ่อนแถบเลือก */
  ratioKeys?: RatioKey[] | undefined;
  defaultRatio?: RatioKey | undefined;
  /** "round" = กรอบวงกลม เช่น รูปโปรไฟล์ */
  cropShape?: "rect" | "round" | undefined;
  allowSkip?: boolean | undefined;
  applyLabel?: string | undefined;
}) {
  const [index, setIndex] = useState(0);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [ratio, setRatio] = useState<RatioKey>(defaultRatio);
  const ratioChoices = ratioKeys?.length ? RATIOS.filter((r) => ratioKeys.includes(r.key)) : RATIOS;
  const [originalAspect, setOriginalAspect] = useState(5 / 7);
  const [area, setArea] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const open = queue.length > 0;
  const current = queue[Math.min(index, queue.length - 1)];

  // ปิดแล้วรีเซ็ตกลับรูปแรก (ImagePicker ใส่ key ให้ remount ทุกคิวใหม่ด้วย)
  useEffect(() => {
    if (!open) setIndex(0);
  }, [open]);

  // รีเซ็ตค่าเมื่อเปลี่ยนรูป
  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
    setArea(null);
    if (!current) return;
    let alive = true;
    imageAspect(current.url)
      .then((a) => alive && setOriginalAspect(a))
      .catch(() => {
        if (!alive) return;
        // เช่น ไฟล์ HEIC ที่เบราว์เซอร์นี้เปิดไม่ได้ → ใช้รูปเดิมไปก่อน
        toast.info("เปิดรูปนี้เพื่อครอบไม่ได้ ระบบจะใช้รูปเดิม", { description: current.fileName });
        onResult(current.id, null);
        next();
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  const aspect =
    RATIOS.find((r) => r.key === ratio)?.value ??
    // หมุน 90°/270° แล้วสัดส่วนต้นฉบับกลับด้าน
    (rotation % 180 === 0 ? originalAspect : 1 / originalAspect);

  const next = () => {
    if (index + 1 >= queue.length) onClose();
    else setIndex((i) => i + 1);
  };

  const onCropComplete = useCallback((_: Area, pixels: Area) => setArea(pixels), []);

  const apply = async () => {
    if (!current || !area) return;
    setBusy(true);
    try {
      const file = await cropImageToFile(current.url, area, rotation, current.fileName);
      onResult(current.id, file);
      next();
    } catch (e) {
      toast.error("ครอบรูปไม่สำเร็จ", e instanceof Error ? { description: e.message } : {});
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    if (!current) return;
    onResult(current.id, null);
    next();
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-[70] flex flex-col overflow-hidden bg-card outline-none sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(640px,calc(100%-2rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl sm:shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3 pt-[max(env(safe-area-inset-top),0.75rem)] sm:pt-3">
            <DialogPrimitive.Title className="font-display text-base font-semibold">
              {title} {queue.length > 1 && `(${Math.min(index + 1, queue.length)}/${queue.length})`}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close
              aria-label="ปิด (ใช้รูปเดิมสำหรับรูปที่เหลือ)"
              className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted"
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>

          <div className="relative min-h-[300px] flex-1 bg-[#1d1b19] sm:h-[420px] sm:flex-none">
            {current && (
              <Cropper
                image={current.url}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={aspect}
                cropShape={cropShape}
                minZoom={1}
                maxZoom={5}
                zoomSpeed={0.3}
                showGrid
                objectFit="contain"
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onRotationChange={setRotation}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          <div className="space-y-3.5 px-4 py-3.5">
            {ratioChoices.length > 1 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
              {ratioChoices.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  title={r.hint}
                  onClick={() => setRatio(r.key)}
                  aria-pressed={ratio === r.key}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    ratio === r.key ? "bg-foreground text-background" : "bg-tile text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="ซูมออก"
                onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="range"
                min={1}
                max={5}
                step={0.01}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="ซูม"
                className="h-1.5 flex-1 cursor-pointer accent-[var(--primary)]"
              />
              <button
                type="button"
                aria-label="ซูมเข้า"
                onClick={() => setZoom((z) => Math.min(5, z + 0.2))}
                className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="rounded-xl"
                onClick={() => setRotation((r) => (r + 90) % 360)}
              >
                <RotateCw className="h-4 w-4" /> หมุน 90°
              </Button>
              <p className="text-right text-[11px] text-muted-foreground">
                ลากรูปเพื่อจัดตำแหน่ง · บนมือถือใช้สองนิ้วซูม
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:pb-3">
            {allowSkip ? (
              <Button type="button" variant="ghost" className="rounded-xl" onClick={skip} disabled={busy}>
                ข้ามรูปนี้
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              {index > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  className="rounded-xl"
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  disabled={busy}
                >
                  ย้อนกลับ
                </Button>
              )}
              <Button
                type="button"
                onClick={apply}
                disabled={busy || !area}
                className="rounded-xl bg-gradient-ember font-semibold text-primary-foreground hover:opacity-90"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {applyLabel ?? (index + 1 < queue.length ? "ใช้รูปนี้ แล้วไปรูปถัดไป" : "ใช้รูปนี้")}
              </Button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
