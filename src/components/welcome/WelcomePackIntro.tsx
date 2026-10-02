import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, Coins, Crown, Gavel, Sparkles, Store, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

import { useClaimWelcomePack, useWelcomePackStatus } from "@/hooks/useWelcomePack";
import { useAuth } from "@/lib/auth";

import "./welcome-pack.css";

interface PackCard {
  title: string;
  type: string;
  icon: LucideIcon;
  gems: number;
  r1: string;
  r2: string;
  text: string;
  holo?: boolean;
  gift?: boolean;
}

const INFO_CARDS: PackCard[] = [
  {
    title: "ประมูลสด",
    type: "Auction",
    icon: Gavel,
    gems: 1,
    r1: "#ff9a4d",
    r2: "#b8320a",
    text: "เสนอราคาแข่งกันแบบเรียลไทม์ ติดตามสถานะได้ที่ การประมูลของฉัน",
  },
  {
    title: "ตลาดซื้อขาย",
    type: "Marketplace",
    icon: Store,
    gems: 1,
    r1: "#5cc8ff",
    r2: "#1e3a8a",
    text: "ซื้อการ์ดได้ทันทีในราคาที่ตั้งไว้ ขอดูรูปเพิ่มก่อนจัดส่งได้เสมอ",
  },
  {
    title: "ราคากลางเกรดไทย",
    type: "Market price",
    icon: BadgeCheck,
    gems: 2,
    r1: "#4fe0a6",
    r2: "#065f46",
    text: "ราคาจากการขายจริงล่าสุด แยกเกรดไทย SQC กับเกรดต่างประเทศ",
    holo: true,
  },
  {
    title: "แต้ม TT Points",
    type: "Rewards",
    icon: Coins,
    gems: 2,
    r1: "#ffd166",
    r2: "#9a4a07",
    text: "ได้แต้มทุกครั้งที่ซื้อ ใช้เป็นส่วนลดหรือแลกของรางวัล",
    holo: true,
  },
];

/** ระดับของใบของขวัญ ตามแต้มที่ฐานข้อมูลสุ่มได้ (50/100/200/500) */
function giftTier(points: number | null) {
  if (points === null) return { label: "Welcome Gift", gems: 1 };
  if (points >= 500) return { label: "Ultra Rare", gems: 4 };
  if (points >= 200) return { label: "Super Rare", gems: 3 };
  if (points >= 100) return { label: "Rare", gems: 2 };
  return { label: "Welcome Gift", gems: 1 };
}

const SPARKS: [number, number][] = [
  [14, 30],
  [82, 24],
  [22, 78],
  [76, 72],
  [50, 16],
];
const TOTAL = INFO_CARDS.length + 1;

/** สุ่มแบบเดียวกับฐานข้อมูล ใช้เฉพาะโหมดดูตัวอย่างบนเครื่อง */
function previewRoll() {
  const r = Math.random();
  return r < 0.6 ? 50 : r < 0.9 ? 100 : r < 0.99 ? 200 : 500;
}

/**
 * อินโทรเปิดซองการ์ด แสดงครั้งเดียวหลังสมัคร/ล็อกอินครั้งแรก
 * บนเครื่อง (dev) เปิดดูซ้ำได้ด้วย ?welcome=preview โดยไม่แจกแต้มจริง
 */
export function WelcomePackIntro() {
  const { user } = useAuth();
  const [preview, setPreview] = useState(false);
  const status = useWelcomePackStatus(preview ? null : (user?.id ?? null));
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  // อ่าน URL หลัง hydrate เพื่อไม่ให้หน้าที่ server ส่งมาไม่ตรงกับเครื่อง
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (new URLSearchParams(window.location.search).get("welcome") === "preview") {
      setPreview(true);
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (status.data && !status.data.claimed) setOpen(true);
  }, [status.data]);

  const close = useCallback(() => {
    setOpen(false);
    if (user) void queryClient.invalidateQueries({ queryKey: ["welcome-pack", user.id] });
  }, [queryClient, user]);

  if (!open) return null;
  return <WelcomePackStage name={user?.name ?? "สมาชิกใหม่"} preview={preview} onClose={close} />;
}

type Phase = "pack" | "dealing" | "cards" | "done";

function WelcomePackStage({
  name,
  preview,
  onClose,
}: {
  name: string;
  preview: boolean;
  onClose: () => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const topCardRef = useRef<HTMLDivElement | null>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  const [phase, setPhase] = useState<Phase>("pack");
  const [torn, setTorn] = useState(false);
  const [tear, setTear] = useState(0);
  const [idx, setIdx] = useState(0);
  const [flown, setFlown] = useState<Record<number, 1 | -1>>({});
  const [drag, setDrag] = useState<{ dx: number; dy: number } | null>(null);
  const [points, setPoints] = useState<number | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const claim = useClaimWelcomePack();
  const claimStarted = useRef(false);

  const reduce =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const memberSince = new Date().toLocaleDateString("th-TH", { month: "short", year: "numeric" });

  // ล็อกการเลื่อนหน้าเว็บด้านหลังระหว่างเปิดซอง
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const runClaim = useCallback(() => {
    setClaimError(null);
    if (preview) {
      window.setTimeout(() => setPoints(previewRoll()), 500);
      return;
    }
    claim.mutate(undefined, {
      onSuccess: (res) => setPoints(res.points),
      onError: (e) => setClaimError(e.message),
    });
  }, [claim, preview]);

  const startClaim = useCallback(() => {
    if (claimStarted.current) return;
    claimStarted.current = true;
    runClaim();
  }, [runClaim]);

  const openPack = useCallback(() => {
    if (phase !== "pack" || torn) return;
    setTorn(true);
    startClaim();
    try {
      navigator.vibrate?.(30);
    } catch {
      /* บางเครื่องไม่รองรับการสั่น */
    }
    window.setTimeout(
      () => {
        setPhase("dealing");
        // รอให้การ์ดวางนอกจอก่อน 1 เฟรม แล้วค่อยเลื่อนขึ้นมาเป็นปึก
        window.setTimeout(() => setPhase("cards"), 40);
      },
      reduce ? 0 : 600,
    );
  }, [phase, torn, startClaim, reduce]);

  const skip = useCallback(() => {
    startClaim();
    setTorn(true);
    setIdx(TOTAL);
    setPhase("done");
  }, [startClaim]);

  const finish = useCallback(() => {
    setClosing(true);
    window.setTimeout(onClose, reduce ? 0 : 300);
  }, [onClose, reduce]);

  // เอียงซอง/การ์ดตามนิ้ว: ตั้งตัวแปร CSS ตรงที่ stage ไม่ต้อง re-render
  const onStageMove = (e: React.PointerEvent) => {
    if (reduce || !stageRef.current) return;
    const x = e.clientX / window.innerWidth - 0.5;
    const y = e.clientY / window.innerHeight - 0.5;
    stageRef.current.style.setProperty("--tx", x.toFixed(3));
    stageRef.current.style.setProperty("--ty", y.toFixed(3));
  };

  // ---------- ฉีกซอง ----------
  const tearStart = useRef<number | null>(null);
  const onTearDown = (e: React.PointerEvent<HTMLDivElement>) => {
    tearStart.current = e.clientX;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onTearMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (tearStart.current === null) return;
    const width = e.currentTarget.getBoundingClientRect().width * 0.85;
    const p = Math.max(0, Math.min(1, (e.clientX - tearStart.current) / width));
    setTear(p);
    if (p > 0.7) {
      tearStart.current = null;
      openPack();
    }
  };
  const onTearUp = () => {
    tearStart.current = null;
    if (!torn) setTear(0);
  };

  // ---------- ปัดการ์ด ----------
  const dragStart = useRef({ x: 0, y: 0, t: 0 });
  const dismiss = useCallback(
    (dir: 1 | -1) => {
      setFlown((f) => ({ ...f, [idx]: dir }));
      setDrag(null);
      try {
        navigator.vibrate?.(12);
      } catch {
        /* ไม่รองรับ */
      }
      const next = idx + 1;
      setIdx(next);
      if (next >= TOTAL) window.setTimeout(() => setPhase("done"), reduce ? 0 : 420);
    },
    [idx, reduce],
  );
  const onCardDown = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    if (phase !== "cards" || i !== idx) return;
    dragStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setDrag({ dx: 0, dy: 0 });
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onCardMove = (e: React.PointerEvent<HTMLDivElement>, i: number) => {
    if (!drag || i !== idx) return;
    setDrag({
      dx: e.clientX - dragStart.current.x,
      dy: (e.clientY - dragStart.current.y) * 0.3,
    });
  };
  const onCardUp = (i: number) => {
    if (!drag || i !== idx) return;
    const tap = Math.abs(drag.dx) < 6 && Date.now() - dragStart.current.t < 400;
    if (tap || Math.abs(drag.dx) > 80) dismiss(drag.dx >= 0 ? 1 : -1);
    else setDrag(null);
  };

  // โฟกัสใบบนสุด/ปุ่มสรุป สำหรับคนใช้คีย์บอร์ด
  useEffect(() => {
    if (phase === "cards") topCardRef.current?.focus({ preventScroll: true });
    if (phase === "done") goRef.current?.focus({ preventScroll: true });
  }, [phase, idx]);

  const tier = giftTier(points);
  const cards: PackCard[] = [
    ...INFO_CARDS,
    {
      title: "ของขวัญต้อนรับ",
      type: tier.label,
      icon: Crown,
      gems: tier.gems,
      r1: "#ff8a3d",
      r2: "#7c2d92",
      text: `สมาชิกตั้งแต่ ${memberSince}`,
      holo: true,
      gift: true,
    },
  ];
  const top = cards[idx];
  const rarityLabel = top ? (top.gift ? tier.label : top.holo ? "Rare" : "Common") : "";

  const cardStyle = (c: PackCard, i: number): CSSProperties => {
    const base = { "--r1": c.r1, "--r2": c.r2 } as CSSProperties;
    const dir = flown[i];
    if (dir) {
      return {
        ...base,
        transform: `translate(${dir * 120}vw,-6vh) rotate(${dir * 22}deg)`,
        opacity: 0,
        pointerEvents: "none",
      };
    }
    const k = i - idx;
    if (phase === "dealing") {
      return { ...base, transform: "translateY(55vh) scale(.7)", zIndex: 100 - i };
    }
    if (k === 0) {
      return drag
        ? {
            ...base,
            zIndex: 100,
            transform: `translate(${drag.dx}px,${drag.dy}px) rotate(${drag.dx * 0.07}deg)`,
          }
        : { ...base, zIndex: 100 };
    }
    return {
      ...base,
      zIndex: 100 - k,
      opacity: k > 3 ? 0 : 1,
      filter: `brightness(${1 - k * 0.12})`,
      transform: `translateY(${k * -14}px) scale(${1 - k * 0.06})`,
    };
  };

  const inDeck = phase === "dealing" || phase === "cards";
  const hintText =
    phase === "pack"
      ? "ลากนิ้วตามเส้นประด้านบนเพื่อฉีกซอง"
      : idx === TOTAL - 1
        ? "ปัดการ์ดใบนี้เพื่อเก็บเข้าคอลเลกชัน"
        : "ปัดหรือแตะการ์ดเพื่อดูใบถัดไป";

  return (
    <div
      ref={stageRef}
      className={`wp${torn ? " is-opened" : ""}${closing ? " is-closing" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="ซองต้อนรับสมาชิกใหม่"
      onPointerMove={onStageMove}
    >
      <div className="wp-top">
        <span className="wp-brand">
          Tale<span>tails</span>
        </span>
        {phase !== "done" && (
          <button type="button" className="wp-ghost" onClick={skip}>
            ข้าม
          </button>
        )}
      </div>
      {preview && <span className="wp-note">โหมดดูตัวอย่างบนเครื่อง: ไม่แจกแต้มจริง</span>}

      {/* ---------- ซอง ---------- */}
      <div className="wp-pack-wrap" aria-hidden={torn}>
        <div className={`wp-pack${torn ? " is-torn" : ""}`}>
          <div className="wp-crimp t" />
          <div className="wp-crimp b" />
          <div className="wp-lid">
            <div className="wp-crimp t" />
          </div>
          <div className="wp-face">
            <span className="wp-kicker">Welcome Pack</span>
            <span className="wp-seal">
              <Sparkles />
            </span>
            <span className="wp-logo">
              Tale<span>tails</span>
            </span>
            <span className="wp-count">ซองต้อนรับสมาชิกใหม่ {TOTAL} ใบ</span>
          </div>
          <div
            className="wp-tear"
            aria-hidden="true"
            onPointerDown={onTearDown}
            onPointerMove={onTearMove}
            onPointerUp={onTearUp}
            onPointerCancel={onTearUp}
          >
            <div className="wp-tear-line" />
            <div className="wp-tear-fill" style={{ width: `${tear * 88}%` }} />
            <div className="wp-finger" />
          </div>
        </div>
        {!torn && (
          <button type="button" className="wp-tear-btn" onClick={openPack}>
            แตะเพื่อเปิดซอง
          </button>
        )}
      </div>

      {/* ---------- ปึกการ์ด ---------- */}
      {inDeck && (
        <div className="wp-deck">
          <div className={`wp-rarity${phase === "cards" && top?.holo ? " on" : ""}`}>
            {rarityLabel}
          </div>
          {phase === "cards" && top?.holo && <div key={idx} className="wp-glow" />}
          {cards.map((c, i) => {
            const isTop = phase === "cards" && i === idx;
            return (
              <div
                key={c.title}
                ref={isTop ? topCardRef : undefined}
                role="button"
                tabIndex={isTop ? 0 : -1}
                aria-hidden={!isTop}
                aria-label={`${c.title} ใบที่ ${i + 1} จาก ${TOTAL} แตะเพื่อดูใบถัดไป`}
                className={[
                  "wp-card",
                  c.holo ? "is-holo" : "",
                  c.gift ? "is-ultra" : "",
                  isTop && !drag ? "is-top" : "",
                  isTop && drag ? "is-dragging" : "",
                ].join(" ")}
                style={cardStyle(c, i)}
                onPointerDown={(e) => onCardDown(e, i)}
                onPointerMove={(e) => onCardMove(e, i)}
                onPointerUp={() => onCardUp(i)}
                onPointerCancel={() => onCardUp(i)}
                onKeyDown={(e) => {
                  if (isTop && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    dismiss(1);
                  }
                }}
              >
                <CardFace card={c} index={i} name={name} points={points} error={!!claimError} />
              </div>
            );
          })}
        </div>
      )}

      {phase !== "done" && (
        <div className="wp-hint">
          <h1>{phase === "pack" ? "ยินดีต้อนรับสู่ Taletails" : "การ์ดของคุณ"}</h1>
          <p>{hintText}</p>
          {inDeck && (
            <div className="wp-dots">
              {cards.map((c, i) => (
                <i key={c.title} className={i === idx ? "on" : i < idx ? "seen" : ""} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- สรุป ---------- */}
      {phase === "done" && (
        <section className="wp-summary" aria-live="polite">
          <div className="wp-fan">
            {cards.map((c, i) => (
              <FanCard key={c.title} card={c} index={i} name={name} points={points} />
            ))}
          </div>
          <h2>ยินดีต้อนรับ {name}</h2>
          {claimError ? (
            <p>รับแต้มต้อนรับไม่สำเร็จ ลองกดรับอีกครั้ง หรือกลับมาเปิดใหม่ภายหลังได้</p>
          ) : points === null ? (
            <p>กำลังสุ่มแต้มต้อนรับของคุณ…</p>
          ) : (
            <p>
              คุณได้รับ <strong>{points.toLocaleString("th-TH")} TT Points</strong>{" "}
              {preview ? "(ตัวอย่าง)" : "เข้าบัญชีแล้ว"} ใช้เป็นส่วนลดตอนสั่งซื้อได้เลย
            </p>
          )}
          <div className="wp-row">
            {claimError ? (
              <>
                <button
                  ref={goRef}
                  type="button"
                  className="wp-cta"
                  onClick={runClaim}
                  disabled={claim.isPending}
                >
                  {claim.isPending ? "กำลังรับแต้ม…" : "รับแต้มอีกครั้ง"}
                </button>
                <button type="button" className="wp-ghost is-link" onClick={onClose}>
                  ไว้ทีหลัง
                </button>
              </>
            ) : (
              <>
                <button ref={goRef} type="button" className="wp-cta" onClick={finish}>
                  เริ่มสะสมเลย
                </button>
                <Link to="/points" className="wp-ghost is-link" onClick={finish}>
                  ดูแต้มของฉัน
                </Link>
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function CardFace({
  card,
  index,
  name,
  points,
  error = false,
}: {
  card: PackCard;
  index: number;
  name: string;
  points: number | null;
  error?: boolean | undefined;
}) {
  const Icon = card.icon;
  const foot = (
    <div className="wp-foot">
      <span>Welcome Pack</span>
      <b>
        {String(index + 1).padStart(3, "0")}/{String(TOTAL).padStart(3, "0")}
      </b>
    </div>
  );
  return (
    <div className="wp-inner">
      <div className="wp-art">
        <span className="wp-ring a" />
        <span className="wp-ring b" />
        {SPARKS.map(([x, y]) => (
          <i key={`${x}-${y}`} className="wp-spark" style={{ left: `${x}%`, top: `${y}%` }} />
        ))}
        <span className="wp-emblem">
          <Icon strokeWidth={2.2} />
        </span>
        <div className="wp-head">
          <b>{card.title}</b>
          <span className="wp-gems">
            {Array.from({ length: card.gems }, (_, g) => (
              <i key={g} />
            ))}
          </span>
        </div>
      </div>
      {card.gift ? (
        <div className="wp-info">
          <span className="wp-type">{card.type}</span>
          <span className="wp-member">{name}</span>
          <span className="wp-gift">
            {error
              ? "รับแต้มไม่สำเร็จ"
              : points === null
                ? "กำลังสุ่มแต้ม…"
                : `+${points.toLocaleString("th-TH")} TT Points`}
          </span>
          <p>{card.text}</p>
          {foot}
        </div>
      ) : (
        <div className="wp-info">
          <span className="wp-type">{card.type}</span>
          <p>{card.text}</p>
          {foot}
        </div>
      )}
      <span className="wp-sheen" />
    </div>
  );
}

function FanCard({
  card,
  index,
  name,
  points,
}: {
  card: PackCard;
  index: number;
  name: string;
  points: number | null;
}) {
  const [spread, setSpread] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setSpread(true), 40);
    return () => window.clearTimeout(t);
  }, []);
  const o = index - (TOTAL - 1) / 2;
  return (
    <div
      className={`wp-card${card.holo ? " is-holo" : ""}${card.gift ? " is-ultra" : ""}`}
      style={
        {
          "--r1": card.r1,
          "--r2": card.r2,
          transform: spread
            ? `translateX(calc(-50% + ${o * 52}%)) rotate(${o * 9}deg) translateY(${Math.abs(o) * 10}px)`
            : "translateX(-50%)",
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <CardFace card={card} index={index} name={name} points={points} />
    </div>
  );
}
