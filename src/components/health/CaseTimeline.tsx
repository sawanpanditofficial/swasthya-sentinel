import { Archive, ArrowUpRight, CheckCircle2, History, RotateCcw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { REVIEW_STATE_LABEL } from "./CaseFeedback";
import type { CaseReview, ReviewState } from "@/lib/health/types";

const ICONS: Record<ReviewState, typeof CheckCircle2> = {
  open: Sparkles,
  reviewed: CheckCircle2,
  escalated: ArrowUpRight,
  closed: Archive,
  reopened: RotateCcw,
};

const TONE: Record<ReviewState, string> = {
  open: "bg-muted text-muted-foreground",
  reviewed: "bg-stable text-stable-foreground",
  escalated: "bg-critical text-critical-foreground",
  closed: "bg-secondary text-secondary-foreground",
  reopened: "bg-monitor text-monitor-foreground",
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

/**
 * Case activity timeline: who reviewed, escalated, reopened or closed each
 * deviation, when, and the note they left. Append-only — entries are never
 * edited or removed.
 */
export function CaseTimeline({
  reviews,
  className,
  emptyHint = "No reviewer activity yet. The first decision on this case will appear here.",
}: {
  reviews: CaseReview[];
  className?: string;
  emptyHint?: string;
}) {
  const current = reviews[0]?.action ?? "open";

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Case activity timeline">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
          <History className="size-4 shrink-0 text-primary" aria-hidden /> Case activity
        </h3>
        <span
          className={cn(
            "ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
            TONE[current],
          )}
        >
          {REVIEW_STATE_LABEL[current]}
        </span>
      </div>

      {reviews.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyHint}</p>
      ) : (
        <ol className="mt-4 space-y-0">
          {reviews.map((r, i) => {
            const Icon = ICONS[r.action];
            return (
              <li key={r.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
                <div className="flex flex-col items-center">
                  <span className={cn("grid size-7 shrink-0 place-items-center rounded-full", TONE[r.action])}>
                    <Icon className="size-3.5" aria-hidden />
                  </span>
                  {i < reviews.length - 1 && <span className="w-px flex-1 bg-border" aria-hidden />}
                </div>
                <div className={cn("min-w-0", i < reviews.length - 1 && "pb-4")}>
                  <p className="text-sm font-semibold text-foreground">
                    {REVIEW_STATE_LABEL[r.action]}
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      by {r.reviewer_name ?? "Health worker"}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {when(r.created_at)}
                    {r.alert_id ? " · on a specific alert" : " · on this person's case"}
                  </p>
                  {r.note && (
                    <p className="mt-1.5 rounded-lg border border-border bg-card/70 p-2.5 text-xs text-foreground/85">
                      {r.note}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <p className="mt-4 border-t border-border pt-3 text-[11px] leading-relaxed text-muted-foreground">
        Decisions are recorded for accountability and cannot be edited. Reopening a closed case always
        requires a fresh resolution note.
      </p>
    </section>
  );
}
