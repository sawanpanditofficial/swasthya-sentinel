/**
 * Server functions for AI record reading and emergency summaries.
 * Thin wrappers — runtime work lives in the imported server-only modules.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { ExtractedRecord } from "./shadow-types";

const SummaryInputSchema = z.object({ patientId: z.string().uuid() });

/** Regenerates the person's emergency handover summary from their own record. */
export const refreshEmergencySummary = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SummaryInputSchema.parse(data))
  .handler(
    async ({ data, context }): Promise<{ summary: string; riskFlags: string[]; at: string }> => {
      const { buildAndSaveSummary } = await import("./shadow-write.server");
      return buildAndSaveSummary(context.supabase, data.patientId);
    },
  );

const DocInputSchema = z.object({ documentId: z.string().uuid() });

/** Reads an uploaded document into reviewable fields; nothing is saved to the record yet. */
export const readMedicalDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => DocInputSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ extracted: ExtractedRecord }> => {
    const { readDocument } = await import("./shadow-write.server");
    return readDocument(context.supabase, data.documentId);
  });
