/**
 * Creates a blank personal health record for a signed-in citizen who does not
 * have one yet, so every new account starts with an empty baseline instead of
 * sharing the seeded demo persona.
 */
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const ensureOwnPatient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<string | null> => {
    const { data: profile, error } = await context.supabase
      .from("profiles")
      .select("full_name, role, linked_patient_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!profile) return null;
    if (profile.linked_patient_id) return profile.linked_patient_id;
    if (profile.role !== "patient") return null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error: insertError } = await supabaseAdmin
      .from("patients")
      .insert({
        name: profile.full_name ?? "New member",
        baseline_profile: "steady",
        drift_score: 0,
        status: "stable",
        is_demo: true,
      })
      .select("id")
      .single();
    if (insertError) throw insertError;

    const { error: linkError } = await supabaseAdmin
      .from("profiles")
      .update({ linked_patient_id: created.id })
      .eq("id", context.userId);
    if (linkError) throw linkError;

    return created.id;
  });
