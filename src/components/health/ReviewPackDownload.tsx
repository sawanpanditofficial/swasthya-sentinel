import { useState } from "react";
import { FileCheck2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadReviewPack } from "@/lib/health/report";
import type { CaseReview, HealthCheck, Patient } from "@/lib/health/types";

/**
 * One-click PHC review pack: bundles the case activity timeline with the
 * baseline-vs-today summary for every signal into a single PDF.
 */
export function ReviewPackDownload({
  patient,
  checks,
  reviews,
  className,
}: {
  patient: Patient;
  checks: HealthCheck[];
  reviews: CaseReview[];
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  function download(days: 14 | 30) {
    setBusy(true);
    try {
      downloadReviewPack(patient, checks, reviews, days);
      toast.success("PHC review pack downloaded.");
    } catch {
      toast.error("Could not build the review pack. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="PHC review pack">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FileCheck2 className="size-4 shrink-0 text-primary" aria-hidden /> PHC review pack
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Everything a clinician needs in one PDF: the case activity timeline with every recorded
        decision, plus a baseline-vs-today chart summary for each signal and the prototype threshold
        it was measured against.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || checks.length === 0} onClick={() => download(14)}>
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <FileCheck2 className="size-3.5" aria-hidden />
          )}
          Review pack · 14 days
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || checks.length === 0}
          onClick={() => download(30)}
        >
          30-day window
        </Button>
      </div>
      {checks.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          No checks recorded for this person yet, so there is nothing to compare.
        </p>
      )}
    </section>
  );
}
