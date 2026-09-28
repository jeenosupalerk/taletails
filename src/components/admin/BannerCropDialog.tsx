import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Check, Loader2, Minus, Plus, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { type Area, type MediaSize } from "react-easy-crop";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cropImageToFile } from "@/lib/crop-image";
import { cn } from "@/lib/utils";

/*
 * ครอบรูป banner 2 ขนาดในหน้าเดียว (mockup 28 ก.ย. 2026)
 * - จอคอม 16:5 → 2400×750 · มือถือ 1:1 → 1080×1080 (ตรงกับกล่อง banner ใน HeroCarousel)
 * - เส้นประบอกตำแหน่งข้อความ/ปุ่มที่จะทับรูป ใช้ข้อความจริงจากฟอร์ม
 * - บันทึกเป็น WebP คุณภาพสูง ย่อให้พอดีขนาดที่แสดงจริง → ไฟล์เล็ก แต่ภาพไม่แตก
 */

export type BannerTarget = "desktop" | "mobile";

export const BANNER_SPECS: Record<
  BannerTarget,
  { label: string; aspect: number; outWidth: number; outHeight: number; minWidth: number }
> = {
  desktop: { label: "จอคอม", aspect: 16 / 5, outWidth: 2400, outHeight: 750, minWidth: 1600 },
  mobile: { label: "มือถือ", aspect: 1, outWidth: 1080, outHeight: 1080, minWidth: 800 },
};

/** ตำแหน่งข้อความบน banner (สัดส่วนของกล่อง) — ตรงกับ padding/ความกว้างใน HeroCarousel */
const TEXT_ZONE: Record<
  BannerTarget,
  { left: string; bottom: string; width: string; height: string }
> = {
  // วัดจากหน้าแรกจริง (28 ก.ย. 2026): จอ 1280 → กล่อง 1199×375, ข้อความเริ่มที่ 158px เว้นขอบ 40px
  desktop: { left: "3.3%", bottom: "10.7%", width: "56%", height: "47%" },
  // มือถือ 375 → กล่อง 341×341, ข้อความ (โลโก้ + หัวข้อ + ข้อความรอง + ปุ่ม 2 แถว) สูง 69%
  mobile: { left: "5.9%", bottom: "5.9%", width: "88%", height: "69%" },
};

interface CropState {
  crop: { x: number; y: number };
  zoom: number;
  rotation: number;
  area: Area | null;
}
const EMPTY_STATE: CropState = { crop: { x: 0, y: 0 }, zoom: 1, rotation: 0, area: null };

export interface BannerCropResult {
  desktop: File;
  mobile: File;
  /** เก็บตำแหน่งครอบไว้ กด "แก้การครอบ" ได้โดยไม่ต้องอัปโหลดใหม่ */
  states: Record<BannerTarget, CropState>;
}

const ACCEPT = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 25 * 1024 * 1024;
const MAX_PIXELS = 16_000_000;

/**
 * ตรวจไฟล์ก่อนครอบ แล้วคืน object URL ของรูปต้นทาง
 * รูปเกิน 16 ล้านพิกเซลย่อก่อน — iOS Safari ถอดรหัสรูปใหญ่กว่านี้ไม่ไหว (หน้าครอบจะค้าง/ภาพว่าง)
 */
export async function prepareBannerSource(
  file: File,
): Promise<{ url: string; width: number; height: number }> {
  const heic =
    /\.(heic|heif)$/i.test(file.name) || file.type.includes("heic") || file.type.includes("heif");
  if (heic || !ACCEPT.includes(file.type)) {
    throw new Error(
      heic
        ? "ไฟล์ HEIC จาก iPhone ยังไม่รองรับ ให้เปลี่ยนเป็น JPG ก่อน"
        : "รองรับเฉพาะไฟล์ JPG, PNG, WebP",
    );
  }
  if (file.size > MAX_BYTES) {
    throw new Error(
      `ไฟล์ใหญ่ ${(file.size / 1024 / 1024).toFixed(1)} MB เกิน 25 MB เลือกรูปที่เล็กลง`,
    );
  }
  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error("เปิดรูปนี้ไม่ได้ ลองบันทึกเป็น JPG ใหม่แล้วเลือกอีกครั้ง");
  });
  const { width, height } = bitmap;
  if (width * height <= MAX_PIXELS) {
    bitmap.close?.();
    return { url: URL.createObjectURL(file), width, height };
  }
  const scale = Math.sqrt(MAX_PIXELS / (width * height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("เบราว์เซอร์นี้ย่อรูปไม่ได้");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
  if (!blob) throw new Error("ย่อรูปไม่สำเร็จ");
  return { url: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
}

export function BannerCropDialog({
  open,
  source,
  initialStates,
  preview,
  onCancel,
  onDone,
}: {
  open: boolean;
  /** object URL จาก prepareBannerSource */
  source: string | null;
  initialStates?: Record<BannerTarget, CropState> | undefined;
  /** ข้อความจริงในฟอร์ม ใช้วางในกรอบเส้นประ */
  preview: { title: string; subtitle: string; cta: string };
  onCancel: () => void;
  onDone: (result: BannerCropResult) => void;
}) {
  const [tab, setTab] = useState<BannerTarget>("desktop");
  const [states, setStates] = useState<Record<BannerTarget, CropState>>(
    initialStates ?? { desktop: EMPTY_STATE, mobile: EMPTY_STATE },
  );
  // ครอบแล้ว = เคยเปิดแท็บนั้นและได้ตำแหน่งครอบ (react-easy-crop ส่ง area ทันทีที่โหลดรูป)
  const [visited, setVisited] = useState<Record<BannerTarget, boolean>>({
    desktop: true,
    mobile: !!initialStates,
  });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTab("desktop");
    setStates(initialStates ?? { desktop: EMPTY_STATE, mobile: EMPTY_STATE });
    setVisited({ desktop: true, mobile: !!initialStates });
    // เปิดใหม่ทุกครั้งเริ่มที่แท็บจอคอม
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, source]);

  const current = states[tab];
  const spec = BANNER_SPECS[tab];
  const update = (patch: Partial<CropState>) =>
    setStates((s) => ({ ...s, [tab]: { ...s[tab], ...patch } }));
  const onCropComplete = useCallback(
    (_: Area, pixels: Area) => setStates((s) => ({ ...s, [tab]: { ...s[tab], area: pixels } })),
    [tab],
  );

  const goMobile = () => {
    setVisited((v) => ({ ...v, mobile: true }));
    setTab("mobile");
  };

  const done = async () => {
    if (!source) return;
    const d = states.desktop.area;
    const m = states.mobile.area;
    if (!d || !m) {
      toast.error("ครอบให้ครบทั้งจอคอมและมือถือก่อน");
      return;
    }
    setBusy(true);
    try {
      const [desktop, mobile] = await Promise.all([
        cropImageToFile(source, d, states.desktop.rotation, "banner-desktop", {
          maxWidth: BANNER_SPECS.desktop.outWidth,
          type: "image/webp",
          quality: 0.86,
        }),
        cropImageToFile(source, m, states.mobile.rotation, "banner-mobile", {
          maxWidth: BANNER_SPECS.mobile.outWidth,
          type: "image/webp",
          quality: 0.86,
        }),
      ]);
      onDone({ desktop, mobile, states });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "ครอบรูปไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  const outW = current.area
    ? Math.min(spec.outWidth, Math.round(current.area.width))
    : spec.outWidth;
  const outH = Math.round(outW / spec.aspect);
  const lowRes = !!current.area && current.area.width < spec.minWidth;

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onInteractOutside={(e) => e.preventDefault()}
          className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[96dvh] flex-col rounded-t-3xl bg-card shadow-2xl sm:inset-auto sm:top-1/2 sm:left-1/2 sm:w-[min(960px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <DialogPrimitive.Title className="font-display text-lg font-semibold">
              ครอบรูป banner
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 rounded-xl"
                aria-label="ปิด"
                disabled={busy}
              >
                <X className="h-5 w-5" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 pt-4">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex gap-1 rounded-xl bg-secondary p-1"
                role="tablist"
                aria-label="ขนาดที่ครอบ"
              >
                {(["desktop", "mobile"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="tab"
                    aria-selected={tab === k}
                    onClick={() => (k === "mobile" ? goMobile() : setTab(k))}
                    className={cn(
                      "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-semibold transition-colors",
                      tab === k ? "bg-card shadow-sm" : "text-muted-foreground",
                    )}
                  >
                    {BANNER_SPECS[k].label} {k === "desktop" ? "16:5" : "1:1"}
                    {visited[k] && states[k].area && (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    )}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                ลากรูปเพื่อเลื่อน ครอบให้ครบ 2 แบบแล้วกดใช้รูปนี้
              </p>
            </div>

            {source && (
              <CropStage
                key={tab}
                source={source}
                target={tab}
                state={current}
                preview={preview}
                onChange={update}
                onCropComplete={onCropComplete}
              />
            )}

            <div className="flex flex-wrap items-center gap-3 py-4">
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 rounded-xl"
                aria-label="ซูมออก"
                onClick={() => update({ zoom: Math.max(1, current.zoom - 0.2) })}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <input
                type="range"
                min={1}
                max={4}
                step={0.01}
                value={current.zoom}
                onChange={(e) => update({ zoom: Number(e.target.value) })}
                aria-label="ซูม"
                className="w-40 accent-[var(--primary)] sm:w-60"
              />
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 rounded-xl"
                aria-label="ซูมเข้า"
                onClick={() => update({ zoom: Math.min(4, current.zoom + 0.2) })}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="min-h-11 rounded-xl"
                onClick={() => update({ rotation: (current.rotation + 90) % 360 })}
              >
                <RotateCw className="h-4 w-4" /> หมุน
              </Button>
              <div className="ml-auto text-right text-xs leading-relaxed sm:text-sm">
                <p>
                  <b className="tabular-nums">
                    {outW} × {outH} px
                  </b>{" "}
                  <span className="text-muted-foreground">WebP</span>
                </p>
                {lowRes ? (
                  <p className="text-amber-700 dark:text-amber-400">
                    ส่วนที่ครอบกว้าง {Math.round(current.area!.width)} px ภาพอาจไม่คมบนจอใหญ่
                  </p>
                ) : (
                  <p className="text-emerald-700 dark:text-emerald-400">ความละเอียดพอ ภาพคมชัด</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 border-t border-border px-5 py-4">
            <Button
              variant="ghost"
              className="min-h-11 rounded-xl"
              onClick={onCancel}
              disabled={busy}
            >
              ยกเลิก
            </Button>
            <span className="flex-1" />
            {tab === "desktop" ? (
              <Button className="min-h-11 rounded-xl" onClick={goMobile}>
                ถัดไป: ครอบแบบมือถือ
              </Button>
            ) : (
              <Button className="min-h-11 rounded-xl" disabled={busy} onClick={() => void done()}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                ใช้รูปนี้
              </Button>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/** พื้นที่ครอบ 1 ขนาด + กรอบเส้นประบอกตำแหน่งข้อความ */
function CropStage({
  source,
  target,
  state,
  preview,
  onChange,
  onCropComplete,
}: {
  source: string;
  target: BannerTarget;
  state: CropState;
  preview: { title: string; subtitle: string; cta: string };
  onChange: (patch: Partial<CropState>) => void;
  onCropComplete: (area: Area, pixels: Area) => void;
}) {
  const spec = BANNER_SPECS[target];
  const zone = TEXT_ZONE[target];
  const boxRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [media, setMedia] = useState<MediaSize | null>(null);

  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([e]) => e && setBox({ w: e.contentRect.width, h: e.contentRect.height }),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // กรอบครอบขนาดคงที่ (ใหญ่สุดที่ยังอยู่ในรูปและในกล่อง) → วางกรอบเส้นประทับได้ตรงตำแหน่ง
  const pad = 24;
  const limitW = Math.min(box.w - pad * 2, media ? media.width : Infinity);
  const limitH = Math.min(box.h - pad * 2, media ? media.height : Infinity);
  let cw = limitW;
  let ch = cw / spec.aspect;
  if (ch > limitH) {
    ch = limitH;
    cw = ch * spec.aspect;
  }
  const ready = box.w > 0 && cw > 0 && ch > 0;

  return (
    <div
      ref={boxRef}
      className={cn(
        "relative mt-4 overflow-hidden rounded-2xl bg-neutral-900",
        target === "desktop" ? "h-[240px] sm:h-[380px]" : "h-[340px] sm:h-[420px]",
      )}
    >
      {ready && (
        <>
          <Cropper
            image={source}
            crop={state.crop}
            zoom={state.zoom}
            rotation={state.rotation}
            aspect={spec.aspect}
            cropSize={{ width: cw, height: ch }}
            onCropChange={(crop) => onChange({ crop })}
            onZoomChange={(zoom) => onChange({ zoom })}
            onCropComplete={onCropComplete}
            onMediaLoaded={setMedia}
            showGrid={false}
            style={{ cropAreaStyle: { border: "2px solid #fff", borderRadius: 6 } }}
          />
          {/* ตัวอย่างข้อความจริง — ไม่รับคลิก ลากรูปทะลุได้ */}
          <div
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-md"
            style={{ width: cw, height: ch }}
          >
            <div className="absolute inset-0 bg-gradient-fade" />
            <div
              className="absolute flex flex-col justify-end gap-1 rounded-lg border-[1.5px] border-dashed border-white/85 p-2"
              style={{
                left: zone.left,
                bottom: zone.bottom,
                width: zone.width,
                height: zone.height,
              }}
            >
              <p
                className={cn(
                  "line-clamp-2 leading-tight font-bold text-white",
                  target === "desktop" ? "text-sm sm:text-xl" : "text-base",
                )}
              >
                {preview.title || "หัวข้อ banner"}
              </p>
              {preview.subtitle && (
                <p className="line-clamp-2 text-[10px] text-white/80 sm:text-xs">
                  {preview.subtitle}
                </p>
              )}
              <div className="mt-1 flex gap-1.5">
                {preview.cta && (
                  <span className="rounded-md bg-primary px-2 py-1 text-[10px] font-semibold text-primary-foreground">
                    {preview.cta}
                  </span>
                )}
                <span className="rounded-md bg-white px-2 py-1 text-[10px] font-semibold text-neutral-900">
                  ดูตลาดซื้อขาย
                </span>
              </div>
            </div>
            <span className="absolute top-2 right-2 rounded-full bg-black/45 px-2 py-0.5 text-[10px] text-white">
              พื้นที่ข้อความ
            </span>
          </div>
        </>
      )}
    </div>
  );
}
