// Persisted currency values and all sums are expressed in whole cents.
export const cents = (value: number | string) => Math.round((Number(value) + Number.EPSILON) * 100);
export const roundMoney = (value: number) => cents(value) / 100;
export const sumMoney = (values: (number | string)[]) => values.reduce<number>((sum, value) => sum + cents(value), 0) / 100;

export function saleTotals(items: { quantity: number; unit_price: number }[], discountType: "percent" | "value", discountValue: string) {
  const subtotalCents = items.reduce((sum, item) => sum + cents(item.unit_price) * item.quantity, 0);
  const value = Math.max(0, Number(discountValue) || 0);
  const discountCents = Math.min(subtotalCents, discountType === "percent" ? Math.round(subtotalCents * value / 100) : cents(value));
  return { subtotal: subtotalCents / 100, discountAmount: discountCents / 100, totalAmount: (subtotalCents - discountCents) / 100 };
}
