import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin } from "@/lib/pin";

const PinContext = createContext<{ unlockedFor: string | null; unlock: (id: string) => void }>(null!);
export const PIN_IDLE_TIMEOUT = 15 * 60 * 1000;
const sessionKey = (id: string) => `pulse-pin-session-v1:${id}`;

export function PinProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unlockedFor, setUnlockedFor] = useState<string | null>(null);
  const lastActivity = useRef(0);
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    try {
      if (previousUser.current && previousUser.current !== id) sessionStorage.removeItem(sessionKey(previousUser.current));
      const saved = id ? Number(sessionStorage.getItem(sessionKey(id))) : 0;
      const valid = !!id && hasPin(id) && saved > 0 && saved <= Date.now() && Date.now() - saved < PIN_IDLE_TIMEOUT;
      lastActivity.current = valid ? saved : 0;
      setUnlockedFor(valid ? id : null);
      if (id && !valid) sessionStorage.removeItem(sessionKey(id));
    } catch { lastActivity.current = 0; setUnlockedFor(null); }
    previousUser.current = id;
  }, [user?.id]);

  const unlock = useCallback((id: string) => {
    if (id !== user?.id) return;
    lastActivity.current = Date.now();
    try { sessionStorage.setItem(sessionKey(id), String(lastActivity.current)); } catch { /* Keep the in-memory unlock when storage is unavailable. */ }
    setUnlockedFor(id);
  }, [user?.id]);

  useEffect(() => {
    const id = user?.id;
    if (!id || unlockedFor !== id) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      clearTimeout(timer);
      const remaining = PIN_IDLE_TIMEOUT - (Date.now() - lastActivity.current);
      if (remaining <= 0) {
        try { sessionStorage.removeItem(sessionKey(id)); } catch { /* The in-memory lock still applies. */ }
        setUnlockedFor(null);
        return false;
      }
      timer = setTimeout(check, remaining);
      return true;
    };
    const activity = () => {
      if (document.visibilityState === "hidden" || !check()) return;
      lastActivity.current = Date.now();
      try { sessionStorage.setItem(sessionKey(id), String(lastActivity.current)); } catch { /* Reload will require the PIN if storage is unavailable. */ }
      check();
    };
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "scroll"] as const;
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    document.addEventListener("visibilitychange", check);
    window.addEventListener("focus", check);
    check();
    return () => {
      clearTimeout(timer);
      events.forEach(event => window.removeEventListener(event, activity));
      document.removeEventListener("visibilitychange", check);
      window.removeEventListener("focus", check);
    };
  }, [user?.id, unlockedFor]);
  return <PinContext.Provider value={{ unlockedFor: unlockedFor === user?.id ? unlockedFor : null, unlock }}>{children}</PinContext.Provider>;
}

export function usePinLock() { return useContext(PinContext); }
