import { ArrowDownRight, ArrowRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { Kpi } from "@/lib/analytics/types";

export const CHART_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-chart-5)",
];

/** Format a numeric value for display. Monetary values use ₹ with Indian number grouping. */
export function formatValue(value: number, unit: Kpi["unit"]) {
  if (unit === "percent") return `${value}%`;
  if (unit === "days") return `${value} days`;
  if (unit === "currency") {
    // Indian numbering: lakh (1,00,000) and crore (1,00,00,000)
    return (
      "₹" +
      new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: 0,
      }).format(value)
    );
  }
  return new Intl.NumberFormat("en-IN").format(value);
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const positive =
    kpi.deltaDirection === "flat"
      ? null
      : (kpi.deltaDirection === "up") === (kpi.goodDirection === "up");
  const Icon =
    kpi.deltaDirection === "up" ? ArrowUpRight : kpi.deltaDirection === "down" ? ArrowDownRight : ArrowRight;
  const delta =
    kpi.previous === null || kpi.previous === 0
      ? null
      : Math.round(((kpi.value - kpi.previous) / Math.abs(kpi.previous)) * 1000) / 10;

  return (
    <Card className="gap-2 py-4">
      <CardHeader className="px-4">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {kpi.label}
        </CardDescription>
        <CardTitle className="font-display text-2xl">{formatValue(kpi.value, kpi.unit)}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        {delta !== null ? (
          <div
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              positive === null
                ? "bg-muted text-muted-foreground"
                : positive
                  ? "bg-success/12 text-success"
                  : "bg-destructive/12 text-destructive",
            )}
          >
            <Icon className="size-3" />
            {Math.abs(delta)}% vs prev. quarter
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No comparison period</div>
        )}
        <p className="text-xs text-muted-foreground">{kpi.context}</p>
      </CardContent>
    </Card>
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function InsightNote({ text, icon: Icon }: { text: string; icon?: LucideIcon }) {
  return (
    <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-relaxed">
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0 text-primary" /> : null}
      <p>{text}</p>
    </div>
  );
}

export function LoadingGrid({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-72 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 p-10 text-center">
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  if (normalized === "active" || normalized === "joined" || normalized === "open" || normalized === "filled" || normalized === "accepted") {
    return <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 capitalize">{status}</span>;
  }
  if (normalized === "exited" || normalized === "rejected" || normalized === "closed") {
    return <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400 capitalize">{status}</span>;
  }
  if (normalized === "screened" || normalized === "interviewed" || normalized === "offered" || normalized === "on_hold") {
    return <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400 capitalize">{status.replace("_", " ")}</span>;
  }
  return <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground capitalize">{status}</span>;
}
