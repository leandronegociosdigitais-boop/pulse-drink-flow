import { beforeEach, describe, expect, it, vi } from "vitest";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
import { backupSchema, exportBackup, restoreBackup } from "@/lib/backup";
import { runOperation } from "@/lib/operations";

const valid = {
  version: "1.2", created_at: "2026-10-16T12:00:00Z", products: [], customers: [],
  sales: [], sale_items: [], purchases: [], purchase_batches: [], inventory_movements: [],
  bills: [], cash_flow: [], sale_batch_consumptions: [], app_settings: [],
};
beforeEach(() => rpc.mockReset());
describe("backup seguro", () => {
  it("recusa arquivo incompleto antes de chamar o banco", async () => {
    await expect(restoreBackup({ version: "1.2", created_at: valid.created_at })).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("aceita a versão anterior completa sem exigir as tabelas novas", () => {
    const { sale_batch_consumptions: _a, app_settings: _b, ...older } = valid;
    expect(backupSchema.safeParse({ ...older, version: "1.1" }).success).toBe(true);
  });
  it("não trata falha de exportação como backup vazio", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "Falha de conexão" } });
    await expect(exportBackup()).rejects.toThrow("Falha de conexão");
  });
  it("envia a restauração em uma única operação", async () => {
    rpc.mockResolvedValue({ error: null });
    await restoreBackup(valid);
    expect(rpc).toHaveBeenCalledExactlyOnceWith("restore_app_backup", { p_backup: valid });
  });
  it("não recorre a gravações parciais quando a operação segura falha", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "PGRST202", message: "missing" } });
    await expect(runOperation({ action: "create_sale" })).rejects.toThrow("atualização de segurança");
    expect(rpc).toHaveBeenCalledTimes(1);
  });
});
