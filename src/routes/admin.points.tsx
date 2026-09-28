import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Pencil, Plus, RefreshCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoLoader } from "@/components/ui/logo-loader";
import { Switch } from "@/components/ui/switch";
import {
  useConvertTtPoints,
  useSaveTtReward,
  useSaveTtSettings,
  useSetRedemptionStatus,
  useTtAdminRedemptions,
  useTtAdminRewards,
  useTtAdminSettings,
  useTtConversionPreview,
  type TtAdminReward,
  type TtAdminSettings,
  type TtRewardInput,
} from "@/hooks/usePoints";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/points")({
  component: AdminPointsPage,
});

const CARD = "space-y-4 rounded-3xl bg-card p-5 ring-1 ring-border sm:p-6";
const FIELD = "min-h-11 rounded-xl";

/** ISO → ค่าให้ input datetime-local (เวลาเครื่อง) */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);

/** ต้นทุนของรางวัลคิดเป็นกี่ % ของยอดซื้อที่ลูกค้าต้องใช้เพื่อได้แต้มเท่านั้น */
function costPct(reward: Pick<TtAdminReward, "points_cost" | "unit_cost">, bahtPerPoint: number) {
  if (reward.unit_cost === null || reward.points_cost <= 0 || bahtPerPoint <= 0) return null;
  return (reward.unit_cost / (reward.points_cost * bahtPerPoint)) * 100;
}

function AdminPointsPage() {
  const settingsQuery = useTtAdminSettings();
  if (settingsQuery.isLoading || !settingsQuery.data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LogoLoader size={64} />
      </div>
    );
  }
  return <PointsAdmin initial={settingsQuery.data} />;
}

function PointsAdmin({ initial }: { initial: TtAdminSettings }) {
  const save = useSaveTtSettings();
  const [s, setS] = useState(initial);
  useEffect(() => setS(initial), [initial]);
  const set = <K extends keyof TtAdminSettings>(k: K, v: TtAdminSettings[K]) => setS((p) => ({ ...p, [k]: v }));
  const costPerPoint = (s.baht_per_point * s.target_cost_pct) / 100;
  const v2 = Boolean(s.conversion_done_at);

  const onSave = () => {
    const { conversion_done_at: _skip, ...patch } = s;
    save.mutate(patch, {
      onSuccess: () => toast.success("บันทึกการตั้งค่า TT แล้ว"),
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold">TT Points</h1>
          <p className="text-sm text-muted-foreground">
            ตั้งค่าการได้แต้ม โปรโมชั่น และของรางวัล · ตัวเลขต้นทุนในหน้านี้เห็นเฉพาะแอดมิน
          </p>
        </div>
        <Button onClick={onSave} disabled={save.isPending} className="min-h-11 rounded-xl px-5 font-semibold">
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          บันทึกการตั้งค่า
        </Button>
      </div>

      {!v2 && (
        <p className="rounded-2xl bg-secondary p-4 text-sm">
          <b className="font-semibold">ระบบใหม่ยังไม่เปิด</b> ลูกค้ายังใช้กติกาเดิม (25 บาท = 1 TT, 1 TT = 0.50 บาท)
          ตั้งค่าและใส่ของรางวัลเตรียมไว้ได้เลย แล้วกด "แปลงแต้ม" ด้านล่างเมื่อพร้อม
        </p>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={CARD}>
          <h2 className="font-display text-lg font-bold">การได้แต้ม</h2>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            ทุกยอดซื้อ
            <Input
              type="number"
              min={1}
              value={s.baht_per_point}
              onChange={(e) => set("baht_per_point", Number(e.target.value))}
              className={cn(FIELD, "w-24 text-center font-semibold")}
            />
            บาท = 1 TT
          </label>
          <fieldset className="space-y-2 text-sm">
            <legend className="mb-1 font-semibold">ให้แต้มเมื่อ</legend>
            {(
              [
                ["paid", "ชำระเงินแล้ว"],
                ["completed", "ลูกค้าได้รับของแล้ว (แนะนำ กันยกเลิกหลังได้แต้ม)"],
              ] as const
            ).map(([v, label]) => (
              <label key={v} className="flex min-h-11 items-center gap-2">
                <input
                  type="radio"
                  name="earn_on"
                  checked={s.earn_on === v}
                  onChange={() => set("earn_on", v)}
                  className="h-4 w-4 accent-primary"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            แต้มหมดอายุหลังได้รับ
            <Input
              type="number"
              min={1}
              value={s.expiry_months}
              onChange={(e) => set("expiry_months", Number(e.target.value))}
              className={cn(FIELD, "w-20 text-center font-semibold")}
            />
            เดือน
          </label>
          <p className="rounded-xl bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
            คิดจากยอดที่ลูกค้าจ่ายจริง (หลังหักส่วนลดและแต้ม) · เศษปัดทิ้ง · การตัดแต้มหมดอายุจะเปิดใช้ในเฟสถัดไป
          </p>
        </section>

        <section className={CARD}>
          <h2 className="font-display text-lg font-bold">ต้นทุนเป้าหมาย (ภายใน)</h2>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            ต้นทุน Reward ไม่เกิน
            <Input
              type="number"
              step="0.1"
              min={0.1}
              value={s.target_cost_pct}
              onChange={(e) => set("target_cost_pct", Number(e.target.value))}
              className={cn(FIELD, "w-24 text-center font-semibold")}
            />
            % ของยอดซื้อ
          </label>
          <div className="flex items-baseline gap-2 rounded-2xl bg-secondary p-4">
            <span className="text-sm">จึงคิดว่า 1 TT มีต้นทุน</span>
            <span className="font-display text-2xl font-bold text-primary">
              {costPerPoint.toLocaleString("th-TH", { maximumFractionDigits: 2 })} บาท
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            ใช้ตรวจว่าของรางวัลแต่ละชิ้นคุ้มไหม ลูกค้าไม่เห็นตัวเลขนี้
          </p>
        </section>

        <section className={CARD}>
          <h2 className="font-display text-lg font-bold">โปรโมชั่นตัวคูณแต้ม</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="promo_name">ชื่อโปร</Label>
              <Input
                id="promo_name"
                value={s.promo_name ?? ""}
                placeholder="เช่น Double TT"
                onChange={(e) => set("promo_name", e.target.value || null)}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo_mult">ตัวคูณ (1 = ปิดโปร)</Label>
              <Input
                id="promo_mult"
                type="number"
                min={1}
                max={10}
                step="0.5"
                value={s.promo_multiplier}
                onChange={(e) => set("promo_multiplier", Number(e.target.value))}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo_start">เริ่ม</Label>
              <Input
                id="promo_start"
                type="datetime-local"
                value={toLocalInput(s.promo_starts_at)}
                onChange={(e) => set("promo_starts_at", fromLocalInput(e.target.value))}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="promo_end">จบ</Label>
              <Input
                id="promo_end"
                type="datetime-local"
                value={toLocalInput(s.promo_ends_at)}
                onChange={(e) => set("promo_ends_at", fromLocalInput(e.target.value))}
                className={FIELD}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            หมดเวลาแล้วกลับเป็นอัตราปกติเอง · ช่วงโปร ต้นทุนจริงเป็น {(s.target_cost_pct * s.promo_multiplier).toFixed(1)}%
          </p>
        </section>

        <section className={cn(CARD, "ring-primary/40")}>
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">ช่วงเปลี่ยนผ่าน: ใช้ TT ลดราคาตอนจ่าย</h2>
            <Switch
              aria-label="เปิดใช้ TT ลดราคา"
              checked={s.cash_redeem_enabled}
              onCheckedChange={(v) => set("cash_redeem_enabled", v)}
            />
          </div>
          <label className="flex flex-wrap items-center gap-2 text-sm">
            1 TT =
            <Input
              type="number"
              step="0.01"
              min={0}
              value={s.cash_value_per_point}
              onChange={(e) => set("cash_value_per_point", Number(e.target.value))}
              className={cn(FIELD, "w-24 text-center font-semibold")}
            />
            บาท · ใช้ได้ไม่เกิน
            <Input
              type="number"
              min={0}
              max={100}
              value={s.cash_max_pct}
              onChange={(e) => set("cash_max_pct", Number(e.target.value))}
              className={cn(FIELD, "w-20 text-center font-semibold")}
            />
            % ของยอด
          </label>
          <div className="space-y-1.5">
            <Label htmlFor="cash_until">ปิดอัตโนมัติวันที่</Label>
            <Input
              id="cash_until"
              type="datetime-local"
              value={toLocalInput(s.cash_redeem_until)}
              onChange={(e) => set("cash_redeem_until", fromLocalInput(e.target.value))}
              className={cn(FIELD, "max-w-xs")}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            ค่านี้มีผลหลังแปลงแต้มแล้ว · ลูกค้าเห็นวันปิดในหน้าแต้มของฉันและหน้าชำระเงิน
          </p>
        </section>
      </div>

      <RewardsSection bahtPerPoint={s.baht_per_point} targetPct={s.target_cost_pct} />
      <RedemptionsSection />
      <ConversionSection done={s.conversion_done_at} />
    </div>
  );
}

const EMPTY_REWARD: TtRewardInput = {
  name: "",
  description: null,
  image_url: null,
  points_cost: 300,
  unit_cost: null,
  fulfillment: "with_next_order",
  stock: null,
  is_active: false,
  sort_order: 0,
};

function RewardsSection({ bahtPerPoint, targetPct }: { bahtPerPoint: number; targetPct: number }) {
  const rewards = useTtAdminRewards();
  const saveReward = useSaveTtReward();
  const [form, setForm] = useState<TtRewardInput | null>(null);
  const formPct = form ? costPct({ points_cost: form.points_cost, unit_cost: form.unit_cost }, bahtPerPoint) : null;
  // จำนวน TT ที่ทำให้ต้นทุนพอดีเป้า
  const suggested =
    form?.unit_cost && bahtPerPoint > 0 ? Math.ceil((form.unit_cost * 100) / (targetPct * bahtPerPoint)) : null;

  const submit = () => {
    if (!form) return;
    if (!form.name.trim()) {
      toast.error("กรุณาใส่ชื่อของรางวัล");
      return;
    }
    saveReward.mutate(form, {
      onSuccess: () => {
        toast.success("บันทึกของรางวัลแล้ว");
        setForm(null);
      },
      onError: (e) => toast.error(e.message),
    });
  };

  return (
    <section className={CARD}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">ของรางวัล</h2>
        {!form && (
          <Button variant="outline" onClick={() => setForm(EMPTY_REWARD)} className="min-h-11 rounded-xl">
            <Plus className="h-4 w-4" /> เพิ่มของรางวัล
          </Button>
        )}
      </div>

      {form && (
        <div className="space-y-3 rounded-2xl bg-secondary/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold">{form.id ? "แก้ไขของรางวัล" : "ของรางวัลใหม่"}</p>
            <button type="button" aria-label="ปิด" onClick={() => setForm(null)} className="grid h-11 w-11 place-items-center">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rw_name">ชื่อของรางวัล</Label>
              <Input id="rw_name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={FIELD} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rw_pts">ใช้กี่ TT</Label>
              <Input
                id="rw_pts"
                type="number"
                min={1}
                value={form.points_cost}
                onChange={(e) => setForm({ ...form, points_cost: Number(e.target.value) })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rw_cost">ต้นทุนจริงของร้าน (บาท)</Label>
              <Input
                id="rw_cost"
                type="number"
                min={0}
                value={form.unit_cost ?? ""}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value === "" ? null : Number(e.target.value) })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rw_how">วิธีรับ</Label>
              <select
                id="rw_how"
                value={form.fulfillment}
                onChange={(e) => setForm({ ...form, fulfillment: e.target.value as TtRewardInput["fulfillment"] })}
                className="min-h-11 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="with_next_order">แนบกับคำสั่งซื้อถัดไป</option>
                <option value="free_shipping_coupon">คูปองส่งฟรี</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rw_stock">สต็อก (เว้นว่าง = ไม่จำกัด)</Label>
              <Input
                id="rw_stock"
                type="number"
                min={0}
                value={form.stock ?? ""}
                onChange={(e) => setForm({ ...form, stock: e.target.value === "" ? null : Number(e.target.value) })}
                className={FIELD}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="rw_img">ลิงก์รูป (ไม่ใส่ก็ได้)</Label>
              <Input
                id="rw_img"
                value={form.image_url ?? ""}
                onChange={(e) => setForm({ ...form, image_url: e.target.value || null })}
                className={FIELD}
              />
            </div>
          </div>
          {formPct !== null && (
            <p className={cn("text-sm", formPct > targetPct ? "text-destructive" : "text-muted-foreground")}>
              ต้นทุนคิดเป็น <b>{formPct.toFixed(2)}%</b> ของยอดซื้อ
              {formPct > targetPct && suggested ? ` · เกินเป้า ${targetPct}% ควรตั้งอย่างน้อย ${suggested} TT` : ""}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              เปิดให้ลูกค้าแลก
            </label>
            <Button onClick={submit} disabled={saveReward.isPending} className="min-h-11 rounded-xl px-5 font-semibold">
              {saveReward.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              บันทึกของรางวัล
            </Button>
          </div>
        </div>
      )}

      {rewards.isLoading ? (
        <div className="flex h-24 items-center justify-center">
          <LogoLoader size={48} />
        </div>
      ) : (rewards.data ?? []).length === 0 ? (
        <p className="text-sm text-muted-foreground">ยังไม่มีของรางวัล</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground">
                <th className="py-2 pr-3 font-semibold">ของรางวัล</th>
                <th className="py-2 pr-3 font-semibold">วิธีรับ</th>
                <th className="py-2 pr-3 font-semibold">ใช้ TT</th>
                <th className="py-2 pr-3 font-semibold">ต้นทุนจริง</th>
                <th className="py-2 pr-3 font-semibold">ต้นทุน / ยอดซื้อ</th>
                <th className="py-2 pr-3 font-semibold">สต็อก</th>
                <th className="py-2 pr-3 font-semibold">สถานะ</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {(rewards.data ?? []).map((r) => {
                const pct = costPct(r, bahtPerPoint);
                return (
                  <tr key={r.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3 pr-3 font-semibold">{r.name}</td>
                    <td className="py-3 pr-3">{r.fulfillment === "free_shipping_coupon" ? "คูปองส่งฟรี" : "แนบกับคำสั่งซื้อถัดไป"}</td>
                    <td className="py-3 pr-3 font-semibold tabular-nums">{r.points_cost.toLocaleString("th-TH")}</td>
                    <td className="py-3 pr-3 tabular-nums">{r.unit_cost === null ? "-" : `${r.unit_cost} บาท`}</td>
                    <td className="py-3 pr-3">
                      {pct === null ? (
                        <span className="text-muted-foreground">ใส่ต้นทุนก่อน</span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 text-xs font-bold",
                            pct > targetPct ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success",
                          )}
                        >
                          {pct.toFixed(2)}%{pct > targetPct ? " เกินเป้า" : ""}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{r.stock ?? "ไม่จำกัด"}</td>
                    <td className="py-3 pr-3">{r.is_active ? "เปิด" : "ปิด"}</td>
                    <td className="py-3 text-right">
                      <Button
                        variant="ghost"
                        aria-label={`แก้ไข ${r.name}`}
                        onClick={() => setForm({ ...r })}
                        className="min-h-11 min-w-11 rounded-xl"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function RedemptionsSection() {
  const list = useTtAdminRedemptions();
  const setStatus = useSetRedemptionStatus();
  const rows = list.data ?? [];
  if (!list.isLoading && rows.length === 0) return null;

  const update = (id: string, status: "attached" | "fulfilled") =>
    setStatus.mutate(
      { id, status },
      { onSuccess: () => toast.success(status === "attached" ? "ทำเครื่องหมายว่าแนบแล้ว" : "ส่งแล้ว"), onError: (e) => toast.error(e.message) },
    );

  return (
    <section className={CARD}>
      <h2 className="font-display text-lg font-bold">ของรางวัลที่รอส่ง</h2>
      <p className="text-sm text-muted-foreground">แพ็กไปพร้อมคำสั่งซื้อถัดไปของลูกค้าคนนั้น แล้วกดสถานะตามขั้น</p>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.reward_name}</p>
              <p className="text-xs text-muted-foreground">
                {r.users?.username ?? r.users?.email ?? "สมาชิก"} · แลกเมื่อ{" "}
                {new Date(r.created_at).toLocaleDateString("th-TH", { dateStyle: "medium" })} ·{" "}
                {r.status === "attached" ? "แนบแล้ว รอส่ง" : "รอแนบ"}
              </p>
            </div>
            {r.status === "pending" ? (
              <Button variant="outline" onClick={() => update(r.id, "attached")} className="min-h-11 rounded-xl">
                แนบกับคำสั่งซื้อแล้ว
              </Button>
            ) : (
              <Button onClick={() => update(r.id, "fulfilled")} className="min-h-11 rounded-xl">
                ส่งแล้ว
              </Button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ConversionSection({ done }: { done: string | null }) {
  const preview = useTtConversionPreview(!done);
  const convert = useConvertTtPoints();
  const p = preview.data;

  return (
    <section className={cn(CARD, "flex flex-wrap items-center gap-4")}>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-lg font-bold">แปลงแต้มเดิมเป็นระบบใหม่ (ทำครั้งเดียว)</h2>
        {done ? (
          <p className="mt-1 text-sm text-muted-foreground">
            แปลงแล้วเมื่อ {new Date(done).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" })} · ระบบใหม่ใช้งานอยู่
          </p>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">
            แต้มเดิม 1 TT (ลด 0.50 บาท) → แต้มใหม่ 5 TT มูลค่าเท่าเดิม ·{" "}
            {p
              ? `สมาชิก ${p.members.toLocaleString("th-TH")} คน แต้มรวม ${p.points.toLocaleString("th-TH")} TT → ${(p.points * 5).toLocaleString("th-TH")} TT`
              : "กำลังนับยอด…"}{" "}
            · ส่งแจ้งเตือนบอกสมาชิกอัตโนมัติ · กติกาใหม่เริ่มทันทีหลังกด
          </p>
        )}
      </div>
      {!done && (
        <ConfirmDialog
          title="ยืนยันแปลงแต้มเข้าระบบใหม่"
          description={
            p
              ? `แต้มของสมาชิก ${p.members} คน จะถูกคูณ 5 (รวม ${(p.points * 5).toLocaleString("th-TH")} TT) และกติกาใหม่จะเริ่มทันที · ทำซ้ำหรือย้อนกลับจากหน้านี้ไม่ได้`
              : "กติกาใหม่จะเริ่มทันที · ทำซ้ำหรือย้อนกลับจากหน้านี้ไม่ได้"
          }
          confirmLabel="แปลงแต้ม"
          disabled={convert.isPending}
          onConfirm={() =>
            convert.mutate(undefined, {
              onSuccess: (n) => toast.success(`แปลงแต้มแล้ว ${n} บัญชี ระบบใหม่เริ่มทำงาน`),
              onError: (e) => toast.error(e.message),
            })
          }
          trigger={
            <Button className="min-h-11 rounded-xl bg-foreground px-5 font-semibold text-background hover:bg-foreground hover:brightness-110">
              {convert.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
              แปลงแต้ม
            </Button>
          }
        />
      )}
    </section>
  );
}
