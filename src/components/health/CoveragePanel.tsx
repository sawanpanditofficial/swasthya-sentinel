import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MapPin, ShieldCheck, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { listAssignments, removeAssignment, upsertAssignment } from "@/lib/health/api";
import { ALL_VILLAGES, DEMO_VILLAGES, coverageSummary } from "@/lib/health/scope";
import type { WorkerAssignment } from "@/lib/health/types";

/**
 * Village coverage and permission grants for one worker. Cases outside these
 * villages are not returned by the database at all, so this panel is the single
 * place where a worker's reach is widened or narrowed.
 */
export function CoveragePanel({
  workerId,
  className,
}: {
  workerId: string;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const assignmentsQuery = useQuery({
    queryKey: ["assignments", workerId],
    queryFn: () => listAssignments(workerId),
  });
  const assignments = assignmentsQuery.data ?? [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["assignments", workerId] });
    queryClient.invalidateQueries({ queryKey: ["patients"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
  };

  const grant = useMutation({
    mutationFn: (vars: { village: string; can_review: boolean; can_escalate: boolean }) =>
      upsertAssignment(workerId, vars.village, {
        can_review: vars.can_review,
        can_escalate: vars.can_escalate,
      }),
    onSuccess: () => {
      invalidate();
      toast.success("Coverage updated.");
    },
    onError: () => toast.error("Could not update coverage."),
  });

  const revoke = useMutation({
    mutationFn: (id: string) => removeAssignment(id),
    onSuccess: () => {
      invalidate();
      toast.success("Coverage removed. Those cases are hidden again.");
    },
    onError: () => toast.error("Could not remove that assignment."),
  });

  const byVillage = new Map<string, WorkerAssignment>(assignments.map((a) => [a.village, a]));
  const blockWide = byVillage.get(ALL_VILLAGES);

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Assigned coverage">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <UserCog className="size-4 shrink-0 text-primary" aria-hidden /> Your assigned coverage
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {coverageSummary(assignments)} You can only open, review or escalate cases in villages
            assigned to you — everything else is withheld by the database, not just hidden here.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => setOpen((o) => !o)}>
          {open ? "Done" : "Manage"}
        </Button>
      </div>

      {assignmentsQuery.isLoading ? (
        <div className="mt-4 grid place-items-center py-4">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        </div>
      ) : (
        <>
          <ul className="mt-3 flex flex-wrap gap-2">
            {assignments.length === 0 && (
              <li className="rounded-lg border border-monitor/40 bg-monitor-soft/50 px-3 py-2 text-xs text-monitor-foreground">
                No village assigned yet. Add one below to start reviewing cases.
              </li>
            )}
            {assignments.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs"
              >
                <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden />
                <span className="font-semibold text-foreground">
                  {a.village === ALL_VILLAGES ? "Whole block" : a.village}
                </span>
                <span className="text-muted-foreground">
                  {a.can_review ? "review" : "view only"}
                  {a.can_escalate ? " · escalate" : ""}
                </span>
              </li>
            ))}
          </ul>

          {open && (
            <div className="animate-rise mt-4 space-y-2 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">
                In this prototype a worker manages their own coverage so the demo can be walked
                through end to end. In deployment these grants are issued by a PHC administrator.
              </p>
              {[ALL_VILLAGES, ...DEMO_VILLAGES].map((village) => {
                const current = byVillage.get(village);
                const label = village === ALL_VILLAGES ? "Whole block (all villages)" : village;
                const disabled = grant.isPending || revoke.isPending;
                return (
                  <div
                    key={village}
                    className={cn(
                      "rounded-xl border p-3",
                      current ? "border-primary/40 bg-primary/5" : "border-border bg-card",
                    )}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      <p className="min-w-0 flex-1 text-sm font-semibold text-foreground">{label}</p>
                      {current ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-critical"
                          disabled={disabled}
                          onClick={() => revoke.mutate(current.id)}
                        >
                          <Trash2 className="size-3.5" aria-hidden /> Remove
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="h-8"
                          disabled={disabled || (!!blockWide && village !== ALL_VILLAGES)}
                          onClick={() =>
                            grant.mutate({ village, can_review: true, can_escalate: false })
                          }
                        >
                          <ShieldCheck className="size-3.5" aria-hidden /> Assign
                        </Button>
                      )}
                    </div>
                    {current && (
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                          <Label htmlFor={`review-${current.id}`} className="text-xs">
                            Can review cases
                          </Label>
                          <Switch
                            id={`review-${current.id}`}
                            checked={current.can_review}
                            disabled={disabled}
                            onCheckedChange={(v) =>
                              grant.mutate({
                                village,
                                can_review: v,
                                can_escalate: v ? current.can_escalate : false,
                              })
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2">
                          <Label htmlFor={`escalate-${current.id}`} className="text-xs">
                            Can escalate / refer
                          </Label>
                          <Switch
                            id={`escalate-${current.id}`}
                            checked={current.can_escalate}
                            disabled={disabled || !current.can_review}
                            onCheckedChange={(v) =>
                              grant.mutate({ village, can_review: true, can_escalate: v })
                            }
                          />
                        </div>
                      </div>
                    )}
                    {!current && !!blockWide && village !== ALL_VILLAGES && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">
                        Already covered by your block-wide assignment.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </section>
  );
}
