import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const updater = vi.hoisted(() => ({ register: vi.fn(), update: vi.fn(), options: null as {
  onNeedRefresh?: () => void; onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration) => void;
} | null }));
vi.mock("virtual:pwa-register", () => ({ registerSW: updater.register }));
vi.mock("@/contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/contexts/PinContext", () => ({ PinProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: () => <p>Aplicativo bloqueado pelo PIN</p> }));
import App from "@/App";

const previousWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
beforeEach(() => {
  localStorage.clear();
  updater.options = null; updater.register.mockReset(); updater.update.mockReset();
  updater.update.mockResolvedValue(undefined);
  updater.register.mockImplementation(options => { updater.options = options; return updater.update; });
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: { controller: null } });
});
afterEach(() => {
  cleanup();
  if (previousWorker) Object.defineProperty(navigator, "serviceWorker", previousWorker);
  else Reflect.deleteProperty(navigator, "serviceWorker");
});

describe("atualização antes de desbloquear o aplicativo", () => {
  it("registra o atualizador mesmo com a rota bloqueada pelo PIN", () => {
    render(<App />);
    expect(screen.getByText("Aplicativo bloqueado pelo PIN")).toBeInTheDocument();
    expect(updater.register).toHaveBeenCalledTimes(1);
  });
  it("mostra e aplica uma atualização na tela bloqueada", async () => {
    render(<App />);
    act(() => updater.options?.onNeedRefresh?.());
    fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    await waitFor(() => expect(updater.update).toHaveBeenCalledWith(true));
  });
  it("procura atualização ao voltar do segundo plano e limpa listeners ao desmontar", () => {
    const view = render(<App />);
    const update = vi.fn().mockResolvedValue(undefined);
    act(() => updater.options?.onRegisteredSW?.("/sw.js", { update } as unknown as ServiceWorkerRegistration));
    fireEvent(window, new Event("focus"));
    expect(update).toHaveBeenCalledTimes(1);
    view.unmount();
    fireEvent(window, new Event("focus"));
    expect(update).toHaveBeenCalledTimes(1);
  });
});
