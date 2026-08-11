import { cn } from "@/lib/utils";
import { RISK_META, RISK_TONE } from "@/lib/health/shadow";
import type { RiskLevel } from "@/lib/health/shadow-types";

export function RiskBadge({
  level,
  className,
  showHindi = false,
}: {
  level: RiskLevel;
  className?: string;
  showHindi?: boolean;
}) {
  const meta = RISK_META[level];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
        RISK_TONE[level],
        className,
      )}
    >
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {meta.label} attention
      {showHindi && <span className="font-medium normal-case opacity-75">{meta.hi}</span>}
    </span>
  );
}
