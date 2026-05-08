import * as React from "react";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type CrmRole = "admin" | "counsellor" | null;

interface CrmAuthContext {
  user: User | null;
  session: Session | null;
  role: CrmRole;
  isAdmin: boolean;
  isCounsellor: boolean;
  hasAccess: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const Ctx = createContext<CrmAuthContext | undefined>(undefined);

export function CrmAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<CrmRole>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (uid: string) => {
    const { data } = await supabase
      .from("crm_user_roles")
      .select("role")
      .eq("user_id", uid)
      .order("role", { ascending: true });
    if (data && data.length > 0) {
      // Prefer admin if present
      const isAdmin = data.some((r) => r.role === "admin");
      setRole(isAdmin ? "admin" : "counsellor");
    } else {
      setRole(null);
    }
  };

 useEffect(() => {
  let mounted = true;

  // 8-second timeout to prevent infinite loading
  const timeout = setTimeout(() => {
    if (mounted && loading) {
      console.warn("[CrmAuth] Auth check timed out after 8s");
      setLoading(false);
    }
  }, 8000);

  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    async (_evt, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        try { await fetchRole(s.user.id); } catch (e) { console.error("[CrmAuth] fetchRole error", e); }
      } else {
        setRole(null);
      }
      if (mounted) setLoading(false);
    }
  );

  supabase.auth.getSession().then(async ({ data: { session: s } }) => {
    if (!mounted) return;
    setSession(s);
    setUser(s?.user ?? null);
    if (s?.user) {
      try { await fetchRole(s.user.id); } catch (e) { console.error("[CrmAuth] fetchRole error", e); }
    }
    if (mounted) setLoading(false);
  }).catch((e) => {
    console.error("[CrmAuth] getSession error", e);
    if (mounted) setLoading(false);
  });

  return () => {
    mounted = false;
    clearTimeout(timeout);
    subscription.unsubscribe();
  };
}, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/crm` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
  };

  const refreshRole = async () => {
    if (user) await fetchRole(user.id);
  };

  const value: CrmAuthContext = {
    user,
    session,
    role,
    isAdmin: role === "admin",
    isCounsellor: role === "counsellor",
    hasAccess: role !== null,
    loading,
    signIn,
    signInWithGoogle,
    signOut,
    refreshRole,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCrmAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCrmAuth must be used within CrmAuthProvider");
  return ctx;
}
