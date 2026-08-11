import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_referrals",
  title: "List referrals",
  description: "Referrals for human clinical review that the caller can see, with facility, reason and status.",
  inputSchema: {
    patient_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).default(20),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ patient_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("referrals")
      .select("id, patient_id, reason, facility, status, created_at, updated_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (patient_id) query = query.eq("patient_id", patient_id);
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const payload = { referrals: data ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
