/**
 * Domain types for the Digital Health Shadow (emergency continuity) layer.
 * Deliberately independent of the database client so an external service can
 * implement the same contracts later.
 */

export type AppRole = "patient" | "asha" | "doctor" | "responder" | "hospital" | "coordinator";

export type RiskLevel = "low" | "moderate" | "high" | "critical";

export interface EmergencyProfile {
  id: string;
  patient_id: string;
  blood_group: string | null;
  date_of_birth: string | null;
  gender: string | null;
  address: string | null;
  emergency_code: string;
  ai_summary: string | null;
  ai_summary_at: string | null;
  ai_risk_flags: string[];
  risk_level: RiskLevel;
  offline_enabled: boolean;
  updated_at: string;
}

export interface MedicalCondition {
  id: string;
  patient_id: string;
  name: string;
  severity: string | null;
  diagnosed_on: string | null;
  notes: string | null;
  source: string;
  created_at: string;
}

export interface Allergy {
  id: string;
  patient_id: string;
  substance: string;
  severity: string | null;
  reaction: string | null;
  source: string;
  created_at: string;
}

export interface Medication {
  id: string;
  patient_id: string;
  name: string;
  dosage: string | null;
  frequency: string | null;
  started_on: string | null;
  active: boolean;
  source: string;
  created_at: string;
}

export interface Surgery {
  id: string;
  patient_id: string;
  procedure: string;
  performed_on: string | null;
  hospital: string | null;
  notes: string | null;
  source: string;
  created_at: string;
}

export interface EmergencyContact {
  id: string;
  patient_id: string;
  name: string;
  relationship: string | null;
  phone: string;
  priority: number;
  created_at: string;
}

export interface MedicalDocument {
  id: string;
  patient_id: string;
  file_name: string;
  mime_type: string | null;
  storage_path: string;
  status: "uploaded" | "processing" | "extracted" | "failed";
  extracted: ExtractedRecord | null;
  extract_error: string | null;
  created_at: string;
}

/** Structured output of the document reader, always reviewed before it is saved. */
export interface ExtractedRecord {
  document_type?: string | null;
  summary?: string | null;
  conditions?: { name: string; severity?: string | null; notes?: string | null }[];
  allergies?: { substance: string; severity?: string | null; reaction?: string | null }[];
  medications?: { name: string; dosage?: string | null; frequency?: string | null }[];
  surgeries?: { procedure: string; performed_on?: string | null; hospital?: string | null }[];
  notes?: string[];
}

export interface EmergencyAccessToken {
  id: string;
  patient_id: string;
  token: string;
  label: string | null;
  expires_at: string | null;
  revoked: boolean;
  created_at: string;
}

export interface AccessLog {
  id: string;
  patient_id: string;
  actor_role: string | null;
  actor_name: string | null;
  actor_org: string | null;
  action: string;
  scope: string | null;
  via: string;
  detail: string | null;
  created_at: string;
}

export interface Hospital {
  id: string;
  name: string;
  district: string | null;
  phone: string | null;
  beds_total: number;
  beds_available: number;
  has_icu: boolean;
  latitude: number | null;
  longitude: number | null;
  updated_at: string;
}

export interface DisasterEvent {
  id: string;
  name: string;
  kind: string;
  region: string | null;
  status: "active" | "monitoring" | "closed";
  started_at: string;
  note: string | null;
  created_at: string;
}

export type TriageStatus = "unassessed" | "safe" | "needs_help" | "evacuating" | "hospitalised";

export interface PatientDisasterStatus {
  id: string;
  disaster_id: string;
  patient_id: string;
  risk_level: RiskLevel;
  triage_status: TriageStatus;
  assigned_to: string | null;
  hospital_id: string | null;
  note: string | null
  updated_at: string;
}

/** Everything an emergency responder is shown, critical information first. */
export interface EmergencyBundle {
  patient: {
    id: string;
    name: string;
    age: number | null;
    sex: string | null;
    village: string | null;
    drift_score: number | null;
    status: string | null;
    last_check_at: string | null;
  };
  profile: EmergencyProfile | null;
  allergies: Allergy[];
  conditions: MedicalCondition[];
  medications: Medication[];
  surgeries: Surgery[];
  contacts: EmergencyContact[];
  /** How this view was opened, echoed back for the audit banner. */
  access: { via: "break_glass" | "signed_in"; at: string; label?: string | null };
}
