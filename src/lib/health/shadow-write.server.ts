/**
 * Server-only writes for the emergency layer: summary generation and document
 * reading. Reads and writes happen as the signed-in caller so the database's
 * own access rules apply; the file bytes are fetched with elevated access
 * because storage objects live under the uploader's folder.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { extractDocument, generateSummary } from "./shadow-ai.server";
import type { ExtractedRecord } from "./shadow-types";

const MAX_DOC_BYTES = 8 * 1024 * 1024;

export async function buildAndSaveSummary(
  client: SupabaseClient,
  patientId: string,
): Promise<{ summary: string; riskFlags: string[]; at: string }> {
  const [patient, profile, allergies, conditions, medications, surgeries] = await Promise.all([
    client.from("patients").select("name, age, sex, drift_score").eq("id", patientId).maybeSingle(),
    client.from("emergency_profiles").select("blood_group").eq("patient_id", patientId).maybeSingle(),
    client.from("allergies").select("substance, severity, reaction").eq("patient_id", patientId),
    client.from("medical_conditions").select("name, severity").eq("patient_id", patientId),
    client
      .from("medications")
      .select("name, dosage, frequency, active")
      .eq("patient_id", patientId),
    client.from("surgeries").select("procedure, performed_on").eq("patient_id", patientId),
  ]);

  const p = patient.data as Record<string, unknown> | null;
  if (!p) throw new Error("This record is not available.");

  const result = await generateSummary({
    name: String(p["name"]),
    age: (p["age"] as number | null) ?? null,
    sex: (p["sex"] as string | null) ?? null,
    bloodGroup: ((profile.data as { blood_group?: string | null } | null)?.blood_group) ?? null,
    allergies: (allergies.data ?? []) as never,
    conditions: (conditions.data ?? []) as never,
    medications: (medications.data ?? []) as never,
    surgeries: (surgeries.data ?? []) as never,
    driftScore: (p["drift_score"] as number | null) ?? null,
  });

  const at = new Date().toISOString();
  const { error } = await client
    .from("emergency_profiles")
    .update({ ai_summary: result.summary, ai_summary_at: at, ai_risk_flags: result.riskFlags })
    .eq("patient_id", patientId);
  if (error) throw error;

  return { ...result, at };
}

export async function readDocument(
  client: SupabaseClient,
  documentId: string,
): Promise<{ extracted: ExtractedRecord }> {
  const { data: doc, error } = await client
    .from("medical_documents")
    .select("id, file_name, mime_type, storage_path")
    .eq("id", documentId)
    .maybeSingle();
  if (error) throw error;
  if (!doc) throw new Error("This document is not available.");
  const row = doc as { file_name: string; mime_type: string | null; storage_path: string };

  await client.from("medical_documents").update({ status: "processing" }).eq("id", documentId);

  try {
    const file = await supabaseAdmin.storage.from("medical-documents").download(row.storage_path);
    if (file.error || !file.data) throw new Error("The uploaded file could not be read.");
    const bytes = new Uint8Array(await file.data.arrayBuffer());
    if (bytes.byteLength === 0) throw new Error("The uploaded file is empty.");
    if (bytes.byteLength > MAX_DOC_BYTES) throw new Error("File is larger than 8 MB.");

    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
    const base64 = btoa(binary);

    const extracted = await extractDocument(
      row.file_name,
      row.mime_type ?? "application/pdf",
      base64,
    );
    await client
      .from("medical_documents")
      .update({ status: "extracted", extracted: extracted as never, extract_error: null })
      .eq("id", documentId);
    return { extracted };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Reading failed.";
    await client
      .from("medical_documents")
      .update({ status: "failed", extract_error: message.slice(0, 300) })
      .eq("id", documentId);
    throw new Error(message);
  }
}
