import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

const records = z.array(z.record(z.unknown()));
export const backupSchema = z.object({
  version: z.enum(["1.1", "1.2"]),
  created_at: z.string().refine(value => Number.isFinite(Date.parse(value)), "Data inválida"),
  products: records, customers: records, sales: records, sale_items: records,
  purchases: records, purchase_batches: records, inventory_movements: records,
  bills: records, cash_flow: records,
  sale_batch_consumptions: records.optional(), app_settings: records.optional(),
}).superRefine((backup, ctx) => {
  if (backup.version === "1.2") {
    for (const key of ["sale_batch_consumptions", "app_settings"] as const) {
      if (!backup[key]) ctx.addIssue({ code: "custom", path: [key], message: "Tabela ausente" });
    }
  }
});

export async function exportBackup() {
  const { data, error } = await supabase.rpc("export_app_backup");
  if (error) throw new Error(error.message);
  return backupSchema.parse(data);
}

export async function restoreBackup(value: unknown) {
  const backup = backupSchema.parse(value);
  const { error } = await supabase.rpc("restore_app_backup", { p_backup: backup as Json });
  if (error) throw new Error(error.message);
}

export function downloadBackup(backup: unknown, filename: string) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
