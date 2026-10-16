import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CashFlow } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { readReportRows } from "@/lib/reportQueries";

export function useCashFlow() {
  return useQuery({
    queryKey: ["cash_flow"],
    queryFn: async () => {
      const data = await readReportRows((from, to) => supabase
        .from("cash_flow")
        .select("*")
        .order("created_at", { ascending: false }).order("id").range(from, to));
      return data as CashFlow[];
    },
  });
}

export function useCashBalance() {
  return useQuery({
    queryKey: ["cash_flow", "balance"],
    queryFn: async () => {
      const data = await readReportRows((from, to) => supabase
        .from("cash_flow")
        .select("type, amount").order("id").range(from, to));
      
      const entries = data as { type: string; amount: number }[];
      const balance = entries.reduce((acc, entry) => {
        return entry.type === "entrada" ? acc + entry.amount : acc - entry.amount;
      }, 0);
      
      return balance;
    },
  });
}

export function useCreateCashFlowEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: Omit<CashFlow, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("cash_flow")
        .insert(entry)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Registro adicionado ao caixa!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar no caixa", description: error.message, variant: "destructive" });
    },
  });
}

export function useAddCashEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entry: { type: "entrada" | "saida"; category: string; description?: string; amount: number }) => {
      const { data, error } = await supabase
        .from("cash_flow")
        .insert({
          type: entry.type,
          category: entry.category,
          description: entry.description || null,
          amount: entry.amount,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cash_flow"] });
      toast({ title: "Valor adicionado ao caixa!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar valor", description: error.message, variant: "destructive" });
    },
  });
}
