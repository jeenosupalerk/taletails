import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlarmClock, ShieldAlert, Trophy } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { PaymentCountdown } from "@/components/site/PaymentCountdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuctionBanStatus, useAuctionWins, useWinsRealtime } from "@/hooks/useAuctionWins";
import { useAuthUserId } from "@/hooks/useCardDetail";
import { supabase } from "@/integrations/supabase/client";
import { thb } from "@/lib/cart";
import { flushPendingPush } from "@/lib/push.functions";

const winsSeenKey = (userId: string) => `taletails-wins-reminder-${userId}`;
const banSeenKey = (userId: string) => `taletails-ban-notice-${userId}`;

/**
 * ทำงานเบื้องหลังทุกหน้า:
 *  - เปิดป๊อบอัพเตือนให้ไปชำระเงินสำหรับของที่ประมูลชนะ (ครั้งแรกที่เข้าเว็บในแต่ละรอบการใช้งาน)
 *  - เปิดป๊อบอัพแจ้งเมื่อบัญชีถูกห้ามประมูล
 *  - ผลักการแจ้งเตือนที่ค้างอยู่ออกเป็น Push ทันที (เช่น แจ้งว่าชนะประมูล)
 */
export function AuctionWinWatcher() {
  const userId = useAuthUserId();
  const navigate = useNavigate();
  const wins = useAuctionWins();
  const ban = useAuctionBanStatus();
  const flushPush = useServerFn(flushPendingPush);
  useWinsRealtime(userId);

  const [openWins, setOpenWins] = useState(false);
  const [openBan, setOpenBan] = useState(false);

  const pending = useMemo(
    () =>
      (wins.data ?? []).filter(
        (o) => o.status === "pending" && new Date(o.payment_due_at).getTime() > Date.now(),
      ),
    [wins.data],
  );

  // ส่งการแจ้งเตือนที่ค้างอยู่ (ชนะประมูล / ถูกแซง / บทลงโทษ) ออกเป็น Push
  useEffect(() => {
    if (!userId) return;
    void flushPush({}).catch(() => undefined);
  }, [userId, pending.length, flushPush]);

  // ปิดรอบที่หมดเวลาและยกเลิกรายการที่เลยกำหนดชำระ (สำรองกรณีไม่มีตัวตั้งเวลา)
  useEffect(() => {
    if (!userId) return;
    const sweep = () => {
      void runProcessAuctions({})
        .then((res) => {
          if (res && (res.auctionsClosed > 0 || res.ordersExpired > 0)) {
            void wins.refetch();
          }
        })
        .catch(() => undefined);
    };
    sweep();
    const id = window.setInterval(sweep, 60_000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, runProcessAuctions]);


  // ป๊อบอัพเตือนชำระเงินครั้งแรกที่เข้าเว็บ
  useEffect(() => {
    if (!userId || pending.length === 0) return;
    const signature = pending
      .map((o) => o.id)
      .sort()
      .join(",");
    try {
      if (window.sessionStorage.getItem(winsSeenKey(userId)) === signature) return;
      window.sessionStorage.setItem(winsSeenKey(userId), signature);
    } catch {
      /* sessionStorage ไม่พร้อมใช้งาน */
    }
    setOpenWins(true);
  }, [userId, pending]);

  // ป๊อบอัพแจ้งเมื่อถูกห้ามประมูล
  useEffect(() => {
    const status = ban.data;
    if (!userId || !status?.isBanned) return;
    const signature = status.isPermanent ? "permanent" : (status.bannedUntil ?? "banned");
    try {
      if (window.localStorage.getItem(banSeenKey(userId)) === signature) return;
      window.localStorage.setItem(banSeenKey(userId), signature);
    } catch {
      /* localStorage ไม่พร้อมใช้งาน */
    }
    setOpenBan(true);
  }, [userId, ban.data]);

  const first = pending[0];

  return (
    <>
      <Dialog open={openWins && !!first} onOpenChange={setOpenWins}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Trophy className="h-6 w-6" />
            </span>
            <DialogTitle className="text-center font-display text-base">
              คุณชนะการประมูล {pending.length} รายการ
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              กรุณาชำระเงินภายในเวลาที่กำหนด (15 นาที) หากเลยเวลา สิทธิ์จะถูกยกให้ผู้เสนอราคาอันดับถัดไป
              และบัญชีของคุณจะได้รับบทลงโทษ
            </DialogDescription>
          </DialogHeader>

          {first && (
            <div className="rounded-2xl border border-border bg-muted/40 p-3">
              <p className="truncate font-display text-sm font-semibold">
                {first.cards?.name ?? "การ์ดที่ชนะประมูล"}
              </p>
              <div className="mt-1.5 flex items-center justify-between gap-2">
                <span className="font-display text-sm font-bold text-primary">
                  {thb.format(Number(first.total_amount))}
                </span>
                <PaymentCountdown dueAt={first.payment_due_at} />
              </div>
              <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <AlarmClock className="h-3.5 w-3.5" />
                เวลาที่เหลือของแต่ละรายการดูได้ในหน้า "ของที่ประมูลชนะ"
              </p>
            </div>
          )}

          <DialogFooter className="gap-2 sm:flex-col">
            <Button
              className="h-11 w-full rounded-xl text-sm font-semibold"
              onClick={() => {
                setOpenWins(false);
                if (first) void navigate({ to: "/checkout/$id", params: { id: first.id } });
              }}
            >
              ไปชำระเงินเลย
            </Button>
            <Button
              variant="secondary"
              className="h-11 w-full rounded-xl text-sm"
              onClick={() => {
                setOpenWins(false);
                void navigate({ to: "/wins" });
              }}
            >
              ดูรายการทั้งหมด
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={openBan} onOpenChange={setOpenBan}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <DialogTitle className="text-center font-display text-base">
              {ban.data?.isPermanent ? "ถูกห้ามประมูลถาวร" : "ถูกห้ามประมูลชั่วคราว"}
            </DialogTitle>
            <DialogDescription className="text-center text-sm">
              {ban.data?.isPermanent
                ? "เนื่องจากผิดนัดชำระเงินหลายครั้ง บัญชีของคุณถูกห้ามเข้าร่วมการประมูลอย่างถาวร กรุณาติดต่อทีมงานหากต้องการอุทธรณ์"
                : `เนื่องจากไม่ชำระเงินตามเวลาที่กำหนด คุณจะกลับมาประมูลได้อีกครั้ง ${
                    ban.data?.bannedUntil
                      ? new Date(ban.data.bannedUntil).toLocaleString("th-TH")
                      : "เมื่อครบกำหนด"
                  }`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              className="h-11 w-full rounded-xl text-sm font-semibold"
              onClick={() => setOpenBan(false)}
            >
              รับทราบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
