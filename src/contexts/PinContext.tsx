import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const PinContext = createContext<{ unlockedFor: string | null; unlock: (id: string) => void }>(null!);

export function PinProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unlockedFor, setUnlockedFor] = useState<string | null>(null);
  useEffect(() => { setUnlockedFor(null); }, [user?.id]);
  useEffect(() => {
    const lock = () => setUnlockedFor(null);
    const onVisibility = () => { if (document.visibilityState === "hidden") lock(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", lock);
    return () => { document.removeEventListener("visibilitychange", onVisibility); window.removeEventListener("pagehide", lock); };
  }, []);
  return <PinContext.Provider value={{ unlockedFor, unlock: setUnlockedFor }}>{children}</PinContext.Provider>;
}

export function usePinLock() { return useContext(PinContext); }
