/**
 * Server-only lookups and demo role management for the emergency layer.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAccess } from "./emergency.server";
import type { EmergencyBundle } from "./shadow-types";

/**
 * Resolves an emergency code as the signed-in caller, so the database's own
 * access rules decide whether the record may be read. Records the access.
 */
export async function lookupByCode(
  client: SupabaseClient,
  userId: string,
  code: string,
): Promise<EmergencyBundle | null> {
  const { data: profile, error } = await client
    .from("emergency_profiles")
    .select("*")
    .eq("emergency_code", code)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;
  const patientId = (profile as { patient_id: string }).patient_id;

  const [patient, allergies, conditions, medications, surgeries, contacts] = await Promise.all([
    client.from("patients").select("*").eq("id", patientId).maybeSingle(),
    client.from("allergies").select("*").eq("patient_id", patientId),
    client.from("medical_conditions").select("*").eq("patient_id", patientId),
    client.from("medications").select("*").eq("patient_id", patientId),
    client.from("surgeries").select("*").eq("patient_id", patientId),
    client.from("emergency_contacts").select("*").eq("patient_id", patientId).order("priority"),
  ]);
  const p = patient.data as Record<string, unknown> | null;
  if (!p) return null;

  await logAccess({
    patientId,
    actorId: userId,
    actor: { role: "responder" },
    action: "emergency_card_opened",
    via: "signed_in",
    detail: `Code lookup ${code}`,
  });

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
    profile: profile as EmergencyBundle["profile"],
    allergies: (allergies.data ?? []) as EmergencyBundle["allergies"],
    conditions: (conditions.data ?? []) as EmergencyBundle["conditions"],
    medications: (medications.data ?? []) as EmergencyBundle["medications"],
    surgeries: (surgeries.data ?? []) as EmergencyBundle["surgeries"],
    contacts: (contacts.data ?? []) as EmergencyBundle["contacts"],
    access: { via: "signed_in", at: new Date().toISOString() },
  };
}

/** Adds or removes one demo emergency role for the caller's own account. */
export async function toggleDemoRole(
  userId: string,
  role: "responder" | "hospital" | "coordinator",
  enabled: boolean,
): Promise<void> {
  if (enabled) {
    const { error } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role }, { onConflict: "user_id,role" });
    if (error) throw error;
    return;
  }
  const { error } = await supabaseAdmin
    .from("user_roles")
    .delete()
    .eq("user_id", userId)
    .eq("role", role);
  if (error) throw error;
}
