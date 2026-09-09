import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { CHART_COLORS } from "@/components/talent/primitives";

const axis = {
  stroke: "var(--color-muted-foreground)",
  fontSize: 12,
  tickLine: false,
  axisLine: false,
};

const tooltipStyle = {
  contentStyle: {
    background: "var(--color-popover)",
    border: "1px solid var(--color-border)",
    borderRadius: "0.6rem",
    fontSize: "0.8rem",
    color: "var(--color-popover-foreground)",
  },
};

export function TrendChart({
  data,
  series,
  height = 260,
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
                stopOpacity={0.02}
              />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={56} />
        <Tooltip {...tooltipStyle} />
        {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function LineTrend({
  data,
  series,
  height = 260,
}: {
  data: Record<string, unknown>[];
  series: { key: string; label: string; color?: string }[];
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: -18, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="label" {...axis} />
        <YAxis {...axis} width={56} />
        <Tooltip {...tooltipStyle} />
        {series.length > 1 ? <Legend wrapperStyle={{ fontSize: 12 }} /> : null}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            dot={false}
            strokeWidth={2}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function Bars({
  data,
  dataKey = "value",
  nameKey = "name",
  height = 280,
  layout = "vertical",
  color = CHART_COLORS[0],
  unit,
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
  layout?: "vertical" | "horizontal";
  color?: string;
  unit?: string;
}) {
  const horizontalBars = layout === "vertical";
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout={horizontalBars ? "vertical" : "horizontal"}
        margin={{ left: horizontalBars ? 8 : -18, right: 16, top: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={!horizontalBars} vertical={horizontalBars} />
        {horizontalBars ? (
          <>
            <XAxis type="number" {...axis} {...(unit ? { unit } : {})} />
            <YAxis type="category" dataKey={nameKey} {...axis} width={128} />
          </>
        ) : (
          <>
            <XAxis dataKey={nameKey} {...axis} />
            <YAxis {...axis} width={56} {...(unit ? { unit } : {})} />
          </>
        )}
        <Tooltip {...tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
        <Bar dataKey={dataKey} fill={color} radius={horizontalBars ? [0, 6, 6, 0] : [6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function Donut({
  data,
  height = 280,
  colors = CHART_COLORS,
}: {
  data: { name: string; value: number }[];
  height?: number;
  colors?: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="55%"
          outerRadius="82%"
          paddingAngle={2}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function FunnelBars({
  stages,
}: {
  stages: { key: string; label: string; count: number }[];
}) {
  const max = Math.max(...stages.map((s) => s.count), 1);
  return (
    <div className="space-y-3">
      {stages.map((s, i) => {
        const prev = stages[i - 1]?.count;
        const drop = prev ? Math.round(((prev - s.count) / prev) * 1000) / 10 : null;
        return (
          <div key={s.key}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="font-medium">{s.label}</span>
              <span className="tabular-nums text-muted-foreground">
                {s.count.toLocaleString()}
                {drop !== null ? (
                  <span className="ml-2 text-xs text-destructive">−{drop}%</span>
                ) : null}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max((s.count / max) * 100, 1.5)}%`,
                  backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
