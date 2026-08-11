import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser, NOT_CLINICAL } from "../supabase";

export default defineTool({
  name: "my_health_summary",
  title: "My health summary",
  description:
    "Summary of the signed-in person's own record: current prototype Health Drift score, status band, village and last check time.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("full_name, role, linked_patient_id, consent_given, language")
      .eq("id", ctx.getUserId()!)
      .maybeSingle();
    if (profileError) {
      return { content: [{ type: "text", text: profileError.message }], isError: true };
    }
    if (!profile?.linked_patient_id) {
      return {
        content: [{ type: "text", text: "No linked health record yet. Complete a daily check in the app first." }],
      };
    }
    const { data: patient, error } = await supabase
      .from("patients")
      .select("id, name, age, sex, village, drift_score, status, last_check_at")
      .eq("id", profile.linked_patient_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const payload = { profile, patient, disclaimer: NOT_CLINICAL };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
