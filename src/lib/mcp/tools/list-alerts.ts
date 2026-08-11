import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, NOT_CLINICAL } from "../supabase";

export default defineTool({
  name: "list_alerts",
  title: "List deviation alerts",
  description:
    "Baseline-deviation alerts visible to the caller, with severity, review state and whether human clinical review is still recommended.",
  inputSchema: {
    patient_id: z.string().uuid().optional(),
    unacknowledged_only: z.boolean().default(false),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id, unacknowledged_only, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("alerts")
      .select(
        "id, patient_id, severity, title, body, requires_review, acknowledged, review_state, review_note, reviewed_at, created_at, patient:patients(name, village, drift_score, status)",
      )
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (patient_id) query = query.eq("patient_id", patient_id);
    if (unacknowledged_only) query = query.eq("acknowledged", false);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const payload = { alerts: data ?? [], disclaimer: NOT_CLINICAL };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
