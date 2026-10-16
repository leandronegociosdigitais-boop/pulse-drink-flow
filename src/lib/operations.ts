import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

// These RPCs must be deployed before this version of the application.
// Never retry a failed atomic operation through separate table writes.
export async function runOperation<T>(payload: Json, procedure: "app_operation" | "create_bill_plan" | "create_credit_purchase" = "app_operation"): Promise<T> {
  const { data, error } = await supabase.rpc(procedure, { p_payload: payload });
  if (error) throw new Error(error.code === "PGRST202"
    ? "A atualização de segurança do banco precisa ser instalada antes desta operação."
    : error.message);
  return data as T;
}
