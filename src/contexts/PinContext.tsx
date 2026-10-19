import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { hasPin } from "@/lib/pin";
import { clearPinUnlock, rememberPinUnlock, restorePinUnlock } from "@/lib/pinSession";

const PinContext = createContext<{ unlockedFor: string | null; unlock: (id: string) => void }>(null!);
export function PinProvider({ children }: { children: React.ReactNode }) {
  const { user, sessionId, loading } = useAuth();
  const [unlocked, setUnlocked] = useState<{ userId: string; sessionId: string | null } | null>(null);
  const previous = useRef<{ userId: string; sessionId: string | null } | null>(null);
  useEffect(() => {
    if (loading) return;
    const id = user?.id ?? null;
    const login = sessionId ?? null;
    try {
      if (previous.current && (previous.current.userId !== id || previous.current.sessionId !== login)) clearPinUnlock(previous.current.userId);
      const valid = !!id && hasPin(id) && restorePinUnlock(id, login);
      setUnlocked(valid ? { userId: id, sessionId: login } : null);
    } catch { setUnlocked(null); }
    previous.current = id ? { userId: id, sessionId: login } : null;
  }, [user?.id, sessionId, loading]);

  useEffect(() => {
    const id = user?.id;
    if (!id) return;
    const changed = (event: StorageEvent) => {
      if (event.key === `pulse-pin-login-v2:${id}`) {
        const valid = !!sessionId && event.newValue === sessionId && hasPin(id);
        setUnlocked(valid ? { userId: id, sessionId } : null);
      } else if (event.key === `pulse-pin-v1:${id}` && event.newValue === null) setUnlocked(null);
    };
    window.addEventListener("storage", changed);
    return () => window.removeEventListener("storage", changed);
  }, [user?.id, sessionId]);

  const unlock = useCallback((id: string) => {
    if (id !== user?.id) return;
    rememberPinUnlock(id, sessionId ?? null);
    setUnlocked({ userId: id, sessionId: sessionId ?? null });
  }, [user?.id, sessionId]);

  return <PinContext.Provider value={{ unlockedFor: !loading && unlocked?.userId === user?.id && unlocked?.sessionId === (sessionId ?? null) ? unlocked.userId : null, unlock }}>{children}</PinContext.Provider>;
}

export function usePinLock() { return useContext(PinContext); }
