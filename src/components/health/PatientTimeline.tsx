import type { HealthCheck } from "@/lib/health/types";
import { SYMPTOM_LABELS } from "@/lib/health/types";
import { bandTextClass, StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";
import { Mic, MicOff, Timer, Footprints } from "lucide-react";

export function PatientTimeline({
  checks,
  limit = 10,
  className,
}: {
  checks: HealthCheck[];
  limit?: number;
  className?: string;
}) {
  const items = checks.slice(0, limit);

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Check timeline">
      <header className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Symptom & check timeline</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Self-reported entries and device signals, most recent first.
        </p>
      </header>
      <ol className="relative space-y-4 border-l border-border pl-5">
        {items.map((c) => {
          const symptoms = SYMPTOM_LABELS.filter((s) => Number(c.symptoms[s.key]) > 0);
          return (
            <li key={c.id} className="relative">
              <span
                className={cn(
                  "absolute top-1.5 -left-[26px] size-3 rounded-full border-2 border-card",
                  c.drift_band === "stable" && "bg-stable",
                  c.drift_band === "monitor" && "bg-monitor",
                  c.drift_band === "review" && "bg-review",
                  c.drift_band === "high_priority" && "bg-critical",
                )}
                aria-hidden
              />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {new Date(c.check_date).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                    <span className={cn("ml-2 font-bold", bandTextClass[c.drift_band])}>
                      drift {c.drift_score}
                    </span>
                  </p>
                  <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Timer className="size-3.5" aria-hidden />
                      {c.reaction_median_ms ?? "—"} ms
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Footprints className="size-3.5" aria-hidden />
                      {c.activity_steps?.toLocaleString("en-IN") ?? "—"} steps
                    </span>
                    <span className="inline-flex items-center gap-1">
                      {c.voice_status === "analysed" ? (
                        <Mic className="size-3.5" aria-hidden />
                      ) : (
                        <MicOff className="size-3.5" aria-hidden />
                      )}
                      voice {c.voice_status}
                    </span>
                  </p>
                  {symptoms.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {symptoms.map((s) => (
                        <li
                          key={s.key}
                          className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground"
                        >
                          {s.en} · {s.hi}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px] text-muted-foreground">No symptoms reported</p>
                  )}
                </div>
                <StatusBadge band={c.drift_band} />
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
