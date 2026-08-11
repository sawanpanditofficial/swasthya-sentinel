import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  History,
  Loader2,
  PauseCircle,
  ShieldCheck,
  ShieldOff,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { listConsentEvents, saveGuardian, setConsentScope } from "@/lib/health/api";
import { CONSENT_SCOPES, CONSENT_SCOPE_LABEL, pausedScopes } from "@/lib/health/scope";
import type { ConsentEvent, ConsentScope, Profile } from "@/lib/health/types";

interface PendingChange {
  scope: ConsentScope;
  granted: boolean;
  label: string;
  consequence: string;
}

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function ConsentLog({ events }: { events: ConsentEvent[] }) {
  return (
    <div className="mt-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        <History className="size-3.5" aria-hidden /> Consent history
      </h3>
      {events.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">
          No consent changes recorded yet. Every future change is stored here with its exact time.
        </p>
      ) : (
        <ol className="mt-2 divide-y divide-border">
          {events.map((e) => (
            <li key={e.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-2.5">
              <span
                className={cn(
                  "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full",
                  e.granted ? "bg-stable text-stable-foreground" : "bg-critical text-critical-foreground",
                )}
              >
                {e.granted ? (
                  <ShieldCheck className="size-3" aria-hidden />
                ) : (
                  <ShieldOff className="size-3" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {CONSENT_SCOPE_LABEL[e.scope]} {e.granted ? "allowed" : "paused"}
                  <span className="font-normal text-muted-foreground">
                    {" "}
                    by {e.actor === "guardian" ? (e.actor_name ?? "guardian") : "the person themselves"}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground">{when(e.created_at)}</p>
                {e.note && (
                  <p className="mt-1 rounded-lg border border-border bg-card/70 p-2 text-xs text-foreground/85">
                    {e.note}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/**
 * Consent centre for a citizen or their guardian: shows exactly which parts of
 * the daily check are paused right now, the full history of consent changes, and
 * updates consent behind an explicit confirmation that states the consequence.
 */
export function ConsentCenter({ profile, className }: { profile: Profile; className?: string }) {
  const queryClient = useQueryClient();
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [note, setNote] = useState("");
  const [asGuardian, setAsGuardian] = useState(!!profile.guardian_name);
  const [guardianName, setGuardianName] = useState(profile.guardian_name ?? "");
  const [guardianRelation, setGuardianRelation] = useState(profile.guardian_relation ?? "");

  useEffect(() => {
    setGuardianName(profile.guardian_name ?? "");
    setGuardianRelation(profile.guardian_relation ?? "");
  }, [profile.guardian_name, profile.guardian_relation]);

  const eventsQuery = useQuery({
    queryKey: ["consent-events", profile.id],
    queryFn: () => listConsentEvents(profile.id),
  });

  const change = useMutation({
    mutationFn: (c: PendingChange) =>
      setConsentScope({
        userId: profile.id,
        scope: c.scope,
        granted: c.granted,
        actor: asGuardian ? "guardian" : "self",
        actorName: asGuardian ? guardianName.trim() || "Guardian" : (profile.full_name ?? null),
        note,
      }),
    onSuccess: (_d, c) => {
      queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      queryClient.invalidateQueries({ queryKey: ["consent-events", profile.id] });
      setPending(null);
      setNote("");
      toast.success(
        c.granted ? `${c.label} is being collected again.` : `${c.label} is now paused.`,
      );
    },
    onError: () => toast.error("Could not update consent."),
  });

  const guardian = useMutation({
    mutationFn: () =>
      saveGuardian(profile.id, {
        guardian_name: guardianName.trim() || null,
        guardian_relation: guardianRelation.trim() || null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", profile.id] });
      toast.success("Guardian details saved.");
    },
    onError: () => toast.error("Could not save guardian details."),
  });

  const paused = pausedScopes(profile);
  const allPaused = !profile.consent_given;

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Consent centre">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden /> Consent centre ·
        सहमति केंद्र
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        Consent is per signal. Pausing one part of the check leaves the rest working, and the paused
        signal is simply left out of the drift score instead of being guessed.
      </p>

      {/* Currently paused summary */}
      <div
        className={cn(
          "mt-3 rounded-xl border p-3",
          paused.length === 0
            ? "border-stable/40 bg-stable-soft/40"
            : "border-monitor/50 bg-monitor-soft/40",
        )}
      >
        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <PauseCircle className="size-4 shrink-0" aria-hidden />
          {paused.length === 0
            ? "Nothing is paused — the full check is active."
            : allPaused
              ? "All monitoring is paused."
              : `Paused right now: ${paused.join(", ")}`}
        </p>
        {allPaused && (
          <p className="mt-1 text-xs text-muted-foreground">
            No new checks, scores or alerts are created. Past entries stay visible to the person
            until they ask for deletion.
            {profile.consent_revoked_at ? ` Withdrawn ${when(profile.consent_revoked_at)}.` : ""}
          </p>
        )}
      </div>

      {/* Master switch */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">All monitoring</p>
          <p className="text-xs text-muted-foreground">
            The single switch that stops or resumes everything at once.
          </p>
        </div>
        <Switch
          aria-label="All monitoring"
          checked={profile.consent_given}
          disabled={change.isPending}
          onCheckedChange={(v) =>
            setPending({
              scope: "all",
              granted: v,
              label: "All monitoring",
              consequence: v
                ? "Daily checks, drift scores and alerts resume from the next check onwards. Nothing is back-filled for the paused period."
                : "New checks, drift scores and alerts stop immediately and this case leaves the worker's priority queue. Existing entries remain visible to the person and can be deleted on request.",
            })
          }
        />
      </div>

      {/* Per-signal switches */}
      <ul className="mt-2 space-y-2">
        {CONSENT_SCOPES.map((s) => {
          const on = profile[s.field] !== false;
          return (
            <li
              key={s.scope}
              className={cn(
                "rounded-xl border p-3",
                allPaused ? "border-border bg-secondary/30 opacity-70" : "border-border bg-card",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-foreground">
                    {s.label} · {s.hi}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.detail}</p>
                  {(!on || allPaused) && (
                    <p className="mt-1 text-xs font-medium text-monitor-foreground">
                      Paused: {s.paused}
                    </p>
                  )}
                </div>
                <Switch
                  aria-label={s.label}
                  checked={on && !allPaused}
                  disabled={change.isPending || allPaused}
                  onCheckedChange={(v) =>
                    setPending({
                      scope: s.scope,
                      granted: v,
                      label: s.label,
                      consequence: v
                        ? `${s.label} is collected again from the next check and starts rebuilding its own baseline.`
                        : s.paused,
                    })
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>

      {/* Guardian */}
      <div className="mt-4 rounded-xl border border-border bg-card p-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserRound className="size-4 shrink-0 text-primary" aria-hidden /> Guardian acting on
          behalf
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          For an elderly parent or a child, record who is giving consent. Their name is stored with
          every consent change they make.
        </p>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <div>
            <Label htmlFor="guardian-name" className="text-xs font-semibold">
              Guardian name
            </Label>
            <Input
              id="guardian-name"
              className="mt-1 h-11"
              placeholder="e.g. Sunita Devi"
              value={guardianName}
              onChange={(e) => setGuardianName(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="guardian-relation" className="text-xs font-semibold">
              Relationship
            </Label>
            <Input
              id="guardian-relation"
              className="mt-1 h-11"
              placeholder="e.g. daughter"
              value={guardianRelation}
              onChange={(e) => setGuardianRelation(e.target.value)}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button
            size="sm"
            variant="outline"
            disabled={guardian.isPending}
            onClick={() => guardian.mutate()}
          >
            Save guardian details
          </Button>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch
              aria-label="Record changes as guardian"
              checked={asGuardian}
              onCheckedChange={setAsGuardian}
            />
            Record my next consent change as the guardian
          </label>
        </div>
      </div>

      {eventsQuery.isLoading ? (
        <div className="mt-4 grid place-items-center py-4">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        </div>
      ) : (
        <ConsentLog events={eventsQuery.data ?? []} />
      )}

      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pending?.granted ? `Allow ${pending?.label.toLowerCase()}?` : `Pause ${pending?.label.toLowerCase()}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>{pending?.consequence}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="consent-note" className="text-xs font-semibold">
              Reason (optional, kept on the record)
            </Label>
            <Textarea
              id="consent-note"
              rows={2}
              maxLength={500}
              value={note}
              placeholder="e.g. phone shared with family, prefer not to record voice"
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              Recorded as{" "}
              {asGuardian ? (guardianName.trim() || "Guardian") : (profile.full_name ?? "this person")}{" "}
              at the current time.
            </p>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setNote("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={change.isPending}
              onClick={() => pending && change.mutate(pending)}
            >
              {pending?.granted ? "Allow" : "Pause"} {pending?.label.toLowerCase()}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
