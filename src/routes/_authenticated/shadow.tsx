import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Sparkles, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/health/AppShell";
import { EmergencyCard } from "@/components/emergency/EmergencyCard";
import { EmergencyRecordView } from "@/components/emergency/EmergencyRecordView";
import { AccessLogList } from "@/components/emergency/AccessLogList";
import { DocumentUpload } from "@/components/emergency/DocumentUpload";
import {
  AllergyList,
  ConditionList,
  ContactList,
  MedicationList,
  SurgeryList,
} from "@/components/emergency/ShadowLists";
import { RiskBadge } from "@/components/emergency/RiskBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile } from "@/lib/health/api";
import * as shadow from "@/lib/health/shadow-api";
import { refreshEmergencySummary, readMedicalDocument } from "@/lib/health/shadow-ai.functions";
import { formatWhen, riskLevelFor, saveOfflineCopy } from "@/lib/health/shadow";
import type { ExtractedRecord, MedicalDocument } from "@/lib/health/shadow-types";

export const Route = createFileRoute("/_authenticated/shadow")({
  head: () => ({
    meta: [
      { title: "My emergency record — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Keep blood group, allergies, medicines and family contacts ready for an emergency, with a scannable card and a log of who opened it.",
      },
      { property: "og:title", content: "My emergency record — SwasthyaShadow" },
      {
        property: "og:description",
        content:
          "A digital health shadow that stays available when you cannot speak for yourself — with consent and an access log.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ShadowPage,
});

function ShadowPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState(false);
  const refreshSummary = useServerFn(refreshEmergencySummary);
  const readDoc = useServerFn(readMedicalDocument);

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const patientId = profileQuery.data?.linked_patient_id ?? null;

  const shadowQuery = useQuery({
    queryKey: ["shadow", patientId],
    enabled: !!patientId,
    queryFn: async () => {
      const profile = await shadow.ensureEmergencyProfile(patientId!);
      const [bundle, tokens, logs, documents] = await Promise.all([
        shadow.getShadowBundle(patientId!),
        shadow.listAccessTokens(patientId!),
        shadow.listAccessLogs(patientId!),
        shadow.listDocuments(patientId!),
      ]);
      return { profile, bundle, tokens, logs, documents };
    },
  });

  const data = shadowQuery.data;
  const bundle = data?.bundle ?? null;

  const derivedRisk = useMemo(
    () =>
      bundle
        ? riskLevelFor({
            allergies: bundle.allergies,
            conditions: bundle.conditions,
            medications: bundle.medications,
            driftScore: bundle.patient.drift_score,
          })
        : "low",
    [bundle],
  );

  // Keep the stored attention level in step with the record, and keep an offline
  // copy on this device so the card still opens without a network.
  useEffect(() => {
    if (!bundle || !data?.profile) return;
    if (data.profile.risk_level !== derivedRisk)
      void shadow.setRiskLevel(bundle.patient.id, derivedRisk);
    if (data.profile.offline_enabled) saveOfflineCopy(`self.${bundle.patient.id}`, bundle);
  }, [bundle, data?.profile, derivedRisk]);

  async function run(action: () => Promise<unknown>, success?: string) {
    setBusy(true);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: ["shadow", patientId] });
      if (success) toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function applyExtracted(extracted: ExtractedRecord) {
    if (!patientId) return;
    await run(async () => {
      for (const c of extracted.conditions ?? [])
        await shadow.addShadowRow("medical_conditions", {
          patient_id: patientId,
          name: c.name,
          severity: c.severity ?? null,
          notes: c.notes ?? null,
          source: "document",
        });
      for (const a of extracted.allergies ?? [])
        await shadow.addShadowRow("allergies", {
          patient_id: patientId,
          substance: a.substance,
          severity: a.severity ?? null,
          reaction: a.reaction ?? null,
          source: "document",
        });
      for (const m of extracted.medications ?? [])
        await shadow.addShadowRow("medications", {
          patient_id: patientId,
          name: m.name,
          dosage: m.dosage ?? null,
          frequency: m.frequency ?? null,
          source: "document",
        });
      for (const s of extracted.surgeries ?? [])
        await shadow.addShadowRow("surgeries", {
          patient_id: patientId,
          procedure: s.procedure,
          performed_on: s.performed_on ?? null,
          hospital: s.hospital ?? null,
          source: "document",
        });
    }, "Added to your record — please check the entries.");
  }

  if (profileQuery.isLoading || shadowQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (!patientId || !data || !bundle) {
    return (
      <AppShell role="patient" title="My emergency record">
        <Card>
          <CardHeader>
            <CardTitle>Setting up your record</CardTitle>
            <CardDescription>
              Your personal record is still being created. Please refresh in a moment.
            </CardDescription>
          </CardHeader>
        </Card>
      </AppShell>
    );
  }

  const profile = data.profile;

  return (
    <AppShell
      role="patient"
      title="My emergency record"
      subtitle="Kept ready for the moment you cannot speak for yourself. You decide who can open it."
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle>Basic details · मूल जानकारी</CardTitle>
                <CardDescription>
                  Shown at the top of your emergency card, before anything else.
                </CardDescription>
              </div>
              <RiskBadge level={derivedRisk} showHindi />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="blood">Blood group</Label>
                <Input
                  id="blood"
                  defaultValue={profile.blood_group ?? ""}
                  placeholder="O+"
                  maxLength={5}
                  onBlur={(e) =>
                    void run(() =>
                      shadow.updateEmergencyProfile(patientId, {
                        blood_group: e.target.value.trim() || null,
                      }),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dob">Date of birth</Label>
                <Input
                  id="dob"
                  type="date"
                  defaultValue={profile.date_of_birth ?? ""}
                  onBlur={(e) =>
                    void run(() =>
                      shadow.updateEmergencyProfile(patientId, {
                        date_of_birth: e.target.value || null,
                      }),
                    )
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  defaultValue={profile.address ?? ""}
                  placeholder="Village, block, district"
                  maxLength={200}
                  onBlur={(e) =>
                    void run(() =>
                      shadow.updateEmergencyProfile(patientId, {
                        address: e.target.value.trim() || null,
                      }),
                    )
                  }
                />
              </div>
            </div>
            <Label className="flex items-start gap-3 rounded-xl border border-border p-3">
              <Switch
                checked={profile.offline_enabled}
                disabled={busy}
                onCheckedChange={(v) =>
                  void run(() =>
                    shadow.updateEmergencyProfile(patientId, { offline_enabled: v }),
                  )
                }
              />
              <span className="min-w-0 text-sm font-normal">
                <span className="flex items-center gap-1.5 font-semibold">
                  <WifiOff className="size-4" aria-hidden />
                  Keep an offline copy on this phone
                </span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  Your emergency card can then be shown even with no network. Turn this off to remove
                  the copy from this device.
                </span>
              </span>
            </Label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" aria-hidden />
                  Handover summary
                </CardTitle>
                <CardDescription>
                  A short paragraph a responder can read in seconds. It only repeats what is on your
                  record — it never names a disease or suggests a medicine.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => refreshSummary({ data: { patientId } }),
                    "Handover summary updated.",
                  )
                }
              >
                <RefreshCw className="size-4" aria-hidden />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {profile.ai_summary ? (
              <>
                <p className="text-sm leading-relaxed">{profile.ai_summary}</p>
                <p className="text-xs text-muted-foreground">
                  Written {formatWhen(profile.ai_summary_at)}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                No summary yet. Add your details below, then press Refresh.
              </p>
            )}
          </CardContent>
        </Card>

        <AllergyList
          items={bundle.allergies}
          busy={busy}
          onAdd={(row) =>
            run(() => shadow.addShadowRow("allergies", { patient_id: patientId, ...row }))
          }
          onDelete={(id) => run(() => shadow.deleteShadowRow("allergies", id))}
        />
        <ConditionList
          items={bundle.conditions}
          busy={busy}
          onAdd={(row) =>
            run(() => shadow.addShadowRow("medical_conditions", { patient_id: patientId, ...row }))
          }
          onDelete={(id) => run(() => shadow.deleteShadowRow("medical_conditions", id))}
        />
        <MedicationList
          items={bundle.medications}
          busy={busy}
          onAdd={(row) =>
            run(() => shadow.addShadowRow("medications", { patient_id: patientId, ...row }))
          }
          onToggleActive={(id, active) =>
            run(() => shadow.updateShadowRow("medications", id, { active }))
          }
          onDelete={(id) => run(() => shadow.deleteShadowRow("medications", id))}
        />
        <SurgeryList
          items={bundle.surgeries}
          busy={busy}
          onAdd={(row) =>
            run(() => shadow.addShadowRow("surgeries", { patient_id: patientId, ...row }))
          }
          onDelete={(id) => run(() => shadow.deleteShadowRow("surgeries", id))}
        />
        <ContactList
          items={bundle.contacts}
          busy={busy}
          onAdd={(row) =>
            run(() => shadow.addShadowRow("emergency_contacts", { patient_id: patientId, ...row }))
          }
          onDelete={(id) => run(() => shadow.deleteShadowRow("emergency_contacts", id))}
        />

        <DocumentUpload
          documents={data.documents}
          busy={busy}
          onUpload={(file) =>
            run(() => shadow.uploadDocument(user!.id, patientId, file), "Paper uploaded.")
          }
          onRead={async (doc: MedicalDocument) => {
            const result = await readDoc({ data: { documentId: doc.id } });
            await queryClient.invalidateQueries({ queryKey: ["shadow", patientId] });
            return result.extracted;
          }}
          onDelete={(doc) => run(() => shadow.deleteDocument(doc))}
          onApply={applyExtracted}
        />

        <EmergencyCard
          profile={profile}
          tokens={data.tokens}
          busy={busy}
          onCreate={(label, days) =>
            run(
              () => shadow.createAccessToken(patientId, label, days),
              "New emergency code created.",
            )
          }
          onRevoke={(id) => run(() => shadow.revokeAccessToken(id), "Code revoked.")}
        />

        <AccessLogList logs={data.logs} />

        <section aria-label="Preview">
          <h2 className="mb-3 text-base font-semibold">What a responder will see</h2>
          <EmergencyRecordView bundle={bundle} />
        </section>
      </div>
    </AppShell>
  );
}
