import { ChevronLeft, ChevronRight, Crop, ImagePlus, Loader2, Plus, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { ImageCropDialog, type CropTarget } from "@/components/shop/ImageCropDialog";
import type { PickedImage } from "@/hooks/useAdmin";
import { cn } from "@/lib/utils";

export const MAX_IMAGES = 8;

interface Item {
  id: string;
  /** รูปเดิมบนเซิร์ฟเวอร์ (กรณีแก้ไขสินค้าที่ลงไว้แล้ว) */
  remoteUrl?: string;
  /** ไฟล์ต้นฉบับ — ใช้ครอบใหม่ (รูปเดิมจะโหลดมาเป็นไฟล์ตอนกดครอบ) */
  original?: File;
  originalUrl?: string;
  /** ไฟล์ที่จะอัปโหลดจริง (ครอบแล้ว หรือเป็นต้นฉบับถ้ากดข้าม) — ไม่มี = ใช้รูปเดิม */
  file?: File;
  /** URL ที่ใช้แสดงรูปย่อ */
  url: string;
}

export type { PickedImage };

const toPicked = (i: Item): PickedImage =>
  i.file ? { kind: "file", file: i.file } : { kind: "remote", url: i.remoteUrl ?? i.url };

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));

/**
 * เลือกรูปสินค้า: พรีวิวเป็นรูปย่อ ลบ / เพิ่ม / ครอบใหม่ / เรียงลำดับได้ รูปแรก = รูปปก
 * เลือกแล้วจะเปิดหน้าครอบให้ทีละรูป (กดข้ามได้)
 */
export function ImagePicker({
  files,
  onChange,
  initialUrls,
  onChangeImages,
}: {
  /** โหมดสร้างสินค้า: รายการไฟล์ที่จะอัปโหลด */
  files?: File[];
  onChange?: (files: File[]) => void;
  /** โหมดแก้ไข: รูปเดิมของสินค้า */
  initialUrls?: string[];
  onChangeImages?: (images: PickedImage[]) => void;
}) {
  const [items, setItems] = useState<Item[]>(() =>
    (initialUrls ?? []).map((url) => ({ id: uid(), remoteUrl: url, url })),
  );
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [queue, setQueue] = useState<CropTarget[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropActive, setDropActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // ฟอร์มถูกล้าง (เช่น ลงขายสำเร็จ) → ล้างรูปย่อด้วย
  useEffect(() => {
    if (files && files.length === 0 && itemsRef.current.length > 0) {
      itemsRef.current.forEach(revoke);
      setItems([]);
    }
  }, [files]);

  // คืนหน่วยความจำของ object URL ตอนออกจากหน้า
  useEffect(() => () => itemsRef.current.forEach(revoke), []);

  const commit = (next: Item[]) => {
    setItems(next);
    onChange?.(next.flatMap((i) => (i.file ? [i.file] : [])));
    onChangeImages?.(next.map(toPicked));
  };

  const addFiles = (list: FileList | File[]) => {
    const picked = Array.from(list).filter((f) => f.type.startsWith("image/") || /\.(heic|heif)$/i.test(f.name));
    if (!picked.length) return;
    const room = MAX_IMAGES - items.length;
    if (room <= 0) {
      toast.error(`ใส่รูปได้สูงสุด ${MAX_IMAGES} รูป`);
      return;
    }
    if (picked.length > room) toast.info(`เพิ่มได้อีก ${room} รูป (สูงสุด ${MAX_IMAGES} รูป)`);
    const queueNext: CropTarget[] = [];
    const added: Item[] = picked.slice(0, room).map((f) => {
      const url = URL.createObjectURL(f);
      const id = uid();
      queueNext.push({ id, url, fileName: f.name });
      return { id, original: f, originalUrl: url, file: f, url };
    });
    commit([...items, ...added]);
    setQueue(queueNext);
  };

  const remove = (id: string) => {
    const item = items.find((i) => i.id === id);
    if (item) revoke(item);
    commit(items.filter((i) => i.id !== id));
  };

  const move = (id: string, delta: number) => {
    const from = items.findIndex((i) => i.id === id);
    const to = from + delta;
    if (from < 0 || to < 0 || to >= items.length) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    commit(next);
  };

  const moveTo = (id: string, targetId: string) => {
    if (id === targetId) return;
    const from = items.findIndex((i) => i.id === id);
    const to = items.findIndex((i) => i.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...items];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it!);
    commit(next);
  };

  const onCropResult = (id: string, file: File | null) => {
    if (!file) return; // ข้าม → ใช้ไฟล์/รูปเดิม
    const next = itemsRef.current.map((i) => {
      if (i.id !== id) return i;
      if (i.url !== i.originalUrl && i.url !== i.remoteUrl) URL.revokeObjectURL(i.url);
      return { ...i, file, url: URL.createObjectURL(file) };
    });
    itemsRef.current = next;
    commit(next);
  };

  const recrop = async (item: Item) => {
    if (item.original && item.originalUrl) {
      setQueue([{ id: item.id, url: item.originalUrl, fileName: item.original.name }]);
      return;
    }
    if (!item.remoteUrl) return;
    // รูปเดิมบนเซิร์ฟเวอร์: โหลดมาเป็นไฟล์ในเครื่องก่อน (กัน canvas ติด CORS ตอนครอบ)
    setLoadingId(item.id);
    try {
      const res = await fetch(item.remoteUrl);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const original = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });
      const originalUrl = URL.createObjectURL(original);
      // ระหว่างโหลด ผู้ใช้อาจลบรูปนี้ไปแล้ว
      if (!itemsRef.current.some((i) => i.id === item.id)) {
        URL.revokeObjectURL(originalUrl);
        return;
      }
      const next = itemsRef.current.map((i) => (i.id === item.id ? { ...i, original, originalUrl } : i));
      itemsRef.current = next;
      setItems(next);
      setQueue([{ id: item.id, url: originalUrl, fileName: original.name }]);
    } catch {
      toast.error("โหลดรูปเดิมมาครอบไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes("Files")) {
          e.preventDefault();
          setDropActive(true);
        }
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(e) => {
        if (!e.dataTransfer.files.length) return;
        e.preventDefault();
        setDropActive(false);
        addFiles(e.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = ""; // เลือกไฟล์เดิมซ้ำได้
        }}
      />

      {items.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cn(
            "mt-1.5 flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-primary/35 bg-primary/[0.03] px-4 py-7 text-center transition-colors hover:bg-primary/[0.06]",
            dropActive && "border-primary bg-primary/10",
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <ImagePlus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold text-foreground">ลากรูปมาวาง หรือกดเพื่อเลือก</span>
          <span className="text-xs text-muted-foreground">
            JPG, PNG, HEIC · สูงสุด {MAX_IMAGES} รูป · แนะนำถ่ายตรง พื้นเรียบ
          </span>
        </button>
      ) : (
        <>
          <div
            className={cn(
              "mt-1.5 grid grid-cols-3 gap-2.5 rounded-2xl sm:grid-cols-4",
              dropActive && "ring-2 ring-primary ring-offset-2 ring-offset-background",
            )}
          >
            {items.map((item, i) => (
              <div
                key={item.id}
                draggable
                onDragStart={(e) => {
                  setDragId(item.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", item.id); // Firefox ต้องมี setData ถึงจะลากได้
                }}
                onDragOver={(e) => {
                  if (dragId) e.preventDefault();
                }}
                onDrop={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  e.stopPropagation();
                  moveTo(dragId, item.id);
                  setDragId(null);
                }}
                onDragEnd={() => setDragId(null)}
                className={cn(
                  "group relative aspect-[5/7] cursor-grab overflow-hidden rounded-xl bg-tile ring-1 ring-border active:cursor-grabbing",
                  dragId === item.id && "opacity-50 ring-2 ring-primary",
                )}
              >
                <img src={item.url} alt={`รูปที่ ${i + 1}`} className="h-full w-full object-cover" draggable={false} />
                {i === 0 && (
                  <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10.5px] font-semibold text-primary-foreground shadow">
                    <Star className="h-3 w-3 fill-current" /> รูปปก
                  </span>
                )}
                <button
                  type="button"
                  aria-label={`ลบรูปที่ ${i + 1}`}
                  onClick={() => remove(item.id)}
                  className="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-foreground/80 text-background shadow transition-transform active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-1.5 pt-5">
                  <button
                    type="button"
                    aria-label="เลื่อนไปก่อนหน้า"
                    disabled={i === 0}
                    onClick={() => move(item.id, -1)}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-card/90 text-foreground disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    aria-label={`ครอบรูปที่ ${i + 1} ใหม่`}
                    onClick={() => void recrop(item)}
                    disabled={loadingId === item.id}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-card/90 text-foreground"
                  >
                    {loadingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Crop className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    aria-label="เลื่อนไปถัดไป"
                    disabled={i === items.length - 1}
                    onClick={() => move(item.id, 1)}
                    className="grid h-7 w-7 place-items-center rounded-lg bg-card/90 text-foreground disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            {items.length < MAX_IMAGES && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex aspect-[5/7] flex-col items-center justify-center gap-1.5 rounded-xl bg-card text-xs font-semibold text-primary ring-2 ring-primary/30 ring-inset transition-colors hover:bg-primary/5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10">
                  <Plus className="h-5 w-5" />
                </span>
                เพิ่มรูป
                <span className="font-normal text-muted-foreground">
                  {items.length}/{MAX_IMAGES}
                </span>
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            รูปแรกคือรูปปก · ลากหรือกดลูกศรเพื่อเรียงลำดับ · กด ✕ เพื่อลบ · กดไอคอนครอบเพื่อปรับใหม่ ·
            ระบบย่อขนาดไฟล์ให้อัตโนมัติก่อนอัปโหลด
          </p>
        </>
      )}

      <ImageCropDialog key={queue[0]?.id ?? "none"} queue={queue} onResult={onCropResult} onClose={() => setQueue([])} />
    </div>
  );
}

function revoke(item: Item) {
  if (item.originalUrl) URL.revokeObjectURL(item.originalUrl);
  if (item.url !== item.originalUrl && item.url !== item.remoteUrl) URL.revokeObjectURL(item.url);
}
