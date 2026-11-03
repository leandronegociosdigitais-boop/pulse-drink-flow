import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateProduct } from "@/hooks/useProducts";
import { toast } from "@/hooks/use-toast";

const categories = ["Cerveja", "Refrigerante", "Água", "Suco", "Energético", "Destilado", "Vinho", "Outros"];

export default function NovoProduto() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  
  const [form, setForm] = useState({
    name: "",
    category: "Cerveja",
    cost_price: "",
    sale_price: "",
    stock_quantity: "",
    min_stock: "5",
  });

  const costPrice = parseFloat(form.cost_price) || 0;
  const salePrice = parseFloat(form.sale_price) || 0;
  const profit = salePrice - costPrice;
  const marginPercent = salePrice > 0 ? (profit / salePrice) * 100 : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast({ title: "Informe o nome do produto", variant: "destructive" });
      return;
    }

    if (costPrice <= 0) {
      toast({ title: "Preço de custo deve ser maior que zero", variant: "destructive" });
      return;
    }

    if (salePrice <= 0) {
      toast({ title: "Preço de venda deve ser maior que zero", variant: "destructive" });
      return;
    }

    if (salePrice < costPrice) {
      toast({ title: "Preço de venda menor que o custo!", variant: "destructive" });
      return;
    }

    await createProduct.mutateAsync({
      name: form.name.trim(),
      category: form.category,
      cost_price: costPrice,
      sale_price: salePrice,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      min_stock: parseInt(form.min_stock) || 5,
    });

    navigate("/estoque");
  };

  return (
    <AppLayout>
      <PageHeader title="Novo Produto" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto</Label>
              <Input
                id="name"
                placeholder="Ex: Cerveja Brahma 350ml"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cost_price">Custo do estoque inicial</Label>
                <Input
                  id="cost_price"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sale_price">Preço de Venda</Label>
                <Input
                  id="sale_price"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.sale_price}
                  onChange={(e) => setForm({ ...form, sale_price: e.target.value })}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">Este custo vale para o estoque inicial. Nas próximas compras, informe o valor pago em cada compra.</p>
            {/* Lucro automático */}
            {salePrice > 0 && (
              <div className={`p-3 rounded-lg ${profit >= 0 ? "bg-primary/10" : "bg-destructive/10"}`}>
                <p className={`text-sm font-medium ${profit >= 0 ? "text-primary" : "text-destructive"}`}>
                  Lucro: R$ {profit.toFixed(2)} ({marginPercent.toFixed(1)}%)
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="stock_quantity">Estoque Atual</Label>
                <Input
                  id="stock_quantity"
                  type="number"
                  placeholder="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_stock">Estoque Mínimo</Label>
                <Input
                  id="min_stock"
                  type="number"
                  placeholder="5"
                  value={form.min_stock}
                  onChange={(e) => setForm({ ...form, min_stock: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createProduct.isPending}>
          {createProduct.isPending ? "Salvando..." : "Cadastrar Produto"}
        </Button>
      </form>
    </AppLayout>
  );
}
