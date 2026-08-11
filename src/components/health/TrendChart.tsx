import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";

export interface TrendPoint {
  label: string;
  value: number | null;
}

export function TrendChart({
  title,
  subtitle,
  data,
  unit = "",
  variant = "area",
  color = "var(--color-chart-1)",
  baseline,
  bands = false,
  height = 200,
  className,
}: {
  title: string;
  subtitle?: string;
  data: TrendPoint[];
  unit?: string;
  variant?: "area" | "line";
  color?: string;
  baseline?: number | null;
  bands?: boolean;
  height?: number;
  className?: string;
}) {
  const gradientId = `grad-${title.replace(/[^a-z]/gi, "")}`;

  return (
    <section className={cn("surface-card animate-rise p-4 sm:p-5", className)}>
      <header className="mb-3 min-w-0">
        <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          {variant === "area" ? (
            <AreaChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                domain={bands ? [0, 100] : ["auto", "auto"]}
              />
              {bands && (
                <>
                  <ReferenceLine y={30} stroke="var(--color-stable)" strokeDasharray="4 4" />
                  <ReferenceLine y={60} stroke="var(--color-review)" strokeDasharray="4 4" />
                  <ReferenceLine y={80} stroke="var(--color-critical)" strokeDasharray="4 4" />
                </>
              )}
              {baseline != null && (
                <ReferenceLine
                  y={baseline}
                  stroke="var(--color-muted-foreground)"
                  strokeDasharray="5 5"
                  label={{
                    value: "personal baseline",
                    fontSize: 10,
                    fill: "var(--color-muted-foreground)",
                    position: "insideTopRight",
                  }}
                />
              )}
              <Tooltip content={<ChartTooltip unit={unit} />} />
              <Area
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.4}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </AreaChart>
          ) : (
            <LineChart data={data} margin={{ top: 6, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                interval="preserveStartEnd"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              {baseline != null && (
                <ReferenceLine y={baseline} stroke="var(--color-muted-foreground)" strokeDasharray="5 5" />
              )}
              <Tooltip content={<ChartTooltip unit={unit} />} />
              <Line
                type="monotone"
                dataKey="value"
                stroke={color}
                strokeWidth={2.4}
                dot={false}
                activeDot={{ r: 4 }}
                connectNulls
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </section>
  );
}

function ChartTooltip({
  active,
  payload,
  label,
  unit,
}: {
  active?: boolean;
  payload?: { value?: number | string }[];
  label?: string;
  unit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-[var(--shadow-raised)]">
      <p className="font-semibold text-popover-foreground">{label}</p>
      <p className="text-muted-foreground">
        {payload[0]?.value}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}
