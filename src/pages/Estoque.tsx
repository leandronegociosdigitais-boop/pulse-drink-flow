import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Package, History, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function Estoque() {
  const navigate = useNavigate();
  const { data: products = [], isLoading } = useProducts();
  const [search, setSearch] = useState("");
  const [stockFilter, setStockFilter] = useState<"todos" | "zerados" | "criticos">("todos");

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (stockFilter === "zerados") return p.stock_quantity <= 0;
    if (stockFilter === "criticos") return p.stock_quantity <= p.min_stock;
    return true;
  }).sort((a, b) => b.stock_quantity - a.stock_quantity || a.name.localeCompare(b.name, "pt-BR"));

  const zeroCount = products.filter((p) => p.stock_quantity <= 0).length;
  const criticalCount = products.filter((p) => p.stock_quantity <= p.min_stock).length;

  const getStockStatus = (product: typeof products[0]) => {
    if (product.stock_quantity === 0) return "critical";
    if (product.stock_quantity <= product.min_stock) return "low";
    return "ok";
  };

  return (
    <AppLayout>
      <PageHeader
        title="Estoque"
        subtitle={`${products.length} produtos cadastrados`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => navigate("/estoque/historico")}>
              <History className="w-4 h-4 mr-1" />
              Histórico
            </Button>
            <Button size="sm" onClick={() => navigate("/estoque/novo")}>
              <Plus className="w-4 h-4 mr-1" />
              Novo
            </Button>
          </div>
        }
      />

      <div className="p-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar produto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            variant={stockFilter === "todos" ? "default" : "outline"}
            onClick={() => setStockFilter("todos")}
            className="flex-1"
          >
            Todos ({products.length})
          </Button>
          <Button
            size="sm"
            variant={stockFilter === "zerados" ? "default" : "outline"}
            onClick={() => setStockFilter("zerados")}
            className={cn("flex-1", stockFilter === "zerados" && "bg-destructive hover:bg-destructive/90")}
          >
            Zerados ({zeroCount})
          </Button>
          <Button
            size="sm"
            variant={stockFilter === "criticos" ? "default" : "outline"}
            onClick={() => setStockFilter("criticos")}
            className={cn("flex-1", stockFilter === "criticos" && "bg-warning hover:bg-warning/90 text-warning-foreground")}
          >
            Críticos ({criticalCount})
          </Button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const status = getStockStatus(product);
              const profit = product.sale_price - product.cost_price;
              
              return (
                <Card
                  key={product.id}
                  className="cursor-pointer transition-all hover:border-primary/30"
                  onClick={() => navigate(`/estoque/${product.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {status !== "ok" && (
                            <AlertTriangle
                              className={cn(
                                "w-4 h-4 shrink-0",
                                status === "critical" ? "text-destructive" : "text-warning"
                              )}
                            />
                          )}
                          <h3 className="font-medium truncate">{product.name}</h3>
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {product.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>Custo: {formatCurrency(product.cost_price)}</span>
                          <span>Venda: {formatCurrency(product.sale_price)}</span>
                        </div>
                        <p className="text-xs text-primary mt-1">
                          Lucro: {formatCurrency(profit)} ({product.sale_price > 0 ? ((profit / product.sale_price) * 100).toFixed(0) : 0}%)
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <Badge
                          className={cn(
                            status === "critical" && "bg-destructive text-destructive-foreground",
                            status === "low" && "bg-warning text-warning-foreground",
                            status === "ok" && "bg-muted text-muted-foreground"
                          )}
                        >
                          {product.stock_quantity} un
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Mín: {product.min_stock}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </AppLayout>
  );
}
