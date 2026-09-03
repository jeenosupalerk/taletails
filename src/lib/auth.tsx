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

async function loadProfile(userId: string, fallbackEmail: string): Promise<AuthUser> {
  const { data } = await supabase
    .from("users")
    .select("id, email, username, avatar_url, phone")
    .eq("id", userId)
    .maybeSingle();

  const email = data?.email || fallbackEmail;
  return {
    id: userId,
    email,
    name: data?.username || email.split("@")[0] || "สมาชิก Taletails",
    ...(data?.avatar_url ? { avatarUrl: data.avatar_url } : {}),
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
    setUser(await loadProfile(session.user.id, session.user.email ?? ""));
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
        void loadProfile(session.user.id, session.user.email ?? "").then((next) => {
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
