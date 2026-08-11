/**
 * Server-only emergency access resolution.
 *
 * Break-glass access is deliberately readable without an account: an emergency
 * responder holding the person's QR card must not be asked to sign in. Every
 * open is written to the audit log, tokens can expire and can be revoked by the
 * person at any time, and the payload is limited to what treatment needs.
 */

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { EmergencyBundle } from "./shadow-types";

export interface Actor {
  name?: string | null;
  org?: string | null;
  role?: string | null;
}

async function buildBundle(
  patientId: string,
  access: EmergencyBundle["access"],
): Promise<EmergencyBundle | null> {
  const [patient, profile, allergies, conditions, medications, surgeries, contacts] =
    await Promise.all([
      supabaseAdmin.from("patients").select("*").eq("id", patientId).maybeSingle(),
      supabaseAdmin.from("emergency_profiles").select("*").eq("patient_id", patientId).maybeSingle(),
      supabaseAdmin.from("allergies").select("*").eq("patient_id", patientId),
      supabaseAdmin.from("medical_conditions").select("*").eq("patient_id", patientId),
      supabaseAdmin.from("medications").select("*").eq("patient_id", patientId),
      supabaseAdmin.from("surgeries").select("*").eq("patient_id", patientId),
      supabaseAdmin
        .from("emergency_contacts")
        .select("*")
        .eq("patient_id", patientId)
        .order("priority", { ascending: true }),
    ]);

  const p = patient.data as Record<string, unknown> | null;
  if (!p) return null;

  return {
    patient: {
      id: String(p["id"]),
      name: String(p["name"]),
      age: (p["age"] as number | null) ?? null,
      sex: (p["sex"] as string | null) ?? null,
      village: (p["village"] as string | null) ?? null,
      drift_score: (p["drift_score"] as number | null) ?? null,
      status: (p["status"] as string | null) ?? null,
      last_check_at: (p["last_check_at"] as string | null) ?? null,
    },
    profile: (profile.data as EmergencyBundle["profile"]) ?? null,
    allergies: (allergies.data ?? []) as EmergencyBundle["allergies"],
    conditions: (conditions.data ?? []) as EmergencyBundle["conditions"],
    medications: (medications.data ?? []) as EmergencyBundle["medications"],
    surgeries: (surgeries.data ?? []) as EmergencyBundle["surgeries"],
    contacts: (contacts.data ?? []) as EmergencyBundle["contacts"],
    access,
  };
}

export async function logAccess(input: {
  patientId: string;
  actorId?: string | null;
  actor: Actor;
  action: string;
  via: "break_glass" | "signed_in";
  scope?: string;
  detail?: string | null;
}): Promise<void> {
  await supabaseAdmin.from("access_logs").insert({
    patient_id: input.patientId,
    actor_id: input.actorId ?? null,
    actor_role: input.actor.role ?? null,
    actor_name: input.actor.name?.slice(0, 120) ?? null,
    actor_org: input.actor.org?.slice(0, 120) ?? null,
    action: input.action,
    scope: input.scope ?? "emergency_card",
    via: input.via,
    detail: input.detail ?? null,
  });
}

export type TokenResult =
  | { ok: true; bundle: EmergencyBundle }
  | { ok: false; reason: "not_found" | "revoked" | "expired" };

/** Opens an emergency card from a QR token and records the access. */
export async function resolveByToken(token: string, actor: Actor): Promise<TokenResult> {
  const { data } = await supabaseAdmin
    .from("emergency_access_tokens")
    .select("id, patient_id, label, revoked, expires_at")
    .eq("token", token)
    .maybeSingle();
  if (!data) return { ok: false, reason: "not_found" };
  const row = data as { patient_id: string; label: string | null; revoked: boolean; expires_at: string | null };
  if (row.revoked) return { ok: false, reason: "revoked" };
  if (row.expires_at && new Date(row.expires_at).getTime() < Date.now())
    return { ok: false, reason: "expired" };

  const bundle = await buildBundle(row.patient_id, {
    via: "break_glass",
    at: new Date().toISOString(),
    label: row.label,
  });
  if (!bundle) return { ok: false, reason: "not_found" };

  await logAccess({
    patientId: row.patient_id,
    actor: { ...actor, role: actor.role ?? "responder" },
    action: "emergency_card_opened",
    via: "break_glass",
    detail: row.label ? `Scan card: ${row.label}` : "Emergency QR scan",
  });

  return { ok: true, bundle };
}
