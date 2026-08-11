import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/health/AppShell";
import { VoiceRecorder } from "@/components/health/VoiceRecorder";
import { ReactionTest } from "@/components/health/ReactionTest";
import { SymptomForm, VitalsForm } from "@/components/health/CheckForms";
import { HealthDriftCard } from "@/components/health/HealthDriftCard";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile, getChecks, saveHealthCheck } from "@/lib/health/api";
import { analyseCheck, bandForScore } from "@/lib/health/drift";
import type {
  DriftBand,
  ReactionResult,
  SymptomReport,
  VitalReport,
  VoiceSample,
} from "@/lib/health/types";

export const Route = createFileRoute("/_authenticated/check")({
  head: () => ({
    meta: [
      { title: "Daily health check — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Record a two-minute smartphone health check: voice sample, reaction test, activity and symptoms, compared with your own baseline.",
      },
      { property: "og:title", content: "Daily health check — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Low-cost, non-invasive daily check-in that learns your personal baseline.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CheckFlow,
});

const STEPS = ["Voice", "Reaction", "Symptoms", "Vitals", "Result"] as const;

/** Which check step each consent scope controls. */
const STEP_SCOPE = ["voice", "reaction", "symptoms", "vitals"] as const;

function CheckFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [voice, setVoice] = useState<VoiceSample | null>(null);
  const [reaction, setReaction] = useState<ReactionResult | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomReport>({});
  const [vitals, setVitals] = useState<VitalReport>({});
  const [steps, setSteps] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ score: number; band: DriftBand; deviations: string[] } | null>(null);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const patientId = profileQuery.data?.linked_patient_id ?? null;
  const historyQuery = useQuery({
    queryKey: ["checks", patientId],
    enabled: !!patientId,
    queryFn: () => getChecks(patientId!, 30),
  });

  const profile = profileQuery.data;
  const allowed = {
    voice: profile?.consent_voice !== false,
    reaction: profile?.consent_reaction !== false,
    activity: profile?.consent_activity !== false,
    symptoms: profile?.consent_symptoms !== false,
    vitals: profile?.consent_vitals !== false,
  };

  async function submit() {
    setSaving(true);
    try {
      const history = historyQuery.data ?? [];
      // A paused signal is left out entirely rather than guessed, so the drift
      // score simply ignores it.
      const submission = {
        patientId: patientId!,
        voice: allowed.voice ? voice : null,
        reaction: allowed.reaction ? reaction : null,
        symptoms: allowed.symptoms ? symptoms : {},
        vitals: allowed.vitals ? vitals : {},
        activitySteps: allowed.activity ? steps : null,
      };
      const analysis = analyseCheck(submission, history);

      await saveHealthCheck(submission, analysis);
      setResult({ score: analysis.score, band: bandForScore(analysis.score), deviations: analysis.deviations });
      setStep(4);
      toast.success("Check saved to your timeline.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save your check");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      role="patient"
      title="Daily health check"
      subtitle="Each signal is compared only with your own past readings."
    >
      {profileQuery.data && !profileQuery.data.consent_given && (
        <section className="surface-card border-critical/50 bg-critical-soft/40 p-5" aria-label="Consent required">
          <h2 className="text-sm font-semibold text-foreground">Monitoring is paused</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You withdrew consent, so no new checks are recorded. Restore consent whenever you are
            ready — your past entries are untouched.
          </p>
          <Button asChild className="mt-4">
            <Link to="/settings">Open consent & privacy</Link>
          </Button>
        </section>
      )}

      {(profileQuery.data?.consent_given ?? true) && (
      <>
      <ol className="mb-6 flex items-center gap-1.5" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="min-w-0 flex-1">
            <span
              className={
                i <= step
                  ? "block h-1.5 rounded-full bg-primary"
                  : "block h-1.5 rounded-full bg-border"
              }
            />
            <span className="mt-1.5 block truncate text-[10px] font-semibold text-muted-foreground">
              {label}
            </span>
          </li>
        ))}
      </ol>

      <div className="surface-card p-4 sm:p-6">
        {step < 4 && !allowed[STEP_SCOPE[step]!] ? (
          <div className="space-y-4 py-2">
            <h2 className="text-base font-semibold text-foreground">
              {STEPS[step]} is paused by your consent settings
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              This step is skipped and the signal is left out of your Health Drift score instead of
              being estimated. You can allow it again at any time.
            </p>
            <Button asChild variant="outline">
              <Link to="/settings">Open consent centre</Link>
            </Button>
          </div>
        ) : (
          <>
            {step === 0 && <VoiceRecorder value={voice} onChange={setVoice} />}
            {step === 1 && <ReactionTest value={reaction} onChange={setReaction} />}
            {step === 2 && <SymptomForm symptoms={symptoms} onChange={setSymptoms} />}
            {step === 3 && (
              <VitalsForm
                vitals={vitals}
                steps={steps}
                onVitals={setVitals}
                onSteps={setSteps}
                {...(allowed.activity ? {} : { hideSteps: true })}
              />
            )}
          </>
        )}
        {step === 4 && result && (
          <div className="space-y-5">
            <HealthDriftCard score={result.score} band={result.band} deviations={result.deviations} />
            <p className="text-sm text-muted-foreground">
              This result reflects change relative to your own baseline. It is not a diagnosis. If you feel
              unwell, contact your ASHA worker or nearest health centre.
            </p>
            <Button size="lg" className="w-full" onClick={() => navigate({ to: "/patient" })}>
              Back to my health <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        )}
      </div>

      {step < 4 && (
        <div className="mt-5 flex items-center gap-3">
          <Button
            variant="outline"
            size="lg"
            className="flex-1"
            disabled={step === 0}
            onClick={() => setStep((s) => Math.max(0, s - 1))}
          >
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
          {step < 3 ? (
            <Button size="lg" className="flex-1" onClick={() => setStep((s) => s + 1)}>
              {!allowed[STEP_SCOPE[step]!] ? "Next step" : step === 0 && !voice ? "Skip voice" : "Continue"}
              <ArrowRight className="size-4" aria-hidden />
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={submit} disabled={saving}>
              {saving ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Submit check
            </Button>
          )}
        </div>
      )}
      </>
      )}
    </AppShell>
  );
}

