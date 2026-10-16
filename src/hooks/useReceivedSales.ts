import { useQuery } from "@tanstack/react-query";
import { fetchReceivedSales } from "@/lib/reportQueries";

export function useReceivedSales() {
  return useQuery({ queryKey: ["received_sales"], queryFn: fetchReceivedSales });
}
