import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchReceivedSales, fetchReceivedItems, readReportRows } from "@/lib/reportQueries";
import { receivedBetween, netReceivedItems } from "@/lib/receivedSales";

export interface MonthlyProductSale {
  product_id: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
  total_profit: number;
}

export interface MonthlyReportData {
  monthLabel: string;
  totalSold: number;
  totalProfit: number;
  totalSales: number;
  totalExpenses: number;
  totalInvestment: number;
  productSales: MonthlyProductSale[];
}

/**
 * Get a complete monthly report for a given year/month.
 * month is 0-indexed (0 = January).
 */
export function useMonthlyReport(year: number, month: number) {
  return useQuery({
    queryKey: ["monthly_report", year, month],
    queryFn: async (): Promise<MonthlyReportData> => {
      const start = new Date(year, month, 1, 0, 0, 0, 0);
      const end = new Date(year, month + 1, 1, 0, 0, 0, 0);

      const monthLabel = start.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      });

      // Recognize payment in the month it reaches cash, including legacy receipts.
      const paidSales = receivedBetween(await fetchReceivedSales(), start, end);
      const totalSold = paidSales.reduce((acc, s) => acc + Number(s.total_amount), 0);
      const totalProfit = paidSales.reduce((acc, s) => acc + Number(s.total_profit), 0);
      const totalSales = paidSales.length;

      const saleIds = paidSales.map((s) => s.id);

      // 2. Items per product
      let productSales: MonthlyProductSale[] = [];
      if (saleIds.length > 0) {
        const itemsData = netReceivedItems(paidSales, await fetchReceivedItems(saleIds));

        const map = new Map<string, MonthlyProductSale>();
        for (const item of itemsData || []) {
          const pid = item.product_id;
          const name = (item.products as { name: string } | null)?.name || "Produto removido";
          const cur = map.get(pid);
          if (cur) {
            cur.total_quantity += item.quantity;
            cur.total_revenue += Number(item.subtotal);
            cur.total_profit += Number(item.profit);
          } else {
            map.set(pid, {
              product_id: pid,
              product_name: name,
              total_quantity: item.quantity,
              total_revenue: Number(item.subtotal),
              total_profit: Number(item.profit),
            });
          }
        }
        productSales = Array.from(map.values()).sort(
          (a, b) => b.total_quantity - a.total_quantity
        );
      }

      // 3. Expenses (cash_flow saidas) in the month
      const cashOut = await readReportRows((from, to) => supabase
        .from("cash_flow")
        .select("amount, category")
        .eq("type", "saida")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()).order("id").range(from, to));

      const totalExpenses = (cashOut || []).reduce((acc, c) => acc + Number(c.amount), 0);

      // 4. Investment (purchases) in the month
      const purchases = await readReportRows((from, to) => supabase
        .from("purchases")
        .select("total_amount")
        .gte("created_at", start.toISOString())
        .lt("created_at", end.toISOString()).order("id").range(from, to));

      const totalInvestment = (purchases || []).reduce(
        (acc, p) => acc + Number(p.total_amount),
        0
      );

      return {
        monthLabel,
        totalSold,
        totalProfit,
        totalSales,
        totalExpenses,
        totalInvestment,
        productSales,
      };
    },
  });
}
