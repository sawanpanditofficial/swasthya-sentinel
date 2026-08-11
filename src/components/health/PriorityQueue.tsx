import type { Patient } from "@/lib/health/types";
import { PatientCard } from "./PatientCard";
import { ListFilter } from "lucide-react";

export function PriorityQueue({
  patients,
  limit = 6,
  title = "Priority queue",
  subtitle = "Ranked by prototype Health Drift — highest deviation first. Not a clinical triage list.",
}: {
  patients: Patient[];
  limit?: number;
  title?: string;
  subtitle?: string;
}) {
  const queue = [...patients]
    .filter((p) => p.drift_score >= 30)
    .sort((a, b) => b.drift_score - a.drift_score)
    .slice(0, limit);

  return (
    <section aria-label={title}>
      <header className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 sm:flex sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold text-foreground">{title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">
          <ListFilter className="size-3.5" aria-hidden />
          {queue.length}
        </span>
      </header>
      {queue.length === 0 ? (
        <p className="surface-card p-5 text-sm text-muted-foreground">
          No deviations above the Monitor threshold right now.
        </p>
      ) : (
        <ul className="space-y-3">
          {queue.map((p, i) => (
            <li key={p.id}>
              <PatientCard patient={p} rank={i + 1} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
