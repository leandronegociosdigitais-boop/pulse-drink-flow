import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Wallet, ShoppingCart, Download, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/dashboard/KPICard";
import { SalesChart } from "@/components/dashboard/SalesChart";
import { InvestmentChart } from "@/components/dashboard/InvestmentChart";
import { DashboardBanner } from "@/components/dashboard/DashboardBanner";
import { DailyGoalCard } from "@/components/dashboard/DailyGoalCard";
import { Button } from "@/components/ui/button";
import { useTodaySales, useMonthSales, useSales } from "@/hooks/useSales";
import { useCashBalance } from "@/hooks/useCashFlow";
import { useCurrentInvestment } from "@/hooks/useInvestment";


function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [chartPeriod, setChartPeriod] = useState("week");
  const { data: todaySales = [] } = useTodaySales();
  const { data: monthSales = [] } = useMonthSales();
  const { data: allSales = [] } = useSales();
  const { data: cashBalance = 0 } = useCashBalance();
  const { data: investment } = useCurrentInvestment();
  const isStandalone =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as unknown as { standalone?: boolean }).standalone === true);

  const INSTALL_BANNER_KEY = "installBannerDismissedAt";
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (isStandalone) {
      setShowInstallBanner(false);
      return;
    }
    try {
      const dismissedAt = Number(localStorage.getItem(INSTALL_BANNER_KEY) || 0);
      setShowInstallBanner(!dismissedAt || Date.now() - dismissedAt > SEVEN_DAYS_MS);
    } catch {
      setShowInstallBanner(true);
    }
  }, [isStandalone, SEVEN_DAYS_MS]);

  const dismissInstallBanner = () => {
    try {
      localStorage.setItem(INSTALL_BANNER_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setShowInstallBanner(false);
  };

  const todayTotal = todaySales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const monthTotal = monthSales.reduce((acc, sale) => acc + sale.total_amount, 0);
  const totalProfit = monthSales.reduce((acc, sale) => acc + sale.total_profit, 0);

  // Gerar dados do gráfico baseado no período selecionado
  const getChartData = () => {
    let days = 7;
    let dateFormat: Intl.DateTimeFormatOptions = { weekday: "short" };
    let salesData = monthSales;

    if (chartPeriod === "day") {
      // Últimas 24 horas por hora
      const hours = Array.from({ length: 24 }, (_, i) => {
        const date = new Date();
        date.setHours(date.getHours() - (23 - i), 0, 0, 0);
        const hourStr = date.toISOString().slice(0, 13);
        
        const hourTotal = todaySales
          .filter((s) => s.created_at.slice(0, 13) === hourStr)
          .reduce((acc, s) => acc + s.total_amount, 0);

        return {
          date: date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          value: hourTotal,
        };
      });
      return hours;
    }

    if (chartPeriod === "month") {
      days = 30;
      dateFormat = { day: "numeric" };
      salesData = allSales;
    }

    return Array.from({ length: days }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (days - 1 - i));
      const dateStr = date.toISOString().split("T")[0];
      
      const dayTotal = salesData
        .filter((s) => s.created_at.startsWith(dateStr))
        .reduce((acc, s) => acc + s.total_amount, 0);

      return {
        date: date.toLocaleDateString("pt-BR", dateFormat),
        value: dayTotal,
      };
    });
  };

  const chartData = getChartData();

  return (
    <AppLayout>
      <PageHeader title="Dashboard" subtitle="Visão geral do seu negócio" />
      
      <div className="p-4 space-y-4 animate-fade-in">
        {/* Banner */}
        <DashboardBanner />

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <KPICard
            title="Vendas Hoje"
            value={formatCurrency(todayTotal)}
            icon={<ShoppingCart className="w-5 h-5" />}
            variant="primary"
          />
          <KPICard
            title="Vendas Mês"
            value={formatCurrency(monthTotal)}
            icon={<DollarSign className="w-5 h-5" />}
          />
          <KPICard
            title="Lucro Total"
            value={formatCurrency(totalProfit)}
            icon={<TrendingUp className="w-5 h-5" />}
            variant="primary"
          />
          <KPICard
            title="Saldo Caixa"
            value={formatCurrency(cashBalance)}
            icon={<Wallet className="w-5 h-5" />}
            variant={cashBalance < 0 ? "destructive" : "default"}
          />
        </div>

        {/* Meta do Dia */}
        <DailyGoalCard todayTotal={todayTotal} />

        {/* Install Banner (após KPIs) */}
        {showInstallBanner && (
          <div className="relative">
            <Button
              variant="outline"
              className="w-full border-primary/30 bg-primary/5 hover:bg-primary/10 pr-10"
              onClick={() => navigate("/instalar")}
            >
              <Download className="w-4 h-4 mr-2 text-primary" />
              <span>Instalar App no Celular</span>
            </Button>
            <button
              type="button"
              aria-label="Dispensar"
              onClick={(e) => {
                e.stopPropagation();
                dismissInstallBanner();
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Gráfico de vendas */}
        <SalesChart data={chartData} period={chartPeriod} onPeriodChange={setChartPeriod} />

        {/* Gráfico de valor investido */}
        <InvestmentChart
          totalInvested={investment?.totalInvested ?? 0}
          byProduct={investment?.byProduct ?? []}
        />
      </div>
    </AppLayout>
  );
}
