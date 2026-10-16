import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sale, SaleItemInput, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { runOperation } from "@/lib/operations";

interface SaleItemWithProduct {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  subtotal: number;
  profit: number;
  created_at: string;
  product_name: string;
}

interface SaleWithDetails extends Sale {
  customer: { name: string } | null;
  items: SaleItemWithProduct[];
}

export function useSales() {
  return useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*, customers:customer_id(name), sale_items(id, quantity, subtotal, products:product_id(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map(sale => ({ ...sale,
        customer_name: sale.customers?.name ?? null,
        items_summary: sale.sale_items.map(item => ({ id: item.id, quantity: item.quantity,
          subtotal: item.subtotal, product_name: item.products?.name ?? "Produto removido" })),
      })) as Sale[];
    },
  });
}

const PAGE_SIZE = 20;

export function useSalesPage(page: number, filter?: "pagas" | "pendentes") {
  return useQuery({
    queryKey: ["sales", "page", page, filter],
    queryFn: async () => {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("sales")
        .select("*", { count: "exact", head: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (filter === "pagas") query = query.eq("status", "pago");
      if (filter === "pendentes") query = query.eq("status", "pendente");

      const { data, error, count } = await query;
      if (error) throw error;
      return { data: data as Sale[], count: count ?? 0 };
    },
  });
}

export function useSaleById(saleId: string) {
  return useQuery({
    queryKey: ["sales", saleId],
    queryFn: async () => {
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .select(`*, customers:customer_id (name)`)
        .eq("id", saleId)
        .single();
      if (saleError) throw saleError;

      const { data: items, error: itemsError } = await supabase
        .from("sale_items")
        .select(`*, products:product_id (name)`)
        .eq("sale_id", saleId);
      if (itemsError) throw itemsError;

      const saleWithDetails: SaleWithDetails = {
        id: sale.id,
        customer_id: sale.customer_id,
        total_amount: sale.total_amount,
        total_profit: sale.total_profit,
        discount_amount: sale.discount_amount,
        payment_method: sale.payment_method as Sale["payment_method"],
        status: sale.status as "pago" | "pendente",
        created_at: sale.created_at,
        customer: sale.customers as { name: string } | null,
        items: items.map((item) => ({
          ...item,
          product_name: (item.products as { name: string })?.name || "Produto removido",
        })),
      };
      return saleWithDetails;
    },
    enabled: !!saleId,
  });
}

export function useTodaySales() {
  return useQuery({
    queryKey: ["sales", "today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", today.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });
}

export function useMonthSales() {
  return useQuery({
    queryKey: ["sales", "month"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .gte("created_at", startOfMonth.toISOString())
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
  });
}

interface CreateSaleInput {
  items: SaleItemInput[];
  payment_method: PaymentMethod;
  customer_id?: string | null;
  discount_amount?: number;
  status?: "pago" | "pendente";
}

export function useCreateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ items, payment_method, customer_id, discount_amount = 0, status = "pago" }: CreateSaleInput) => {
      return runOperation<Sale>({ action: "create_sale", payment_method, customer_id: customer_id || null,
        discount_amount, status, items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.sale_price })) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_report"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Venda registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar venda", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarkSaleAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => runOperation<Sale>({ action: "pay_sale", id: saleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_report"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Venda marcada como paga!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao marcar venda como paga", description: error.message, variant: "destructive" });
    },
  });
}

interface UpdatePendingSaleInput {
  saleId: string;
  items: SaleItemInput[];
  payment_method: PaymentMethod;
  customer_id?: string | null;
  discount_amount?: number;
}

/**
 * Edit a pending sale: restore previous batches, recompute via FIFO with new items.
 * Only allowed for sales with status="pendente".
 */
export function useUpdatePendingSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ saleId, items, payment_method, customer_id, discount_amount = 0 }: UpdatePendingSaleInput) => {
      return runOperation<Sale>({ action: "update_sale", id: saleId, payment_method, customer_id: customer_id || null,
        discount_amount, items: items.map(i => ({ product_id: i.product.id, quantity: i.quantity, unit_price: i.product.sale_price })) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_report"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Venda pendente atualizada!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar venda", description: error.message, variant: "destructive" });
    },
  });
}

/**
 * Delete a pending sale and restore its stock.
 */
export function useDeletePendingSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (saleId: string) => runOperation({ action: "delete_sale", id: saleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_report"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Venda pendente excluída!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir venda", description: error.message, variant: "destructive" });
    },
  });
}
