/**
 * "Why was this flagged?" explanation layer.
 *
 * Turns a stored health check plus the person's own recent history into
 * signal-by-signal baseline comparisons, so every deviation shown in the UI can
 * be traced back to the number it came from and the prototype threshold that
 * was crossed. PROTOTYPE ONLY — non-clinical, never a diagnosis.
 */

import { bandForScore, bandMeta, buildBaseline, symptomLoad } from "./drift";
import type { DriftBand, HealthCheck, SymptomKey } from "./types";
import { SYMPTOM_LABELS } from "./types";

export type ExplanationVerdict = "flagged" | "watch" | "within_baseline" | "no_baseline";

export interface SignalExplanation {
  key: "reaction" | "activity" | "voice" | "symptoms" | "vitals";
  signal: string;
  /** What was measured today, already formatted for display. */
  today: string;
  /** The person's own 14-day baseline, already formatted. */
  baseline: string;
  /** Signed change against that baseline, e.g. "+24% slower". */
  change: string | null;
  /** The prototype rule that decided the verdict. */
  threshold: string;
  verdict: ExplanationVerdict;
  /** Plain-language reason, safe to show to a citizen. */
  reason: string;
}

export interface CheckExplanation {
  score: number;
  band: DriftBand;
  bandLabel: string;
  bandRange: string;
  recommendation: string;
  baselineSamples: number;
  baselineSufficient: boolean;
  signals: SignalExplanation[];
  flaggedCount: number;
  /** Deviation strings recorded with the check itself. */
  recordedDeviations: string[];
}

const MIN_BASELINE_SAMPLES = 3;

function pct(delta: number): string {
  const rounded = Math.round(Math.abs(delta) * 100);
  return `${delta >= 0 ? "+" : "−"}${rounded}%`;
}

/**
 * Builds the explanation for `check` using the checks that came before it.
 * `history` may include `check` itself; it is filtered out.
 */
export function explainCheck(check: HealthCheck, history: HealthCheck[]): CheckExplanation {
  const earlier = history
    .filter((c) => c.id !== check.id && c.check_date <= check.check_date)
    .sort((a, b) => b.check_date.localeCompare(a.check_date));
  const baseline = buildBaseline(earlier);
  const baselineSufficient = baseline.samples >= MIN_BASELINE_SAMPLES;
  const signals: SignalExplanation[] = [];

  const noBaseline = (
    key: SignalExplanation["key"],
    signal: string,
    today: string,
    threshold: string,
  ): SignalExplanation => ({
    key,
    signal,
    today,
    baseline: "not learned yet",
    change: null,
    threshold,
    verdict: "no_baseline",
    reason: `Baseline insufficient — ${baseline.samples} of ${MIN_BASELINE_SAMPLES} checks needed. Continue monitoring.`,
  });

  // Reaction time --------------------------------------------------------
  const reaction = check.reaction_median_ms ?? check.reaction_mean_ms;
  if (reaction != null) {
    const today = `${reaction} ms`;
    const threshold = "Prototype rule: +18% slower = flagged, +8% = watch";
    if (baseline.reactionMedianMs == null || !baselineSufficient) {
      signals.push(noBaseline("reaction", "Tap reaction time", today, threshold));
    } else {
      const delta = (reaction - baseline.reactionMedianMs) / baseline.reactionMedianMs;
      signals.push({
        key: "reaction",
        signal: "Tap reaction time",
        today,
        baseline: `${baseline.reactionMedianMs} ms median`,
        change: `${pct(delta)} ${delta >= 0 ? "slower" : "faster"}`,
        threshold,
        verdict: delta > 0.18 ? "flagged" : delta > 0.08 ? "watch" : "within_baseline",
        reason:
          delta > 0.18
            ? "Responses are meaningfully slower than this person's own usual speed."
            : delta > 0.08
              ? "Slightly slower than usual — worth watching over the next few days."
              : "In line with this person's own usual speed.",
      });
    }
  }

  // Daily activity -------------------------------------------------------
  if (check.activity_steps != null) {
    const today = `${check.activity_steps.toLocaleString("en-IN")} steps`;
    const threshold = "Prototype rule: −35% drop = flagged, −20% = watch";
    if (baseline.activitySteps == null || !baselineSufficient) {
      signals.push(noBaseline("activity", "Daily activity", today, threshold));
    } else {
      const drop = (baseline.activitySteps - check.activity_steps) / baseline.activitySteps;
      signals.push({
        key: "activity",
        signal: "Daily activity",
        today,
        baseline: `${baseline.activitySteps.toLocaleString("en-IN")} steps median`,
        change: `${pct(-drop)} ${drop >= 0 ? "lower" : "higher"}`,
        threshold,
        verdict: drop > 0.35 ? "flagged" : drop > 0.2 ? "watch" : "within_baseline",
        reason:
          drop > 0.35
            ? "Movement is well below this person's own usual daily range."
            : drop > 0.2
              ? "Somewhat less movement than usual."
              : "Usual amount of movement for this person.",
      });
    }
  }

  // Voice stability ------------------------------------------------------
  if (check.voice_jitter != null) {
    const today = check.voice_jitter.toFixed(3);
    const threshold = "Prototype rule: +30% variability = flagged, +15% = watch";
    if (baseline.voiceJitter == null || !baselineSufficient) {
      signals.push(noBaseline("voice", "Voice stability index", today, threshold));
    } else {
      const delta = (check.voice_jitter - baseline.voiceJitter) / Math.max(0.4, baseline.voiceJitter);
      signals.push({
        key: "voice",
        signal: "Voice stability index",
        today,
        baseline: `${baseline.voiceJitter.toFixed(3)} average`,
        change: `${pct(delta)} ${delta >= 0 ? "less stable" : "more stable"}`,
        threshold,
        verdict: delta > 0.3 ? "flagged" : delta > 0.15 ? "watch" : "within_baseline",
        reason:
          delta > 0.3
            ? "Today's voice sample varies more than this person's own earlier samples. No disease is inferred from voice."
            : delta > 0.15
              ? "Small change in voice steadiness compared with earlier samples."
              : "Voice steadiness matches this person's earlier samples.",
      });
    }
  }

  // Symptoms -------------------------------------------------------------
  const load = symptomLoad(check.symptoms);
  const reported = SYMPTOM_LABELS.filter(
    (s) => Number(check.symptoms[s.key as SymptomKey]) > 0,
  ).map((s) => s.en);
  signals.push({
    key: "symptoms",
    signal: "Self-reported symptoms",
    today: reported.length ? reported.join(", ") : "none reported",
    baseline: `usual symptom load ${baseline.symptomLoad}`,
    change: `load ${load}`,
    threshold: "Prototype rule: symptom load 12 points above usual = flagged",
    verdict: load - baseline.symptomLoad > 12 ? "flagged" : load > 0 ? "watch" : "within_baseline",
    reason:
      load - baseline.symptomLoad > 12
        ? "More symptoms reported than this person usually reports."
        : load > 0
          ? "Symptoms reported, close to this person's usual pattern."
          : "No symptoms reported today.",
  });

  // Optional vitals ------------------------------------------------------
  const spo2 = check.vitals?.spo2;
  const temp = check.vitals?.temp_c;
  if ((typeof spo2 === "number" && spo2 > 0) || typeof temp === "number") {
    const parts: string[] = [];
    if (typeof spo2 === "number" && spo2 > 0) parts.push(`SpO₂ ${spo2}%`);
    if (typeof temp === "number") parts.push(`${temp}°C`);
    const flagged = (typeof spo2 === "number" && spo2 > 0 && spo2 < 94) || (typeof temp === "number" && temp >= 38);
    signals.push({
      key: "vitals",
      signal: "Optional vitals (self-measured)",
      today: parts.join(" · "),
      baseline: "compared with usual personal range",
      change: null,
      threshold: "Prototype rule: SpO₂ below 94% or temperature 38°C and above = flagged",
      verdict: flagged ? "flagged" : "within_baseline",
      reason: flagged
        ? "A self-measured reading is outside the usual personal range. Device accuracy is not verified."
        : "Self-measured readings are within the usual personal range.",
    });
  }

  const band = check.drift_band ?? bandForScore(check.drift_score);
  const meta = bandMeta(band);

  return {
    score: check.drift_score,
    band,
    bandLabel: meta.label,
    bandRange: meta.range,
    recommendation: meta.action,
    baselineSamples: baseline.samples,
    baselineSufficient,
    signals,
    flaggedCount: signals.filter((s) => s.verdict === "flagged").length,
    recordedDeviations: check.deviations ?? [],
  };
}
