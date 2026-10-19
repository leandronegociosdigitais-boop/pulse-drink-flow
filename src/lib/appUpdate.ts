export const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? "dev";

export function appVersionLabel(version = APP_VERSION) {
  const date = new Date(Number(version));
  return Number.isFinite(date.getTime()) && version !== "dev"
    ? date.toLocaleString("pt-BR", { timeZone: "America/Manaus", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : "desenvolvimento";
}

export async function latestAppVersion() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`/app-version.json?check=${Date.now()}`, { cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("Não foi possível verificar a atualização.");
    const data = await response.json();
    if (typeof data.version !== "string" || !/^\d+$/.test(data.version)) throw new Error("Versão inválida.");
    return data.version as string;
  } finally { clearTimeout(timer); }
}

// Kept outside the SPA navigation fallback, including in already-installed workers.
// This page refreshes only the app shell, never login/PIN/database storage.
export function openAppUpdater() { window.location.assign("/api/atualizar.html?iniciar=1"); }
