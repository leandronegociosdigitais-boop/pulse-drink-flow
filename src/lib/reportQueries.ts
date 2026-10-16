import { supabase } from "@/integrations/supabase/client";
import type { Sale, CashFlow } from "@/types/database";
import { receivedSales } from "@/lib/receivedSales";

// Paginate financial reads so totals remain complete beyond the API row limit.
export async function readReportRows<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await page(from, from + 499);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 500) return rows;
  }
}

export async function fetchReceivedSales() {
  const [sales, cash] = await Promise.all([
    readReportRows((from, to) => supabase.from("sales").select("*").eq("status", "pago").order("id").range(from, to)),
    readReportRows((from, to) => supabase.from("cash_flow").select("*").eq("type", "entrada")
      .in("reference_type", ["sale", "venda"]).order("id").range(from, to)),
  ]);
  return receivedSales(sales as Sale[], cash as CashFlow[]);
}

export async function fetchReceivedItems(saleIds: string[]) {
  const rows = [];
  for (let offset = 0; offset < saleIds.length; offset += 100) {
    const batch = await readReportRows((from, to) => supabase.from("sale_items")
      .select("*, products:product_id (name, category)").in("sale_id", saleIds.slice(offset, offset + 100)).order("id").range(from, to));
    rows.push(...batch);
  }
  return rows;
}
