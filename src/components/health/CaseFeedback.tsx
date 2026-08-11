import { useState } from "react";
import { CheckCircle2, ArrowUpRight, Archive, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CaseReview, ReviewState } from "@/lib/health/types";

const ACTIONS: {
  action: Exclude<ReviewState, "open">;
  label: string;
  hint: string;
  icon: typeof CheckCircle2;
  tone: string;
}[] = [
  {
    action: "reviewed",
    label: "Mark reviewed",
    hint: "Deviation seen and understood, no further action needed today.",
    icon: CheckCircle2,
    tone: "border-stable/50 text-stable hover:bg-stable-soft",
  },
  {
    action: "escalated",
    label: "Escalate",
    hint: "Send to a clinician queue and raise a referral for review.",
    icon: ArrowUpRight,
    tone: "border-critical/50 text-critical hover:bg-critical-soft",
  },
  {
    action: "closed",
    label: "Close case",
    hint: "Resolved or explained by a known cause — stop tracking this deviation.",
    icon: Archive,
    tone: "border-border text-muted-foreground hover:bg-secondary",
  },
];

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  open: "Awaiting review",
  reviewed: "Reviewed",
  escalated: "Escalated",
  closed: "Closed",
};

export function ReviewStatePill({ state }: { state: ReviewState }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
        state === "open" && "bg-muted text-muted-foreground",
        state === "reviewed" && "bg-stable text-stable-foreground",
        state === "escalated" && "bg-critical text-critical-foreground",
        state === "closed" && "bg-secondary text-secondary-foreground",
      )}
    >
      {REVIEW_STATE_LABEL[state]}
    </span>
  );
}

/**
 * Reviewer feedback controls for a deviation: mark reviewed, escalate or close,
 * with an optional note that is written to an immutable review log.
 */
export function CaseFeedback({
  currentState = "open",
  pending = false,
  compact = false,
  onSubmit,
  className,
}: {
  currentState?: ReviewState;
  pending?: boolean;
  compact?: boolean;
  onSubmit: (action: Exclude<ReviewState, "open">, note: string) => void;
  className?: string;
}) {
  const [note, setNote] = useState("");
  const [active, setActive] = useState<Exclude<ReviewState, "open"> | null>(null);

  return (
    <div className={cn("space-y-3", className)}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Reviewer decision</h4>
          <ReviewStatePill state={currentState} />
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {ACTIONS.map((a) => (
          <Button
            key={a.action}
            type="button"
            variant="outline"
            size="sm"
            title={a.hint}
            disabled={pending}
            aria-pressed={active === a.action}
            className={cn("h-9", a.tone, active === a.action && "ring-2 ring-ring")}
            onClick={() => setActive(a.action)}
          >
            <a.icon className="size-3.5" aria-hidden /> {a.label}
          </Button>
        ))}
      </div>
      {active && (
        <div className="animate-rise space-y-2">
          <Textarea
            value={note}
            maxLength={500}
            rows={2}
            placeholder={
              active === "escalated"
                ? "What should the clinician look at first?"
                : "Optional note for the record (e.g. fasting during festival week)"
            }
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                onSubmit(active, note);
                setNote("");
                setActive(null);
              }}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Confirm {REVIEW_STATE_LABEL[active].toLowerCase()}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setActive(null)}>
              Cancel
            </Button>
            <p className="text-[11px] text-muted-foreground">
              {ACTIONS.find((a) => a.action === active)?.hint}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/** Immutable audit trail of reviewer decisions. */
export function ReviewLog({ reviews }: { reviews: CaseReview[] }) {
  if (reviews.length === 0) return null;
  return (
    <section className="surface-card p-4 sm:p-5" aria-label="Review history">
      <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <History className="size-4 shrink-0 text-primary" aria-hidden /> Review history
      </h3>
      <ol className="mt-3 space-y-3">
        {reviews.map((r) => (
          <li key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
            <ReviewStatePill state={r.action} />
            <div className="min-w-0">
              {r.note && <p className="text-sm text-foreground/85">{r.note}</p>}
              <p className="text-[11px] text-muted-foreground">
                {r.reviewer_name ?? "Health worker"} ·{" "}
                {new Date(r.created_at).toLocaleString("en-IN", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
