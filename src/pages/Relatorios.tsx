import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReceivedSales } from "@/hooks/useReceivedSales";
import { receivedBetween } from "@/lib/receivedSales";
import { useProducts } from "@/hooks/useProducts";
import { useCashFlow } from "@/hooks/useCashFlow";
import { useBills } from "@/hooks/useBills";
import { useProductSalesReport, useMonthlyInvestment } from "@/hooks/useSaleItems";
import { useMonthlyReport } from "@/hooks/useMonthlyReport";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { TrendingUp, DollarSign, Package, Receipt, Trophy, ShoppingCart, Download, CalendarRange } from "lucide-react";
import { useNavigate } from "react-router-dom";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const COLORS = ["hsl(150, 100%, 50%)", "hsl(200, 100%, 50%)", "hsl(280, 100%, 50%)", "hsl(45, 100%, 50%)"];

export default function Relatorios() {
  const navigate = useNavigate();
  const { data: receivedSales = [], isError: receiptsError } = useReceivedSales();
  const { data: products = [] } = useProducts();
  const { data: cashFlow = [] } = useCashFlow();
  const { data: bills = [] } = useBills();
  const { data: productSalesReport = [] } = useProductSalesReport();
  const { data: monthlyInvestment = 0 } = useMonthlyInvestment();

  // Mensal: estado de mês/ano selecionados (padrão: mês atual)
  const today = new Date();
  const monthSales = receivedBetween(receivedSales, new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1));
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const { data: monthlyReport, isLoading: monthlyLoading, isError: monthlyError } = useMonthlyReport(
    selectedYear,
    selectedMonth
  );

  // Lista de meses disponíveis (12 meses retroativos)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    return {
      value: `${d.getFullYear()}-${d.getMonth()}`,
      year: d.getFullYear(),
      month: d.getMonth(),
      label: d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    };
  });

  // Cálculos de vendas
  const totalSold = monthSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalProfit = monthSales.reduce((acc, s) => acc + s.total_profit, 0);
  const avgTicket = monthSales.length > 0 ? totalSold / monthSales.length : 0;

  // Vendas por forma de pagamento
  const salesByPayment = monthSales.reduce((acc, sale) => {
    const key = sale.payment_method;
    acc[key] = (acc[key] || 0) + sale.total_amount;
    return acc;
  }, {} as Record<string, number>);

  const paymentChartData = Object.entries(salesByPayment).map(([name, value]) => ({
    name: name === "dinheiro" ? "Dinheiro" : name === "pix" ? "PIX" : name === "credito" ? "Crédito" : name === "debito" ? "Débito" : "Cartão",
    value,
  }));

  // Margem de lucro
  const profitMargin = totalSold > 0 ? (totalProfit / totalSold) * 100 : 0;

  // Produtos com estoque crítico
  const criticalStock = products.filter((p) => p.stock_quantity <= p.min_stock);

  // Financeiro
  const entries = cashFlow.filter((c) => c.type === "entrada");
  const exits = cashFlow.filter((c) => c.type === "saida");
  const totalEntries = entries.reduce((acc, c) => acc + c.amount, 0);
  const totalExits = exits.reduce((acc, c) => acc + c.amount, 0);

  const paidBills = bills.filter((b) => b.is_paid);
  const pendingBills = bills.filter((b) => !b.is_paid);
  const totalPaidBills = paidBills.reduce((acc, b) => acc + b.amount, 0);
  const totalPendingBills = pendingBills.reduce((acc, b) => acc + b.amount, 0);

  // Top 5 produtos mais vendidos
  const topProducts = productSalesReport.slice(0, 5);

  return (
    <AppLayout>
      <PageHeader 
        title="Relatórios" 
        subtitle="Análise do seu negócio"
        action={
          <Button size="sm" variant="outline" onClick={() => navigate("/backup")}>
            <Download className="w-4 h-4 mr-1" />
            Backup
          </Button>
        }
      />

      <div className="p-4 pb-24">
        <p className="text-xs text-muted-foreground mb-3">Vendas e lucro consideram somente valores recebidos, na data do pagamento.</p>
        {receiptsError && <p role="alert" className="text-sm text-destructive">Não foi possível carregar os recebimentos. Tente atualizar a página.</p>}
        <Tabs defaultValue="mensal" className="w-full">
          <TabsList className="w-full grid grid-cols-6 h-auto mb-2">
            <TabsTrigger value="mensal" className="flex flex-col items-center gap-1 text-[10px] py-2 px-1">
              <CalendarRange className="w-4 h-4" />
              <span>Mensal</span>
            </TabsTrigger>
            <TabsTrigger value="vendas" className="flex flex-col items-center gap-1 text-[10px] py-2 px-1">
              <DollarSign className="w-4 h-4" />
              <span>Vendas</span>
            </TabsTrigger>
            <TabsTrigger value="produtos" className="flex flex-col items-center gap-1 text-[10px] py-2 px-1">
              <ShoppingCart className="w-4 h-4" />
              <span>Produtos</span>
            </TabsTrigger>
            <TabsTrigger value="lucro" className="flex flex-col items-center gap-1 text-[10px] py-2 px-1">
              <TrendingUp className="w-4 h-4" />
              <span>Lucro</span>
            </TabsTrigger>
            <TabsTrigger value="estoque" className="flex flex-col items-center gap-1 text-[10px] py-2 px-1">
              <Package className="w-4 h-4" />
              <span>Estoque</span>
            </TabsTrigger>
            <TabsTrigger value="financeiro" className="flex flex-col items-center gap-1 text-[10px] py-2 px-1">
              <Receipt className="w-4 h-4" />
              <span>Finanças</span>
            </TabsTrigger>
          </TabsList>

          {/* RELATÓRIO MENSAL */}
          <TabsContent value="mensal" className="space-y-4 mt-4">
            <Card>
              <CardContent className="p-3">
                <Select
                  value={`${selectedYear}-${selectedMonth}`}
                  onValueChange={(v) => {
                    const [y, m] = v.split("-").map(Number);
                    setSelectedYear(y);
                    setSelectedMonth(m);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="capitalize">{opt.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {monthlyError ? (
              <p role="alert" className="text-sm text-destructive">Não foi possível carregar o relatório mensal. Tente atualizar a página.</p>
            ) : monthlyLoading || !monthlyReport ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total Recebido</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(monthlyReport.totalSold)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-primary/30 bg-primary/5">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Lucro Recebido no Mês</p>
                      <p className="text-lg font-bold text-primary">
                        {formatCurrency(monthlyReport.totalProfit)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Vendas Recebidas</p>
                      <p className="text-lg font-bold">{monthlyReport.totalSales}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Despesas Total</p>
                      <p className="text-lg font-bold text-destructive">
                        {formatCurrency(monthlyReport.totalExpenses)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="col-span-2 border-warning/30 bg-warning/5">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-muted-foreground">Investido em Compras</p>
                      <p className="text-lg font-bold text-warning">
                        {formatCurrency(monthlyReport.totalInvestment)}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-primary" />
                      Cervejas com pagamento recebido no mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {monthlyReport.productSales.length === 0 ? (
                      <p className="text-center py-4 text-muted-foreground text-sm">
                        Nenhuma venda registrada neste mês
                      </p>
                    ) : (
                      monthlyReport.productSales.map((p, i) => (
                        <div
                          key={p.product_id}
                          className="flex items-center gap-3 py-1 border-b border-border last:border-0"
                        >
                          <Badge
                            variant={i === 0 ? "default" : "secondary"}
                            className="shrink-0"
                          >
                            #{i + 1}
                          </Badge>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {p.product_name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {p.total_quantity} un · {formatCurrency(p.total_revenue)}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-primary font-medium">
                              +{formatCurrency(p.total_profit)}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          {/* RELATÓRIO DE VENDAS */}
          <TabsContent value="vendas" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Recebido</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totalSold)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Vendas Recebidas</p>
                  <p className="text-lg font-bold">{monthSales.length}</p>
                </CardContent>
              </Card>
              <Card className="col-span-2">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(avgTicket)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Por Forma de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                {paymentChartData.length > 0 ? (
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={paymentChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={40}
                          outerRadius={70}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {paymentChartData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    Sem dados no período
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATÓRIO DE PRODUTOS VENDIDOS */}
          <TabsContent value="produtos" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Lucro Recebido no Mês</p>
                  <p className="text-lg font-bold text-primary">{formatCurrency(totalProfit)}</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Investido</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(monthlyInvestment)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-primary" />
                  Produtos com Pagamento Recebido no Mês
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topProducts.length > 0 ? (
                  topProducts.map((product, index) => (
                    <div key={product.product_id} className="flex items-center gap-3">
                      <Badge 
                        variant={index === 0 ? "default" : "secondary"}
                        className={index === 0 ? "glow-neon" : ""}
                      >
                        #{index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {product.total_quantity} un vendidas
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{formatCurrency(product.total_revenue)}</p>
                        <p className="text-xs text-primary">+{formatCurrency(product.total_profit)}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    Nenhuma venda no mês
                  </p>
                )}
              </CardContent>
            </Card>

            {productSalesReport.length > 5 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Todos os Produtos Vendidos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-60 overflow-y-auto">
                  {productSalesReport.map((product) => (
                    <div key={product.product_id} className="flex items-center justify-between text-sm">
                      <span className="truncate flex-1">{product.product_name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{product.total_quantity} un</Badge>
                        <span className="text-primary font-medium">{formatCurrency(product.total_profit)}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* RELATÓRIO DE LUCRO */}
          <TabsContent value="lucro" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Lucro Recebido no Mês</p>
                  <p className="text-lg font-bold text-primary text-glow">
                    {formatCurrency(totalProfit)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Margem</p>
                  <p className="text-lg font-bold">{profitMargin.toFixed(1)}%</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Lucro por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                {topProducts.length > 0 ? (
                  <div className="h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={topProducts.map(p => ({ name: p.product_name.slice(0, 12), profit: p.total_profit }))} 
                        layout="vertical" 
                        margin={{ left: 0 }}
                      >
                        <XAxis type="number" tickFormatter={(v) => `R$${v}`} />
                        <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 10 }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} />
                        <Bar dataKey="profit" fill="hsl(150, 100%, 50%)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center py-4 text-muted-foreground text-sm">
                    Sem vendas no período
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATÓRIO DE ESTOQUE */}
          <TabsContent value="estoque" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Total Produtos</p>
                  <p className="text-lg font-bold">{products.length}</p>
                </CardContent>
              </Card>
              <Card className={criticalStock.length > 0 ? "border-destructive/50" : ""}>
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Estoque Crítico</p>
                  <p className={`text-lg font-bold ${criticalStock.length > 0 ? "text-destructive" : ""}`}>
                    {criticalStock.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {criticalStock.length > 0 && (
              <Card className="border-destructive/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm text-destructive">Produtos Críticos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {criticalStock.map((product) => (
                    <div key={product.id} className="flex items-center justify-between">
                      <span className="text-sm truncate">{product.name}</span>
                      <Badge variant={product.stock_quantity === 0 ? "destructive" : "outline"}>
                        {product.stock_quantity} un
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Estoque por Categoria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(
                  products.reduce((acc, p) => {
                    acc[p.category] = (acc[p.category] || 0) + p.stock_quantity;
                    return acc;
                  }, {} as Record<string, number>)
                ).map(([category, qty]) => (
                  <div key={category} className="flex items-center justify-between">
                    <span className="text-sm">{category}</span>
                    <Badge variant="secondary">{qty} un</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* RELATÓRIO FINANCEIRO */}
          <TabsContent value="financeiro" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="border-success/30 bg-success/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Entradas</p>
                  <p className="text-lg font-bold text-success">{formatCurrency(totalEntries)}</p>
                </CardContent>
              </Card>
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-3 text-center">
                  <p className="text-xs text-muted-foreground">Saídas</p>
                  <p className="text-lg font-bold text-destructive">{formatCurrency(totalExits)}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={`text-2xl font-bold ${totalEntries - totalExits >= 0 ? "text-primary" : "text-destructive"}`}>
                  {formatCurrency(totalEntries - totalExits)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Contas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Contas Pagas</span>
                  <span className="text-sm font-medium text-success">{formatCurrency(totalPaidBills)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Contas Pendentes</span>
                  <span className="text-sm font-medium text-warning">{formatCurrency(totalPendingBills)}</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
