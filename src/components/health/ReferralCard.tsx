import type { Referral } from "@/lib/health/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Hospital } from "lucide-react";

const statusTone: Record<Referral["status"], string> = {
  pending: "bg-review-soft text-review",
  in_review: "bg-monitor-soft text-monitor-foreground",
  completed: "bg-stable-soft text-stable",
  declined: "bg-muted text-muted-foreground",
};

const statusLabel: Record<Referral["status"], string> = {
  pending: "Awaiting review",
  in_review: "With clinician",
  completed: "Review completed",
  declined: "Declined",
};

export function ReferralCard({
  referral,
  onStatusChange,
}: {
  referral: Referral;
  onStatusChange?: (id: string, status: Referral["status"]) => void;
}) {
  return (
    <article className="surface-card animate-rise p-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            <Hospital className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="truncate">{referral.facility ?? "Nearest PHC"}</span>
          </p>
          {referral.reason && <p className="mt-1 text-sm text-muted-foreground">{referral.reason}</p>}
          <time className="mt-1.5 block text-[11px] text-muted-foreground">
            Raised {new Date(referral.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
          </time>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase",
            statusTone[referral.status],
          )}
        >
          {statusLabel[referral.status]}
        </span>
      </div>
      {onStatusChange && referral.status !== "completed" && (
        <div className="mt-3 flex flex-wrap gap-2">
          {referral.status === "pending" && (
            <Button size="sm" variant="secondary" onClick={() => onStatusChange(referral.id, "in_review")}>
              Assign to clinician
            </Button>
          )}
          <Button size="sm" onClick={() => onStatusChange(referral.id, "completed")}>
            Mark review completed
          </Button>
        </div>
      )}
    </article>
  );
}
