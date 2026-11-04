import { cents } from "./money";

export interface CostBatch {
  id: string;
  product_id: string;
  created_at: string;
  remaining_quantity: number;
  purchase_price: number;
}

// Match the database ordering, including its tie breaker for simultaneous entries.
export function fifoCost(batches: CostBatch[], productId: string, quantity: number): number | null {
  let remaining = quantity;
  let totalCents = 0;
  const ordered = batches.filter(b => b.product_id === productId && b.remaining_quantity > 0)
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  for (const batch of ordered) {
    const consumed = Math.min(remaining, Number(batch.remaining_quantity));
    totalCents += consumed * cents(batch.purchase_price);
    remaining -= consumed;
    if (remaining === 0) break;
  }
  return remaining === 0 ? totalCents / 100 : null;
}
