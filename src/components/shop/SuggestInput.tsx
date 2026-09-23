import { Check, History } from "lucide-react";
import { useId, useMemo, useRef, useState, type ReactNode } from "react";

import { Input } from "@/components/ui/input";
import { normText } from "@/lib/market-price";
import { cn } from "@/lib/utils";

export interface SuggestItem<T> {
  key: string;
  /** ข้อความที่ใช้จับคู่กับสิ่งที่พิมพ์ */
  text: string;
  /** บรรทัดรองใต้ชื่อ */
  detail?: string | undefined;
  /** ยิ่งมากยิ่งขึ้นก่อน (เช่น จำนวนครั้งที่เคยลง) */
  weight?: number | undefined;
  value: T;
}

/**
 * ช่องพิมพ์พร้อมรายการแนะนำจากข้อมูลที่เคยลงไว้แล้ว
 * - พิมพ์แล้วขึ้นรายการที่ตรง (ไม่สนตัวพิมพ์/เว้นวรรค/ขีด) · ↑↓ เลือก · Enter ใช้ · Esc ปิด
 * - ใต้ช่องแสดงคำเตือนถ้าสะกดใกล้เคียงชื่อที่มีอยู่แต่ไม่ตรงเป๊ะ
 */
export function SuggestInput<T>({
  value,
  onChange,
  items,
  onPick,
  placeholder,
  similar,
  emptyHint,
  maxItems = 8,
}: {
  value: string;
  onChange: (v: string) => void;
  items: SuggestItem<T>[];
  onPick: (item: SuggestItem<T>) => void;
  placeholder?: string | undefined;
  /** ชื่อที่มีอยู่แล้วซึ่งสะกดใกล้เคียงค่าที่พิมพ์ (null = ไม่มี) */
  similar?: string | null | undefined;
  emptyHint?: ReactNode;
  maxItems?: number | undefined;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const blurTimer = useRef<number | null>(null);

  const matches = useMemo(() => {
    const q = normText(value);
    const scored = items
      .map((it) => {
        const t = normText(it.text);
        if (!q) return { it, score: 1 };
        if (t === q) return { it, score: 4 };
        if (t.startsWith(q)) return { it, score: 3 };
        if (t.split(" ").some((w) => w.startsWith(q))) return { it, score: 2 };
        if (t.includes(q)) return { it, score: 1 };
        return null;
      })
      .filter((x): x is { it: SuggestItem<T>; score: number } => x !== null);
    scored.sort((a, b) => b.score - a.score || (b.it.weight ?? 0) - (a.it.weight ?? 0));
    return scored.slice(0, maxItems).map((x) => x.it);
  }, [items, value, maxItems]);

  // ซ่อนรายการถ้าสิ่งที่พิมพ์ตรงกับรายการเดียวที่มีอยู่แล้วเป๊ะ
  const exactOnly = matches.length === 1 && matches[0]!.text === value.trim() && !matches[0]!.detail;
  const show = open && matches.length > 0 && !exactOnly;

  const pick = (it: SuggestItem<T>) => {
    onPick(it);
    setOpen(false);
  };

  return (
    <div className="relative">
      <Input
        className="min-h-11 rounded-xl"
        value={value}
        placeholder={placeholder}
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          blurTimer.current = window.setTimeout(() => setOpen(false), 120);
        }}
        onKeyDown={(e) => {
          if (!show) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (i + 1) % matches.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (i - 1 + matches.length) % matches.length);
          } else if (e.key === "Enter") {
            const it = matches[active];
            if (it) {
              e.preventDefault();
              pick(it);
            }
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />

      {show && (
        <ul
          id={listId}
          role="listbox"
          className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-y-auto rounded-2xl bg-popover p-1.5 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] ring-1 ring-border"
          onMouseDown={(e) => e.preventDefault()}
        >
          <li className="px-2.5 pt-1 pb-1.5 text-[11px] font-semibold text-muted-foreground">
            <History className="mr-1 inline h-3.5 w-3.5 align-[-2px]" />
            เคยลงไว้แล้ว — เลือกเพื่อใช้ชื่อเดียวกัน
          </li>
          {matches.map((it, i) => (
            <li
              key={it.key}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(it)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2",
                i === active && "bg-primary/[0.08]",
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{it.text}</p>
                {it.detail && <p className="truncate text-[11px] text-muted-foreground">{it.detail}</p>}
              </div>
              {it.text === value.trim() && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </li>
          ))}
        </ul>
      )}

      {similar && !show && (
        <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">
          มีชื่อที่ลงไว้แล้วสะกดว่า “{similar}” —{" "}
          <button
            type="button"
            className="font-semibold text-primary underline underline-offset-2"
            onClick={() => onChange(similar)}
          >
            ใช้ชื่อนี้
          </button>{" "}
          เพื่อให้ราคากลางรวมเป็นรุ่นเดียวกัน
        </p>
      )}
      {!similar && !show && emptyHint}
    </div>
  );
}
