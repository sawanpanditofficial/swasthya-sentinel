import { ChevronDown, Info, MinusCircle, ShieldAlert, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { DRIFT_BANDS, DRIFT_DISCLAIMER } from "@/lib/health/drift";
import { explainCheck, type ExplanationVerdict, type SignalExplanation } from "@/lib/health/explain";
import type { HealthCheck } from "@/lib/health/types";

const VERDICT: Record<
  ExplanationVerdict,
  { label: string; pill: string; icon: typeof ShieldAlert }
> = {
  flagged: {
    label: "Flagged",
    pill: "bg-review text-review-foreground",
    icon: TriangleAlert,
  },
  watch: { label: "Watch", pill: "bg-monitor text-monitor-foreground", icon: ShieldAlert },
  within_baseline: {
    label: "Within baseline",
    pill: "bg-stable-soft text-stable",
    icon: MinusCircle,
  },
  no_baseline: { label: "Baseline insufficient", pill: "bg-muted text-muted-foreground", icon: Info },
};

function SignalRow({ s }: { s: SignalExplanation }) {
  const v = VERDICT[s.verdict];
  return (
    <li
      className={cn(
        "rounded-xl border p-3",
        s.verdict === "flagged" ? "border-review/50 bg-review-soft/40" : "border-border bg-card",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <v.icon
          className={cn(
            "size-4 shrink-0",
            s.verdict === "flagged"
              ? "text-review"
              : s.verdict === "watch"
                ? "text-monitor"
                : "text-muted-foreground",
          )}
          aria-hidden
        />
        <h4 className="min-w-0 text-sm font-semibold text-foreground">{s.signal}</h4>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
            v.pill,
          )}
        >
          {v.label}
        </span>
      </div>

      <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
        <div className="min-w-0">
          <dt className="text-muted-foreground">Today</dt>
          <dd className="font-semibold text-foreground">{s.today}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Own baseline (14 days)</dt>
          <dd className="font-semibold text-foreground">{s.baseline}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-muted-foreground">Change</dt>
          <dd className="font-semibold text-foreground">{s.change ?? "—"}</dd>
        </div>
      </dl>

      <p className="mt-2 text-xs leading-relaxed text-foreground/85">{s.reason}</p>
      <p className="mt-1.5 text-[11px] text-muted-foreground">{s.threshold}</p>
    </li>
  );
}

/**
 * Expanded "why was this flagged" panel: each signal is traced to the personal
 * baseline it was compared against and the prototype threshold it crossed.
 */
export function WhyFlagged({
  check,
  history,
  className,
  defaultOpen = false,
}: {
  check: HealthCheck;
  history: HealthCheck[];
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const x = explainCheck(check, history);

  return (
    <section className={cn("surface-card overflow-hidden", className)} aria-label="Why this was flagged">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4 text-left sm:p-5"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">
            Why this was flagged · यह क्यों दर्ज हुआ
          </span>
          <span className="mt-0.5 block text-xs text-muted-foreground">
            {x.flaggedCount > 0
              ? `${x.flaggedCount} signal${x.flaggedCount > 1 ? "s" : ""} outside this person's own baseline · Drift ${x.score} (${x.bandLabel} ${x.bandRange})`
              : `No signal crossed a prototype threshold · Drift ${x.score} (${x.bandLabel} ${x.bandRange})`}
          </span>
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>

      {open && (
        <div className="animate-rise border-t border-border p-4 sm:p-5">
          <p className="text-xs leading-relaxed text-muted-foreground">
            Every comparison below uses this person's own last {x.baselineSamples} check
            {x.baselineSamples === 1 ? "" : "s"} — never a population average.
            {!x.baselineSufficient &&
              " Baseline insufficient for some signals — continue monitoring rather than acting on the score."}
          </p>

          <ul className="mt-3 space-y-2.5">
            {x.signals.map((s) => (
              <SignalRow key={s.key} s={s} />
            ))}
          </ul>

          {x.recordedDeviations.length > 0 && (
            <div className="mt-4">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Deviations recorded with this check
              </h4>
              <ul className="mt-1.5 space-y-1">
                {x.recordedDeviations.map((d) => (
                  <li key={d} className="text-xs text-foreground/85">
                    · {d}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-3">
            <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Prototype threshold labels
            </h4>
            <dl className="mt-2 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
              {DRIFT_BANDS.map((b) => (
                <div
                  key={b.band}
                  className={cn(
                    "min-w-0 rounded-lg px-2 py-1.5",
                    b.band === x.band ? "bg-card ring-1 ring-primary/40" : "",
                  )}
                >
                  <dt className="truncate font-semibold text-foreground/85">{b.label}</dt>
                  <dd className="text-muted-foreground">{b.range}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/80">Not clinically validated.</span>{" "}
              {DRIFT_DISCLAIMER} Recommended next step: {x.recommendation}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
