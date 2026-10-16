import { availableSaleStock, originalSaleProduct } from "@/lib/saleEditing";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Minus, Trash2, ShoppingBag, Percent } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useProducts } from "@/hooks/useProducts";
import { useSaleById, useUpdatePendingSale } from "@/hooks/useSales";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { SaleItemInput, PaymentMethod } from "@/types/database";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function EditarVenda() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: sale, isLoading } = useSaleById(id || "");
  const updateSale = useUpdatePendingSale();
  const createCustomer = useCreateCustomer();

  const [items, setItems] = useState<SaleItemInput[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("dinheiro");
  const [customerName, setCustomerName] = useState("");
  const [search, setSearch] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "value">("value");
  const [discountValue, setDiscountValue] = useState<string>("");
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from existing sale once products + sale are loaded
  useEffect(() => {
    if (!sale || hydrated || products.length === 0) return;
    if (sale.status !== "pendente") {
      toast({
        title: "Venda não pode ser editada",
        description: "Apenas vendas pendentes podem ser modificadas.",
        variant: "destructive",
      });
      navigate(`/vendas/${id}`);
      return;
    }

    const initialItems: SaleItemInput[] = sale.items
      .map((it) => {
        const product = products.find((p) => p.id === it.product_id);
        if (!product) return null;
        return { product: originalSaleProduct(product, it.unit_price), quantity: it.quantity };
      })
      .filter((x): x is SaleItemInput => x !== null);

    setItems(initialItems);
    setPaymentMethod(sale.payment_method);
    setCustomerName(sale.customer?.name || "");
    if (sale.discount_amount && sale.discount_amount > 0) {
      setDiscountType("value");
      setDiscountValue(String(sale.discount_amount));
    }
    setHydrated(true);
  }, [sale, products, hydrated, id, navigate]);

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const subtotal = items.reduce(
    (acc, item) => acc + item.product.sale_price * item.quantity,
    0
  );

  const discountAmount = (() => {
    const val = parseFloat(discountValue) || 0;
    if (discountType === "percent") {
      return Math.min((subtotal * val) / 100, subtotal);
    }
    return Math.min(val, subtotal);
  })();

  const totalAmount = subtotal - discountAmount;

  // Estoque disponível = estoque atual + qty reservada pelos itens ORIGINAIS da venda
  // menos a qty dos itens que o usuário já removeu localmente
  const reservedByThisSale = (productId: string) => {
    if (!sale) return 0;
    return sale.items
      .filter((it) => it.product_id === productId)
      .reduce((acc, it) => acc + it.quantity, 0);
  };

  const availableStock = (productId: string, baseStock: number) =>
    availableSaleStock(baseStock, reservedByThisSale(productId));

  const addItem = (product: typeof products[0]) => {
    const max = availableStock(product.id, product.stock_quantity);
    if (max <= 0) {
      toast({ title: "Produto sem estoque!", variant: "destructive" });
      return;
    }

    const existingIndex = items.findIndex((i) => i.product.id === product.id);

    if (existingIndex >= 0) {
      const currentQty = items[existingIndex].quantity;
      if (currentQty >= max) {
        toast({ title: "Estoque insuficiente!", variant: "destructive" });
        return;
      }
      const newItems = [...items];
      newItems[existingIndex].quantity++;
      setItems(newItems);
    } else {
      setItems([...items, { product, quantity: 1 }]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    const item = newItems[index];
    const newQty = item.quantity + delta;
    const max = availableStock(item.product.id, item.product.stock_quantity);

    if (newQty <= 0) {
      newItems.splice(index, 1);
    } else if (newQty > max) {
      toast({ title: "Estoque insuficiente!", variant: "destructive" });
      return;
    } else {
      newItems[index].quantity = newQty;
    }

    setItems(newItems);
  };

  const handleSubmit = async () => {
    if (!id) return;
    if (items.length === 0) {
      toast({ title: "Adicione pelo menos um produto", variant: "destructive" });
      return;
    }

    let customerId: string | null = null;
    if (customerName.trim()) {
      const existing = customers.find(
        (c) => c.name.toLowerCase() === customerName.toLowerCase().trim()
      );
      if (existing) {
        customerId = existing.id;
      } else {
        const newCustomer = await createCustomer.mutateAsync(customerName.trim());
        customerId = newCustomer.id;
      }
    }

    await updateSale.mutateAsync({
      saleId: id,
      items,
      payment_method: paymentMethod,
      customer_id: customerId,
      discount_amount: discountAmount,
    });

    navigate(`/vendas/${id}`);
  };

  if (isLoading || !hydrated) {
    return (
      <AppLayout>
        <PageHeader title="Editar Venda Pendente" showBack />
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader title="Editar Venda Pendente" showBack />

      <div className="p-4 space-y-4 pb-32">
        <Input
          placeholder="Buscar produto para adicionar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {search && (
          <div className="grid grid-cols-2 gap-2">
            {filteredProducts.slice(0, 6).map((product) => {
              const max = availableStock(product.id, product.stock_quantity);
              return (
                <Card
                  key={product.id}
                  className={cn("cursor-pointer transition-all", max <= 0 && "opacity-50")}
                  onClick={() => addItem(product)}
                >
                  <CardContent className="p-3">
                    <p className="font-medium text-sm truncate">{product.name}</p>
                    <p className="text-primary font-bold">
                      {formatCurrency(product.sale_price)}
                    </p>
                    <Badge
                      variant={max <= 0 ? "destructive" : "secondary"}
                      className="text-xs mt-1"
                    >
                      {Math.max(0, max - (items.find(i => i.product.id === product.id)?.quantity || 0))} un
                    </Badge>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {items.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <ShoppingBag className="w-4 h-4" />
                Itens da Venda
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {items.map((item, index) => (
                <div key={item.product.id} className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(item.product.sale_price)} x {item.quantity}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(index, -1)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <span className="w-6 text-center">{item.quantity}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => updateQuantity(index, 1)}
                    >
                      <Plus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => {
                        const newItems = [...items];
                        newItems.splice(index, 1);
                        setItems(newItems);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Desconto
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder={discountType === "percent" ? "%" : "R$"}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                min="0"
                className="flex-1"
              />
              <Button
                variant={discountType === "percent" ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscountType("percent")}
              >
                %
              </Button>
              <Button
                variant={discountType === "value" ? "default" : "outline"}
                size="sm"
                onClick={() => setDiscountType("value")}
              >
                R$
              </Button>
            </div>
            {discountAmount > 0 && (
              <p className="text-sm text-primary mt-2">
                Desconto: -{formatCurrency(discountAmount)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Forma de Pagamento</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
              className="grid grid-cols-2 gap-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="dinheiro" id="e-dinheiro" />
                <Label htmlFor="e-dinheiro">Dinheiro</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pix" id="e-pix" />
                <Label htmlFor="e-pix">PIX</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="credito" id="e-credito" />
                <Label htmlFor="e-credito">Crédito</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="debito" id="e-debito" />
                <Label htmlFor="e-debito">Débito</Label>
              </div>
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Nome do cliente"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </CardContent>
        </Card>
      </div>

      {items.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 bg-card border-t border-border p-4 z-40">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center justify-between mb-3">
              <div>
                {discountAmount > 0 && (
                  <p className="text-xs text-muted-foreground line-through">
                    {formatCurrency(subtotal)}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-display font-bold text-primary text-glow">
                  {formatCurrency(totalAmount)}
                </p>
              </div>
              <Badge variant="outline" className="text-warning border-warning">
                Pendente
              </Badge>
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={updateSale.isPending}
            >
              {updateSale.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
