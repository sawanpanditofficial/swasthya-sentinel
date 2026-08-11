import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser, NOT_CLINICAL } from "../supabase";

export default defineTool({
  name: "list_priority_patients",
  title: "List priority patients",
  description:
    "Patients within the caller's village coverage ranked by prototype Health Drift score, for prioritising human review. Returns nothing for citizens without coverage.",
  inputSchema: {
    band: z
      .enum(["stable", "monitor", "review", "high"])
      .optional()
      .describe("Filter by prototype status band."),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ band, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("patients")
      .select("id, name, age, sex, village, drift_score, status, last_check_at")
      .order("drift_score", { ascending: false })
      .limit(limit ?? 20);
    if (band) query = query.eq("status", band);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const payload = { patients: data ?? [], disclaimer: NOT_CLINICAL };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
