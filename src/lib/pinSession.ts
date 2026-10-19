import type { Session } from "@supabase/supabase-js";

const deviceKey = (userId: string) => `pulse-pin-login-v2:${userId}`;
const tabKey = (userId: string) => `pulse-pin-session-v1:${userId}`;

// Only a local UI session identifier. Supabase still verifies login and RLS.
// Do not persist an access token or refresh token in the PIN unlock record.
export function pinLoginId(session: Session | null): string | null {
  if (!session) return null;
  try {
    const payload = session.access_token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
    return claims.sub === session.user.id && typeof claims.session_id === "string" && claims.session_id.length > 0
      ? claims.session_id : null;
  } catch { return null; }
}

export function clearPinUnlock(userId: string) {
  try { localStorage.removeItem(deviceKey(userId)); } catch { /* Best effort if device storage is unavailable. */ }
  try { sessionStorage.removeItem(tabKey(userId)); } catch { /* Best effort if tab storage is unavailable. */ }
}

export function rememberPinUnlock(userId: string, sessionId: string | null) {
  if (sessionId) {
    try { localStorage.setItem(deviceKey(userId), sessionId); } catch { /* Fall back to the current tab. */ }
  }
  try { sessionStorage.setItem(tabKey(userId), String(Date.now())); } catch { /* In-memory unlock remains available. */ }
}

export function restorePinUnlock(userId: string, sessionId: string | null): boolean {
  if (sessionId) {
    try {
      const saved = localStorage.getItem(deviceKey(userId));
      if (saved !== null) return saved === sessionId;
    } catch { /* Try the legacy tab record below. */ }
  }
  try {
    const saved = Number(sessionStorage.getItem(tabKey(userId)));
    const valid = Number.isFinite(saved) && saved > 0 && saved <= Date.now();
    if (valid && sessionId) rememberPinUnlock(userId, sessionId);
    return valid;
  } catch { return false; }
}
