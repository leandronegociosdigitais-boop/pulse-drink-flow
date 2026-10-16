import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
import { useCreatePurchase } from "@/hooks/usePurchases";

function renderPurchase() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return renderHook(useCreatePurchase, {
    wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>,
  });
}
beforeEach(() => { rpc.mockReset(); rpc.mockResolvedValue({ data: { id: "compra" }, error: null }); });

describe("entrada de estoque e pagamento", () => {
  it("encaminha crédito com parcelas para a operação sem saída de caixa", async () => {
    const { result } = renderPurchase();
    await act(async () => { await result.current.mutateAsync({ product_id: "produto", quantity: 10, unit_cost: 10,
      payment_method: "credito", installment_count: 3, first_due_date: "2090-01-31" }); });
    expect(rpc).toHaveBeenCalledExactlyOnceWith("create_credit_purchase", { p_payload: {
      action: "create_purchase", product_id: "produto", quantity: 10, unit_cost: 10, payment_method: "credito",
      supplier: null, installment_count: 3, first_due_date: "2090-01-31",
    } });
  });
  it("mantém a compra por PIX no pagamento imediato", async () => {
    const { result } = renderPurchase();
    await act(async () => { await result.current.mutateAsync({ product_id: "produto", quantity: 2, unit_cost: 10, payment_method: "pix" }); });
    expect(rpc.mock.calls[0][0]).toBe("app_operation");
  });
  it("recusa crédito incompleto sem tentar lançar pagamento à vista", async () => {
    const { result } = renderPurchase();
    await act(async () => { await expect(result.current.mutateAsync({ product_id: "produto", quantity: 2, unit_cost: 10,
      payment_method: "credito" })).rejects.toThrow("parcelas"); });
    expect(rpc).not.toHaveBeenCalled();
  });
});
