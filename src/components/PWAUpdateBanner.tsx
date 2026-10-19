import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { Button } from "@/components/ui/button";

const BUILD_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

export function PWAUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    const saveVersion = () => {
      try { localStorage.setItem("bebidas-app-version", BUILD_VERSION); } catch { /* Updates still work when storage is unavailable. */ }
    };
    let storedVersion: string | null = null;
    try { storedVersion = localStorage.getItem("bebidas-app-version"); } catch { /* Continue to register updates. */ }
    if (storedVersion !== BUILD_VERSION) {
      saveVersion();
      if (navigator.serviceWorker?.controller) {
        setNeedRefresh(true);
      }
    }

    const isInIframe = (() => {
      try {
        return window.self !== window.top;
      } catch {
        return true;
      }
    })();
    const isPreviewHost =
      window.location.hostname.includes("id-preview--") ||
      window.location.hostname.includes("lovableproject.com");

    if (isInIframe || isPreviewHost) {
      navigator.serviceWorker?.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
      });
      return;
    }

    let active = true;
    let registration: ServiceWorkerRegistration | undefined;
    let interval: ReturnType<typeof setInterval> | undefined;
    const checkUpdate = () => {
      if (document.visibilityState !== "hidden") registration?.update().catch(() => {});
    };
    const update = registerSW({
      immediate: true,
      onNeedRefresh() {
        if (active) setNeedRefresh(true);
      },
      onOfflineReady() {
        saveVersion();
      },
      onRegisteredSW(_swUrl, registered) {
        if (active && registered) {
          registration = registered;
          interval = setInterval(checkUpdate, 60_000);
        }
      },
    });
    setUpdateSW(() => update);
    window.addEventListener("focus", checkUpdate);
    document.addEventListener("visibilitychange", checkUpdate);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", checkUpdate);
      document.removeEventListener("visibilitychange", checkUpdate);
    };
  }, []);

  if (!needRefresh) return null;

  const handleUpdate = async () => {
    try { localStorage.setItem("bebidas-app-version", BUILD_VERSION); } catch { /* Updating does not require local storage. */ }

    if (updateSW) {
      await updateSW(true);
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <RefreshCw className="w-4 h-4 shrink-0" />
          <p className="text-sm font-medium truncate">
            Nova versão disponível!
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleUpdate}
          className="shrink-0 font-semibold"
        >
          Atualizar agora
        </Button>
      </div>
    </div>
  );
}
