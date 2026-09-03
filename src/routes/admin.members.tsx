import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, Loader2, ShieldBan, ShieldCheck, Store, UserCog } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  useAdminMembers,
  useMemberBids,
  useSellerRoleMap,
  useToggleBan,
  useToggleRole,
  type ManagedRole,
} from "@/hooks/useAdmin";
import { thb } from "@/lib/cart";

export const Route = createFileRoute("/admin/members")({
  component: AdminMembersPage,
});

function AdminMembersPage() {
  const members = useAdminMembers();
  const ban = useToggleBan();
  const roles = useSellerRoleMap();
  const toggleRole = useToggleRole();
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const bids = useMemberBids(openId ?? undefined);

  const setRole = (userId: string, role: ManagedRole, granted: boolean, label: string) =>
    toggleRole.mutate(
      { userId, role, granted },
      {
        onSuccess: () => toast.success(granted ? `ให้สิทธิ์${label}แล้ว` : `ยกเลิกสิทธิ์${label}แล้ว`),
        onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
      },
    );

  const rows = (members.data ?? []).filter((m) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (m.username ?? "").toLowerCase().includes(t) || m.email.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-lg font-semibold">สมาชิก</h2>
        <Input
          placeholder="ค้นหาชื่อหรืออีเมล"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="h-11 w-full rounded-xl sm:w-64"
        />
      </div>

      {members.isLoading ? (
        <div className="grid place-items-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
          ไม่พบสมาชิก
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-2xl border border-border bg-card p-3.5 transition-colors hover:border-primary/30 sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-sm font-semibold">
                    {m.username ?? "ไม่ระบุชื่อ"}
                    {m.is_banned && (
                      <span className="ml-2 rounded-full bg-destructive/15 px-2 py-0.5 text-[11px] font-semibold text-destructive">
                        ถูกระงับ
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.email}</p>
                  {(roles.data?.[m.id]?.seller || roles.data?.[m.id]?.admin) && (
                    <p className="mt-0.5 flex gap-1.5 text-[11px] font-semibold">
                      {roles.data?.[m.id]?.admin && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-primary">
                          แอดมิน
                        </span>
                      )}
                      {roles.data?.[m.id]?.seller && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                          ร้านค้า
                        </span>
                      )}
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    สมัคร {new Date(m.created_at).toLocaleDateString("th-TH")}
                    {m.phone ? ` • ${m.phone}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
                <Button
                  variant="secondary"
                  className="h-10 w-full justify-center rounded-xl px-3 text-xs sm:w-auto"
                  onClick={() => setOpenId((id) => (id === m.id ? null : m.id))}
                >
                  ประวัติการบิด
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${openId === m.id ? "rotate-180" : ""}`}
                  />
                </Button>

                <ConfirmDialog
                  title={roles.data?.[m.id]?.seller ? "ยกเลิกสิทธิ์ร้านค้า" : "อนุญาตให้เปิดร้าน"}
                  description={`ยืนยันการเปลี่ยนสิทธิ์ร้านค้าของ ${m.full_name ?? m.email ?? "สมาชิกนี้"} หรือไม่?`}
                  confirmLabel="ยืนยัน"
                  tone={roles.data?.[m.id]?.seller ? "destructive" : "default"}
                  disabled={toggleRole.isPending}
                  onConfirm={() =>
                    setRole(m.id, "seller", !roles.data?.[m.id]?.seller, "ร้านค้า")
                  }
                  trigger={
                    <Button
                      variant={roles.data?.[m.id]?.seller ? "ghost" : "secondary"}
                      className="h-10 w-full justify-center rounded-xl px-3 text-xs sm:w-auto"
                      disabled={toggleRole.isPending}
                    >
                      <Store className="h-3.5 w-3.5" />
                      {roles.data?.[m.id]?.seller ? "ยกเลิกสิทธิ์ร้านค้า" : "อนุญาตเปิดร้าน"}
                    </Button>
                  }
                />

                <ConfirmDialog
                  title={roles.data?.[m.id]?.admin ? "ยกเลิกสิทธิ์แอดมิน" : "ตั้งเป็นแอดมิน"}
                  description={`สิทธิ์แอดมินเข้าถึงข้อมูลทั้งระบบได้ ยืนยันเปลี่ยนสิทธิ์ของ ${m.full_name ?? m.email ?? "สมาชิกนี้"} หรือไม่?`}
                  confirmLabel="ยืนยัน"
                  tone={roles.data?.[m.id]?.admin ? "destructive" : "default"}
                  disabled={toggleRole.isPending}
                  onConfirm={() => setRole(m.id, "admin", !roles.data?.[m.id]?.admin, "แอดมิน")}
                  trigger={
                    <Button
                      variant={roles.data?.[m.id]?.admin ? "ghost" : "secondary"}
                      className="h-10 w-full justify-center rounded-xl px-3 text-xs sm:w-auto"
                      disabled={toggleRole.isPending}
                    >
                      <UserCog className="h-3.5 w-3.5" />
                      {roles.data?.[m.id]?.admin ? "ยกเลิกสิทธิ์แอดมิน" : "ตั้งเป็นแอดมิน"}
                    </Button>
                  }
                />

                <Button
                  variant={m.is_banned ? "secondary" : "ghost"}
                  className={`h-10 w-full justify-center rounded-xl px-3 text-xs sm:w-auto ${m.is_banned ? "" : "text-destructive"}`}
                  onClick={() =>
                    ban.mutate(
                      { userId: m.id, banned: !m.is_banned },
                      {
                        onSuccess: () =>
                          toast.success(m.is_banned ? "ปลดระงับบัญชีแล้ว" : "ระงับบัญชีแล้ว"),
                        onError: (e) =>
                          toast.error(e instanceof Error ? e.message : "ไม่สำเร็จ"),
                      },
                    )
                  }
                >
                  {m.is_banned ? (
                    <>
                      <ShieldCheck className="h-3.5 w-3.5" />
                      ปลดระงับ
                    </>
                  ) : (
                    <>
                      <ShieldBan className="h-3.5 w-3.5" />
                      ระงับบัญชี
                    </>
                  )}
                </Button>
                </div>
              </div>

              {openId === m.id && (
                <div className="mt-3 border-t border-dashed border-border pt-3">
                  {bids.isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (bids.data ?? []).length === 0 ? (
                    <p className="text-xs text-muted-foreground">ยังไม่มีประวัติการบิด</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(bids.data ?? []).map((b) => (
                        <li key={b.id} className="flex items-center justify-between text-xs">
                          <span className="truncate text-muted-foreground">
                            {b.auctions?.cards?.name ?? "การ์ด"} •{" "}
                            {new Date(b.created_at).toLocaleString("th-TH")}
                          </span>
                          <span className="font-display font-semibold">{thb.format(b.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
