import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/health/AppShell";
import { HealthDriftCard } from "@/components/health/HealthDriftCard";
import { TrendChart } from "@/components/health/TrendChart";
import { PatientTimeline } from "@/components/health/PatientTimeline";
import { ReferralCard } from "@/components/health/ReferralCard";
import { StreakCard } from "@/components/health/StreakCard";
import { ReportDownload } from "@/components/health/ReportDownload";
import { WhyFlagged } from "@/components/health/WhyFlagged";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DEMO_PATIENT_ID,
  ensureProfile,
  getChecks,
  getPatient,
  listReferrals,
  saveBestStreak,
} from "@/lib/health/api";
import { buildBaseline } from "@/lib/health/drift";
import { toSeries } from "@/lib/health/series";
import { computeStreak, msUntilReminder, reminderChannelMeta } from "@/lib/health/streak";

export const Route = createFileRoute("/_authenticated/patient")({
  head: () => ({
    meta: [
      { title: "My health baseline — SwasthyaShadow" },
      {
        name: "description",
        content:
          "See your personal Health Drift score, voice stability, reaction time and activity trends over the last 30 days.",
      },
      { property: "og:title", content: "My health baseline — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Longitudinal, baseline-aware health monitoring for your own body — not population averages.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientDashboard,
});

/** Oldest-first seven day grid of completed checks. */
function buildWeek(dates: Set<string>) {
  const out: { label: string; done: boolean; isToday: boolean }[] = [];
  const today = new Date();
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    out.push({
      label: d.toLocaleDateString("en-IN", { weekday: "narrow" }),
      done: dates.has(key),
      isToday: i === 0,
    });
  }
  return out;
}

function PatientDashboard() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });

  const patientId = profileQuery.data?.linked_patient_id ?? DEMO_PATIENT_ID;

  const patientQuery = useQuery({
    queryKey: ["patient", patientId],
    enabled: !!patientId,
    queryFn: () => getPatient(patientId),
  });
  const checksQuery = useQuery({
    queryKey: ["checks", patientId],
    enabled: !!patientId,
    queryFn: () => getChecks(patientId, 30),
  });
  const referralsQuery = useQuery({
    queryKey: ["referrals", patientId],
    enabled: !!patientId,
    queryFn: () => listReferrals(patientId),
  });

  const checks = checksQuery.data ?? [];
  const latest = checks[0];
  const baseline = buildBaseline(checks.slice(1));
  const profile = profileQuery.data;

  const streak = useMemo(() => computeStreak(checks), [checks]);
  const week = useMemo(
    () => buildWeek(new Set(checks.map((c) => c.check_date.slice(0, 10)))),
    [checks],
  );

  // Persist the best streak so it survives a missed day.
  useEffect(() => {
    if (!user || !profile) return;
    if (streak.best > (profile.best_streak ?? 0)) void saveBestStreak(user.id, streak.best);
  }, [user, profile, streak.best]);

  // Demo-mode reminder: schedules an in-session nudge at the chosen time.
  useEffect(() => {
    if (!profile?.reminder_enabled || streak.checkedToday) return;
    const delay = Math.min(msUntilReminder(profile.reminder_time), 2 ** 31 - 1);
    const timer = window.setTimeout(() => {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("SwasthyaShadow", {
            body: `Time for your two-minute daily check.${
            reminderChannelMeta(profile.reminder_channel ?? "in_app").live
              ? ""
              : " (Demo mode: your chosen delivery channel is simulated.)"
          }`,
        });
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [profile, streak.checkedToday]);

  if (profileQuery.isLoading || patientQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  const patient = patientQuery.data;

  return (
    <AppShell
      role="patient"
      title={`Namaste, ${patient?.name ?? profileQuery.data?.full_name ?? "friend"}`}
      subtitle="This is how today compares with your own usual pattern — never with anyone else."
    >
      <div className="space-y-6">
        <HealthDriftCard
          score={patient?.drift_score ?? 0}
          band={patient?.status ?? "stable"}
          deviations={latest?.deviations ?? []}
        />
        <p className="text-xs text-muted-foreground">
          Baseline built from your last {baseline.samples} check
          {baseline.samples === 1 ? "" : "s"}
          {patient?.last_check_at
            ? ` · last check ${new Date(patient.last_check_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}`
            : ""}
        </p>

        {!streak.checkedToday && (
          <div className="surface-card grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 p-4 sm:p-5">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground">Today's check</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Voice, reaction time, activity and symptoms — about two minutes.
              </p>
            </div>
            <Button asChild size="lg" className="shrink-0">
              <Link to="/check">
                <ClipboardCheck className="size-4" aria-hidden /> Start
              </Link>
            </Button>
          </div>
        )}

        <StreakCard
          streak={streak}
          weekDays={week}
          reminderEnabled={profile?.reminder_enabled ?? true}
          reminderTime={profile?.reminder_time ?? "08:00"}
          reminderChannel={profile?.reminder_channel ?? "in_app"}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TrendChart
            title="Health Drift"
            subtitle="Deviation from your personal baseline"
            data={toSeries(checks, "drift_score")}
            bands
          />
          <TrendChart
            title="Reaction time"
            subtitle="Median tap response"
            unit=" ms"
            data={toSeries(checks, "reaction_median_ms")}
            baseline={baseline.reactionMedianMs}
            color="var(--color-chart-2)"
            variant="line"
          />
          <TrendChart
            title="Voice stability index"
            subtitle="Simulated acoustic variability"
            data={toSeries(checks, "voice_jitter")}
            baseline={baseline.voiceJitter}
            color="var(--color-chart-3)"
            variant="line"
          />
          <TrendChart
            title="Daily steps"
            subtitle="Self-reported or device activity"
            data={toSeries(checks, "activity_steps")}
            baseline={baseline.activitySteps}
            color="var(--color-chart-4)"
          />
        </div>

        {latest && <WhyFlagged check={latest} history={checks} />}

        {patient && <ReportDownload patient={patient} checks={checks} />}

        <PatientTimeline checks={checks} />

        {(referralsQuery.data?.length ?? 0) > 0 && (
          <section aria-label="Referrals">
            <h2 className="mb-3 text-base font-semibold text-foreground">Referrals & reviews</h2>
            <div className="space-y-3">
              {referralsQuery.data!.map((r) => (
                <ReferralCard key={r.id} referral={r} />
              ))}
            </div>
          </section>
        )}

        <p className="flex gap-2 rounded-xl bg-primary-soft p-4 text-xs leading-relaxed text-secondary-foreground">
          <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="min-w-0">
            Your data stays linked to your account and is only visible to you and the health workers
            supporting your community.{" "}
            <Link to="/settings" className="font-semibold text-primary hover:underline">
              See exactly what we collect or withdraw consent
            </Link>
            .
          </span>
        </p>
      </div>
    </AppShell>
  );
}
