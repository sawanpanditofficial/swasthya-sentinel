/**
 * Assignment-based scoping and consent metadata.
 *
 * A worker only ever sees the community members in a village they are assigned
 * to, and can only act on a case when the matching permission grant is present.
 * The database enforces this with row-level rules; these helpers mirror the same
 * decisions in the UI so controls are hidden rather than failing on submit.
 */

import type { ConsentScope, Patient, Profile, WorkerAssignment } from "./types";

/** Demo villages available for coverage in the synthetic dataset. */
export const DEMO_VILLAGES = [
  "Rampur",
  "Sonapur",
  "Manikpur",
  "Chandanpur",
  "Bhilwara Khurd",
] as const;

/** A coverage row can use "*" to mean "every village in the block". */
export const ALL_VILLAGES = "*";

export interface Grants {
  canView: boolean;
  canReview: boolean;
  canEscalate: boolean;
  /** The assignment row that granted access, when there is one. */
  via: WorkerAssignment | null;
}

const NO_GRANTS: Grants = { canView: false, canReview: false, canEscalate: false, via: null };

function covers(a: WorkerAssignment, village: string | null): boolean {
  return a.village === ALL_VILLAGES || (village != null && a.village === village);
}

/** What this worker may do with one community member. */
export function grantsForPatient(
  assignments: WorkerAssignment[],
  patient: Pick<Patient, "village"> | null | undefined,
): Grants {
  if (!patient) return NO_GRANTS;
  const matching = assignments.filter((a) => covers(a, patient.village ?? null));
  if (matching.length === 0) return NO_GRANTS;
  return {
    canView: true,
    canReview: matching.some((a) => a.can_review),
    canEscalate: matching.some((a) => a.can_escalate),
    via: matching[0]!,
  };
}

/** Villages this worker covers, expanded for display. */
export function coveredVillages(assignments: WorkerAssignment[]): string[] {
  if (assignments.some((a) => a.village === ALL_VILLAGES)) return [...DEMO_VILLAGES];
  return assignments.map((a) => a.village);
}

export function coverageSummary(assignments: WorkerAssignment[]): string {
  if (assignments.length === 0)
    return "No village assigned yet — cases stay hidden until coverage is granted.";
  const villages = coveredVillages(assignments);
  const review = assignments.filter((a) => a.can_review).length;
  const escalate = assignments.filter((a) => a.can_escalate).length;
  return `${villages.length} village${villages.length === 1 ? "" : "s"} · ${review} with review rights · ${escalate} with escalation rights`;
}

/* ---------------- Consent scopes ---------------- */

export const CONSENT_SCOPES: {
  scope: Exclude<ConsentScope, "all">;
  field: keyof Pick<
    Profile,
    "consent_voice" | "consent_reaction" | "consent_activity" | "consent_symptoms" | "consent_vitals"
  >;
  label: string;
  hi: string;
  detail: string;
  /** What happens in the daily check when this is paused. */
  paused: string;
}[] = [
  {
    scope: "voice",
    field: "consent_voice",
    label: "Voice sample",
    hi: "आवाज़",
    detail:
      "A few seconds of a held vowel, analysed in the browser for a stability number. The audio itself is never uploaded.",
    paused: "The voice step is skipped and voice stability is left out of the drift score.",
  },
  {
    scope: "reaction",
    field: "consent_reaction",
    label: "Tap reaction test",
    hi: "प्रतिक्रिया",
    detail: "Five tap response times, stored as a mean and median in milliseconds.",
    paused: "The tap test is skipped and reaction time is left out of the drift score.",
  },
  {
    scope: "activity",
    field: "consent_activity",
    label: "Daily activity",
    hi: "गतिविधि",
    detail: "A step count entered by hand or shared by a device. Never location.",
    paused: "No step count is asked for or compared with the personal baseline.",
  },
  {
    scope: "symptoms",
    field: "consent_symptoms",
    label: "Symptom questions",
    hi: "लक्षण",
    detail: "The symptom checkboxes, sleep rating and optional note in the person's own words.",
    paused: "Symptom questions are hidden and symptom load is left out of the drift score.",
  },
  {
    scope: "vitals",
    field: "consent_vitals",
    label: "Optional vitals",
    hi: "वाइटल",
    detail: "Temperature, SpO₂ and pulse, only when a device is available.",
    paused: "Vital entry is hidden. Nothing else about the check changes.",
  },
];

export const CONSENT_SCOPE_LABEL: Record<ConsentScope, string> = {
  all: "All monitoring",
  voice: "Voice sample",
  reaction: "Tap reaction test",
  activity: "Daily activity",
  symptoms: "Symptom questions",
  vitals: "Optional vitals",
};

/** Names of the check steps currently paused for this person. */
export function pausedScopes(profile: Profile | null | undefined): string[] {
  if (!profile) return [];
  if (!profile.consent_given) return CONSENT_SCOPES.map((s) => s.label);
  return CONSENT_SCOPES.filter((s) => profile[s.field] === false).map((s) => s.label);
}
