import { cn } from "@/lib/utils";
import { bandMeta } from "@/lib/health/drift";
import type { DriftBand } from "@/lib/health/types";

const tone: Record<DriftBand, string> = {
  stable: "bg-stable-soft text-stable border-stable/30",
  monitor: "bg-monitor-soft text-monitor-foreground border-monitor/40",
  review: "bg-review-soft text-review border-review/30",
  high_priority: "bg-critical-soft text-critical border-critical/30",
};

export function StatusBadge({
  band,
  className,
  showHindi = false,
}: {
  band: DriftBand;
  className?: string;
  showHindi?: boolean;
}) {
  const meta = bandMeta(band);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
        tone[band],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {meta.label}
      {showHindi && <span className="font-medium normal-case opacity-75">{meta.hi}</span>}
    </span>
  );
}

export const bandTextClass: Record<DriftBand, string> = {
  stable: "text-stable",
  monitor: "text-monitor-foreground",
  review: "text-review",
  high_priority: "text-critical",
};

export const bandStrokeVar: Record<DriftBand, string> = {
  stable: "var(--color-stable)",
  monitor: "var(--color-monitor)",
  review: "var(--color-review)",
  high_priority: "var(--color-critical)",
};
