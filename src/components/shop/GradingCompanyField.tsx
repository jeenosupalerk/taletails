import { useState } from "react";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** บริษัทเกรดที่เลือกได้ — SQC (บริษัทเกรดของไทย) อยู่บนสุดเพราะเป็นเกรดหลักของร้าน */
export const GRADING_COMPANIES = [
  { value: "SQC", label: "SQC (เกรดไทย)" },
  { value: "PSA", label: "PSA" },
  { value: "BGS", label: "BGS / Beckett" },
  { value: "CGC", label: "CGC" },
  { value: "SGC", label: "SGC" },
  { value: "ACE", label: "ACE" },
  { value: "TAG", label: "TAG" },
] as const;

const RAW = "__raw";
const OTHER = "__other";

/**
 * เลือกบริษัทเกรดแบบกดเลือก (กันพิมพ์ผิด เช่น กรอก "01" ลงช่องบริษัท)
 * - ไม่เกรด / Raw → เก็บเป็นค่าว่าง
 * - อื่นๆ → พิมพ์ชื่อบริษัทเองได้
 */
export function GradingCompanyField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const upper = value.trim().toUpperCase();
  const known = GRADING_COMPANIES.some((c) => c.value === upper);
  const [otherMode, setOtherMode] = useState(() => Boolean(upper) && !known);
  const selectValue = otherMode ? OTHER : known ? upper : RAW;

  return (
    <div className="space-y-2">
      <Select
        value={selectValue}
        onValueChange={(v) => {
          if (v === OTHER) {
            setOtherMode(true);
            onChange("");
          } else {
            setOtherMode(false);
            onChange(v === RAW ? "" : v);
          }
        }}
      >
        <SelectTrigger className="min-h-11 rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {GRADING_COMPANIES.map((c) => (
            <SelectItem key={c.value} value={c.value}>
              {c.label}
            </SelectItem>
          ))}
          <SelectSeparator />
          <SelectItem value={OTHER}>อื่นๆ (พิมพ์เอง)</SelectItem>
          <SelectItem value={RAW}>ไม่เกรด / Raw</SelectItem>
        </SelectContent>
      </Select>
      {otherMode && (
        <Input
          autoFocus
          className="min-h-11 rounded-xl"
          placeholder="ชื่อบริษัทเกรด"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
        />
      )}
    </div>
  );
}
