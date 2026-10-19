import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { registerSW } from "virtual:pwa-register";
import { Button } from "@/components/ui/button";
import { APP_VERSION, appVersionLabel, latestAppVersion, openAppUpdater } from "@/lib/appUpdate";

export function PWAUpdateBanner() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    const isPreview = window.self !== window.top || window.location.hostname.includes("id-preview--") || window.location.hostname.includes("lovableproject.com");
    if (isPreview) return;

    let active = true;
    let checking = false;
    let registration: ServiceWorkerRegistration | undefined;
    const checkUpdate = async () => {
      if (document.visibilityState === "hidden" || checking) return;
      checking = true;
      registration?.update().catch(() => {});
      try {
        const latest = await latestAppVersion();
        if (active) {
          setCheckFailed(false);
          if (latest !== APP_VERSION) setNeedRefresh(true);
        }
      } catch { if (active) setCheckFailed(true); }
      finally { checking = false; }
    };
    registerSW({
      immediate: true,
      onNeedRefresh() { if (active) setNeedRefresh(true); },
      onRegisteredSW(_url, registered) { if (active) registration = registered; },
    });
    void checkUpdate();
    const interval = setInterval(checkUpdate, 60_000);
    window.addEventListener("focus", checkUpdate);
    window.addEventListener("online", checkUpdate);
    document.addEventListener("visibilitychange", checkUpdate);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", checkUpdate);
      window.removeEventListener("online", checkUpdate);
      document.removeEventListener("visibilitychange", checkUpdate);
    };
  }, []);

  return <div className={needRefresh ? "sticky top-0 z-50 bg-primary text-primary-foreground shadow-lg" : "border-b border-border bg-background"} data-app-version={APP_VERSION}>
    <div className="max-w-lg mx-auto flex items-center justify-between gap-2 px-4 py-1">
      <div className="min-w-0">
        {needRefresh && <p className="text-sm font-medium">Nova versão disponível!</p>}
        <p className="text-[10px]" aria-label="Versão do aplicativo">Versão {appVersionLabel()}</p>
        {checkFailed && <p className="text-[10px]">Sem conexão para verificar atualizações.</p>}
      </div>
      <Button size="sm" variant={needRefresh ? "secondary" : "ghost"} onClick={openAppUpdater} className="shrink-0 text-xs">
        <RefreshCw className="w-3 h-3 mr-1" />{needRefresh ? "Atualizar agora" : "Atualizar app"}
      </Button>
    </div>
  </div>;
}
