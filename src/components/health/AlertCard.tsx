import { AlertTriangle, BellRing, Check } from "lucide-react";
import type { Alert, Patient, ReviewState } from "@/lib/health/types";
import { CaseFeedback, ReviewStatePill } from "./CaseFeedback";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const severityTone = {
  low: "border-monitor/40 bg-monitor-soft/60",
  medium: "border-review/40 bg-review-soft/60",
  high: "border-critical/50 bg-critical-soft/60",
} as const;

const severityIconTone = {
  low: "text-monitor-foreground",
  medium: "text-review",
  high: "text-critical",
} as const;

export function AlertCard({
  alert,
  patient,
  onAcknowledge,
  onReview,
  reviewPending = false,
  allowEscalate = true,

}: {
  alert: Alert;
  patient?: Patient | null;
  onAcknowledge?: (id: string) => void;
  onReview?: (action: Exclude<ReviewState, "open">, note: string) => void;
  reviewPending?: boolean;
  /** Set false when the worker's assignment has no escalation grant. */
  allowEscalate?: boolean;
}) {
  const Icon = alert.severity === "high" ? AlertTriangle : BellRing;
  return (
    <article
      className={cn(
        "animate-rise rounded-xl border p-4",
        severityTone[alert.severity],
        alert.acknowledged && "opacity-70",
      )}
    >
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
        <Icon className={cn("mt-0.5 size-5 shrink-0", severityIconTone[alert.severity])} aria-hidden />
        <div className="min-w-0">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h4 className="min-w-0 text-sm font-semibold text-foreground">{alert.title}</h4>
            <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase">
              {alert.severity}
            </span>
            <ReviewStatePill state={alert.review_state ?? "open"} />
          </div>
          {patient && (
            <p className="mt-0.5 text-xs font-medium text-foreground/80">
              {patient.name} · {patient.village}
            </p>
          )}
          {alert.body && <p className="mt-1.5 text-sm text-foreground/80">{alert.body}</p>}
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <time className="text-[11px] text-muted-foreground">
              {new Date(alert.created_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </time>
            {alert.requires_review && (
              <span className="text-[11px] font-semibold text-review">
                Human clinical review recommended
              </span>
            )}
            {onAcknowledge && !alert.acknowledged && !onReview && (
              <Button
                size="sm"
                variant="secondary"
                className="ml-auto h-8"
                onClick={() => onAcknowledge(alert.id)}
              >
                <Check className="size-3.5" aria-hidden /> Acknowledge
              </Button>
            )}
            {alert.acknowledged && !onReview && (
              <span className="ml-auto text-[11px] font-semibold text-stable">Acknowledged</span>
            )}
          </div>
          {alert.review_note && (
            <p className="mt-2 rounded-lg border border-border bg-card/70 p-2.5 text-xs text-foreground/85">
              <span className="font-semibold">Reviewer note:</span> {alert.review_note}
            </p>
          )}
          {onReview && (
            <CaseFeedback
              className="mt-3 border-t border-border/70 pt-3"
              currentState={alert.review_state ?? "open"}
              pending={reviewPending}
              allowEscalate={allowEscalate}
              onSubmit={onReview}
            />
          )}
        </div>
      </div>
    </article>
  );
}
