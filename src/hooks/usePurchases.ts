import { runOperation } from "@/lib/operations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";

export function usePurchases() {
  return useQuery({
    queryKey: ["purchases"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchases")
        .select("*, products(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });
}

export function usePurchaseBatches(productId?: string) {
  return useQuery({
    queryKey: ["purchase_batches", productId],
    queryFn: async () => {
      let query = supabase
        .from("purchase_batches")
        .select("*, products(name)")
        .order("created_at", { ascending: true });
      
      if (productId) {
        query = query.eq("product_id", productId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

interface CreatePurchaseInput {
  product_id: string;
  quantity: number;
  unit_cost: number;
  payment_method: PaymentMethod;
  supplier?: string;
  installment_count?: number;
  first_due_date?: string;
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ product_id, quantity, unit_cost, payment_method, supplier, installment_count, first_due_date }: CreatePurchaseInput) => {
      if (payment_method === "credito" && (!installment_count || !first_due_date))
        throw new Error("Informe as parcelas e o primeiro vencimento do cartão.");
      return runOperation({ action: "create_purchase", product_id, quantity, unit_cost, payment_method,
        supplier: supplier || null, installment_count: installment_count || 1, first_due_date: first_due_date || null },
        payment_method === "credito" ? "create_credit_purchase" : "app_operation");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchases"] });
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["monthly_report"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
      toast({ title: "Compra registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar compra", description: error.message, variant: "destructive" });
    },
  });
}
