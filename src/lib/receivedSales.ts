import type { CashFlow, Sale, SaleItem } from "@/types/database";

export interface ReceivedSale extends Sale { received_at: string }

// Older sales have no paid_at. Their linked cash receipt is the payment evidence.
// Never fall back to the sale creation date: that would move later payments backwards.
export function receivedSales(sales: Sale[], cash: CashFlow[]): ReceivedSale[] {
  const receipts = new Map<string, string>();
  for (const entry of cash) {
    if (entry.type !== "entrada" || !entry.reference_id || !["sale", "venda"].includes(entry.reference_type ?? "")) continue;
    if (!Number.isFinite(Date.parse(entry.created_at))) continue;
    const previous = receipts.get(entry.reference_id);
    if (!previous || Date.parse(entry.created_at) < Date.parse(previous)) receipts.set(entry.reference_id, entry.created_at);
  }
  return sales.flatMap(sale => {
    if (sale.status !== "pago") return [];
    const date = receipts.get(sale.id) ?? sale.paid_at;
    return date && Number.isFinite(Date.parse(date)) ? [{ ...sale, received_at: date }] : [];
  });
}

export function receivedBetween(sales: ReceivedSale[], start: Date, end: Date) {
  return sales.filter(sale => {
    const time = Date.parse(sale.received_at);
    return time >= start.getTime() && time < end.getTime();
  });
}

// Keep product totals consistent with the net sale, including discounts and cents.
export function netReceivedItems<T extends Pick<SaleItem, "sale_id" | "subtotal" | "profit">>(sales: ReceivedSale[], items: T[]): T[] {
  return sales.flatMap(sale => {
    const rows = items.filter(item => item.sale_id === sale.id);
    const gross = rows.reduce((sum, item) => sum + Math.round(Number(item.subtotal) * 100), 0);
    const grossProfit = rows.reduce((sum, item) => sum + Math.round(Number(item.profit) * 100), 0);
    let revenueAdjustment = Math.round(Number(sale.total_amount) * 100) - gross;
    let profitAdjustment = Math.round(Number(sale.total_profit) * 100) - grossProfit;
    const totalRevenueAdjustment = revenueAdjustment;
    const totalProfitAdjustment = profitAdjustment;
    return rows.map((item, index) => {
      const weight = gross ? Math.round(Number(item.subtotal) * 100) / gross : 1 / rows.length;
      const revenue = index === rows.length - 1 ? revenueAdjustment : Math.round(totalRevenueAdjustment * weight);
      const profit = index === rows.length - 1 ? profitAdjustment : Math.round(totalProfitAdjustment * weight);
      revenueAdjustment -= revenue;
      profitAdjustment -= profit;
      return { ...item, subtotal: (Math.round(Number(item.subtotal) * 100) + revenue) / 100,
        profit: (Math.round(Number(item.profit) * 100) + profit) / 100 };
    });
  });
}
