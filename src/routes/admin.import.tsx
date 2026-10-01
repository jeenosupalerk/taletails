import { Link, createFileRoute } from "@tanstack/react-router";
import {
  CircleAlert,
  CircleCheck,
  Download,
  FileSpreadsheet,
  FolderOpen,
  ImagePlus,
  Loader2,
  TriangleAlert,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { useCreateCard } from "@/hooks/useAdmin";
import { useCategories } from "@/hooks/useSiteContent";
import {
  MAX_ROWS,
  SHEET_NAME,
  TEMPLATE_URL,
  indexImages,
  orphanImages,
  parseSheet,
  validateRows,
  type CellValue,
  type CheckedRow,
  type RawRow,
} from "@/lib/bulk-listing";
import { thb } from "@/lib/cart";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/import")({
  component: AdminImportPage,
});

type Result = { status: "saving" | "done" | "error"; id?: string; error?: string };

/** นามสกุลรูปที่ระบบยังไม่รองรับ (เตือนให้แปลงเป็น JPG) — ไฟล์อื่นที่ไม่ใช่รูปไม่ต้องเตือน */
const UNSUPPORTED_IMAGE = /\.(heic|heif|gif|bmp|tiff?|avif)$/i;

const keyOf = (code: string) => code.trim().toLowerCase();

function Thumb({ file }: { file: File }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    const u = URL.createObjectURL(file);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [file]);
  return url ? (
    <img src={url} alt="" className="h-14 w-10 shrink-0 rounded-md bg-tile object-cover" />
  ) : (
    <span className="h-14 w-10 shrink-0 rounded-md bg-tile" />
  );
}

function AdminImportPage() {
  const categories = useCategories();
  const createCard = useCreateCard();

  const [sheetName, setSheetName] = useState("");
  const [raw, setRaw] = useState<RawRow[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [publish, setPublish] = useState(false);
  const [fillBase, setFillBase] = useState("");
  const [gap, setGap] = useState(15);
  const [results, setResults] = useState<Record<string, Result>>({});
  const [saving, setSaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const dirInput = useRef<HTMLInputElement>(null);

  // กันปิดแท็บกลางทางตอนกำลังบันทึก
  useEffect(() => {
    if (!saving) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [saving]);

  const imageIndex = useMemo(() => indexImages(files), [files]);
  const checked: CheckedRow[] = useMemo(
    () =>
      validateRows(raw, {
        categories: categories.data ?? [],
        images: imageIndex,
        fillEnd: fillBase ? { base: fillBase, gapMinutes: Math.max(1, gap) } : undefined,
      }),
    [raw, categories.data, imageIndex, fillBase, gap],
  );
  const orphans = useMemo(() => orphanImages(imageIndex, raw), [imageIndex, raw]);
  const unsupported = imageIndex.unsupported.filter((n) => UNSUPPORTED_IMAGE.test(n));

  const needsFill = raw.some((r) => /ประมูล|auction/i.test(r.values.type) && !r.values.endTime);
  const doneCount = checked.filter((r) => results[keyOf(r.code)]?.status === "done").length;
  const pending = checked.filter((r) => r.input && results[keyOf(r.code)]?.status !== "done");
  const invalidCount = checked.filter((r) => !r.input).length;
  const failedCount = checked.filter((r) => results[keyOf(r.code)]?.status === "error").length;
  const tooMany = raw.length > MAX_ROWS;

  const onSheet = async (file: File | undefined) => {
    if (!file) return;
    setResults({});
    setSheetName(file.name);
    try {
      const { readSheet } = await import("read-excel-file/browser");
      let data: CellValue[][];
      try {
        data = (await readSheet(file, SHEET_NAME)) as CellValue[][];
      } catch {
        data = (await readSheet(file)) as CellValue[][];
      }
      const parsed = parseSheet(data);
      setRaw(parsed.rows);
      setProblems(parsed.problems);
      if (!parsed.problems.length && parsed.rows.length === 0) {
        setProblems(['ไม่พบแถวข้อมูล กรอกตั้งแต่แถวที่ 2 ของแผ่น "ลงสินค้า"']);
      }
    } catch {
      setRaw([]);
      setProblems(["เปิดไฟล์ไม่ได้ ใช้ไฟล์ .xlsx จากไฟล์ตัวอย่างของเว็บ (ไม่ใช่ .xls หรือ .csv)"]);
    }
  };

  const addImages = (list: FileList | File[] | null) => {
    if (!list) return;
    const incoming = Array.from(list).filter(
      (f) => /\.(jpe?g|png|webp)$/i.test(f.name) || UNSUPPORTED_IMAGE.test(f.name),
    );
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [f.name, f]));
      for (const f of incoming) map.set(f.name, f);
      return [...map.values()];
    });
    setResults({});
  };

  const saveAll = async () => {
    setSaving(true);
    let ok = 0;
    let fail = 0;
    for (const r of checked) {
      if (!r.input) continue;
      const key = keyOf(r.code);
      if (results[key]?.status === "done") continue;
      setResults((p) => ({ ...p, [key]: { status: "saving" } }));
      try {
        const id = await createCard.mutateAsync({ ...r.input, publish });
        setResults((p) => ({ ...p, [key]: { status: "done", id } }));
        ok += 1;
      } catch (e) {
        setResults((p) => ({
          ...p,
          [key]: { status: "error", error: e instanceof Error ? e.message : "บันทึกไม่สำเร็จ" },
        }));
        fail += 1;
      }
    }
    setSaving(false);
    if (fail === 0) toast.success(`บันทึกครบ ${ok} ใบแล้ว`);
    else toast.error(`บันทึกสำเร็จ ${ok} ใบ ไม่สำเร็จ ${fail} ใบ ดูสาเหตุในตาราง`);
  };

  const canSave = !saving && !tooMany && problems.length === 0 && pending.length > 0;
  const saveLabel = saving
    ? "กำลังบันทึก..."
    : failedCount > 0
      ? `ลองใหม่เฉพาะที่ไม่สำเร็จ (${pending.length} ใบ)`
      : `บันทึก ${pending.length} ใบ${publish ? " และลงขายทันที" : " เป็นฉบับร่าง"}`;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold">นำเข้าสินค้าหลายใบ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          ลงขายทันทีและประมูลพร้อมกันได้ครั้งละไม่เกิน {MAX_ROWS} ใบ ใช้ไฟล์ Excel +
          รูปที่ตั้งชื่อตามรหัส
        </p>
      </div>

      {/* ขั้นที่ 1 */}
      <section className="surface-panel space-y-3 p-4 sm:p-5">
        <h3 className="font-display text-sm font-semibold">1. โหลดไฟล์ตัวอย่างและเตรียมข้อมูล</h3>
        <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>กรอกตารางในไฟล์ตัวอย่าง หนึ่งแถวต่อการ์ดหนึ่งใบ (แผ่น "วิธีใช้" อธิบายครบ)</li>
          <li>
            ตั้งชื่อรูปเป็น <b className="text-foreground">รหัส_ลำดับ.jpg</b> เช่น A001_1.jpg
            (รูปหน้า) A001_2.jpg (รูปหลัง) รหัสต้องตรงกับช่อง "รหัส" ในตาราง
          </li>
        </ol>
        <Button asChild variant="secondary" className="min-h-11 rounded-xl">
          <a href={TEMPLATE_URL} download>
            <Download className="h-4 w-4" />
            โหลดไฟล์ Excel ตัวอย่าง
          </a>
        </Button>
      </section>

      {/* ขั้นที่ 2 */}
      <section className="surface-panel space-y-4 p-4 sm:p-5">
        <h3 className="font-display text-sm font-semibold">2. เลือกไฟล์ Excel และรูป</h3>

        <div className="flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:border-primary/40">
            <FileSpreadsheet className="h-4 w-4 text-primary" />
            เลือกไฟล์ Excel (.xlsx)
            <input
              type="file"
              accept=".xlsx"
              className="sr-only"
              onChange={(e) => {
                void onSheet(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          {sheetName && (
            <span className="truncate text-sm text-muted-foreground">
              {sheetName} ({raw.length} แถว)
            </span>
          )}
        </div>

        {problems.map((p) => (
          <p key={p} className="flex items-start gap-2 text-sm text-destructive">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            {p}
          </p>
        ))}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addImages(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-5 text-center transition-colors",
            dragging ? "border-primary bg-primary/5" : "border-border",
          )}
        >
          <ImagePlus className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            ลากรูปทั้งหมดมาวางที่นี่ หรือเลือกจากเครื่อง
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 rounded-xl"
              onClick={() => imgInput.current?.click()}
            >
              <ImagePlus className="h-4 w-4" />
              เลือกรูป
            </Button>
            <Button
              type="button"
              variant="secondary"
              className="min-h-11 rounded-xl"
              onClick={() => dirInput.current?.click()}
            >
              <FolderOpen className="h-4 w-4" />
              เลือกทั้งโฟลเดอร์
            </Button>
          </div>
          <input
            ref={imgInput}
            type="file"
            multiple
            accept=".jpg,.jpeg,.png,.webp"
            className="sr-only"
            onChange={(e) => {
              addImages(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            ref={dirInput}
            type="file"
            multiple
            className="sr-only"
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
            onChange={(e) => {
              addImages(e.target.files);
              e.target.value = "";
            }}
          />
          <p className="mt-3 text-xs text-muted-foreground">
            ได้แล้ว {files.length} รูป (.jpg .jpeg .png .webp)
            {files.length > 0 && (
              <button
                type="button"
                className="ml-2 font-semibold text-primary underline underline-offset-4"
                onClick={() => {
                  setFiles([]);
                  setResults({});
                }}
              >
                ล้างรูป
              </button>
            )}
          </p>
        </div>

        {unsupported.length > 0 && (
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            ไม่รองรับไฟล์ชนิดนี้ (แปลงเป็น JPG ก่อน): {unsupported.join(", ")}
          </p>
        )}
        {orphans.length > 0 && raw.length > 0 && (
          <p className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
            รูปที่ไม่ตรงกับรหัสในตาราง (ไม่ถูกนำเข้า): {orphans.join(", ")}
          </p>
        )}
      </section>

      {/* ขั้นที่ 3 */}
      {raw.length > 0 && problems.length === 0 && (
        <section className="surface-panel space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-display text-sm font-semibold">3. ตรวจก่อนบันทึก</h3>
            <p className="text-sm text-muted-foreground">
              พร้อม <b className="text-foreground">{checked.length - invalidCount}</b> ใบ
              {invalidCount > 0 && (
                <>
                  {" "}
                  ต้องแก้ <b className="text-destructive">{invalidCount}</b> ใบ
                </>
              )}
              {doneCount > 0 && <> บันทึกแล้ว {doneCount} ใบ</>}
            </p>
          </div>

          {tooMany && (
            <p className="flex items-start gap-2 text-sm text-destructive">
              <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
              มี {raw.length} แถว เกินครั้งละ {MAX_ROWS} ใบ แบ่งเป็นหลายไฟล์
            </p>
          )}

          {needsFill && (
            <div className="rounded-2xl border border-dashed border-border p-3 text-sm">
              <p className="font-medium">ตั้งเวลาปิดให้ใบประมูลที่ไม่ได้ใส่เวลาปิด</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Input
                  type="datetime-local"
                  value={fillBase}
                  onChange={(e) => setFillBase(e.target.value)}
                  aria-label="เวลาปิดใบแรก"
                  className="min-h-11 w-auto rounded-xl"
                />
                <span className="text-muted-foreground">ใบถัดไปห่างกัน</span>
                <Input
                  type="number"
                  min={1}
                  value={gap}
                  onChange={(e) => setGap(Number(e.target.value))}
                  aria-label="ห่างกันกี่นาที"
                  className="min-h-11 w-20 rounded-xl"
                />
                <span className="text-muted-foreground">นาที</span>
              </div>
            </div>
          )}

          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border">
            {checked.map((r) => {
              const res = results[keyOf(r.code)];
              const bad = !r.input;
              return (
                <li
                  key={`${r.line}-${r.code}`}
                  className={cn(
                    "flex gap-3 p-3",
                    bad && "bg-destructive/5",
                    res?.status === "done" && "bg-emerald-600/5",
                  )}
                >
                  <div className="flex w-12 shrink-0 gap-1 overflow-hidden">
                    {r.images[0] ? (
                      <Thumb file={r.images[0]} />
                    ) : (
                      <span className="h-14 w-10 rounded-md bg-tile" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-mono text-xs text-muted-foreground">
                        แถว {r.line} {r.code || "(ไม่มีรหัส)"}
                      </span>
                      <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold">
                        {r.saleType === "auction"
                          ? "ประมูล"
                          : r.saleType === "fixed_price"
                            ? "ขายทันที"
                            : "?"}
                      </span>
                      <span className="text-xs text-muted-foreground">รูป {r.images.length}</span>
                    </p>
                    <p className="truncate font-medium">{r.name || "(ไม่มีชื่อ)"}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {r.priceNum > 0 ? thb.format(r.priceNum) : "-"}
                      {r.saleType === "auction" && r.endTime
                        ? ` ปิด ${r.endTime.replace("T", " ")}`
                        : ""}
                    </p>
                    {r.errors.map((e) => (
                      <p key={e} className="mt-0.5 text-xs font-medium text-destructive">
                        {e}
                      </p>
                    ))}
                    {r.warnings.map((w) => (
                      <p key={w} className="mt-0.5 text-xs text-amber-700 dark:text-amber-400">
                        {w}
                      </p>
                    ))}
                    {res?.status === "error" && (
                      <p className="mt-0.5 text-xs font-medium text-destructive">
                        บันทึกไม่สำเร็จ: {res.error}
                      </p>
                    )}
                  </div>
                  <div className="flex w-14 shrink-0 items-start justify-end text-xs font-semibold">
                    {res?.status === "saving" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    ) : res?.status === "done" ? (
                      <CircleCheck className="h-5 w-5 text-emerald-600" aria-label="บันทึกแล้ว" />
                    ) : res?.status === "error" || bad ? (
                      <CircleAlert className="h-5 w-5 text-destructive" aria-label="ต้องแก้" />
                    ) : (
                      <span className="text-muted-foreground">พร้อม</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="space-y-3 border-t border-border pt-4">
            <div role="radiogroup" aria-label="บันทึกเป็น" className="flex flex-wrap gap-2">
              {[
                {
                  v: false,
                  t: "บันทึกเป็นฉบับร่าง (แนะนำ)",
                  h: "ยังไม่ขึ้นหน้าเว็บ ตรวจแล้วค่อยเปิดขาย",
                },
                { v: true, t: "ลงขายทันที", h: "ขึ้นหน้าเว็บ ใบประมูลเริ่มนับเวลา" },
              ].map((o) => (
                <button
                  key={String(o.v)}
                  type="button"
                  role="radio"
                  aria-checked={publish === o.v}
                  onClick={() => setPublish(o.v)}
                  className={cn(
                    "min-h-11 flex-1 rounded-2xl border px-4 py-2 text-left text-sm sm:flex-none",
                    publish === o.v ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <span className="block font-semibold">{o.t}</span>
                  <span className="block text-xs text-muted-foreground">{o.h}</span>
                </button>
              ))}
            </div>

            {publish && canSave ? (
              <ConfirmDialog
                title="ลงขายทันที"
                description={`จะลง ${pending.length} ใบขึ้นหน้าเว็บทันที ใบประมูลจะเริ่มนับเวลาและส่งแจ้งเตือน ยืนยันหรือไม่`}
                confirmLabel="ลงขายทันที"
                onConfirm={() => void saveAll()}
                trigger={
                  <Button className="min-h-12 w-full rounded-xl font-semibold sm:w-auto">
                    {saveLabel}
                  </Button>
                }
              />
            ) : (
              <Button
                className="min-h-12 w-full rounded-xl font-semibold sm:w-auto"
                disabled={!canSave}
                onClick={() => void saveAll()}
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {saveLabel}
              </Button>
            )}
            {invalidCount > 0 && pending.length > 0 && (
              <p className="text-xs text-muted-foreground">
                ใบที่ยังมีข้อผิดพลาดจะถูกข้าม แก้ในไฟล์แล้วเลือกไฟล์ใหม่ได้
              </p>
            )}
            {doneCount > 0 && !saving && (
              <p className="text-sm">
                บันทึกแล้ว {doneCount} ใบ ดูและเปิดขายได้ที่{" "}
                <Link
                  to="/admin"
                  className="font-semibold text-primary underline underline-offset-4"
                >
                  การ์ดทั้งหมด
                </Link>
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
