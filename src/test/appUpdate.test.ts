import { afterEach, describe, expect, it, vi } from "vitest";
import { appVersionLabel, latestAppVersion } from "@/lib/appUpdate";
afterEach(() => vi.unstubAllGlobals());
describe("identificação da versão publicada", () => {
  it("consulta a versão sem reutilizar cache HTTP", async () => {
    const request = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: "1792411200000" }) });
    vi.stubGlobal("fetch", request);
    expect(await latestAppVersion()).toBe("1792411200000");
    expect(request.mock.calls[0][0]).toMatch(/^\/app-version\.json\?check=\d+$/);
    expect(request.mock.calls[0][1].cache).toBe("no-store");
  });
  it("recusa a página HTML de fallback em vez de declarar uma versão válida", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
    await expect(latestAppVersion()).rejects.toThrow("Versão inválida");
  });
  it("não trata uma falha de publicação como atualização válida", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(latestAppVersion()).rejects.toThrow("Não foi possível");
  });
  it("mostra data e hora da versão no fuso de Manaus", () => {
    expect(appVersionLabel(String(Date.parse("2026-10-19T16:30:00Z")))).toContain("19/10");
    expect(appVersionLabel(String(Date.parse("2026-10-19T16:30:00Z")))).toContain("12:30");
  });
});
