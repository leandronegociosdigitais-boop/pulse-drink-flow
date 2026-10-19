import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
const updater = vi.hoisted(() => ({ register: vi.fn(), update: vi.fn(), options: null as {
  onNeedRefresh?: () => void; onRegisteredSW?: (url: string, registration: ServiceWorkerRegistration) => void;
} | null }));
const appUpdate = vi.hoisted(() => ({ latest: vi.fn(), open: vi.fn() }));
vi.mock("@/lib/appUpdate", () => ({ APP_VERSION: "100", appVersionLabel: () => "19/10, 12:00", latestAppVersion: appUpdate.latest, openAppUpdater: appUpdate.open }));
vi.mock("virtual:pwa-register", () => ({ registerSW: updater.register }));
vi.mock("@/contexts/AuthContext", () => ({ AuthProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/contexts/PinContext", () => ({ PinProvider: ({ children }: { children: ReactNode }) => children }));
vi.mock("@/components/ProtectedRoute", () => ({ ProtectedRoute: () => <p>Aplicativo bloqueado pelo PIN</p> }));
import App from "@/App";

const previousWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
beforeEach(() => {
  localStorage.clear();
  updater.options = null; updater.register.mockReset(); updater.update.mockReset();
  appUpdate.latest.mockReset(); appUpdate.open.mockReset();
  appUpdate.latest.mockResolvedValue("100");
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
    expect(screen.getByLabelText("Versão do aplicativo")).toHaveTextContent("19/10, 12:00");
    expect(screen.getByRole("button", { name: "Atualizar app" })).toBeInTheDocument();
  });
  it("mostra e aplica uma atualização na tela bloqueada", async () => {
    render(<App />);
    act(() => updater.options?.onNeedRefresh?.());
    fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    await waitFor(() => expect(appUpdate.open).toHaveBeenCalledTimes(1));
    expect(updater.update).not.toHaveBeenCalled();
  });
  it("procura atualização ao voltar do segundo plano e limpa listeners ao desmontar", async () => {
    const view = render(<App />);
    const update = vi.fn().mockResolvedValue(undefined);
    act(() => updater.options?.onRegisteredSW?.("/sw.js", { update } as unknown as ServiceWorkerRegistration));
    await act(async () => { await Promise.resolve(); });
    fireEvent(window, new Event("focus"));
    expect(update).toHaveBeenCalledTimes(1);
    view.unmount();
    fireEvent(window, new Event("focus"));
    expect(update).toHaveBeenCalledTimes(1);
  });
  it("detecta versão publicada mais recente mesmo sem aviso do service worker", async () => {
    appUpdate.latest.mockResolvedValue("200");
    render(<App />);
    expect(await screen.findByText("Nova versão disponível!")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Atualizar agora" }));
    expect(appUpdate.open).toHaveBeenCalledTimes(1);
  });
  it("informa falha de conexão sem esconder a atualização manual", async () => {
    appUpdate.latest.mockRejectedValue(new Error("offline"));
    render(<App />);
    expect(await screen.findByText("Sem conexão para verificar atualizações.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Atualizar app" })).toBeInTheDocument();
  });
});
