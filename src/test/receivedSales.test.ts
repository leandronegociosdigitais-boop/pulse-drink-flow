import { describe, expect, it } from "vitest";
import { netReceivedItems, receivedBetween, receivedSales } from "@/lib/receivedSales";
import type { CashFlow, Sale } from "@/types/database";

const sale = (id: string, extra: Partial<Sale> = {}): Sale => ({ id, customer_id: null, total_amount: 100, total_profit: 30,
  payment_method: "pix", status: "pago", created_at: "2026-09-30T20:00:00Z", ...extra });
const receipt = (id: string, date: string, extra: Partial<CashFlow> = {}): CashFlow => ({ id: `receipt-${id}`, reference_id: id,
  reference_type: "venda", type: "entrada", category: "Venda", description: null, amount: 100, created_at: date, ...extra });

describe("vendas e lucro recebidos", () => {
  it("não reconhece venda pendente, mesmo com valor de lucro calculado", () => {
    expect(receivedSales([sale("pending", { status: "pendente" })], [])).toEqual([]);
    expect(receivedSales([sale("pending", { status: "pendente" })], [receipt("pending", "2026-10-16T12:00:00Z")])).toEqual([]);
  });
  it("reconhece venda antiga no mês do recebimento, sem reescrever a data da venda", () => {
    const source = sale("old");
    const paid = receivedSales([source], [receipt("old", "2026-10-16T12:00:00Z")]);
    expect(receivedBetween(paid, new Date("2026-09-01"), new Date("2026-10-01"))).toHaveLength(0);
    expect(receivedBetween(paid, new Date("2026-10-01"), new Date("2026-11-01"))).toHaveLength(1);
    expect(paid[0].created_at).toBe(source.created_at);
  });
  it("usa paid_at quando existe, e não inventa recebimento a partir de created_at", () => {
    const paid = receivedSales([sale("modern", { paid_at: "2026-10-16T12:00:00Z" }), sale("unconfirmed")], []);
    expect(paid.map(s => s.id)).toEqual(["modern"]);
  });
  it("não confunde aporte, saída ou compra com recebimento de venda", () => {
    expect(receivedSales([sale("old")], [receipt("old", "2026-10-16", { type: "saida" }),
      receipt("old", "2026-10-16", { reference_type: "compra" }), receipt("old", "2026-10-16", { reference_type: null })])).toEqual([]);
  });
  it("não duplica indicadores e usa a primeira entrada válida do caixa", () => {
    const paid = receivedSales([sale("old")], [receipt("old", "2026-10-17"), receipt("old", "2026-10-16", { reference_type: "sale" })]);
    expect(paid).toHaveLength(1);
    expect(paid[0].received_at).toBe("2026-10-16");
  });
  it("respeita o início inclusivo e fim exclusivo do mês em Manaus", () => {
    const paid = receivedSales([sale("before"), sale("start"), sale("end")], [receipt("before", "2026-10-01T03:59:59Z"),
      receipt("start", "2026-10-01T04:00:00Z"), receipt("end", "2026-11-01T04:00:00Z")]);
    expect(receivedBetween(paid, new Date("2026-10-01T00:00:00-04:00"), new Date("2026-11-01T00:00:00-04:00")).map(s => s.id)).toEqual(["start"]);
  });
  it("exclui data inválida em vez de deslocar recebimento para a venda", () => {
    expect(receivedSales([sale("old", { paid_at: "invalid" })], [receipt("old", "invalid")])).toEqual([]);
  });
  it("faz os valores por produto fecharem com o total líquido e lucro da venda com desconto", () => {
    const paid = receivedSales([sale("discount", { total_amount: 99.99, total_profit: 29.99, paid_at: "2026-10-16" })], []);
    const items = [1, 2, 3].map(id => ({ id, sale_id: "discount", subtotal: 35, profit: 35 / 3 }));
    const net = netReceivedItems(paid, items);
    expect(net.reduce((sum, row) => sum + Math.round(row.subtotal * 100), 0)).toBe(9999);
    expect(net.reduce((sum, row) => sum + Math.round(row.profit * 100), 0)).toBe(2999);
    expect(items[0].subtotal).toBe(35);
    expect(netReceivedItems([], items)).toEqual([]);
  });
});
