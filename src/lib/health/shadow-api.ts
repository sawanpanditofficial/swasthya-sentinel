/**
 * Database access for the Digital Health Shadow layer. Components never talk to
 * the database directly; row-level rules in the database do the real gating and
 * these helpers mirror the same shape as the emergency service contracts.
 */

import { supabase } from "@/integrations/supabase/client";
import type {
  AccessLog,
  Allergy,
  AppRole,
  DisasterEvent,
  EmergencyAccessToken,
  EmergencyBundle,
  EmergencyContact,
  EmergencyProfile,
  Hospital,
  MedicalCondition,
  MedicalDocument,
  Medication,
  PatientDisasterStatus,
  RiskLevel,
  Surgery,
  TriageStatus,
} from "./shadow-types";
import type { Patient } from "./types";

const PROFILE_FIELDS =
  "id, patient_id, blood_group, date_of_birth, gender, address, emergency_code, ai_summary, ai_summary_at, ai_risk_flags, risk_level, offline_enabled, updated_at";

/* ---------------- Roles ---------------- */

export async function listMyRoles(userId: string): Promise<AppRole[]> {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw error;
  return (data ?? []).map((r) => r.role as AppRole);
}

/* ---------------- Shadow record ---------------- */

export async function getEmergencyProfile(patientId: string): Promise<EmergencyProfile | null> {
  const { data, error } = await supabase
    .from("emergency_profiles")
    .select(PROFILE_FIELDS)
    .eq("patient_id", patientId)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as EmergencyProfile | null) ?? null;
}

export async function ensureEmergencyProfile(patientId: string): Promise<EmergencyProfile> {
  const existing = await getEmergencyProfile(patientId);
  if (existing) return existing;
  const { data, error } = await supabase
    .from("emergency_profiles")
    .insert({ patient_id: patientId })
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data as unknown as EmergencyProfile;
}

export async function updateEmergencyProfile(
  patientId: string,
  patch: Partial<
    Pick<
      EmergencyProfile,
      "blood_group" | "date_of_birth" | "gender" | "address" | "offline_enabled" | "risk_level"
    >
  >,
): Promise<EmergencyProfile> {
  const { data, error } = await supabase
    .from("emergency_profiles")
    .update(patch)
    .eq("patient_id", patientId)
    .select(PROFILE_FIELDS)
    .single();
  if (error) throw error;
  return data as unknown as EmergencyProfile;
}

export async function setRiskLevel(patientId: string, level: RiskLevel): Promise<void> {
  const { error } = await supabase
    .from("emergency_profiles")
    .update({ risk_level: level })
    .eq("patient_id", patientId);
  if (error) throw error;
}

export async function listConditions(patientId: string): Promise<MedicalCondition[]> {
  const { data, error } = await supabase
    .from("medical_conditions")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as MedicalCondition[];
}

export async function listAllergies(patientId: string): Promise<Allergy[]> {
  const { data, error } = await supabase
    .from("allergies")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Allergy[];
}

export async function listMedications(patientId: string): Promise<Medication[]> {
  const { data, error } = await supabase
    .from("medications")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Medication[];
}

export async function listSurgeries(patientId: string): Promise<Surgery[]> {
  const { data, error } = await supabase
    .from("surgeries")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as Surgery[];
}

export async function listContacts(patientId: string): Promise<EmergencyContact[]> {
  const { data, error } = await supabase
    .from("emergency_contacts")
    .select("*")
    .eq("patient_id", patientId)
    .order("priority", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EmergencyContact[];
}

type ShadowTable =
  | "medical_conditions"
  | "allergies"
  | "medications"
  | "surgeries"
  | "emergency_contacts";

export async function addShadowRow(
  table: ShadowTable,
  row: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase.from(table).insert(row as never);
  if (error) throw error;
}

export async function updateShadowRow(
  table: ShadowTable,
  id: string,
  patch: Record<string, unknown>,
): Promise<void> {
  const { error } = await supabase
    .from(table)
    .update(patch as never)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteShadowRow(table: ShadowTable, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) throw error;
}

/** Everything the responder view needs for one person, read as the signed-in user. */
export async function getShadowBundle(patientId: string): Promise<EmergencyBundle | null> {
  const [{ data: patient, error: pErr }, profile, allergies, conditions, medications, surgeries, contacts] =
    await Promise.all([
      supabase.from("patients").select("*").eq("id", patientId).maybeSingle(),
      getEmergencyProfile(patientId),
      listAllergies(patientId),
      listConditions(patientId),
      listMedications(patientId),
      listSurgeries(patientId),
      listContacts(patientId),
    ]);
  if (pErr) throw pErr;
  if (!patient) return null;
  const p = patient as unknown as Patient;
  return {
    patient: {
      id: p.id,
      name: p.name,
      age: p.age,
      sex: p.sex,
      village: p.village,
      drift_score: p.drift_score,
      status: p.status,
      last_check_at: p.last_check_at,
    },
    profile,
    allergies,
    conditions,
    medications,
    surgeries,
    contacts,
    access: { via: "signed_in", at: new Date().toISOString() },
  };
}

/* ---------------- QR access tokens & audit ---------------- */

export async function listAccessTokens(patientId: string): Promise<EmergencyAccessToken[]> {
  const { data, error } = await supabase
    .from("emergency_access_tokens")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EmergencyAccessToken[];
}

function randomToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createAccessToken(
  patientId: string,
  label: string,
  expiresInDays: number | null,
): Promise<EmergencyAccessToken> {
  const expires_at =
    expiresInDays == null
      ? null
      : new Date(Date.now() + expiresInDays * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("emergency_access_tokens")
    .insert({ patient_id: patientId, token: randomToken(), label, expires_at })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as EmergencyAccessToken;
}

export async function revokeAccessToken(id: string): Promise<void> {
  const { error } = await supabase
    .from("emergency_access_tokens")
    .update({ revoked: true })
    .eq("id", id);
  if (error) throw error;
}

export async function listAccessLogs(patientId: string, limit = 30): Promise<AccessLog[]> {
  const { data, error } = await supabase
    .from("access_logs")
    .select("id, patient_id, actor_role, actor_name, actor_org, action, scope, via, detail, created_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as AccessLog[];
}

/* ---------------- Documents ---------------- */

export const DOCUMENT_BUCKET = "medical-documents";

export async function listDocuments(patientId: string): Promise<MedicalDocument[]> {
  const { data, error } = await supabase
    .from("medical_documents")
    .select("*")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as MedicalDocument[];
}

export async function uploadDocument(
  userId: string,
  patientId: string,
  file: File,
): Promise<MedicalDocument> {
  const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  const { error: upErr } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (upErr) throw upErr;
  const { data, error } = await supabase
    .from("medical_documents")
    .insert({
      patient_id: patientId,
      file_name: file.name,
      mime_type: file.type || null,
      storage_path: path,
      status: "uploaded",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as MedicalDocument;
}

export async function deleteDocument(doc: MedicalDocument): Promise<void> {
  await supabase.storage.from(DOCUMENT_BUCKET).remove([doc.storage_path]);
  const { error } = await supabase.from("medical_documents").delete().eq("id", doc.id);
  if (error) throw error;
}

/* ---------------- Hospitals & disaster response ---------------- */

export async function listHospitals(): Promise<Hospital[]> {
  const { data, error } = await supabase
    .from("hospitals")
    .select("*")
    .order("beds_available", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Hospital[];
}

export async function updateHospitalBeds(id: string, beds_available: number): Promise<void> {
  const { error } = await supabase
    .from("hospitals")
    .update({ beds_available, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function listDisasters(): Promise<DisasterEvent[]> {
  const { data, error } = await supabase
    .from("disaster_events")
    .select("*")
    .order("started_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as DisasterEvent[];
}

export async function listDisasterStatuses(
  disasterId: string,
): Promise<(PatientDisasterStatus & { patient?: Patient })[]> {
  const { data, error } = await supabase
    .from("patient_disaster_status")
    .select("*, patient:patients(*)")
    .eq("disaster_id", disasterId)
    .order("risk_level", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as (PatientDisasterStatus & { patient?: Patient })[];
}

export async function updateTriage(
  id: string,
  patch: { triage_status?: TriageStatus; assigned_to?: string | null; hospital_id?: string | null; note?: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("patient_disaster_status")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
