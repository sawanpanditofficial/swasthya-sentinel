import { useRef, useState } from "react";
import { FileText, Loader2, ScanLine, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatWhen } from "@/lib/health/shadow";
import type { ExtractedRecord, MedicalDocument } from "@/lib/health/shadow-types";

/**
 * Upload a prescription or discharge sheet, have it read into fields, then
 * review before anything is added to the record. Nothing is saved automatically.
 */
export function DocumentUpload({
  documents,
  onUpload,
  onRead,
  onDelete,
  onApply,
  busy,
}: {
  documents: MedicalDocument[];
  onUpload: (file: File) => Promise<void>;
  onRead: (doc: MedicalDocument) => Promise<ExtractedRecord>;
  onDelete: (doc: MedicalDocument) => Promise<void>;
  onApply: (extracted: ExtractedRecord) => Promise<void>;
  busy?: boolean | undefined;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [readingId, setReadingId] = useState<string | null>(null);
  const [review, setReview] = useState<{ doc: MedicalDocument; extracted: ExtractedRecord } | null>(
    null,
  );

  async function handleRead(doc: MedicalDocument) {
    setReadingId(doc.id);
    try {
      const extracted = await onRead(doc);
      setReview({ doc, extracted });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "The document could not be read.");
    } finally {
      setReadingId(null);
    }
  }

  const counts = review
    ? {
        conditions: review.extracted.conditions?.length ?? 0,
        allergies: review.extracted.allergies?.length ?? 0,
        medications: review.extracted.medications?.length ?? 0,
        surgeries: review.extracted.surgeries?.length ?? 0,
      }
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Medical papers · मेडिकल कागज़</CardTitle>
        <CardDescription>
          Upload a photo or PDF of a prescription, lab report or discharge sheet. It is read into
          fields you can check before they are added — nothing is saved on its own, and the reader
          never decides a diagnosis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) {
              toast.error("Please choose a file under 8 MB.");
              return;
            }
            await onUpload(file);
          }}
        />
        <Button variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
          <Upload className="size-4" aria-hidden />
          Upload a paper
        </Button>

        {documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No papers uploaded yet.</p>
        ) : (
          <ul className="space-y-2">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{doc.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatWhen(doc.created_at)} · {doc.extract_error ?? doc.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy || readingId === doc.id}
                    onClick={() => void handleRead(doc)}
                  >
                    {readingId === doc.id ? (
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                    ) : (
                      <ScanLine className="size-4" aria-hidden />
                    )}
                    Read
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={busy}
                    aria-label={`Delete ${doc.file_name}`}
                    onClick={() => void onDelete(doc)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {review && counts && (
          <div className="space-y-3 rounded-xl border border-primary/30 bg-primary-soft/40 p-4">
            <div>
              <p className="text-sm font-semibold">Check what was read</p>
              <p className="text-xs text-muted-foreground">
                From {review.doc.file_name}
                {review.extracted.document_type ? ` · ${review.extracted.document_type}` : ""}
              </p>
            </div>
            {review.extracted.summary && (
              <p className="text-sm leading-relaxed">{review.extracted.summary}</p>
            )}
            <ul className="space-y-1 text-sm">
              <ReviewLine label="Conditions" items={review.extracted.conditions?.map((c) => c.name)} />
              <ReviewLine label="Allergies" items={review.extracted.allergies?.map((a) => a.substance)} />
              <ReviewLine
                label="Medicines"
                items={review.extracted.medications?.map((m) =>
                  [m.name, m.dosage].filter(Boolean).join(" "),
                )}
              />
              <ReviewLine label="Surgeries" items={review.extracted.surgeries?.map((s) => s.procedure)} />
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={
                  busy ||
                  counts.conditions + counts.allergies + counts.medications + counts.surgeries === 0
                }
                onClick={async () => {
                  await onApply(review.extracted);
                  setReview(null);
                }}
              >
                Add these to my record
              </Button>
              <Button variant="outline" onClick={() => setReview(null)}>
                Discard
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReviewLine({ label, items }: { label: string; items?: string[] }) {
  if (!items || items.length === 0) return null;
  return (
    <li>
      <span className="font-medium">{label}:</span>{" "}
      <span className="text-muted-foreground">{items.join(", ")}</span>
    </li>
  );
}
