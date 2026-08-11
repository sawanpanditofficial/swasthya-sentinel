/**
 * Database access layer. All Supabase queries for the health domain live here
 * so components never talk to the database directly.
 */

import { supabase } from "@/integrations/supabase/client";
import { bandForScore } from "./drift";
import type {
  Alert,
  CaseReview,
  ReminderChannel,
  ReviewState,

  CheckSubmission,
  DriftBand,
  HealthCheck,
  Patient,
  Profile,
  Referral,
} from "./types";
import type { DriftAnalysis } from "./drift";

/** Demo persona used when a citizen account has no linked record yet. */
const PROFILE_FIELDS =
  "id, full_name, role, linked_patient_id, consent_given, language, reminder_enabled, reminder_time, consent_revoked_at, best_streak";

export const DEMO_PATIENT_ID = "a0000000-0000-4000-8000-000000000001";
export const DEMO_HIGH_PRIORITY_ID = "a0000001-0000-4000-8000-000000000001";

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_FIELDS)
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function ensureProfile(userId: string, fullName?: string | null): Promise<Profile> {
  const existing = await getProfile(userId);
  if (existing) {
    if (!existing.linked_patient_id && existing.role === "patient") {
      const { data, error } = await supabase
        .from("profiles")
        .update({ linked_patient_id: DEMO_PATIENT_ID })
        .eq("id", userId)
        .select(PROFILE_FIELDS)
        .single();
      if (error) throw error;
      return data as Profile;
    }
    return existing;
  }
  const { data, error } = await supabase
    .from("profiles")
    .insert({ id: userId, full_name: fullName ?? null, linked_patient_id: DEMO_PATIENT_ID })
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function updateProfile(userId: string, patch: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function listPatients(): Promise<Patient[]> {
  const { data, error } = await supabase
    .from("patients")
    .select("*")
    .order("drift_score", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Patient[];
}

export async function getPatient(id: string): Promise<Patient | null> {
  const { data, error } = await supabase.from("patients").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as Patient | null) ?? null;
}

export async function getChecks(patientId: string, limit = 30): Promise<HealthCheck[]> {
  const { data, error } = await supabase
    .from("health_checks")
    .select("*")
    .eq("patient_id", patientId)
    .order("check_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as HealthCheck[];
}

export async function listAlerts(limit = 12): Promise<(Alert & { patient?: Patient })[]> {
  const { data, error } = await supabase
    .from("alerts")
    .select("*, patient:patients(*)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as (Alert & { patient?: Patient })[];
}

export async function listReferrals(patientId?: string): Promise<Referral[]> {
  let query = supabase.from("referrals").select("*").order("created_at", { ascending: false });
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Referral[];
}

export async function setReferralStatus(id: string, status: Referral["status"]): Promise<void> {
  const { error } = await supabase
    .from("referrals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function acknowledgeAlert(id: string): Promise<void> {
  const { error } = await supabase.from("alerts").update({ acknowledged: true }).eq("id", id);
  if (error) throw error;
}

export async function createReferral(patientId: string, reason: string, facility: string) {
  const { error } = await supabase
    .from("referrals")
    .insert({ patient_id: patientId, reason, facility, status: "pending" });
  if (error) throw error;
}

export async function saveHealthCheck(
  submission: CheckSubmission,
  analysis: DriftAnalysis,
): Promise<HealthCheck> {
  const band: DriftBand = bandForScore(analysis.score);
  const { data, error } = await supabase
    .from("health_checks")
    .insert({
      patient_id: submission.patientId,
      voice_status: submission.voice?.status ?? "skipped",
      voice_jitter: submission.voice?.jitter ?? null,
      reaction_mean_ms: submission.reaction?.meanMs ?? null,
      reaction_median_ms: submission.reaction?.medianMs ?? null,
      activity_steps: submission.activitySteps,
      symptoms: submission.symptoms as unknown as Record<string, number>,
      vitals: submission.vitals as unknown as Record<string, number>,

      drift_score: analysis.score,
      drift_band: band,
      deviations: analysis.deviations,
      source: "app",
    })
    .select("*")
    .single();
  if (error) throw error;

  await supabase
    .from("patients")
    .update({ drift_score: analysis.score, status: band, last_check_at: new Date().toISOString() })
    .eq("id", submission.patientId);

  if (analysis.score >= 60) {
    await supabase.from("alerts").insert({
      patient_id: submission.patientId,
      severity: analysis.score >= 80 ? "high" : "medium",
      title: "Deviation from personal baseline detected",
      body: "Prototype signal only — not a diagnosis. Human clinical review recommended.",
      requires_review: true,
    });
  }

  return data as unknown as HealthCheck;
}

/* ---------- Clinician / ASHA case feedback ---------- */

export async function listCaseReviews(patientId?: string): Promise<CaseReview[]> {
  let query = supabase
    .from("case_reviews")
    .select("id, patient_id, alert_id, action, note, reviewer_name, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (patientId) query = query.eq("patient_id", patientId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as CaseReview[];
}

export interface ReviewInput {
  patientId: string;
  alertId?: string | null;
  action: ReviewState;
  note?: string;
  reviewerId?: string | null;
  reviewerName?: string | null;
}

/**
 * Records a reviewer decision on a deviation: reviewed, escalated or closed.
 * Writes an immutable audit row and mirrors the latest state onto the alert.
 */
export async function recordCaseReview(input: ReviewInput): Promise<void> {
  const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;

  const { error: logError } = await supabase.from("case_reviews").insert({
    patient_id: input.patientId,
    alert_id: input.alertId ?? null,
    action: input.action,
    note,
    reviewer_id: input.reviewerId ?? null,
    reviewer_name: input.reviewerName ?? null,
  });
  if (logError) throw logError;

  if (input.alertId) {
    const { error } = await supabase
      .from("alerts")
      .update({
        review_state: input.action,
        review_note: note,
        reviewed_by: input.reviewerId ?? null,
        reviewed_at: new Date().toISOString(),
        acknowledged: true,
      })
      .eq("id", input.alertId);
    if (error) throw error;
  }

  // Escalation raises a referral so the case reaches a facility queue.
  if (input.action === "escalated") {
    await supabase.from("referrals").insert({
      patient_id: input.patientId,
      reason: note ?? "Escalated after review of baseline deviation.",
      facility: "Nearest Primary Health Centre",
      status: "in_review",
    });
  }
}

/* ---------- Reminders, streak & consent ---------- */

export async function saveReminderSettings(
  userId: string,
  patch: {
    reminder_enabled?: boolean;
    reminder_time?: string;
    reminder_channel?: ReminderChannel;
    reminder_contact?: string | null;
  },
): Promise<Profile> {
  return updateProfile(userId, patch as Partial<Profile>);
}

export async function saveBestStreak(userId: string, best: number): Promise<void> {
  const { error } = await supabase.from("profiles").update({ best_streak: best }).eq("id", userId);
  if (error) throw error;
}

export async function setConsent(userId: string, consent: boolean): Promise<Profile> {
  return updateProfile(userId, {
    consent_given: consent,
    consent_revoked_at: consent ? null : new Date().toISOString(),
  } as Partial<Profile>);
}
