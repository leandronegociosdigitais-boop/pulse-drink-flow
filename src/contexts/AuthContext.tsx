import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import { clearPinUnlock, pinLoginId } from "@/lib/pinSession";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionId: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [{ user, sessionId, loading }, setAuth] = useState<{ user: User | null; sessionId: string | null; loading: boolean }>({ user: null, sessionId: null, loading: true });

  useEffect(() => {
    let active = true;
    let receivedAuthEvent = false;
    let lastUserId: string | null = null;
    const applySession = (session: Session | null) => {
      if (!active) return;
      lastUserId = session?.user.id ?? null;
      setAuth({ user: session?.user ?? null, sessionId: pinLoginId(session), loading: false });
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      receivedAuthEvent = true;
      if (event === "SIGNED_OUT" && lastUserId) clearPinUnlock(lastUserId);
      applySession(session);
    });
    // A slower initial read must not overwrite a newer sign-in/token-refresh event.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!receivedAuthEvent) applySession(session);
    }).catch(() => { if (!receivedAuthEvent) applySession(null); });

    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  };

  const signUp = async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({ email, password });
    return error?.message ?? null;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (!error && user) clearPinUnlock(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, sessionId, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
