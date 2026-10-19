import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: "default" | "primary" | "warning" | "destructive";
}

export function KPICard({ title, value, icon, trend, variant = "default" }: KPICardProps) {
  return (
    <Card className={cn(
      "relative min-w-0 transition-all duration-300 hover:scale-[1.02]",
      variant === "primary" && "border-primary/30 bg-primary/5",
      variant === "warning" && "border-warning/30 bg-warning/5",
      variant === "destructive" && "border-destructive/30 bg-destructive/5"
    )}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <p className="min-w-0 text-[10px] font-medium text-muted-foreground uppercase tracking-wider [overflow-wrap:anywhere]">
            {title}
          </p>
          <div className={cn(
            "shrink-0 p-1.5 rounded-lg",
            variant === "primary" && "bg-primary/10 text-primary",
            variant === "warning" && "bg-warning/10 text-warning",
            variant === "destructive" && "bg-destructive/10 text-destructive",
            variant === "default" && "bg-muted text-muted-foreground"
          )}>
            {icon}
          </div>
        </div>
        <p className={cn(
          "text-base sm:text-xl leading-tight font-sans font-bold tracking-tight tabular-nums [overflow-wrap:anywhere]",
          variant === "primary" && "text-primary text-glow",
          variant === "warning" && "text-warning",
          variant === "destructive" && "text-destructive"
        )}>
          {value}
        </p>
        {trend && (
          <p className={cn(
            "text-xs font-medium",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? "+" : ""}{trend.value}%
          </p>
        )}
      </CardContent>
    </Card>
  );
}
