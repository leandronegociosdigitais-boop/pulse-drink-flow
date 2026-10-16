import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface SalesChartProps {
  data: { date: string; value: number }[];
  period: string;
  onPeriodChange: (period: string) => void;
}

export function SalesChart({ data, period, onPeriodChange }: SalesChartProps) {

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Vendas Recebidas</CardTitle>
          <Tabs value={period} onValueChange={onPeriodChange}>
            <TabsList className="h-8">
              <TabsTrigger value="day" className="text-xs px-2 h-6">
                Dia
              </TabsTrigger>
              <TabsTrigger value="week" className="text-xs px-2 h-6">
                Semana
              </TabsTrigger>
              <TabsTrigger value="month" className="text-xs px-2 h-6">
                Mês
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[180px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(150, 100%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(150, 100%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(220, 10%, 60%)" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: "hsl(220, 10%, 60%)" }}
                tickFormatter={(value) => `${value / 1000}k`}
                width={35}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(220, 20%, 10%)",
                  border: "1px solid hsl(220, 15%, 20%)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "hsl(0, 0%, 95%)" }}
                formatter={(value: number) => [formatCurrency(value), "Recebido"]}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(150, 100%, 50%)"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
