import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  accent?: boolean;
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  accent = false,
}: MetricCardProps) {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {title}
            </p>
            <p
              className={cn(
                "mt-1.5 text-2xl font-bold tracking-tight",
                accent ? "text-accent" : "text-foreground"
              )}
            >
              {value}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <p
                className={cn(
                  "mt-2 text-xs font-medium",
                  trend.value >= 0 ? "text-emerald-600" : "text-destructive"
                )}
              >
                {trend.value >= 0 ? "+" : ""}
                {trend.value}% {trend.label}
              </p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              accent
                ? "bg-accent/15 text-accent"
                : "bg-primary/10 text-primary"
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
