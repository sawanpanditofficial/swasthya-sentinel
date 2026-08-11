import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "record_case_review",
  title: "Record case review",
  description:
    "Records a reviewer decision on a baseline deviation (reviewed, escalated, closed or reopened) with a resolution note. Requires review/escalate coverage for that patient's village.",
  inputSchema: {
    patient_id: z.string().uuid(),
    alert_id: z.string().uuid().optional(),
    action: z.enum(["reviewed", "escalated", "closed", "reopened"]),
    note: z.string().trim().min(8).max(500).describe("Resolution note explaining the decision."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ patient_id, alert_id, action, note }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error } = await supabase.from("case_reviews").insert({
      patient_id,
      alert_id: alert_id ?? null,
      action,
      note,
      reviewer_id: ctx.getUserId(),
      reviewer_name: ctx.getUserEmail() ?? null,
    });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    if (alert_id) {
      const { error: alertError } = await supabase
        .from("alerts")
        .update({
          review_state: action,
          review_note: note,
          reviewed_by: ctx.getUserId(),
          reviewed_at: new Date().toISOString(),
          acknowledged: true,
        })
        .eq("id", alert_id);
      if (alertError) return { content: [{ type: "text", text: alertError.message }], isError: true };
    }

    return { content: [{ type: "text", text: `Recorded "${action}" for patient ${patient_id}.` }] };
  },
});
