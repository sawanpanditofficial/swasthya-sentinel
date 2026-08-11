import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ClipboardCheck, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/health/AppShell";
import { HealthDriftCard } from "@/components/health/HealthDriftCard";
import { TrendChart } from "@/components/health/TrendChart";
import { PatientTimeline } from "@/components/health/PatientTimeline";
import { ReferralCard } from "@/components/health/ReferralCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { DEMO_PATIENT_ID, ensureProfile, getChecks, getPatient, listReferrals } from "@/lib/health/api";
import { buildBaseline } from "@/lib/health/drift";

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
          lastCheckAt={patient?.last_check_at ?? null}
          baselineDays={baseline.sampleSize}
        />

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

        <div className="grid gap-4 sm:grid-cols-2">
          <TrendChart
            checks={checks}
            metric="drift_score"
            label="Health Drift"
            description="Deviation from your personal baseline"
          />
          <TrendChart
            checks={checks}
            metric="reaction_median_ms"
            label="Reaction time"
            unit="ms"
            description="Median tap response"
          />
          <TrendChart
            checks={checks}
            metric="voice_jitter"
            label="Voice stability index"
            description="Simulated acoustic variability"
          />
          <TrendChart
            checks={checks}
            metric="activity_steps"
            label="Daily steps"
            description="Self-reported or device activity"
          />
        </div>

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
            supporting your community. You can withdraw consent at any time.
          </span>
        </p>
      </div>
    </AppShell>
  );
}
