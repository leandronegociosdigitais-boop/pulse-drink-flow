import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, History, Check, ChevronDown, ChevronUp } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSales, useMarkSaleAsPaid } from "@/hooks/useSales";

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

const paymentLabels = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  credito: "Crédito",
  debito: "Débito",
  cartao: "Cartão",
};

export default function Vendas() {
  const navigate = useNavigate();
  const { data: sales = [], isLoading } = useSales();
  const markAsPaid = useMarkSaleAsPaid();
  const [filter, setFilter] = useState<"todas" | "pagas" | "pendentes">("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredSales = sales.filter((sale) => {
    if (filter === "pagas") return sale.status === "pago";
    if (filter === "pendentes") return sale.status === "pendente";
    return true;
  });

  const pendingCount = sales.filter((s) => s.status === "pendente").length;

  return (
    <AppLayout>
      <PageHeader
        title="Vendas"
        subtitle="Histórico de vendas"
        action={
          <Button size="sm" onClick={() => navigate("/vendas/nova")}>
            <Plus className="w-4 h-4 mr-1" />
            Nova
          </Button>
        }
      />

      <div className="p-4 space-y-3">
        {/* Filtros */}
        <Tabs value={filter} onValueChange={(v) => setFilter(v as typeof filter)}>
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="todas" className="text-xs">
              Todas
            </TabsTrigger>
            <TabsTrigger value="pagas" className="text-xs">
              Pagas
            </TabsTrigger>
            <TabsTrigger value="pendentes" className="text-xs relative">
              Pendentes
              {pendingCount > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 text-[10px] flex items-center justify-center">
                  {pendingCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma venda {filter === "pagas" ? "paga" : filter === "pendentes" ? "pendente" : "registrada"}</p>
            {filter === "todas" && (
              <Button className="mt-4" onClick={() => navigate("/vendas/nova")}>
                Registrar primeira venda
              </Button>
            )}
          </div>
        ) : (
          filteredSales.map((sale) => {
            const isExpanded = expandedId === sale.id;
            return (
              <Card
                key={sale.id}
                className={`transition-all hover:border-primary/30 ${
                  sale.status === "pendente" ? "border-warning/50 bg-warning/5" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                    >
                      <p className="font-medium text-lg">{formatCurrency(sale.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-primary mt-1">
                        Lucro: {formatCurrency(sale.total_profit)}
                      </p>
                      {(sale.discount_amount ?? 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Desconto: -{formatCurrency(sale.discount_amount ?? 0)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant={sale.status === "pendente" ? "outline" : "secondary"} className={sale.status === "pendente" ? "border-warning text-warning" : ""}>
                        {paymentLabels[sale.payment_method as keyof typeof paymentLabels]}
                      </Badge>
                      {sale.status === "pendente" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 border-success text-success hover:bg-success/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsPaid.mutate(sale.id);
                          }}
                          disabled={markAsPaid.isPending}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Pagar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setExpandedId(isExpanded ? null : sale.id)}
                      >
                        {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    <ul className="space-y-1">
                      {(sale.items_summary || []).map(item => <li key={item.id} className="text-xs flex justify-between gap-2">
                        <span>{item.product_name} × {item.quantity}</span>
                        <span className="text-muted-foreground shrink-0">{formatCurrency(item.subtotal)}</span>
                      </li>)}
                    </ul>
                    <p className="text-sm text-muted-foreground">Cliente: <span className="text-foreground">{sale.customer_name || "Não informado"}</span></p>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border space-y-2">
                      <Button
                        size="sm"
                        variant="link"
                        className="h-6 p-0 text-xs"
                        onClick={() => navigate(`/vendas/${sale.id}`)}
                      >
                        Ver detalhes →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </AppLayout>
  );
}
