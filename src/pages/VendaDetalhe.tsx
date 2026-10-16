import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Clock, User, Pencil, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { useSaleById, useMarkSaleAsPaid, useDeletePendingSale } from "@/hooks/useSales";
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

export default function VendaDetalhe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: sale, isLoading } = useSaleById(id!);
  const markAsPaid = useMarkSaleAsPaid();
  const deleteSale = useDeletePendingSale();

  if (isLoading) {
    return (
      <AppLayout>
        <div className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            Carregando...
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!sale) {
    return (
      <AppLayout>
        <div className="p-4">
          <div className="text-center py-8 text-muted-foreground">
            Venda não encontrada
          </div>
          <Button onClick={() => navigate("/vendas")} variant="outline" className="w-full">
            Voltar para Vendas
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="bg-card border-b border-border p-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/vendas")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="font-display font-bold text-lg">Venda #{sale.id.slice(0, 8)}</h1>
            <p className="text-xs text-muted-foreground">
              {format(new Date(sale.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
          <Badge 
            variant={sale.status === "pendente" ? "outline" : "default"}
            className={sale.status === "pendente" ? "border-warning text-warning" : "bg-success"}
          >
            {sale.status === "pendente" ? (
              <><Clock className="w-3 h-3 mr-1" /> Pendente</>
            ) : (
              <><Check className="w-3 h-3 mr-1" /> Pago</>
            )}
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4 pb-24">
        {/* Cliente */}
        {sale.customer && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <User className="w-5 h-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                <p className="font-medium">{sale.customer.name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Itens da venda */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Itens da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sale.items.map((item) => (
              <div key={item.id} className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(item.unit_price)} x {item.quantity}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{formatCurrency(item.subtotal)}</p>
                  <p className="text-xs text-primary">{sale.status === "pendente" ? "Previsto: " : ""}+{formatCurrency(item.profit)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Resumo */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{formatCurrency(sale.total_amount + (sale.discount_amount || 0))}</span>
            </div>
            
            {(sale.discount_amount || 0) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Desconto</span>
                <span className="text-destructive">-{formatCurrency(sale.discount_amount || 0)}</span>
              </div>
            )}
            
            <Separator />
            
            <div className="flex justify-between">
              <span className="font-medium">Total</span>
              <span className="font-bold text-lg text-primary">{formatCurrency(sale.total_amount)}</span>
            </div>
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{sale.status === "pendente" ? "Lucro previsto" : "Lucro recebido"}</span>
              <span className="text-primary">{formatCurrency(sale.total_profit)}</span>
            </div>
            
            <Separator />
            
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Forma de Pagamento</span>
              <Badge variant="secondary">
                {paymentLabels[sale.payment_method as keyof typeof paymentLabels]}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Ações para venda pendente */}
        {sale.status === "pendente" && (
          <div className="space-y-2">
            <Button
              className="w-full glow-neon"
              onClick={async () => {
                try {
                  await markAsPaid.mutateAsync(sale.id);
                  navigate("/vendas");
                } catch {
                  // Toast de erro já tratado no onError da mutation
                }
              }}
              disabled={markAsPaid.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              Marcar como Pago
            </Button>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                onClick={() => navigate(`/vendas/${sale.id}/editar`)}
              >
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-destructive border-destructive/50 hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Excluir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir venda pendente?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O estoque dos produtos será restaurado automaticamente. Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        await deleteSale.mutateAsync(sale.id);
                        navigate("/vendas");
                      }}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
