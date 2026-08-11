import { Link } from "@tanstack/react-router";
import { ChevronRight, MapPin } from "lucide-react";
import type { Patient } from "@/lib/health/types";
import { StatusBadge, bandTextClass } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function PatientCard({ patient, rank }: { patient: Patient; rank?: number }) {
  return (
    <Link
      to="/patients/$id"
      params={{ id: patient.id }}
      className="surface-card group flex min-h-16 items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-raised)] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {rank != null && (
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-sm font-bold text-secondary-foreground">
          {rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="truncate font-semibold text-foreground">{patient.name}</h3>
          <span className="shrink-0 text-xs text-muted-foreground">
            {patient.age ?? "—"} · {patient.sex ?? "—"}
          </span>
        </div>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <MapPin className="size-3 shrink-0" aria-hidden />
          {patient.village ?? "Unknown village"} · baseline: {patient.baseline_profile}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("font-display text-xl leading-none font-bold", bandTextClass[patient.status])}>
          {patient.drift_score}
        </p>
        <StatusBadge band={patient.status} className="mt-1.5" />
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden
      />
    </Link>
  );
}
