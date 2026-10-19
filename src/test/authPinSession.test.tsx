import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
const sdk = vi.hoisted(() => ({ getSession: vi.fn(), signOut: vi.fn(), listener: null as ((event: AuthChangeEvent, session: Session | null) => void) | null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getSession: sdk.getSession, signOut: sdk.signOut,
  onAuthStateChange: (listener: typeof sdk.listener) => { sdk.listener = listener; return { data: { subscription: { unsubscribe: vi.fn() } } }; },
} } }));
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PinProvider, usePinLock } from "@/contexts/PinContext";

const login = (id: string, iat = 1) => ({ user: { id: "user-a" }, access_token: `h.${btoa(JSON.stringify({ sub: "user-a", session_id: id, iat }))}.s` }) as Session;
function App() {
  const { user, loading, signOut } = useAuth();
  const { unlockedFor, unlock } = usePinLock();
  return <><span>{loading ? "loading" : unlockedFor ? "unlocked" : "locked"}</span>
    <button onClick={() => unlock(user!.id)}>Unlock</button><button onClick={signOut}>Sign out</button></>;
}
const mount = () => render(<AuthProvider><PinProvider><App /></PinProvider></AuthProvider>);
beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  localStorage.setItem("pulse-pin-v1:user-a", "configured");
  sdk.getSession.mockReset(); sdk.signOut.mockReset(); sdk.listener = null;
  sdk.getSession.mockResolvedValue({ data: { session: login("login-a") } });
  sdk.signOut.mockImplementation(async () => { sdk.listener?.("SIGNED_OUT", null); return { error: null }; });
});

describe("login e restauração do PIN no Android", () => {
  it("restaura após recriação da janela e não bloqueia na renovação do token", async () => {
    const first = mount();
    await waitFor(() => expect(screen.getByText("locked")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Unlock"));
    first.unmount(); sessionStorage.clear();
    mount();
    await waitFor(() => expect(screen.getByText("unlocked")).toBeInTheDocument());
    act(() => sdk.listener?.("TOKEN_REFRESHED", login("login-a", 2)));
    expect(screen.getByText("unlocked")).toBeInTheDocument();
  });
  it("remove o desbloqueio no logout e exige PIN para outro login", async () => {
    mount();
    await waitFor(() => expect(screen.getByText("locked")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Unlock"));
    fireEvent.click(screen.getByText("Sign out"));
    await waitFor(() => expect(screen.getByText("locked")).toBeInTheDocument());
    expect(localStorage.getItem("pulse-pin-login-v2:user-a")).toBeNull();
    act(() => sdk.listener?.("SIGNED_IN", login("login-b")));
    expect(screen.getByText("locked")).toBeInTheDocument();
  });
  it("não deixa uma leitura inicial atrasada apagar o login e desbloqueio mais recentes", async () => {
    let finish!: (result: { data: { session: Session | null } }) => void;
    sdk.getSession.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    mount();
    act(() => sdk.listener?.("SIGNED_IN", login("login-a")));
    fireEvent.click(screen.getByText("Unlock"));
    await act(async () => finish({ data: { session: null } }));
    expect(screen.getByText("unlocked")).toBeInTheDocument();
  });
});
