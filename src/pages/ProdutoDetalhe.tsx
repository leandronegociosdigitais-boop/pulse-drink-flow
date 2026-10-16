import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Trash2, Plus, Minus } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useProducts, useUpdateProduct, useDeleteProduct, useAdjustProductStock } from "@/hooks/useProducts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function ProdutoDetalhe() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { data: products = [], isLoading } = useProducts();
  const updateProduct = useUpdateProduct();
  const adjustProductStock = useAdjustProductStock();
  const deleteProduct = useDeleteProduct();

  const product = products.find((p) => p.id === id);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState(0);
  const [minStock, setMinStock] = useState("");
  const [stockAdjustment, setStockAdjustment] = useState(0);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (product && !initialized) {
      setName(product.name);
      setCategory(product.category);
      setCostPrice(product.cost_price.toString());
      setSalePrice(product.sale_price.toString());
      setStockQuantity(product.stock_quantity);
      setMinStock(product.min_stock.toString());
      setInitialized(true);
    }
  }, [product, initialized]);

  const handleSave = async () => {
    if (!id || !name.trim()) return;

    await updateProduct.mutateAsync({
      id,
      name: name.trim(),
      category: category.trim() || "Outros",
      cost_price: parseFloat(costPrice) || 0,
      sale_price: parseFloat(salePrice) || 0,
      min_stock: parseInt(minStock) || 5,
    });

    if (stockAdjustment !== 0) {
      await adjustProductStock.mutateAsync({
        productId: id,
        adjustment: stockAdjustment,
        unitCost: parseFloat(costPrice) || 0,
      });
    }

    navigate("/estoque");
  };

  const handleDelete = () => {
    if (!id) return;
    deleteProduct.mutate(id, {
      onSuccess: () => navigate("/estoque"),
    });
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <p className="text-muted-foreground">Produto não encontrado</p>
          <Button variant="outline" onClick={() => navigate("/estoque")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </AppLayout>
    );
  }

  const profit = (parseFloat(salePrice) || 0) - (parseFloat(costPrice) || 0);
  const profitMargin = parseFloat(salePrice) > 0 ? (profit / parseFloat(salePrice)) * 100 : 0;
  const finalStock = stockQuantity + stockAdjustment;

  return (
    <AppLayout>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/estoque")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Editar Produto</h1>
              <p className="text-xs text-muted-foreground">Ajuste dados e estoque</p>
            </div>
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="icon">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir produto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O produto será removido permanentemente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={handleSave} disabled={updateProduct.isPending || adjustProductStock.isPending}>
              <Save className="w-4 h-4 mr-1" />
              Salvar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Stock Adjustment Card */}
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span>Ajuste de Estoque</span>
              <span className="text-2xl font-bold text-primary">{finalStock} un</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setStockAdjustment((prev) => prev - 1)}
                disabled={finalStock <= 0}
              >
                <Minus className="w-5 h-5" />
              </Button>
              <div className="text-center min-w-[80px]">
                <p className={`text-2xl font-bold ${stockAdjustment >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {stockAdjustment >= 0 ? "+" : ""}{stockAdjustment}
                </p>
                <p className="text-xs text-muted-foreground">ajuste</p>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={() => setStockAdjustment((prev) => prev + 1)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-3">
              Estoque atual: {stockQuantity} → Novo estoque: {finalStock}
            </p>
          </CardContent>
        </Card>

        {/* Product Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Dados do Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do produto</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Coca-Cola 2L"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Refrigerantes"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
                <Input
                  id="costPrice"
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="salePrice">Preço de Venda (R$)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  step="0.01"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="0,00"
                />
              </div>
            </div>

            {/* Profit Display */}
            <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Lucro por unidade:</span>
                <span className="font-semibold text-primary">
                  {formatCurrency(profit)} ({profitMargin.toFixed(0)}%)
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="minStock">Estoque Mínimo</Label>
              <Input
                id="minStock"
                type="number"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                placeholder="5"
              />
              <p className="text-xs text-muted-foreground">
                Alerta quando o estoque ficar abaixo deste valor
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
