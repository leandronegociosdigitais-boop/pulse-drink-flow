import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/database";
import { readReportRows } from "@/lib/reportQueries";
import { toast } from "@/hooks/use-toast";

interface StockAdjustmentInput {
  productId: string;
  adjustment: number;
  unitCost: number;
}

export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const data = await readReportRows((from, to) => supabase.from("products").select("*").order("name").order("id").range(from, to));
      return data as Product[];
    },
  });
}

export function useLowStockProducts() {
  return useQuery({
    queryKey: ["products", "low-stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("stock_quantity");

      if (error) throw error;
      return (data as Product[]).filter(p => p.stock_quantity <= p.min_stock);
    },
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (product: Omit<Product, "id" | "created_at" | "updated_at">) => {
      const initialStock = Math.max(0, Number(product.stock_quantity) || 0);
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, stock_quantity: 0 })
        .select()
        .single();

      if (error) throw error;

      if (initialStock > 0) {
        const { data: batch, error: batchError } = await supabase
          .from("purchase_batches")
          .insert({
            product_id: data.id,
            initial_quantity: initialStock,
            remaining_quantity: initialStock,
            purchase_price: product.cost_price || 0,
            supplier: "Estoque inicial",
          })
          .select()
          .single();

        if (batchError) throw batchError;

        const { error: mvError } = await supabase.from("inventory_movements").insert({
          product_id: data.id,
          batch_id: batch.id,
          movement_type: "entrada",
          quantity: initialStock,
          unit_price: product.cost_price || 0,
          origin: "ajuste",
          reference_id: batch.id,
          resulting_stock: initialStock,
        });
        if (mvError) console.error("Erro ao registrar movimentação de estoque:", mvError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["investment"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      toast({ title: "Produto cadastrado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao cadastrar produto", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...product }: Partial<Product> & { id: string }) => {
      const { stock_quantity: _stockQuantity, ...productData } = product;
      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["investment"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      toast({ title: "Produto atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar produto", description: error.message, variant: "destructive" });
    },
  });
}

export function useAdjustProductStock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, adjustment, unitCost }: StockAdjustmentInput) => {
      if (adjustment === 0) return;

      if (adjustment > 0) {
        const { data: batch, error: batchError } = await supabase
          .from("purchase_batches")
          .insert({
            product_id: productId,
            initial_quantity: adjustment,
            remaining_quantity: adjustment,
            purchase_price: unitCost || 0,
            supplier: "Ajuste manual de estoque",
          })
          .select()
          .single();

        if (batchError) throw batchError;

        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", productId)
          .single();

        const { error: mvAddError } = await supabase.from("inventory_movements").insert({
          product_id: productId,
          batch_id: batch.id,
          movement_type: "ajuste",
          quantity: adjustment,
          unit_price: unitCost || 0,
          origin: "ajuste",
          reference_id: batch.id,
          resulting_stock: product?.stock_quantity ?? adjustment,
        });
        if (mvAddError) console.error("Erro ao registrar movimentação de estoque:", mvAddError);

        return;
      }

      let remainingToRemove = Math.abs(adjustment);
      const { data: batches, error } = await supabase
        .from("purchase_batches")
        .select("*")
        .eq("product_id", productId)
        .gt("remaining_quantity", 0)
        .order("created_at", { ascending: true });

      if (error) throw error;

      const totalAvailable = (batches || []).reduce(
        (sum, batch) => sum + Number(batch.remaining_quantity),
        0
      );
      if (totalAvailable < remainingToRemove) {
        throw new Error("Estoque insuficiente para este ajuste");
      }

      for (const batch of batches || []) {
        if (remainingToRemove <= 0) break;

        const quantity = Math.min(remainingToRemove, Number(batch.remaining_quantity));
        const { error: updateError } = await supabase
          .from("purchase_batches")
          .update({ remaining_quantity: Number(batch.remaining_quantity) - quantity })
          .eq("id", batch.id);

        if (updateError) throw updateError;

        const { data: product } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", productId)
          .single();

        const { error: mvRemoveError } = await supabase.from("inventory_movements").insert({
          product_id: productId,
          batch_id: batch.id,
          movement_type: "ajuste",
          quantity,
          unit_price: batch.purchase_price,
          origin: "ajuste",
          reference_id: null,
          resulting_stock: product?.stock_quantity ?? 0,
        });
        if (mvRemoveError) console.error("Erro ao registrar movimentação de estoque:", mvRemoveError);

        remainingToRemove -= quantity;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["investment"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      queryClient.invalidateQueries({ queryKey: ["inventory_movements"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao ajustar estoque", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["investment"] });
      queryClient.invalidateQueries({ queryKey: ["purchase_batches"] });
      toast({ title: "Produto excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir produto", description: error.message, variant: "destructive" });
    },
  });
}
