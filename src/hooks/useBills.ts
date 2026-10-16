import { runOperation } from "@/lib/operations";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bill } from "@/types/database";
import { toast } from "@/hooks/use-toast";

export function useBills() {
  return useQuery({
    queryKey: ["bills"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .order("due_date", { ascending: false }).order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Bill[];
    },
  });
}

export function usePendingBills() {
  return useQuery({
    queryKey: ["bills", "pending"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .eq("is_paid", false)
        .order("due_date", { ascending: false }).order("created_at", { ascending: false });
      
      if (error) throw error;
      return data as Bill[];
    },
  });
}

export function useCreateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (bill: { description: string; amount: number; due_date: string; installment_count?: number }) =>
      runOperation<Bill[]>({ description: bill.description, total: bill.amount, first_due_date: bill.due_date,
        installment_count: bill.installment_count ?? 1 }, "create_bill_plan"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      toast({ title: "Conta cadastrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao cadastrar conta", description: error.message, variant: "destructive" });
    },
  });
}

export function useMarkBillAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => runOperation({ action: "pay_bill", id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", "pending"] });
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Conta marcada como paga!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao marcar conta como paga", description: error.message, variant: "destructive" });
    },
  });
}

export function useUpdateBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; description?: string; amount?: number; due_date?: string }) => {
      const { data, error } = await supabase
        .from("bills")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", "pending"] });
      toast({ title: "Conta atualizada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar conta", description: error.message, variant: "destructive" });
    },
  });
}

export function useDeleteBill() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("bills")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bills"] });
      queryClient.invalidateQueries({ queryKey: ["bills", "pending"] });
      toast({ title: "Conta excluída com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir conta", description: error.message, variant: "destructive" });
    },
  });
}
