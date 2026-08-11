/**
 * Server-only record reader and emergency summary writer.
 *
 * SAFETY: the model is instructed to summarise what is on record and to never
 * state or imply a diagnosis. Extracted document fields are always returned for
 * human review before anything is saved to the person's shadow record.
 */

import type { ExtractedRecord } from "./shadow-types";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.6-flash";

const SAFETY =
  "You support an emergency information tool for community health in India. You summarise what is already written in a person's record. Never state, imply, rank or guess a diagnosis. Never recommend a specific drug or dose. If information is missing, say it is not recorded.";

async function callGateway(body: unknown): Promise<Record<string, unknown>> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("AI is not configured for this project.");
  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify(body),
  });
  if (res.status === 429) throw new Error("AI is busy right now — please try again in a minute.");
  if (res.status === 402) throw new Error("AI credits are exhausted for this workspace.");
  if (!res.ok) throw new Error(`AI request failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as Record<string, unknown>;
}

function firstMessageContent(payload: Record<string, unknown>): string {
  const choices = payload["choices"] as { message?: { content?: unknown } }[] | undefined;
  const content = choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content))
    return content
      .map((part) => (typeof part === "object" && part && "text" in part ? String((part as { text: unknown }).text) : ""))
      .join("");
  return "";
}

export interface SummaryInput {
  name: string;
  age: number | null;
  sex: string | null;
  bloodGroup: string | null;
  allergies: { substance: string; severity: string | null; reaction: string | null }[];
  conditions: { name: string; severity: string | null }[];
  medications: { name: string; dosage: string | null; frequency: string | null; active: boolean }[];
  surgeries: { procedure: string; performed_on: string | null }[];
  driftScore: number | null;
}

export interface SummaryOutput {
  summary: string;
  riskFlags: string[];
}

/** Writes a short handover paragraph plus the lines a responder must read first. */
export async function generateSummary(input: SummaryInput): Promise<SummaryOutput> {
  const payload = await callGateway({
    model: MODEL,
    messages: [
      { role: "system", content: SAFETY },
      {
        role: "user",
        content: [
          "Write an emergency handover summary from this record. Reply as JSON with keys",
          '"summary" (3 to 5 short sentences, plain English an ambulance responder can read in 10 seconds)',
          'and "risk_flags" (array of up to 5 very short lines that must be read first, e.g. a severe allergy).',
          "Mention only what is recorded. No diagnosis, no medicine advice.",
          "",
          JSON.stringify(input),
        ].join("\n"),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "emergency_summary",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            risk_flags: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "risk_flags"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = firstMessageContent(payload).trim();
  try {
    const parsed = JSON.parse(raw) as { summary?: string; risk_flags?: string[] };
    return {
      summary: (parsed.summary ?? "").trim(),
      riskFlags: (parsed.risk_flags ?? []).slice(0, 5).map((f) => String(f).slice(0, 120)),
    };
  } catch {
    return { summary: raw.slice(0, 1200), riskFlags: [] };
  }
}

/** Reads a scanned prescription or discharge sheet into reviewable fields. */
export async function extractDocument(
  fileName: string,
  mimeType: string,
  base64: string,
): Promise<ExtractedRecord> {
  const isImage = mimeType.startsWith("image/");
  const media = isImage
    ? { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } }
    : { type: "file", file: { filename: fileName, file_data: `data:${mimeType};base64,${base64}` } };

  const payload = await callGateway({
    model: MODEL,
    messages: [
      { role: "system", content: SAFETY },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: [
              "Read this medical document and return only what is written in it, as JSON with keys:",
              "document_type, summary, conditions[{name,severity,notes}], allergies[{substance,severity,reaction}],",
              "medications[{name,dosage,frequency}], surgeries[{procedure,performed_on,hospital}], notes[string].",
              "Use null when a field is not written. Do not infer a diagnosis and do not invent entries.",
            ].join(" "),
          },
          media,
        ],
      },
    ],
  });

  const raw = firstMessageContent(payload).trim();
  const json = raw.startsWith("```") ? raw.replace(/^```[a-z]*\n?/i, "").replace(/```$/, "") : raw;
  try {
    return JSON.parse(json) as ExtractedRecord;
  } catch {
    return { summary: raw.slice(0, 1000), notes: ["Could not be read as structured fields."] };
  }
}
