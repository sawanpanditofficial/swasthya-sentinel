import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, NOT_CLINICAL } from "../supabase";

export default defineTool({
  name: "list_health_checks",
  title: "List health checks",
  description:
    "Longitudinal daily health checks for a patient the caller may access (defaults to the caller's own record): reaction time, activity, symptoms, vitals and prototype drift score per day.",
  inputSchema: {
    patient_id: z.string().uuid().optional().describe("Patient id; omit to use the caller's own record."),
    limit: z.number().int().min(1).max(60).default(30).describe("Number of most recent checks."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let targetId = patient_id;
    if (!targetId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("linked_patient_id")
        .eq("id", ctx.getUserId()!)
        .maybeSingle();
      targetId = profile?.linked_patient_id ?? undefined;
    }
    if (!targetId) {
      return { content: [{ type: "text", text: "No patient record available for this caller." }] };
    }
    const { data, error } = await supabase
      .from("health_checks")
      .select(
        "check_date, reaction_mean_ms, reaction_median_ms, activity_steps, voice_status, voice_jitter, symptoms, vitals, drift_score, drift_band, deviations",
      )
      .eq("patient_id", targetId)
      .order("check_date", { ascending: false })
      .limit(limit ?? 30);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const payload = { patient_id: targetId, checks: data ?? [], disclaimer: NOT_CLINICAL };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
