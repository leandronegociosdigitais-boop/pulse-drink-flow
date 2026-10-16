import { supabase } from "@/integrations/supabase/client";

export async function consumeBatchesFIFO(productId: string, quantityNeeded: number, saleId: string) {
  const { data, error } = await supabase.rpc("fifo_consume_batches", {
    p_product_id: productId, p_quantity: quantityNeeded, p_sale_id: saleId,
  });
  if (error) throw error;
  return data as { totalCost: number; batchConsumptions: { batchId: string; qty: number; price: number }[] };
}
