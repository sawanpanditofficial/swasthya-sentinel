/**
 * Emergency continuity logic. Pure functions only: no database, no network.
 * The same rules run on the responder screen, in the offline copy and in the
 * prompt sent to the record reader, so all three agree.
 *
 * SAFETY: nothing here diagnoses. Risk levels describe how much attention a
 * record needs in an emergency, using prototype rules that are not clinically
 * validated.
 */

import type {
  Allergy,
  EmergencyBundle,
  EmergencyContact,
  MedicalCondition,
  Medication,
  RiskLevel,
  TriageStatus,
} from "./shadow-types";

export const RISK_META: Record<RiskLevel, { label: string; hi: string; blurb: string }> = {
  low: { label: "Low", hi: "कम", blurb: "No high-attention entries recorded." },
  moderate: { label: "Moderate", hi: "मध्यम", blurb: "Some entries need care during treatment." },
  high: { label: "High", hi: "अधिक", blurb: "Severe entries present — read before treating." },
  critical: {
    label: "Critical",
    hi: "अति गंभीर",
    blurb: "Life-threatening entries present — read first.",
  },
};

export const RISK_TONE: Record<RiskLevel, string> = {
  low: "bg-stable-soft text-stable border-stable/30",
  moderate: "bg-monitor-soft text-monitor-foreground border-monitor/40",
  high: "bg-review-soft text-review border-review/30",
  critical: "bg-critical-soft text-critical border-critical/30",
};

export const TRIAGE_META: Record<TriageStatus, { label: string; tone: string }> = {
  unassessed: { label: "Not contacted", tone: "bg-muted text-muted-foreground border-border" },
  safe: { label: "Safe", tone: "bg-stable-soft text-stable border-stable/30" },
  needs_help: { label: "Needs help", tone: "bg-critical-soft text-critical border-critical/30" },
  evacuating: { label: "Evacuating", tone: "bg-review-soft text-review border-review/30" },
  hospitalised: {
    label: "At hospital",
    tone: "bg-monitor-soft text-monitor-foreground border-monitor/40",
  },
};

const SEVERE = new Set(["severe", "life_threatening", "critical", "anaphylaxis"]);

function isSevere(value: string | null | undefined): boolean {
  return value ? SEVERE.has(value.toLowerCase().replace(/[\s-]/g, "_")) : false;
}

/**
 * Prototype attention level for a record. Severe allergies dominate because
 * they change what a responder may safely give.
 */
export function riskLevelFor(input: {
  allergies: Pick<Allergy, "severity">[];
  conditions: Pick<MedicalCondition, "severity">[];
  medications: Pick<Medication, "active">[];
  driftScore?: number | null;
}): RiskLevel {
  const severeAllergy = input.allergies.some((a) => isSevere(a.severity));
  const severeCondition = input.conditions.some((c) => isSevere(c.severity));
  const activeMeds = input.medications.filter((m) => m.active).length;
  const drift = input.driftScore ?? 0;

  if (severeAllergy && (severeCondition || drift >= 80)) return "critical";
  if (severeAllergy || severeCondition || drift >= 80) return "high";
  if (activeMeds >= 2 || drift >= 60 || input.conditions.length > 0) return "moderate";
  return "low";
}

/** Short lines a responder must not miss, ordered by urgency. */
export function criticalFlags(bundle: {
  allergies: Allergy[];
  conditions: MedicalCondition[];
  medications: Medication[];
}): string[] {
  const flags: string[] = [];
  for (const a of bundle.allergies)
    if (isSevere(a.severity))
      flags.push(`Severe allergy: ${a.substance}${a.reaction ? ` — ${a.reaction}` : ""}`);
  for (const c of bundle.conditions)
    if (isSevere(c.severity)) flags.push(`Severe condition on record: ${c.name}`);
  const active = bundle.medications.filter((m) => m.active);
  if (active.length > 0)
    flags.push(`On ${active.length} regular medicine${active.length === 1 ? "" : "s"}`);
  return flags;
}

/**
 * Deterministic emergency summary, used before the AI summary exists and as the
 * fallback when generation is unavailable. Never states a diagnosis.
 */
export function fallbackSummary(bundle: {
  patient: { name: string; age: number | null; sex: string | null };
  allergies: Allergy[];
  conditions: MedicalCondition[];
  medications: Medication[];
}): string {
  const who = [
    bundle.patient.age ? `${bundle.patient.age} years` : null,
    bundle.patient.sex ?? null,
  ]
    .filter(Boolean)
    .join(", ");
  const parts: string[] = [`${bundle.patient.name}${who ? ` (${who})` : ""}.`];
  const allergies = bundle.allergies.map((a) => a.substance);
  parts.push(
    allergies.length ? `Recorded allergies: ${allergies.join(", ")}.` : "No allergies recorded.",
  );
  const conditions = bundle.conditions.map((c) => c.name);
  parts.push(
    conditions.length
      ? `Conditions on record: ${conditions.join(", ")}.`
      : "No long-term conditions recorded.",
  );
  const meds = bundle.medications.filter((m) => m.active).map((m) => m.name);
  parts.push(meds.length ? `Regular medicines: ${meds.join(", ")}.` : "No regular medicines recorded.");
  parts.push("Record summary only — not a diagnosis. Confirm with the person or their family.");
  return parts.join(" ");
}

export function sortContacts(contacts: EmergencyContact[]): EmergencyContact[] {
  return [...contacts].sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/* ---------------- Offline copy ---------------- */

const OFFLINE_PREFIX = "swasthyashadow.offline.";

export interface OfflineCopy {
  bundle: EmergencyBundle;
  savedAt: string;
}

export function saveOfflineCopy(key: string, bundle: EmergencyBundle): void {
  try {
    const payload: OfflineCopy = { bundle, savedAt: new Date().toISOString() };
    window.localStorage.setItem(OFFLINE_PREFIX + key, JSON.stringify(payload));
  } catch {
    /* storage unavailable — the online view still works */
  }
}

export function readOfflineCopy(key: string): OfflineCopy | null {
  try {
    const raw = window.localStorage.getItem(OFFLINE_PREFIX + key);
    return raw ? (JSON.parse(raw) as OfflineCopy) : null;
  } catch {
    return null;
  }
}

export function clearOfflineCopy(key: string): void {
  try {
    window.localStorage.removeItem(OFFLINE_PREFIX + key);
  } catch {
    /* nothing to clear */
  }
}

/** Public scan URL for an emergency token. */
export function emergencyUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/emergency/${token}`;
}

export function formatWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
