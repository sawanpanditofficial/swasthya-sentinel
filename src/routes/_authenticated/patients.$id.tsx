import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Hospital, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/health/AppShell";
import { HealthDriftCard } from "@/components/health/HealthDriftCard";
import { TrendChart } from "@/components/health/TrendChart";
import { PatientTimeline } from "@/components/health/PatientTimeline";
import { ReferralCard } from "@/components/health/ReferralCard";
import { CaseFeedback } from "@/components/health/CaseFeedback";
import { CaseTimeline } from "@/components/health/CaseTimeline";
import { WhyFlagged } from "@/components/health/WhyFlagged";

import { ReportDownload } from "@/components/health/ReportDownload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import {
  createReferral,
  ensureProfile,
  getChecks,
  getPatient,
  listCaseReviews,
  listReferrals,
  recordCaseReview,
  setReferralStatus,
} from "@/lib/health/api";
import type { ReviewState } from "@/lib/health/types";
import { buildBaseline } from "@/lib/health/drift";
import { toSeries } from "@/lib/health/series";

export const Route = createFileRoute("/_authenticated/patients/$id")({
  head: () => ({
    meta: [
      { title: "Patient baseline detail — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Longitudinal view of one community member: drift history, voice stability, reaction time, activity, symptoms and referrals.",
      },
      { property: "og:title", content: "Patient baseline detail — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Explainable deviation signals to support — never replace — clinical judgement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PatientDetail,
});

function PatientDetail() {
  const { id } = useParams({ from: "/_authenticated/patients/$id" });
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState("");
  const [facility, setFacility] = useState("Nearest Primary Health Centre");

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const patientQuery = useQuery({ queryKey: ["patient", id], queryFn: () => getPatient(id) });
  const checksQuery = useQuery({ queryKey: ["checks", id], queryFn: () => getChecks(id, 30) });
  const referralsQuery = useQuery({ queryKey: ["referrals", id], queryFn: () => listReferrals(id) });
  const reviewsQuery = useQuery({ queryKey: ["reviews", id], queryFn: () => listCaseReviews(id) });

  const review = useMutation({
    mutationFn: (vars: { action: Exclude<ReviewState, "open">; note: string }) =>
      recordCaseReview({
        patientId: id,
        action: vars.action,
        note: vars.note,
        reviewerId: user?.id ?? null,
        reviewerName: profileQuery.data?.full_name ?? "Health worker",
      }),
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
      queryClient.invalidateQueries({ queryKey: ["referrals", id] });
      toast.success(
        vars.action === "escalated"
          ? "Escalated — referral raised for clinical review."
          : vars.action === "closed"
            ? "Case closed."
            : "Deviation marked as reviewed.",
      );
    },
    onError: () => toast.error("Could not save that decision."),
  });

  const refer = useMutation({
    mutationFn: () => createReferral(id, reason.trim(), facility.trim()),
    onSuccess: () => {
      setReason("");
      queryClient.invalidateQueries({ queryKey: ["referrals", id] });
      toast.success("Referral raised for clinical review.");
    },
    onError: () => toast.error("Could not raise the referral."),
  });

  const statusChange = useMutation({
    mutationFn: ({ refId, status }: { refId: string; status: "in_review" | "completed" }) =>
      setReferralStatus(refId, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["referrals", id] }),
    onError: () => toast.error("Could not update the referral."),
  });

  const role = profileQuery.data?.role === "doctor" ? "doctor" : "asha";
  const patient = patientQuery.data;
  const checks = checksQuery.data ?? [];
  const baseline = buildBaseline(checks.slice(1));

  if (patientQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <AppShell role={role} title={patient?.name ?? "Community member"}>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/worker">
              <ArrowLeft className="size-4" aria-hidden /> Back to community
            </Link>
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="size-3.5" aria-hidden />
            {patient?.village ?? "Unknown village"} · {patient?.age ?? "—"} yrs · {patient?.sex ?? "—"} ·
            baseline profile: {patient?.baseline_profile}
          </p>
        </div>

        <HealthDriftCard
          score={patient?.drift_score ?? 0}
          band={patient?.status ?? "stable"}
          deviations={checks[0]?.deviations ?? []}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TrendChart
            title="Health Drift"
            subtitle="30-day deviation history"
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
            subtitle="Activity trend"
            data={toSeries(checks, "activity_steps")}
            baseline={baseline.activitySteps}
            color="var(--color-chart-4)"
          />
        </div>

        {patient && <ReportDownload patient={patient} checks={checks} />}

        {checks[0] && <WhyFlagged check={checks[0]} history={checks} defaultOpen />}

        <section className="surface-card p-4 sm:p-5" aria-label="Reviewer decision">
          <h2 className="text-base font-semibold text-foreground">Act on this deviation</h2>
          <p className="mt-0.5 mb-3 text-xs text-muted-foreground">
            Your decision is logged with your name and stays on the record. Escalating also raises a
            referral so the case reaches a facility queue. Changing a decided case needs a resolution note.
          </p>
          <CaseFeedback
            currentState={(reviewsQuery.data?.[0]?.action ?? "open") as ReviewState}
            pending={review.isPending}
            onSubmit={(action, note) => review.mutate({ action, note })}
          />
        </section>

        <CaseTimeline reviews={reviewsQuery.data ?? []} />


        <PatientTimeline checks={checks} />

        <section aria-label="Referrals" className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Referrals & clinical review</h2>
          {referralsQuery.data?.map((r) => (
            <ReferralCard
              key={r.id}
              referral={r}
              onStatusChange={(refId, status) =>
                statusChange.mutate({ refId, status: status as "in_review" | "completed" })
              }
            />
          ))}
          <form
            className="surface-card space-y-3 p-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 5) {
                toast.error("Please describe the reason (at least 5 characters).");
                return;
              }
              refer.mutate();
            }}
          >
            <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Hospital className="size-4 text-primary" aria-hidden /> Raise a new referral
            </p>
            <div>
              <Label htmlFor="facility">Facility</Label>
              <Input
                id="facility"
                value={facility}
                maxLength={120}
                onChange={(e) => setFacility(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <div>
              <Label htmlFor="reason">Reason for review</Label>
              <Input
                id="reason"
                value={reason}
                maxLength={280}
                placeholder="e.g. sustained drift with breathing difficulty for 4 days"
                onChange={(e) => setReason(e.target.value)}
                className="mt-1.5 h-11"
              />
            </div>
            <Button type="submit" disabled={refer.isPending}>
              {refer.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
              Send for clinical review
            </Button>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
