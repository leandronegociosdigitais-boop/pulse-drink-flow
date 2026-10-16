import { useState } from "react";
import { Settings, Target, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useDailyGoal, useSetDailyGoal } from "@/hooks/useDailyGoal";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

interface Props {
  todayTotal: number;
}

export function DailyGoalCard({ todayTotal }: Props) {
  const { data: goal = 0 } = useDailyGoal();
  const setGoal = useSetDailyGoal();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");

  const percent = goal > 0 ? Math.min((todayTotal / goal) * 100, 100) : 0;
  const reached = goal > 0 && todayTotal >= goal;

  const handleSave = async () => {
    const value = parseFloat(input.replace(",", "."));
    if (isNaN(value) || value < 0) {
      toast({ title: "Valor inválido", variant: "destructive" });
      return;
    }
    await setGoal.mutateAsync(value);
    toast({ title: "Meta atualizada!" });
    setOpen(false);
  };

  return (
    <Card className={cn(reached && "border-success/50 bg-success/5")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {reached ? (
              <Trophy className="w-4 h-4 text-success" />
            ) : (
              <Target className="w-4 h-4 text-primary" />
            )}
            <span className="text-sm font-medium">Meta de Recebimentos do Dia</span>
          </div>
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setInput(goal ? String(goal) : ""); }}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <Settings className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definir Meta Diária</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="goal">Valor da meta (R$)</Label>
                <Input
                  id="goal"
                  type="number"
                  inputMode="decimal"
                  placeholder="200,00"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  min="0"
                  step="0.01"
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} disabled={setGoal.isPending}>Salvar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {goal > 0 ? (
          <>
            <Progress
              value={percent}
              className={cn("h-2 mb-2", reached && "[&>div]:bg-success")}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {formatCurrency(todayTotal)} de {formatCurrency(goal)}
              </span>
              <span className={cn("font-semibold", reached ? "text-success" : "text-primary")}>
                {percent.toFixed(0)}%
              </span>
            </div>
            {reached && (
              <p className="text-xs text-success mt-2 font-medium">
                🎉 Parabéns! Meta do dia atingida!
              </p>
            )}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            Defina uma meta diária para acompanhar seu progresso.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
