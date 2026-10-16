import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateBill } from "@/hooks/useBills";
import { toast } from "@/hooks/use-toast";
import { InstallmentFields } from "@/components/InstallmentFields";
import { buildInstallments } from "@/lib/installments";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NovaConta() {
  const navigate = useNavigate();
  const createBill = useCreateBill();
  const [installmentCount, setInstallmentCount] = useState("1");
  const [amountMode, setAmountMode] = useState<"total" | "installment">("total");
  
  const [form, setForm] = useState({
    description: "",
    amount: "",
    due_date: "",
  });
  const amount = Number(form.amount);
  const total = Math.round((amount * (amountMode === "installment" ? Number(installmentCount) : 1) + Number.EPSILON) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.description.trim()) {
      toast({ title: "Informe a descrição", variant: "destructive" });
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast({ title: "Informe o valor", variant: "destructive" });
      return;
    }

    if (!form.due_date) {
      toast({ title: "Informe a data de vencimento", variant: "destructive" });
      return;
    }

    try { buildInstallments(total, Number(installmentCount), form.due_date); }
    catch (error) {
      toast({ title: "Confira as parcelas", description: (error as Error).message, variant: "destructive" });
      return;
    }

    try { await createBill.mutateAsync({
      description: form.description.trim(),
      amount: total,
      due_date: form.due_date,
      installment_count: Number(installmentCount),
    });

    navigate("/financeiro?aba=contas");
    } catch { /* The mutation displays the error; keep the form for retry. */ }
  };

  return (
    <AppLayout>
      <PageHeader title="Nova Conta" showBack />

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                placeholder="Ex: Aluguel, Energia, Fornecedor..."
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-mode">O valor informado corresponde a</Label>
              <Select value={amountMode} onValueChange={value => setAmountMode(value as typeof amountMode)}>
                <SelectTrigger id="amount-mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="total">Valor total da conta</SelectItem>
                  <SelectItem value="installment">Valor de cada parcela</SelectItem>
                </SelectContent>
              </Select>
              <Label htmlFor="amount">{amountMode === "total" ? "Valor total (R$)" : "Valor de cada parcela (R$)"}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>

            <InstallmentFields total={total} count={installmentCount} firstDue={form.due_date}
              onCountChange={setInstallmentCount} onFirstDueChange={due_date => setForm({ ...form, due_date })} />
            <p className="text-xs text-muted-foreground">Os próximos vencimentos são preenchidos mês a mês. O caixa só muda quando uma parcela for paga.</p>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={createBill.isPending}>
          {createBill.isPending ? "Salvando..." : "Cadastrar Conta"}
        </Button>
      </form>
    </AppLayout>
  );
}
