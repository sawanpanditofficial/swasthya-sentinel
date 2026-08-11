import { BedDouble, Building2, Hospital as HospitalIcon, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RiskBadge } from "./RiskBadge";
import { TRIAGE_META, formatWhen } from "@/lib/health/shadow";
import { cn } from "@/lib/utils";
import type {
  DisasterEvent,
  Hospital,
  PatientDisasterStatus,
  TriageStatus,
} from "@/lib/health/shadow-types";
import type { Patient } from "@/lib/health/types";

const TRIAGE_ORDER: TriageStatus[] = [
  "unassessed",
  "needs_help",
  "evacuating",
  "hospitalised",
  "safe",
];

/** Coordinator view of one disaster: who needs help first, and where beds are. */
export function DisasterBoard({
  event,
  rows,
  hospitals,
  onTriage,
  onAssignHospital,
  busy,
}: {
  event: DisasterEvent;
  rows: (PatientDisasterStatus & { patient?: Patient })[];
  hospitals: Hospital[];
  onTriage: (id: string, status: TriageStatus) => Promise<void>;
  onAssignHospital: (id: string, hospitalId: string | null) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const counts = TRIAGE_ORDER.map((status) => ({
    status,
    count: rows.filter((r) => r.triage_status === status).length,
  }));

  const sorted = [...rows].sort((a, b) => {
    const rank = { critical: 0, high: 1, moderate: 2, low: 3 } as const;
    return (
      rank[a.risk_level] - rank[b.risk_level] ||
      TRIAGE_ORDER.indexOf(a.triage_status) - TRIAGE_ORDER.indexOf(b.triage_status)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="size-5 text-primary" aria-hidden />
                {event.name}
              </CardTitle>
              <CardDescription>
                {event.kind} · {event.region ?? "Region not set"} · started{" "}
                {formatWhen(event.started_at)}
              </CardDescription>
            </div>
            <Badge variant={event.status === "active" ? "destructive" : "secondary"} className="capitalize">
              {event.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {counts.map(({ status, count }) => (
              <div
                key={status}
                className={cn("rounded-xl border px-3 py-2", TRIAGE_META[status].tone)}
              >
                <p className="text-2xl font-semibold tabular-nums">{count}</p>
                <p className="text-xs font-medium">{TRIAGE_META[status].label}</p>
              </div>
            ))}
          </div>
          {event.note && <p className="mt-3 text-sm text-muted-foreground">{event.note}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" aria-hidden />
            People to reach, highest attention first
          </CardTitle>
          <CardDescription>
            Ordering uses prototype attention levels from each person's own record — not a clinical
            triage score.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody is tracked in this event yet.</p>
          ) : (
            sorted.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{row.patient?.name ?? "Unnamed"}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.patient?.village ?? "Village not set"} · updated {formatWhen(row.updated_at)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RiskBadge level={row.risk_level} />
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs font-semibold",
                        TRIAGE_META[row.triage_status].tone,
                      )}
                    >
                      {TRIAGE_META[row.triage_status].label}
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr_auto] sm:items-center">
                  <Select
                    value={row.triage_status}
                    disabled={busy ?? false}
                    onValueChange={(v) => void onTriage(row.id, v as TriageStatus)}
                  >
                    <SelectTrigger aria-label={`Triage status for ${row.patient?.name ?? "person"}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TRIAGE_ORDER.map((s) => (
                        <SelectItem key={s} value={s}>
                          {TRIAGE_META[s].label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={row.hospital_id ?? "none"}
                    disabled={busy ?? false}
                    onValueChange={(v) => void onAssignHospital(row.id, v === "none" ? null : v)}
                  >
                    <SelectTrigger aria-label="Assign hospital">
                      <SelectValue placeholder="No hospital assigned" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No hospital assigned</SelectItem>
                      {hospitals.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name} · {h.beds_available} free
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {row.patient && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/patients/$id" params={{ id: row.patient.id }}>
                        Open record
                      </Link>
                    </Button>
                  )}
                </div>
                {row.note && <p className="mt-2 text-xs text-muted-foreground">{row.note}</p>}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/** Live bed availability, editable by hospital users. */
export function HospitalCapacity({
  hospitals,
  onUpdate,
  editable = false,
  busy,
}: {
  hospitals: Hospital[];
  onUpdate?: (id: string, bedsAvailable: number) => Promise<void>;
  editable?: boolean;
  busy?: boolean | undefined;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <HospitalIcon className="size-4" aria-hidden />
          Hospital capacity
        </CardTitle>
        <CardDescription>Demo capacity figures for the prototype walkthrough.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {hospitals.map((h) => {
          const share = h.beds_total > 0 ? h.beds_available / h.beds_total : 0;
          return (
            <div
              key={h.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{h.name}</p>
                <p className="text-xs text-muted-foreground">
                  {h.district ?? "District not set"}
                  {h.has_icu ? " · ICU" : ""}
                  {h.phone ? ` · ${h.phone}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold",
                    share > 0.25
                      ? "bg-stable-soft text-stable border-stable/30"
                      : share > 0.1
                        ? "bg-monitor-soft text-monitor-foreground border-monitor/40"
                        : "bg-critical-soft text-critical border-critical/30",
                  )}
                >
                  <BedDouble className="size-3.5" aria-hidden />
                  {h.beds_available}/{h.beds_total} free
                </span>
                {editable && onUpdate && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || h.beds_available === 0}
                      onClick={() => void onUpdate(h.id, Math.max(0, h.beds_available - 1))}
                    >
                      −1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={busy || h.beds_available >= h.beds_total}
                      onClick={() =>
                        void onUpdate(h.id, Math.min(h.beds_total, h.beds_available + 1))
                      }
                    >
                      +1
                    </Button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
