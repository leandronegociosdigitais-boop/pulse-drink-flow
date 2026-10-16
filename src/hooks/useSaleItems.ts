import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchReceivedSales, fetchReceivedItems } from "@/lib/reportQueries";
import { receivedBetween, netReceivedItems } from "@/lib/receivedSales";

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

interface ProductSalesData {
  product_id: string;
  product_name: string;
  category: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
  total_cost: number;
}

export function useSaleItems(saleId: string) {
  return useQuery({
    queryKey: ["sale_items", saleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select(`
          *,
          products:product_id (name)
        `)
        .eq("sale_id", saleId);
      
      if (error) throw error;
      
      return data.map((item) => ({
        ...item,
        product_name: (item.products as { name: string })?.name || "Produto removido",
      })) as SaleItemWithProduct[];
    },
    enabled: !!saleId,
  });
}

export function useProductSalesReport() {
  return useQuery({
    queryKey: ["product_sales_report"],
    queryFn: async () => {
      const now = new Date();
      const sales = receivedBetween(await fetchReceivedSales(), new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 1, 1));
      const saleIds = sales.map(s => s.id);

      if (saleIds.length === 0) {
        return [];
      }

      const itemsData = netReceivedItems(sales, await fetchReceivedItems(saleIds));

      // Agrupar por produto
      const productMap = new Map<string, ProductSalesData>();

      for (const item of itemsData) {
        const productId = item.product_id;
        const productInfo = item.products as { name: string; category: string } | null;
        
        const existing = productMap.get(productId);
        
        if (existing) {
          existing.total_quantity += item.quantity;
          existing.total_revenue += item.subtotal;
          existing.total_profit += item.profit;
          existing.total_cost += item.unit_cost * item.quantity;
        } else {
          productMap.set(productId, {
            product_id: productId,
            product_name: productInfo?.name || "Produto removido",
            category: productInfo?.category || "Outros",
            total_quantity: item.quantity,
            total_revenue: item.subtotal,
            total_profit: item.profit,
            total_cost: item.unit_cost * item.quantity,
          });
        }
      }

      return Array.from(productMap.values()).sort((a, b) => b.total_quantity - a.total_quantity);
    },
  });
}

export function useMonthlyInvestment() {
  return useQuery({
    queryKey: ["monthly_investment"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("purchases")
        .select("total_amount")
        .gte("created_at", startOfMonth.toISOString());

      if (error) throw error;

      return data.reduce((acc, p) => acc + p.total_amount, 0);
    },
  });
}
