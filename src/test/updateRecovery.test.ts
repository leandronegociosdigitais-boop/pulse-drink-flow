import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";

const html = readFileSync("public/api/atualizar.html", "utf8");
const script = html.match(/<script>([\s\S]*?)<\/script>/)![1];
function recovery(online = true) {
  const origin = "https://pulse-drink-flow.lovable.app";
  let click!: () => Promise<void>;
  const button = { disabled: false, addEventListener: (_event: string, listener: typeof click) => { click = listener; } };
  const status = { textContent: "" };
  const unregister = vi.fn().mockResolvedValue(true);
  const otherUnregister = vi.fn().mockResolvedValue(true);
  const removeCache = vi.fn().mockResolvedValue(true);
  const storage = { clear: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() };
  const replace = vi.fn();
  const request = vi.fn().mockResolvedValue({ ok: online, json: async () => ({ version: "12345" }) });
  const context = { document: { getElementById: (id: string) => id === "update" ? button : status },
    navigator: { serviceWorker: { getRegistrations: async () => [{ scope: origin + "/", unregister }, { scope: origin + "/other/", unregister: otherUnregister }] } },
    location: { origin, search: "", replace }, fetch: request, URLSearchParams,
    caches: { keys: async () => ["html-pages", `workbox-precache-v2-${origin}/`, "customer-data", `workbox-precache-v2-${origin}/other/`], delete: removeCache },
    localStorage: storage, sessionStorage: storage, indexedDB: { deleteDatabase: vi.fn() },
  };
  runInNewContext(script, { ...context, window: context });
  return { click: () => click(), button, status, unregister, otherUnregister, removeCache, storage, replace, request, indexedDB: context.indexedDB };
}
describe("recuperação de aplicativo instalado desatualizado", () => {
  it("atualiza somente os arquivos do app sem apagar login, PIN ou dados", async () => {
    const app = recovery();
    await app.click();
    expect(app.unregister).toHaveBeenCalledOnce();
    expect(app.otherUnregister).not.toHaveBeenCalled();
    expect(app.removeCache.mock.calls.map(call => call[0])).toEqual(["html-pages", "workbox-precache-v2-https://pulse-drink-flow.lovable.app/"]);
    expect(app.storage.clear).not.toHaveBeenCalled();
    expect(app.storage.removeItem).not.toHaveBeenCalled();
    expect(app.storage.setItem).not.toHaveBeenCalled();
    expect(app.indexedDB.deleteDatabase).not.toHaveBeenCalled();
    expect(app.replace).toHaveBeenCalledWith("/?versao=12345");
  });
  it("confirma a versão online antes de remover qualquer arquivo offline", async () => {
    const app = recovery(false);
    await app.click();
    expect(app.unregister).not.toHaveBeenCalled();
    expect(app.removeCache).not.toHaveBeenCalled();
    expect(app.replace).not.toHaveBeenCalled();
    expect(app.button.disabled).toBe(false);
    expect(app.status.textContent).toContain("conexão");
  });
  it("oferece atualização independente do React e do desbloqueio do PIN", () => {
    expect(html).toContain('id="update"');
    expect(html).not.toContain('src="/assets/');
    const app = recovery();
    expect(app.unregister).not.toHaveBeenCalled();
    expect(app.request).not.toHaveBeenCalled();
  });
});
