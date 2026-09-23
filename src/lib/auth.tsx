import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { supabase } from "@/integrations/supabase/client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  phone?: string;
  /** รูปที่ Google/Facebook ส่งมาให้ตอนล็อกอิน (ไว้ให้กด "ใช้รูปจากบัญชีที่ล็อกอิน") */
  socialAvatarUrl?: string;
}

interface AuthValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  updateProfile: (patch: Partial<Pick<AuthUser, "name" | "avatarUrl" | "phone">>) => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

/** ผู้ใช้จาก session ของ Supabase เท่าที่ไฟล์นี้ต้องใช้ */
interface SessionUser {
  id: string;
  email?: string | undefined;
  user_metadata?: Record<string, unknown> | undefined;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

/** URL รูปจากผู้ให้บริการล็อกอิน (ไม่ใช่รูปที่ผู้ใช้อัปโหลดเองขึ้น storage ของเรา) */
const SOCIAL_AVATAR_HOST =
  /(googleusercontent\.com|fbcdn\.net|fbsbx\.com|graph\.facebook\.com|facebook\.com)/i;

/** Google ส่งมาใน avatar_url/picture · Facebook ส่งมาใน picture (หรือ avatar_url) */
const socialAvatarOf = (meta?: Record<string, unknown> | undefined) =>
  str(meta?.["avatar_url"]) || str(meta?.["picture"]);

/** ชื่อจริงจากบัญชี Google/Facebook */
const socialNameOf = (meta?: Record<string, unknown> | undefined) =>
  str(meta?.["username"]) || str(meta?.["full_name"]) || str(meta?.["name"]);

/**
 * คัดลอกรูป/ชื่อจากบัญชี Google/Facebook ลงตาราง users
 * เพื่อให้คนอื่น (หน้าผู้ขาย/ประวัติการเสนอราคา) เห็นรูปด้วย ไม่ใช่เห็นแค่เจ้าตัว
 * - ไม่ทับรูปที่ผู้ใช้อัปโหลดเอง (URL ที่ไม่ใช่ของ Google/Facebook)
 * - ไม่ทับชื่อที่ผู้ใช้ตั้งเอง (ทับเฉพาะชื่อเริ่มต้นที่ระบบตั้งจากอีเมล)
 * - ทำงานเงียบๆ พลาดก็ไม่กระทบการเข้าใช้งาน
 */
async function syncSocialProfile(input: {
  userId: string;
  email: string;
  storedAvatar: string;
  storedName: string;
  socialAvatar: string;
  socialName: string;
}) {
  const keepsOwnUpload = !!input.storedAvatar && !SOCIAL_AVATAR_HOST.test(input.storedAvatar);
  const nextAvatar =
    input.socialAvatar && !keepsOwnUpload && input.storedAvatar !== input.socialAvatar
      ? input.socialAvatar
      : "";

  const defaultName = input.email.split("@")[0] ?? "";
  const nameIsDefault = !input.storedName || input.storedName === defaultName;
  const nextName =
    input.socialName && nameIsDefault && input.storedName !== input.socialName ? input.socialName : "";

  // แยกคำสั่งกัน: users.username เป็น UNIQUE ถ้าชื่อจาก Google ไปชนกับคนอื่นแล้วพัง
  // อย่างน้อยรูปต้องบันทึกได้
  if (nextAvatar) {
    // เขียนทับเฉพาะกรณีค่าในฐานข้อมูลยังเป็นค่าที่เพิ่งอ่านมา
    // กันเคสผู้ใช้เพิ่งอัปโหลดรูปเองระหว่างที่คำสั่งนี้กำลังทำงาน
    const q = supabase.from("users").update({ avatar_url: nextAvatar }).eq("id", input.userId);
    await (input.storedAvatar ? q.eq("avatar_url", input.storedAvatar) : q.is("avatar_url", null));
  }
  if (nextName) {
    await supabase.from("users").update({ username: nextName }).eq("id", input.userId);
  }
}

async function loadProfile(sessionUser: SessionUser): Promise<AuthUser> {
  const { data } = await supabase
    .from("users")
    .select("id, email, username, avatar_url, phone")
    .eq("id", sessionUser.id)
    .maybeSingle();

  const email = data?.email || sessionUser.email || "";
  const socialAvatar = socialAvatarOf(sessionUser.user_metadata);
  const socialName = socialNameOf(sessionUser.user_metadata);
  const storedAvatar = data?.avatar_url ?? "";
  const storedName = data?.username ?? "";

  // รูปที่อัปโหลดเองชนะเสมอ · ถ้ายังไม่เคยอัปโหลด ใช้รูปล่าสุดจาก Google/Facebook
  const ownUpload = storedAvatar && !SOCIAL_AVATAR_HOST.test(storedAvatar);
  const avatarUrl = ownUpload ? storedAvatar : socialAvatar || storedAvatar;

  void syncSocialProfile({
    userId: sessionUser.id,
    email,
    storedAvatar,
    storedName,
    socialAvatar,
    socialName,
  }).catch(() => undefined);

  return {
    id: sessionUser.id,
    email,
    name: storedName || socialName || email.split("@")[0] || "สมาชิก Taletails",
    ...(avatarUrl ? { avatarUrl } : {}),
    ...(socialAvatar ? { socialAvatarUrl: socialAvatar } : {}),
    ...(data?.phone ? { phone: data.phone } : {}),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncFromSession = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    const session = data.session;
    if (!session?.user) {
      setUser(null);
      return;
    }
    setUser(await loadProfile(session.user));
  }, []);

  useEffect(() => {
    let alive = true;

    void (async () => {
      await syncFromSession();
      if (alive) setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;
      if (event === "SIGNED_OUT" || !session?.user) {
        setUser(null);
        return;
      }
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        void loadProfile(session.user).then((next) => {
          if (alive) setUser(next);
        });
      }
    });

    return () => {
      alive = false;
      sub.subscription.unsubscribe();
    };
  }, [syncFromSession]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (patch: Partial<Pick<AuthUser, "name" | "avatarUrl" | "phone">>) => {
      const current = user;
      if (!current) return;
      const payload: { username?: string; avatar_url?: string; phone?: string } = {};
      if (patch.name !== undefined) payload.username = patch.name;
      if (patch.avatarUrl !== undefined) payload.avatar_url = patch.avatarUrl;
      if (patch.phone !== undefined) payload.phone = patch.phone;
      if (Object.keys(payload).length === 0) return;

      const { error } = await supabase.from("users").update(payload).eq("id", current.id);
      if (error) throw new Error(error.message);
      setUser({ ...current, ...patch });
    },
    [user],
  );

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      loading,
      logout,
      refresh: syncFromSession,
      updateProfile,
    }),
    [user, loading, logout, syncFromSession, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
