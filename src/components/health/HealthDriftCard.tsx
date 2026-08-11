import { bandMeta, DRIFT_BANDS, DRIFT_DISCLAIMER } from "@/lib/health/drift";
import type { DriftBand } from "@/lib/health/types";
import { bandTextClass, StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { ShieldAlert } from "lucide-react";

export function HealthDriftCard({
  score,
  band,
  deviations = [],
  compact = false,
  className,
}: {
  score: number;
  band: DriftBand;
  deviations?: string[];
  compact?: boolean;
  className?: string;
}) {
  const meta = bandMeta(band);
  const pct = Math.max(2, Math.min(100, score));

  return (
    <section
      className={cn("surface-card animate-rise overflow-hidden p-5 sm:p-6", className)}
      aria-label="Health Drift indicator"
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Health Drift · हेल्थ ड्रिफ्ट
          </p>
          <div className="mt-1 flex items-end gap-2">
            <span className={cn("font-display text-5xl leading-none font-bold", bandTextClass[band])}>
              {score}
            </span>
            <span className="pb-1 text-sm text-muted-foreground">/ 100</span>
          </div>
        </div>
        <StatusBadge band={band} showHindi />
      </div>

      <div className="mt-5">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted" role="presentation">
          <div className="h-full bg-stable" style={{ width: "30%" }} />
          <div className="h-full bg-monitor" style={{ width: "30%" }} />
          <div className="h-full bg-review" style={{ width: "20%" }} />
          <div className="h-full bg-critical" style={{ width: "20%" }} />
        </div>
        <div className="relative mt-1 h-4">
          <div
            className="absolute -translate-x-1/2 transition-all duration-700 ease-out"
            style={{ left: `${pct}%` }}
          >
            <div className="size-3 rotate-45 border-t border-l border-foreground/60 bg-card" />
          </div>
        </div>
        {!compact && (
          <dl className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-muted-foreground sm:grid-cols-4">
            {DRIFT_BANDS.map((b) => (
              <div key={b.band} className="min-w-0">
                <dt className="truncate font-semibold text-foreground/80">{b.label}</dt>
                <dd>{b.range}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <p className="mt-4 rounded-lg bg-primary-soft px-3 py-2 text-sm font-medium text-secondary-foreground">
        {meta.action}
      </p>

      {deviations.length > 0 && (
        <ul className="mt-4 space-y-2">
          {deviations.map((d) => (
            <li key={d} className="flex gap-2 text-sm text-foreground/90">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-review" aria-hidden />
              <span className="min-w-0">{d}</span>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground/80">Prototype thresholds.</span>{" "}
        {DRIFT_DISCLAIMER}
      </p>
    </section>
  );
}
