/**
 * Server functions for the emergency layer. Thin wrappers only — all runtime
 * work lives in the imported server-only modules.
 */

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import type { EmergencyBundle } from "./shadow-types";
import type { TokenResult } from "./emergency.server";

const TokenInput = z.object({
  token: z.string().trim().min(8).max(64),
  responderName: z.string().trim().max(120).optional(),
  responderOrg: z.string().trim().max(120).optional(),
});

/**
 * Break-glass open of an emergency card. Intentionally unauthenticated: a
 * responder with the person's QR card must not need an account. Every open is
 * written to the person's access log.
 */
export const openEmergencyCard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TokenInput.parse(data))
  .handler(async ({ data }): Promise<TokenResult> => {
    const { resolveByToken } = await import("./emergency.server");
    return resolveByToken(data.token, {
      name: data.responderName ?? null,
      org: data.responderOrg ?? null,
      role: "responder",
    });
  });

const LookupInput = z.object({ code: z.string().trim().min(4).max(32) });

/** Signed-in responder or hospital lookup by emergency code, under row-level rules. */
export const lookupEmergencyByCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => LookupInput.parse(data))
  .handler(async ({ data, context }): Promise<EmergencyBundle | null> => {
    const { lookupByCode } = await import("./emergency-lookup.server");
    return lookupByCode(context.supabase, context.userId, data.code.toUpperCase());
  });

const RoleInput = z.object({
  role: z.enum(["responder", "hospital", "coordinator"]),
  enabled: z.boolean(),
});

/**
 * Demo-mode role switch. Emergency roles only ever expose the seeded synthetic
 * records; a real member's record is reachable only through their own scan link
 * or their assigned worker.
 */
export const setDemoRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => RoleInput.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { toggleDemoRole } = await import("./emergency-lookup.server");
    await toggleDemoRole(context.userId, data.role, data.enabled);
    return { ok: true };
  });
