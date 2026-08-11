/**
 * Health Drift service layer.
 *
 * PROTOTYPE ONLY. These thresholds and weights are demo heuristics for a
 * hackathon prototype. They are NOT clinically validated and must never be
 * presented as a diagnosis.
 *
 * All drift computation lives behind `analyseCheck()` so a Python FastAPI ML
 * backend can replace the implementation without touching the UI.
 */

import type {
  CheckSubmission,
  DriftBand,
  HealthCheck,
  ReactionResult,
  SymptomReport,
} from "./types";

export const DRIFT_BANDS: {
  band: DriftBand;
  label: string;
  hi: string;
  range: string;
  min: number;
  max: number;
  action: string;
}[] = [
  {
    band: "stable",
    label: "Stable",
    hi: "स्थिर",
    range: "0–29",
    min: 0,
    max: 29,
    action: "Continue routine daily checks.",
  },
  {
    band: "monitor",
    label: "Monitor",
    hi: "निगरानी",
    range: "30–59",
    min: 30,
    max: 59,
    action: "Repeat checks daily and watch for a pattern.",
  },
  {
    band: "review",
    label: "Review",
    hi: "समीक्षा",
    range: "60–79",
    min: 60,
    max: 79,
    action: "Human clinical review recommended by an ASHA worker or PHC.",
  },
  {
    band: "high_priority",
    label: "High priority",
    hi: "उच्च प्राथमिकता",
    range: "80–100",
    min: 80,
    max: 100,
    action: "Prompt human clinical evaluation recommended.",
  },
];

export function bandForScore(score: number): DriftBand {
  if (score < 30) return "stable";
  if (score < 60) return "monitor";
  if (score < 80) return "review";
  return "high_priority";
}

export function bandMeta(band: DriftBand) {
  return DRIFT_BANDS.find((b) => b.band === band) ?? DRIFT_BANDS[0]!;
}

export const DRIFT_DISCLAIMER =
  "Health Drift is a prototype, non-clinical signal. It only describes deviation from a person's own past readings. It does not detect, name or rule out any disease.";

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1]! + s[mid]!) / 2) : s[mid]!;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export function summariseReaction(trials: number[]): ReactionResult {
  return { trials, meanMs: mean(trials), medianMs: median(trials) };
}

export interface PersonalBaseline {
  reactionMedianMs: number | null;
  activitySteps: number | null;
  voiceJitter: number | null;
  symptomLoad: number;
  samples: number;
}

/** Baseline = the person's own recent history, not a population norm. */
export function buildBaseline(history: HealthCheck[], window = 14): PersonalBaseline {
  const recent = history.slice(0, window);
  const nums = (pick: (c: HealthCheck) => number | null | undefined) =>
    recent.map(pick).filter((v): v is number => typeof v === "number" && !Number.isNaN(v));

  const reaction = nums((c) => c.reaction_median_ms ?? c.reaction_mean_ms);
  const steps = nums((c) => c.activity_steps);
  const jitter = nums((c) => c.voice_jitter);

  return {
    reactionMedianMs: reaction.length ? median(reaction) : null,
    activitySteps: steps.length ? median(steps) : null,
    voiceJitter: jitter.length ? jitter.reduce((a, b) => a + b, 0) / jitter.length : null,
    symptomLoad: recent.length ? mean(recent.map((c) => symptomLoad(c.symptoms))) : 0,
    samples: recent.length,
  };
}

export function symptomLoad(symptoms: SymptomReport): number {
  const flags = [
    symptoms.fever,
    symptoms.cough,
    symptoms.fatigue,
    symptoms.breathing_difficulty,
    symptoms.headache,
    symptoms.loss_of_appetite,
  ].filter((v) => Number(v) > 0).length;
  const sleepPenalty = symptoms.sleep_quality != null ? Math.max(0, 3 - symptoms.sleep_quality) : 0;
  return Math.round(flags * 12 + sleepPenalty * 6);
}

export interface DriftAnalysis {
  score: number;
  band: DriftBand;
  deviations: string[];
  contributions: { label: string; points: number }[];
  baselineSamples: number;
  recommendation: string;
}

/**
 * Service boundary: swap this implementation for an HTTP call to the ML
 * backend (same input/output shape) when it becomes available.
 */
export function analyseCheck(
  submission: CheckSubmission,
  history: HealthCheck[],
): DriftAnalysis {
  const baseline = buildBaseline(history);
  const deviations: string[] = [];
  const contributions: { label: string; points: number }[] = [];
  let score = 0;

  const add = (label: string, points: number, deviation?: string) => {
    if (points <= 0) return;
    score += points;
    contributions.push({ label, points });
    if (deviation) deviations.push(deviation);
  };

  // Reaction time vs personal baseline
  const reaction = submission.reaction?.medianMs ?? null;
  if (reaction != null && baseline.reactionMedianMs != null) {
    const delta = (reaction - baseline.reactionMedianMs) / baseline.reactionMedianMs;
    if (delta > 0.35)
      add("Reaction time far above personal baseline", 26, "Reaction time far above personal baseline");
    else if (delta > 0.18)
      add("Reaction time above personal baseline", 16, "Reaction time above personal baseline");
    else if (delta > 0.08) add("Reaction time slightly slower than usual", 8);
  }

  // Voice acoustic stability vs personal baseline (prototype signal)
  const jitter = submission.voice?.jitter ?? null;
  if (jitter != null && baseline.voiceJitter != null) {
    const delta = (jitter - baseline.voiceJitter) / Math.max(0.4, baseline.voiceJitter);
    if (delta > 0.3)
      add(
        "Voice sample less stable than personal baseline",
        18,
        "Voice sample less stable than personal baseline",
      );
    else if (delta > 0.15) add("Small change in voice stability", 8);
  }

  // Symptom load
  const load = symptomLoad(submission.symptoms);
  const loadDelta = load - baseline.symptomLoad;
  if (load > 0) {
    add(
      "Self-reported symptoms",
      Math.min(30, Math.round(load * 0.7)),
      loadDelta > 12 ? "Symptom load higher than usual for this person" : undefined,
    );
  }

  // Activity
  if (submission.activitySteps != null && baseline.activitySteps != null) {
    const drop = (baseline.activitySteps - submission.activitySteps) / baseline.activitySteps;
    if (drop > 0.35)
      add("Daily activity well below personal baseline", 14, "Daily activity well below personal baseline");
    else if (drop > 0.2) add("Daily activity below personal baseline", 7);
  }

  // Optional vitals — treated only as self-reported context, never a diagnosis
  const { spo2, temp_c } = submission.vitals;
  if (typeof spo2 === "number" && spo2 > 0 && spo2 < 94)
    add("Reported SpO2 below usual personal range", 20, "Reported SpO2 below usual personal range");
  if (typeof temp_c === "number" && temp_c >= 38)
    add("Reported temperature above usual personal range", 14, "Reported temperature above usual personal range");

  // Sustained multi-day pattern raises attention (deviation persistence)
  const risingDays = history
    .slice(0, 3)
    .filter((c) => c.drift_score >= 45).length;
  if (risingDays >= 2) add("Deviation persisting over recent days", 10, "Deviation persisting over recent days");

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = bandForScore(score);

  return {
    score,
    band,
    deviations,
    contributions,
    baselineSamples: baseline.samples,
    recommendation: bandMeta(band).action,
  };
}

/** Simulated voice analysis for the prototype (no diagnostic claim). */
export function simulateVoiceAnalysis(durationSec: number, seed = Math.random()): {
  jitter: number;
  status: "analysed";
  notes: string[];
} {
  const jitter = Number((1.05 + seed * 1.1 + Math.max(0, 6 - durationSec) * 0.05).toFixed(2));
  return {
    jitter,
    status: "analysed",
    notes: [
      "Acoustic stability index extracted on-device (simulated for demo).",
      "Compared only against this person's own previous samples.",
      "No disease detection is performed on the voice sample.",
    ],
  };
}
