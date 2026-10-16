import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { previewInstallments } from "@/lib/installments";

interface Props {
  total: number;
  count: string;
  firstDue: string;
  onCountChange: (value: string) => void;
  onFirstDueChange: (value: string) => void;
  minDate?: string;
}

export function InstallmentFields({ total, count, firstDue, onCountChange, onFirstDueChange, minDate }: Props) {
  const { installments, error } = previewInstallments(total, Number(count), firstDue);
  const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
  return <div className="space-y-3">
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="installment-count">Quantidade de parcelas</Label>
        <Input id="installment-count" type="number" min="1" max="120" step="1" required
          value={count} onChange={event => onCountChange(event.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="first-due-date">Primeiro vencimento</Label>
        <Input id="first-due-date" type="date" required min={minDate} value={firstDue}
          onChange={event => onFirstDueChange(event.target.value)} />
      </div>
    </div>
    {installments.length > 0 ? <div className="rounded-lg border p-3 space-y-2">
      <p className="text-sm font-medium">Previsão dos pagamentos</p>
      <ul className="max-h-52 overflow-y-auto space-y-2 text-sm">
        {installments.map(item => <li key={item.number} className="flex justify-between gap-2">
          <span>{item.number}/{installments.length} · {format(parseISO(item.due_date), "dd/MM/yyyy")}</span>
          <span>{currency(item.amount)}</span>
        </li>)}
      </ul>
      <p className="text-sm font-medium border-t pt-2">Total: {currency(total)}</p>
    </div> : total > 0 && firstDue && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}
