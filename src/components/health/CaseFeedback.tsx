import { useState } from "react";
import { CheckCircle2, ArrowUpRight, Archive, Loader2, RotateCcw, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CaseReview, ReviewState } from "@/lib/health/types";

export type ReviewAction = Exclude<ReviewState, "open">;

const ACTIONS: {
  action: ReviewAction;
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
  {
    action: "reopened",
    label: "Reopen case",
    hint: "New information or a fresh deviation — put this case back in the active queue.",
    icon: RotateCcw,
    tone: "border-monitor/50 text-monitor hover:bg-monitor-soft",
  },
];

export const REVIEW_STATE_LABEL: Record<ReviewState, string> = {
  open: "Awaiting review",
  reviewed: "Reviewed",
  escalated: "Escalated",
  closed: "Closed",
  reopened: "Reopened",
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
        state === "reopened" && "bg-monitor text-monitor-foreground",
      )}
    >
      {REVIEW_STATE_LABEL[state]}
    </span>
  );
}

/**
 * A resolution note is mandatory whenever a case that already has a decision
 * changes status again — including reopening a closed case — so the audit trail
 * always explains why the status moved.
 */
export function requiresResolutionNote(currentState: ReviewState, action: ReviewAction): boolean {
  return action === "reopened" || currentState !== "open";
}

const MIN_NOTE = 8;

/**
 * Reviewer feedback controls for a deviation: mark reviewed, escalate, close or
 * reopen, with a note written to an append-only case activity log.
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
  onSubmit: (action: ReviewAction, note: string) => void;
  className?: string;
}) {
  const [note, setNote] = useState("");
  const [active, setActive] = useState<ReviewAction | null>(null);
  const [touched, setTouched] = useState(false);

  const isClosed = currentState === "closed";
  // A closed case must be reopened before any other decision can be recorded.
  const available = ACTIONS.filter((a) =>
    isClosed ? a.action === "reopened" : a.action !== "reopened" && a.action !== currentState,
  );
  const noteRequired = active ? requiresResolutionNote(currentState, active) : false;
  const noteTooShort = note.trim().length < MIN_NOTE;
  const blocked = noteRequired && noteTooShort;

  return (
    <div className={cn("space-y-3", className)}>
      {!compact && (
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-sm font-semibold text-foreground">Reviewer decision</h4>
          <ReviewStatePill state={currentState} />
        </div>
      )}

      {isClosed && (
        <p className="rounded-lg border border-border bg-secondary/40 p-2.5 text-xs text-muted-foreground">
          This case is closed. Reopen it with a resolution note before recording a new decision.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {available.map((a) => (
          <Button
            key={a.action}
            type="button"
            variant="outline"
            size="sm"
            title={a.hint}
            disabled={pending}
            aria-pressed={active === a.action}
            className={cn("h-9", a.tone, active === a.action && "ring-2 ring-ring")}
            onClick={() => {
              setActive(a.action);
              setTouched(false);
            }}
          >
            <a.icon className="size-3.5" aria-hidden /> {a.label}
          </Button>
        ))}
      </div>

      {active && (
        <div className="animate-rise space-y-2">
          <label className="block text-xs font-semibold text-foreground" htmlFor="resolution-note">
            {noteRequired ? "Resolution note (required)" : "Note (optional)"}
          </label>
          <Textarea
            id="resolution-note"
            value={note}
            maxLength={500}
            rows={2}
            aria-invalid={touched && blocked}
            aria-describedby="resolution-note-hint"
            placeholder={
              active === "reopened"
                ? "Why is this case being reopened? (e.g. drift rose again after closure)"
                : active === "escalated"
                  ? "What should the clinician look at first?"
                  : noteRequired
                    ? "Why is the status changing? This is kept on the record."
                    : "Optional note for the record (e.g. fasting during festival week)"
            }
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => setTouched(true)}
          />
          <p
            id="resolution-note-hint"
            className={cn("text-[11px]", touched && blocked ? "text-critical" : "text-muted-foreground")}
          >
            {noteRequired
              ? blocked
                ? `A resolution note of at least ${MIN_NOTE} characters is required to change a case that has already been decided.`
                : "Saved with your name and the time, and cannot be edited later."
              : ACTIONS.find((a) => a.action === active)?.hint}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={pending || blocked}
              onClick={() => {
                setTouched(true);
                if (blocked) return;
                onSubmit(active, note);
                setNote("");
                setActive(null);
                setTouched(false);
              }}
            >
              {pending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
              Confirm {REVIEW_STATE_LABEL[active].toLowerCase()}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setActive(null);
                setTouched(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Compact audit trail of reviewer decisions (see CaseTimeline for the full view). */
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
