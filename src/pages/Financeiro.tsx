import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useCashFlow, useCashBalance, useAddCashEntry } from "@/hooks/useCashFlow";
import { useBills, useMarkBillAsPaid, useDeleteBill, usePendingBills } from "@/hooks/useBills";
import { format, isBefore, startOfToday, startOfMonth, isAfter, parseISO } from "date-fns";
import { ArrowDownCircle, ArrowUpCircle, AlertCircle, Check, Plus, DollarSign, Package, Clock, ChevronDown, Trash2 } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Financeiro() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: cashFlow = [] } = useCashFlow();
  const { data: cashBalance = 0 } = useCashBalance();
  const { data: bills = [] } = useBills();
  const { data: pendingBills = [] } = usePendingBills();
  const { data: sales = [] } = useSales();
  const pendingSalesTotal = sales
    .filter((s) => s.status === "pendente")
    .reduce((acc, s) => acc + Number(s.total_amount), 0);
  const totalProjected = cashBalance + pendingSalesTotal;
  const markAsPaid = useMarkBillAsPaid();
  const deleteBill = useDeleteBill();
  const addCashEntry = useAddCashEntry();

  // Numeração sequencial das vendas (mais antiga = #001)
  const saleNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    const ordered = [...sales].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    ordered.forEach((s, i) => map.set(s.id, i + 1));
    return map;
  }, [sales]);

  // Buscar itens de todas as vendas referenciadas pelo fluxo de caixa
  const saleIdsInFlow = useMemo(
    () =>
      Array.from(
        new Set(
          cashFlow
            .filter((c) => c.reference_id && (c.reference_type === "venda" || c.reference_type === "sale"))
            .map((c) => c.reference_id as string)
        )
      ),
    [cashFlow]
  );

  const { data: saleItemsBySale = {} } = useQuery({
    queryKey: ["cashflow_sale_items", saleIdsInFlow],
    enabled: saleIdsInFlow.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sale_items")
        .select("sale_id, quantity, products:product_id (name)")
        .in("sale_id", saleIdsInFlow);
      if (error) throw error;
      const grouped: Record<string, string[]> = {};
      for (const item of data as Array<{ sale_id: string; products: { name: string } | null }>) {
        const name = item.products?.name ?? "Produto removido";
        (grouped[item.sale_id] ||= []).push(name);
      }
      return grouped;
    },
  });

  const formatSaleEntry = (entry: typeof cashFlow[0]) => {
    const isSale =
      entry.reference_id &&
      (entry.reference_type === "venda" || entry.reference_type === "sale");
    if (!isSale) return null;
    const num = saleNumberMap.get(entry.reference_id as string);
    const names = saleItemsBySale[entry.reference_id as string] ?? [];
    let productLabel = "";
    if (names.length === 1) productLabel = names[0];
    else if (names.length === 2) productLabel = names.join(", ");
    else if (names.length > 2) productLabel = `${names[0]} + ${names.length - 1} outros`;
    const numLabel = num ? `Venda #${String(num).padStart(3, "0")}` : "Venda";
    return productLabel ? `${numLabel} • ${productLabel}` : numLabel;
  };

  const [cashDialogOpen, setCashDialogOpen] = useState(false);
  const [cashAmount, setCashAmount] = useState("");
  const [cashDescription, setCashDescription] = useState("");
  const [cashFlowVisible, setCashFlowVisible] = useState(20);

  const today = startOfToday();
  const monthStart = startOfMonth(today);
  const overdueBills = pendingBills.filter((b) => isBefore(parseISO(b.due_date), today));

  const monthEntries = cashFlow.filter((c) => c.type === "entrada" && isAfter(new Date(c.created_at), monthStart));
  const monthExits = cashFlow.filter((c) => c.type === "saida" && isAfter(new Date(c.created_at), monthStart));

  const totalEntries = monthEntries.reduce((acc, c) => acc + c.amount, 0);
  const totalExits = monthExits.reduce((acc, c) => acc + c.amount, 0);

  const handleAddCash = async () => {
    const amount = parseFloat(cashAmount);
    if (isNaN(amount) || amount <= 0) return;

    await addCashEntry.mutateAsync({
      type: "entrada",
      category: "Aporte de Caixa",
      description: cashDescription.trim() || "Entrada manual de dinheiro",
      amount,
    });

    setCashAmount("");
    setCashDescription("");
    setCashDialogOpen(false);
  };

  return (
    <AppLayout>
      <PageHeader title="Financeiro" subtitle="Controle financeiro" />

      <div className="p-4 space-y-4">
        {/* Saldo atual */}
        <Card className={cn(
          "border-2",
          cashBalance >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"
        )}>
          <CardContent className="p-4 text-center">
            <p className="text-sm text-muted-foreground mb-1">Saldo Recebido (Caixa)</p>
            <p className={cn(
              "text-3xl font-display font-bold",
              cashBalance >= 0 ? "text-primary text-glow" : "text-destructive"
            )}>
              {formatCurrency(cashBalance)}
            </p>
            <div className="flex justify-center gap-6 mt-3 text-sm">
              <div className="flex items-center gap-1 text-success">
                <ArrowUpCircle className="w-4 h-4" />
                {formatCurrency(totalEntries)}
              </div>
              <div className="flex items-center gap-1 text-destructive">
                <ArrowDownCircle className="w-4 h-4" />
                {formatCurrency(totalExits)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* A Receber + Projetado */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-3 text-center">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-1">
                <Clock className="w-3 h-3" />
                A Receber
              </div>
              <p className="text-lg font-bold text-warning truncate">
                {formatCurrency(pendingSalesTotal)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Vendas pendentes
              </p>
            </CardContent>
          </Card>
          <Card className="border-primary/20 bg-muted/30">
            <CardContent className="p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Saldo Projetado</p>
              <p className={cn(
                "text-lg font-bold truncate",
                totalProjected >= 0 ? "text-primary" : "text-destructive"
              )}>
                {formatCurrency(totalProjected)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Caixa + a receber
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <Dialog open={cashDialogOpen} onOpenChange={setCashDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-16 flex-col gap-1">
                <DollarSign className="w-5 h-5 text-success" />
                <span className="text-xs">Adicionar Caixa</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Adicionar Valor ao Caixa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="cashAmount">Valor (R$)</Label>
                  <Input
                    id="cashAmount"
                    type="number"
                    step="0.01"
                    value={cashAmount}
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cashDescription">Descrição (opcional)</Label>
                  <Input
                    id="cashDescription"
                    value={cashDescription}
                    onChange={(e) => setCashDescription(e.target.value)}
                    placeholder="Ex: Troco inicial do dia"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddCash}
                  disabled={addCashEntry.isPending || !cashAmount}
                >
                  {addCashEntry.isPending ? "Adicionando..." : "Confirmar Entrada"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            className="h-16 flex-col gap-1"
            onClick={() => navigate("/estoque/compra")}
          >
            <Package className="w-5 h-5 text-primary" />
            <span className="text-xs">Comprar Produtos</span>
          </Button>
        </div>

        <Tabs value={searchParams.get("aba") === "contas" ? "contas" : "fluxo"}
          onValueChange={aba => setSearchParams({ aba }, { replace: true })} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="fluxo" className="flex-1">Fluxo de Caixa</TabsTrigger>
            <TabsTrigger value="contas" className="flex-1">
              Contas a Pagar
              {overdueBills.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-xs">
                  {overdueBills.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fluxo" className="space-y-3 mt-4">
            {cashFlow.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma movimentação registrada
              </p>
            ) : (
              cashFlow.slice(0, cashFlowVisible).map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        entry.type === "entrada" ? "bg-success/10" : "bg-destructive/10"
                      )}>
                        {entry.type === "entrada" ? (
                          <ArrowUpCircle className="w-4 h-4 text-success" />
                        ) : (
                          <ArrowDownCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{entry.category}</p>
                        <p className="text-xs text-muted-foreground">
                          {(() => {
                            const saleLabel = formatSaleEntry(entry);
                            const desc = saleLabel ?? entry.description;
                            return (
                              <>
                                {desc && <span>{desc} • </span>}
                                {format(new Date(entry.created_at), "dd/MM HH:mm")}
                              </>
                            );
                          })()}
                        </p>
                      </div>
                    </div>
                    <p className={cn(
                      "font-bold",
                      entry.type === "entrada" ? "text-success" : "text-destructive"
                    )}>
                      {entry.type === "entrada" ? "+" : "-"}{formatCurrency(entry.amount)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
            {cashFlow.length > cashFlowVisible && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => setCashFlowVisible(prev => prev + 20)}
              >
                <ChevronDown className="w-4 h-4 mr-1" />
                Mostrar mais ({cashFlow.length - cashFlowVisible} restantes)
              </Button>
            )}
          </TabsContent>

          <TabsContent value="contas" className="space-y-3 mt-4">
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate("/financeiro/nova-conta")}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nova Conta a Pagar
            </Button>

            {bills.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                Nenhuma conta cadastrada
              </p>
            ) : (
              bills.map((bill) => {
                const isOverdue = !bill.is_paid && isBefore(parseISO(bill.due_date), today);
                
                return (
                  <Card key={bill.id} className={cn(
                    isOverdue && "border-destructive/50 bg-destructive/5"
                  )}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{bill.description}</p>
                            {isOverdue && (
                              <AlertCircle className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Vence: {format(parseISO(bill.due_date), "dd/MM/yyyy")}
                          </p>
                          <p className="font-bold mt-1">{formatCurrency(bill.amount)}</p>
                        </div>
                <div className="shrink-0 flex items-center gap-1">
                  {bill.is_paid ? (
                    <Badge className="bg-success text-success-foreground">
                      <Check className="w-3 h-3 mr-1" />
                      Pago
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => markAsPaid.mutate(bill.id)}
                      disabled={markAsPaid.isPending}
                    >
                      Marcar Pago
                    </Button>
                  )}
                  {!bill.is_paid && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 p-1 h-8 w-8"
                      onClick={() => {
                        if (confirm("Excluir esta conta?")) deleteBill.mutate(bill.id);
                      }}
                      disabled={deleteBill.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
