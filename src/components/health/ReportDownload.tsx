import { useState } from "react";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { downloadPatientReport } from "@/lib/health/report";
import type { HealthCheck, Patient } from "@/lib/health/types";

/** Generates the plain-language baseline report PDF in the browser. */
export function ReportDownload({
  patient,
  checks,
  className,
}: {
  patient: Patient;
  checks: HealthCheck[];
  className?: string;
}) {
  const [busy, setBusy] = useState<14 | 30 | null>(null);

  function download(days: 14 | 30) {
    setBusy(days);
    try {
      downloadPatientReport(patient, checks, days);
      toast.success(`${days}-day report downloaded.`);
    } catch {
      toast.error("Could not build the report. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Download report">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <FileText className="size-4 shrink-0 text-primary" aria-hidden /> Shareable report
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            A one-page PDF with trends, the deviations we noticed, the thresholds used, and a
            plain-language, non-clinical explanation — useful to carry to a PHC visit.
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {([14, 30] as const).map((d) => (
          <Button
            key={d}
            variant={d === 14 ? "default" : "outline"}
            size="sm"
            disabled={busy !== null || checks.length === 0}
            onClick={() => download(d)}
          >
            {busy === d ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              <Download className="size-3.5" aria-hidden />
            )}
            Last {d} days
          </Button>
        ))}
      </div>
      {checks.length === 0 && (
        <p className="mt-2 text-xs text-muted-foreground">
          Complete at least one check to generate a report.
        </p>
      )}
    </section>
  );
}
