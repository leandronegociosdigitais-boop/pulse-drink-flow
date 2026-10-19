import { beforeEach, describe, expect, it } from "vitest";
import type { Session } from "@supabase/supabase-js";
import { clearPinUnlock, pinLoginId, rememberPinUnlock, restorePinUnlock } from "@/lib/pinSession";

const session = (id: string, iat = 1) => ({ user: { id: "user-a" }, access_token: `header.${btoa(JSON.stringify({ sub: "user-a", session_id: id, iat }))}.signature` }) as Session;
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("PIN vinculado ao login no aparelho", () => {
  it("mantém a identidade ao renovar o token, mas muda em um novo login", () => {
    expect(pinLoginId(session("login-a", 1))).toBe("login-a");
    expect(pinLoginId(session("login-a", 2))).toBe("login-a");
    expect(pinLoginId(session("login-b"))).toBe("login-b");
  });
  it("recusa token malformado, sem identidade da sessão ou de outra conta", () => {
    expect(pinLoginId(null)).toBeNull();
    expect(pinLoginId({ ...session("login-a"), access_token: "invalid" })).toBeNull();
    expect(pinLoginId({ ...session("login-a"), user: { id: "user-b" } } as Session)).toBeNull();
    expect(pinLoginId({ ...session("login-a"), access_token: `h.${btoa(JSON.stringify({ sub: "user-a" }))}.s` })).toBeNull();
  });
  it("recupera o desbloqueio após perda da sessão da janela, sem salvar tokens", () => {
    rememberPinUnlock("user-a", "login-a");
    sessionStorage.clear();
    expect(restorePinUnlock("user-a", "login-a")).toBe(true);
    expect(localStorage.getItem("pulse-pin-login-v2:user-a")).toBe("login-a");
    expect(restorePinUnlock("user-a", "login-b")).toBe(false);
    expect(restorePinUnlock("user-b", "login-a")).toBe(false);
  });
  it("migra a sessão da aba anterior e a remove ao sair", () => {
    sessionStorage.setItem("pulse-pin-session-v1:user-a", String(Date.now()));
    expect(restorePinUnlock("user-a", "login-a")).toBe(true);
    sessionStorage.clear();
    expect(restorePinUnlock("user-a", "login-a")).toBe(true);
    clearPinUnlock("user-a");
    expect(restorePinUnlock("user-a", "login-a")).toBe(false);
  });
  it("não reaproveita a sessão da aba para outro login quando há registro vinculado", () => {
    rememberPinUnlock("user-a", "login-a");
    expect(restorePinUnlock("user-a", "login-b")).toBe(false);
  });
});
