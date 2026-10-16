import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PinProvider, PIN_IDLE_TIMEOUT, usePinLock } from "@/contexts/PinContext";

const auth = vi.hoisted(() => ({ user: { id: "user-a" } as { id: string } | null }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
function App() {
  const { unlockedFor, unlock } = usePinLock();
  return <><span>{unlockedFor ?? "locked"}</span><button onClick={() => unlock(auth.user!.id)}>Unlock</button></>;
}
const mount = () => render(<PinProvider><App /></PinProvider>);

describe("PIN inactivity session", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    sessionStorage.clear();
    localStorage.clear();
    localStorage.setItem("pulse-pin-v1:user-a", "configured");
    auth.user = { id: "user-a" };
  });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("keeps an unlocked tab across reloads without extending the idle deadline", () => {
    const first = mount();
    fireEvent.click(screen.getByText("Unlock"));
    act(() => vi.advanceTimersByTime(10 * 60 * 1000));
    first.unmount();
    mount();
    expect(screen.getByText("user-a")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(5 * 60 * 1000));
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("extends the session for real interaction, but locks after 15 idle minutes", () => {
    mount();
    fireEvent.click(screen.getByText("Unlock"));
    act(() => vi.advanceTimersByTime(14 * 60 * 1000));
    fireEvent.keyDown(window, { key: "a" });
    act(() => vi.advanceTimersByTime(14 * 60 * 1000));
    expect(screen.getByText("user-a")).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(60 * 1000));
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it("does not let an expired session revive when a suspended tab receives input", () => {
    mount();
    fireEvent.click(screen.getByText("Unlock"));
    vi.setSystemTime(Date.now() + PIN_IDLE_TIMEOUT);
    fireEvent.pointerDown(window);
    expect(screen.getByText("locked")).toBeInTheDocument();
    expect(sessionStorage.length).toBe(0);
  });

  it("keeps the unlock during a short background visit", () => {
    mount();
    fireEvent.click(screen.getByText("Unlock"));
    fireEvent(window, new Event("pagehide"));
    fireEvent(document, new Event("visibilitychange"));
    expect(screen.getByText("user-a")).toBeInTheDocument();
  });

  it("clears the old session on logout and does not unlock a different account", () => {
    const view = mount();
    fireEvent.click(screen.getByText("Unlock"));
    auth.user = null;
    view.rerender(<PinProvider><App /></PinProvider>);
    expect(sessionStorage.length).toBe(0);
    auth.user = { id: "user-b" };
    view.rerender(<PinProvider><App /></PinProvider>);
    expect(screen.getByText("locked")).toBeInTheDocument();
  });

  it.each(["broken", "0", String(new Date("2026-10-17").getTime())])("rejects an invalid stored timestamp: %s", value => {
    sessionStorage.setItem("pulse-pin-session-v1:user-a", value);
    mount();
    expect(screen.getByText("locked")).toBeInTheDocument();
  });
});
