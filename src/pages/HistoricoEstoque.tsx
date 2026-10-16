import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Filter, Package } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventoryMovements } from "@/hooks/useInventoryMovements";
import { useProducts } from "@/hooks/useProducts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

const movementTypeLabels: Record<string, string> = {
  entrada: "Entrada",
  venda: "Venda",
  ajuste: "Ajuste",
  perda: "Perda",
};

const movementTypeColors: Record<string, string> = {
  entrada: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  venda: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  ajuste: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  perda: "bg-destructive/10 text-destructive border-destructive/20",
};

export default function HistoricoEstoque() {
  const { data: products = [] } = useProducts();
  const [productId, setProductId] = useState<string>("");
  const [movementType, setMovementType] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const { data: movements = [], isLoading } = useInventoryMovements({
    productId: productId && productId !== "all" ? productId : undefined,
    movementType: movementType && movementType !== "all" ? movementType : undefined,
    startDate: startDate ? new Date(startDate).toISOString() : undefined,
    endDate: endDate ? new Date(endDate + "T23:59:59").toISOString() : undefined,
  });

  return (
    <AppLayout>
      <PageHeader title="Histórico de Estoque" subtitle="Movimentações PEPS (FIFO)" showBack />

      <div className="p-4 space-y-4 pb-24">
        {/* Filters */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Filter className="w-4 h-4" />
              Filtros
            </div>
            
            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os produtos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={movementType} onValueChange={setMovementType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="venda">Venda</SelectItem>
                  <SelectItem value="ajuste">Ajuste</SelectItem>
                  <SelectItem value="perda">Perda</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>De</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Até</Label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Movements List */}
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : movements.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma movimentação encontrada</p>
          </div>
        ) : (
          <div className="space-y-2">
            {movements.map((m) => (
              <Card key={m.id}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {m.movement_type === "entrada" ? (
                        <ArrowUpCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <ArrowDownCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">
                          {m.products?.name || "Produto"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(m.movement_date), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                        {m.purchase_batches && (
                          <p className="text-xs text-muted-foreground">
                            Lote: {formatCurrency(m.purchase_batches.purchase_price)}/un
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <Badge variant="outline" className={movementTypeColors[m.movement_type] || ""}>
                        {movementTypeLabels[m.movement_type] || m.movement_type}
                      </Badge>
                      <p className="text-sm font-bold mt-1">
                        {m.movement_type === "entrada" ? "+" : "-"}{m.quantity} un
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Saldo: {m.resulting_stock}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
