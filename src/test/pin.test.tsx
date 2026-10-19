import { webcrypto } from "node:crypto";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "test-user", email: "test@example.com" }, sessionId: "login-test", loading: false, signOut: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { signInWithPassword: signIn } } }));
import { createPin, hasPin, verifyPin } from "@/lib/pin";
import { PinProvider } from "@/contexts/PinContext";
import { PinGuard } from "@/components/PinGuard";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.stubGlobal("crypto", webcrypto); signIn.mockReset(); });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const app = () => render(<PinProvider><PinGuard><div data-testid="private-app">Vendas privadas</div></PinGuard></PinProvider>);

describe("desbloqueio por PIN", () => {
  it("preserva zeros iniciais e não salva o PIN em texto", async () => {
    await createPin("test-user", "0123");
    expect(hasPin("test-user")).toBe(true);
    expect(localStorage.getItem("pulse-pin-v1:test-user")).not.toContain('"0123"');
    await expect(verifyPin("test-user", "0123")).resolves.toBeUndefined();
    await expect(verifyPin("test-user", "1230")).rejects.toThrow("incorreto");
  });
  it("mantém bloqueio após cinco erros mesmo após nova leitura e libera depois do prazo", async () => {
    let now = 1000000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    await createPin("test-user", "0123");
    for (let i = 0; i < 5; i++) await expect(verifyPin("test-user", "9999")).rejects.toThrow();
    await expect(verifyPin("test-user", "0123")).rejects.toThrow("Aguarde");
    now += 60001;
    await expect(verifyPin("test-user", "0123")).resolves.toBeUndefined();
  });
  it("exige PIN inicialmente e mantém acesso ao recarregar e voltar de outra página", async () => {
    await createPin("test-user", "0123");
    const view = app();
    expect(screen.queryByTestId("private-app")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("PIN de 4 números"), { target: { value: "0123" } });
    fireEvent.click(screen.getByRole("button", { name: /^Desbloquear$/ }));
    await waitFor(() => expect(screen.getByTestId("private-app")).toBeInTheDocument(), { timeout: 10000 });
    vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByTestId("private-app")).toBeInTheDocument();
    view.unmount(); app();
    expect(screen.getByTestId("private-app")).toBeInTheDocument();
    const later = Date.now() + 24 * 60 * 60 * 1000;
    vi.spyOn(Date, "now").mockReturnValue(later);
    fireEvent(window, new Event("focus"));
    expect(screen.getByTestId("private-app")).toBeInTheDocument();
  }, 15000);
  it("só cadastra o PIN após confirmação dos quatro números", async () => {
    app();
    fireEvent.change(screen.getByLabelText("PIN de 4 números"), { target: { value: "0123" } });
    fireEvent.change(screen.getByLabelText("Confirme o PIN"), { target: { value: "4567" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar PIN e entrar" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("não coincidem"));
    expect(hasPin("test-user")).toBe(false);
  });
  it("não redefine o PIN quando a confirmação da senha falha", async () => {
    await createPin("test-user", "0123");
    const before = localStorage.getItem("pulse-pin-v1:test-user");
    signIn.mockResolvedValue({ data: { user: null }, error: { message: "wrong password" } });
    app();
    fireEvent.click(screen.getByRole("button", { name: "Esqueci meu PIN" }));
    fireEvent.change(screen.getByLabelText("Senha da conta"), { target: { value: "dummy-wrong-password" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirmar senha" }));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("confirmar sua senha"));
    expect(localStorage.getItem("pulse-pin-v1:test-user")).toBe(before);
    expect(screen.queryByTestId("private-app")).not.toBeInTheDocument();
  });
});
