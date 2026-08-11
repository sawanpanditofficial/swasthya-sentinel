import type { HealthCheck } from "./types";
import type { TrendPoint } from "@/components/health/TrendChart";

type Metric = "drift_score" | "reaction_median_ms" | "voice_jitter" | "activity_steps";

/** Oldest-first series for charts, derived from newest-first check history. */
export function toSeries(checks: HealthCheck[], metric: Metric): TrendPoint[] {
  return [...checks]
    .sort((a, b) => a.check_date.localeCompare(b.check_date))
    .map((c) => ({
      label: new Date(c.check_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      value: (c[metric] as number | null) ?? null,
    }));
}
