import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin } from "@/lib/pin";

const PinContext = createContext<{ unlockedFor: string | null; unlock: (id: string) => void }>(null!);
// This tab's session survives reloads and background visits without an idle expiry.
const sessionKey = (id: string) => `pulse-pin-session-v1:${id}`;

export function PinProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unlockedFor, setUnlockedFor] = useState<string | null>(null);
  const previousUser = useRef<string | null>(null);
  useEffect(() => {
    const id = user?.id ?? null;
    try {
      if (previousUser.current && previousUser.current !== id) sessionStorage.removeItem(sessionKey(previousUser.current));
      const saved = id ? Number(sessionStorage.getItem(sessionKey(id))) : 0;
      const valid = !!id && hasPin(id) && Number.isFinite(saved) && saved > 0 && saved <= Date.now();
      setUnlockedFor(valid ? id : null);
      if (id && !valid) sessionStorage.removeItem(sessionKey(id));
    } catch { setUnlockedFor(null); }
    previousUser.current = id;
  }, [user?.id]);

  const unlock = useCallback((id: string) => {
    if (id !== user?.id) return;
    try { sessionStorage.setItem(sessionKey(id), String(Date.now())); } catch { /* Keep the in-memory unlock when storage is unavailable. */ }
    setUnlockedFor(id);
  }, [user?.id]);

  return <PinContext.Provider value={{ unlockedFor: unlockedFor === user?.id ? unlockedFor : null, unlock }}>{children}</PinContext.Provider>;
}

export function usePinLock() { return useContext(PinContext); }
