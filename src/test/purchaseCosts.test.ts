import { describe, expect, it } from "vitest";
import { fifoCost, type CostBatch } from "@/lib/purchaseCosts";
import { saleTotals, sumMoney } from "@/lib/money";

const batch = (id: string, qty: number, cost: number, date = "2026-10-01T12:00:00Z"): CostBatch => ({
  id, product_id: "beer", remaining_quantity: qty, purchase_price: cost, created_at: date,
});

describe("custo das compras e fechamento de vendas", () => {
  it("consome lotes antigos antes dos novos, inclusive quando uma venda mistura custos", () => {
    const batches = [batch("new", 10, 7, "2026-10-02T12:00:00Z"), batch("old", 10, 5)];
    expect(fifoCost(batches, "beer", 12)).toBe(64);
    expect(fifoCost(batches, "beer", 1)).toBe(5);
    expect(batches[1].remaining_quantity).toBe(10);
  });
  it("respeita o desempate do banco e ignora lotes esgotados e de outro produto", () => {
    expect(fifoCost([batch("b", 2, 7), batch("a", 1, 5), batch("zero", 0, 1),
      { ...batch("other", 100, 0), product_id: "water" }], "beer", 2)).toBe(12);
  });
  it("não inventa custo zero nem volta ao cadastro quando faltam lotes", () => {
    expect(fifoCost([], "beer", 1)).toBeNull();
    expect(fifoCost([batch("a", 1, 5)], "beer", 2)).toBeNull();
    expect(fifoCost([batch("free", 1, 0)], "beer", 1)).toBe(0);
  });
  it("mostra prejuízo e desconta o abatimento do lucro", () => {
    const totals = saleTotals([{ quantity: 12, unit_price: 6 }], "value", "10");
    expect(totals).toEqual({ subtotal: 72, discountAmount: 10, totalAmount: 62 });
    expect(sumMoney([totals.totalAmount, -64])).toBe(-2);
  });
  it("arredonda desconto percentual uma única vez como o banco", () => {
    expect(saleTotals([{ quantity: 3, unit_price: 0.05 }], "percent", "10"))
      .toEqual({ subtotal: 0.15, discountAmount: 0.02, totalAmount: 0.13 });
    expect(saleTotals([{ quantity: 1, unit_price: 10 }], "value", "-5").discountAmount).toBe(0);
    expect(saleTotals([{ quantity: 1, unit_price: 10 }], "percent", "150").totalAmount).toBe(0);
  });
  it("fecha milhares de valores em centavos, incluindo devoluções e prejuízos", () => {
    expect(sumMoney(Array(1105).fill(0.1))).toBe(110.5);
    expect(sumMoney([0.1, 0.2, -0.3])).toBe(0);
  });
});
