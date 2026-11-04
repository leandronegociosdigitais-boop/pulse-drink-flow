import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { ReactNode } from "react";
import VendaDetalhe from "@/pages/VendaDetalhe";
import EditarVenda from "@/pages/EditarVenda";

const fixture = vi.hoisted(() => ({
  sale: { id: "sale-12345678", status: "pago", created_at: "2026-11-03T12:00:00Z", total_amount: 20,
    total_profit: 8, discount_amount: 0, payment_method: "pix", customer: null,
    items: [{ id: "item", product_id: "beer", product_name: "Cerveja", quantity: 2, unit_price: 10, subtotal: 20, profit: 8 }] },
  remove: vi.fn(), update: vi.fn(), pay: vi.fn(),
}));
vi.mock("@/components/layout/AppLayout", () => ({ AppLayout: ({children}: {children: ReactNode}) => <>{children}</> }));
vi.mock("@/components/layout/PageHeader", () => ({ PageHeader: ({title}: {title: string}) => <h1>{title}</h1> }));
vi.mock("@/hooks/useSales", () => ({
  useSaleById: () => ({ data: fixture.sale, isLoading: false }),
  useDeleteSale: () => ({ mutateAsync: fixture.remove, isPending: false }),
  useUpdateSale: () => ({ mutateAsync: fixture.update, isPending: false }),
  useMarkSaleAsPaid: () => ({ mutateAsync: fixture.pay, isPending: false }),
}));
vi.mock("@/hooks/useProducts", () => ({ useProducts: () => ({ data: [{ id: "beer", name: "Cerveja", category: "Bebidas", sale_price: 15, stock_quantity: 0 }] }) }));
vi.mock("@/hooks/useCustomers", () => ({ useCustomers: () => ({data: []}), useCreateCustomer: () => ({mutateAsync: vi.fn()}) }));
const open = (edit=false) => render(<MemoryRouter initialEntries={[edit ? "/vendas/sale-12345678/editar" : "/vendas/sale-12345678"]}>
  <Routes><Route path="/vendas/:id" element={<VendaDetalhe/>}/><Route path="/vendas/:id/editar" element={<EditarVenda/>}/><Route path="/vendas" element={<h1>Vendas</h1>}/></Routes>
</MemoryRouter>);
beforeEach(() => { fixture.sale.status="pago"; vi.clearAllMocks(); fixture.remove.mockResolvedValue({}); fixture.update.mockResolvedValue({}); });
describe("edição e exclusão de vendas confirmadas", () => {
  it("exibe editar e excluir para venda paga sem oferecer novo pagamento", () => {
    open(); expect(screen.getByRole("button",{name:"Editar"})).toBeVisible();
    expect(screen.getByRole("button",{name:"Excluir"})).toBeVisible();
    expect(screen.queryByRole("button",{name:"Marcar como Pago"})).not.toBeInTheDocument();
  });
  it("exige confirmação explícita e explica o estorno do caixa", async () => {
    open(); fireEvent.click(screen.getByRole("button",{name:"Excluir"}));
    expect(screen.getByText(/recebimento desta venda será removido/)).toBeVisible();
    expect(fixture.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Cancelar"}));
    expect(fixture.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Excluir"}));
    fireEvent.click(screen.getAllByRole("button",{name:"Excluir"}).slice(-1)[0]);
    await waitFor(() => expect(fixture.remove).toHaveBeenCalledWith("sale-12345678"));
  });
  it("abre a edição de venda paga e mantém preço negociado e unidades já vendidas", async () => {
    open(true); await screen.findByRole("button",{name:"Salvar Alterações"});
    expect(screen.getByText(/data original do pagamento será mantida/)).toBeVisible();
    fireEvent.click(screen.getByRole("button",{name:"Salvar Alterações"}));
    await waitFor(() => expect(fixture.update).toHaveBeenCalledWith(expect.objectContaining({
      saleId: "sale-12345678", payment_method: "pix", items: [expect.objectContaining({quantity:2,product:expect.objectContaining({sale_price:10})})],
    })));
  });
  it("mantém o pagamento disponível somente para vendas pendentes", () => {
    fixture.sale.status="pendente"; open(); expect(screen.getByRole("button",{name:"Marcar como Pago"})).toBeVisible();
  });
});
