import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
const fixture = vi.hoisted(() => ({ tables: {} as Record<string, Record<string, unknown>[]> }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: (table: string) => {
  let rows = [...(fixture.tables[table] ?? [])];
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: (key: string, value: unknown) => { rows = rows.filter(r => r[key] === value); return builder; },
    gt: (key: string, value: number) => { rows = rows.filter(r => Number(r[key]) > value); return builder; },
    in: (key: string, values: unknown[]) => { rows = rows.filter(r => values.includes(r[key])); return builder; },
    gte: (key: string, value: string) => { rows = rows.filter(r => String(r[key]) >= value); return builder; },
    lt: (key: string, value: string) => { rows = rows.filter(r => String(r[key]) < value); return builder; },
    range: (from: number, to: number) => Promise.resolve({ data: rows.slice(from, to + 1), error: null }),
  };
  return builder;
} } }));
import { useMonthlyReport } from "@/hooks/useMonthlyReport";
import { useProductSalesReport } from "@/hooks/useSaleItems";
import { readReportRows } from "@/lib/reportQueries";
import { useCurrentInvestment } from "@/hooks/useInvestment";
import { usePurchaseBatches } from "@/hooks/usePurchases";

const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>;
beforeEach(() => {
  fixture.tables = {
    sales: [
      { id: "old-paid", status: "pago", total_amount: 90, total_profit: 20, created_at: "2026-09-10T12:00:00Z", paid_at: null },
      { id: "pending", status: "pendente", total_amount: 100, total_profit: 50, created_at: "2026-10-10T12:00:00Z" },
    ],
    cash_flow: [{ id: "cash", type: "entrada", reference_type: "venda", reference_id: "old-paid", amount: 90, created_at: "2026-10-16T12:00:00Z" }],
    sale_items: [
      { id: "paid-item", sale_id: "old-paid", product_id: "beer", quantity: 10, unit_cost: 7, subtotal: 100, profit: 30, products: { name: "Cerveja", category: "Cervejas" } },
      { id: "pending-item", sale_id: "pending", product_id: "beer", quantity: 5, unit_cost: 10, subtotal: 100, profit: 50, products: { name: "Cerveja", category: "Cervejas" } },
    ], purchases: [],
  };
});

describe("relatórios por recebimento", () => {
  it("inclui o pagamento do mês de uma venda antiga e exclui a pendente em valor, lucro e produtos", async () => {
    const { result } = renderHook(() => useMonthlyReport(2026, 9), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalSold: 90, totalProfit: 20, totalSales: 1,
      productSales: [{ product_id: "beer", total_quantity: 10, total_revenue: 90, total_profit: 20 }] });
  });
  it("não registra retroativamente o pagamento no mês em que a venda foi criada", async () => {
    const { result } = renderHook(() => useMonthlyReport(2026, 8), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalSold: 0, totalProfit: 0, totalSales: 0, productSales: [] });
  });
  it("aplica a mesma regra ao ranking e lucro por produto", async () => {
    const now = new Date();
    fixture.tables.cash_flow[0].created_at = new Date(now.getFullYear(), now.getMonth(), 16, 12).toISOString();
    const { result } = renderHook(useProductSalesReport, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject([{ total_quantity: 10, total_revenue: 90, total_profit: 20 }]);
  });
  it("não corta o total quando a consulta passa de mil registros", async () => {
    const rows = Array.from({ length: 1105 }, (_, id) => ({ id }));
    const page = vi.fn(async (from: number, to: number) => ({ data: rows.slice(from, to + 1), error: null }));
    expect(await readReportRows(page)).toHaveLength(1105);
    expect(page).toHaveBeenCalledTimes(3);
  });
  it("não apresenta um total parcial quando uma página falha", async () => {
    await expect(readReportRows(async () => ({ data: null, error: { message: "Falha de conexão" } }))).rejects.toThrow("Falha de conexão");
  });
  it("fecha receita e lucro de mais de mil vendas com descontos e prejuízos", async () => {
    fixture.tables.sales = Array.from({ length: 1105 }, (_, id) => ({
      id: `sale-${id}`, status: "pago", total_amount: 0.13, total_profit: -0.02,
      paid_at: "2026-10-16T12:00:00Z", created_at: "2026-09-01T12:00:00Z",
    }));
    fixture.tables.cash_flow = [];
    fixture.tables.sale_items = fixture.tables.sales.map(s => ({
      id: s.id, sale_id: s.id, product_id: "beer", quantity: 3,
      subtotal: 0.15, profit: 0, unit_cost: 0.05, products: { name: "Cerveja" },
    }));
    const { result } = renderHook(() => useMonthlyReport(2026, 9), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject({ totalSold: 143.65, totalProfit: -22.1, totalSales: 1105,
      productSales: [{ total_revenue: 143.65, total_profit: -22.1 }] });
  });
  it("preserva o custo total real quando o custo unitário médio tem arredondamento", async () => {
    const now = new Date();
    fixture.tables.sales = [{ id: "mixed", status: "pago", total_amount: 5, total_profit: 1,
      paid_at: new Date(now.getFullYear(), now.getMonth(), 16, 12).toISOString() }];
    fixture.tables.cash_flow = [];
    fixture.tables.sale_items = [{ id: "mixed-item", sale_id: "mixed", product_id: "beer", quantity: 3,
      unit_cost: 1.33, subtotal: 6, profit: 1, products: { name: "Cerveja", category: "Cervejas" } }];
    const { result } = renderHook(useProductSalesReport, { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toMatchObject([{ total_revenue: 5, total_profit: 1, total_cost: 4 }]);
  });
  it("carrega todos os lotes e fecha o investimento sem usar o custo do cadastro", async () => {
    fixture.tables.purchase_batches = Array.from({ length: 1105 }, (_, id) => ({
      id: String(id), product_id: "beer", remaining_quantity: 3, purchase_price: 0.1,
      created_at: "2026-10-01T12:00:00Z", products: { name: "Cerveja" },
    }));
    const { result } = renderHook(() => ({ investment: useCurrentInvestment(), batches: usePurchaseBatches() }), { wrapper });
    await waitFor(() => expect(result.current.investment.isSuccess && result.current.batches.isSuccess).toBe(true));
    expect(result.current.batches.data).toHaveLength(1105);
    expect(result.current.investment.data).toMatchObject({ totalInvested: 331.5,
      byProduct: [{ total_invested: 331.5, total_quantity: 3315 }] });
  });
});
