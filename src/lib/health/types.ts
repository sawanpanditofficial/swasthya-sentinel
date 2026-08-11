/**
 * Domain types for SwasthyaShadow.
 * Kept independent of the database client so an external ML backend
 * (e.g. Python FastAPI) can implement the same contracts later.
 */

export type DriftBand = "stable" | "monitor" | "review" | "high_priority";
export type UserRole = "patient" | "asha" | "doctor";

export interface Patient {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  village: string | null;
  baseline_profile: string;
  drift_score: number;
  status: DriftBand;
  last_check_at: string | null;
  is_demo: boolean;
  created_at: string;
}

export type SymptomKey =
  | "fever"
  | "cough"
  | "fatigue"
  | "breathing_difficulty"
  | "headache"
  | "loss_of_appetite";

export interface SymptomReport extends Partial<Record<SymptomKey, number>> {
  /** 1 (very poor) to 5 (very good) */
  sleep_quality?: number;
  notes?: string;
}


export interface VitalReport {
  temp_c?: number | null;
  spo2?: number | null;
  pulse?: number | null;
}

export interface HealthCheck {
  id: string;
  patient_id: string;
  check_date: string;
  voice_status: string;
  voice_jitter: number | null;
  reaction_mean_ms: number | null;
  reaction_median_ms: number | null;
  activity_steps: number | null;
  symptoms: SymptomReport;
  vitals: VitalReport;
  drift_score: number;
  drift_band: DriftBand;
  deviations: string[];
  source: string;
  created_at: string;
}

export interface Alert {
  id: string;
  patient_id: string;
  severity: "low" | "medium" | "high";
  title: string;
  body: string | null;
  requires_review: boolean;
  acknowledged: boolean;
  created_at: string;
}

export interface Referral {
  id: string;
  patient_id: string;
  status: "pending" | "in_review" | "completed" | "declined";
  reason: string | null;
  facility: string | null;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  role: UserRole;
  linked_patient_id: string | null;
  consent_given: boolean;
  language: string;
}

export interface VoiceSample {
  durationSec: number;
  /** Simulated acoustic stability index for the prototype. */
  jitter: number;
  status: "analysed" | "pending" | "skipped";
}

export interface ReactionResult {
  trials: number[];
  meanMs: number;
  medianMs: number;
}

export interface CheckSubmission {
  patientId: string;
  voice: VoiceSample | null;
  reaction: ReactionResult | null;
  symptoms: SymptomReport;
  vitals: VitalReport;
  activitySteps: number | null;
}

export const SYMPTOM_LABELS: { key: SymptomKey; en: string; hi: string }[] = [
  { key: "fever", en: "Fever", hi: "बुखार" },
  { key: "cough", en: "Cough", hi: "खांसी" },
  { key: "fatigue", en: "Fatigue / weakness", hi: "थकान" },
  { key: "breathing_difficulty", en: "Breathing difficulty", hi: "सांस लेने में कठिनाई" },
  { key: "headache", en: "Headache", hi: "सिरदर्द" },
  { key: "loss_of_appetite", en: "Loss of appetite", hi: "भूख न लगना" },
];
