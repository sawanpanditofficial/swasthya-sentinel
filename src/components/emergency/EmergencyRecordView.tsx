import { AlertTriangle, Droplets, HeartPulse, MapPin, Phone, Pill, Scissors, WifiOff } from "lucide-react";
import { RiskBadge } from "./RiskBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { criticalFlags, fallbackSummary, formatWhen, sortContacts, telHref } from "@/lib/health/shadow";
import type { EmergencyBundle } from "@/lib/health/shadow-types";

/**
 * Emergency-mode record view. Critical information first, very large type, no
 * navigation chrome — designed to be read in seconds on a phone at a roadside.
 */
export function EmergencyRecordView({
  bundle,
  offline = false,
  savedAt,
}: {
  bundle: EmergencyBundle;
  offline?: boolean;
  savedAt?: string | null;
}) {
  const flags = bundle.profile?.ai_risk_flags?.length
    ? bundle.profile.ai_risk_flags
    : criticalFlags(bundle);
  const summary = bundle.profile?.ai_summary?.trim() || fallbackSummary(bundle);
  const contacts = sortContacts(bundle.contacts);
  const activeMeds = bundle.medications.filter((m) => m.active);

  return (
    <div className="space-y-4">
      {offline && (
        <div className="flex items-center gap-2 rounded-xl border border-monitor/40 bg-monitor-soft px-4 py-3 text-sm font-medium text-monitor-foreground">
          <WifiOff className="size-4 shrink-0" aria-hidden />
          Offline copy saved on this device{savedAt ? ` on ${formatWhen(savedAt)}` : ""}. It may not
          be the latest record.
        </div>
      )}

      <div className="rounded-2xl border border-critical/30 bg-critical-soft p-5">
        <p className="text-xs font-semibold tracking-[0.18em] text-critical uppercase">
          Emergency record · आपातकालीन जानकारी
        </p>
        <h1 className="font-display mt-1 text-3xl leading-tight font-semibold text-foreground">
          {bundle.patient.name}
        </h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-foreground/80">
          {bundle.patient.age != null && <span>{bundle.patient.age} yrs</span>}
          {bundle.patient.sex && <span className="capitalize">{bundle.patient.sex}</span>}
          {bundle.profile?.blood_group && (
            <span className="inline-flex items-center gap-1.5 font-semibold text-critical">
              <Droplets className="size-4" aria-hidden />
              {bundle.profile.blood_group}
            </span>
          )}
          {bundle.patient.village && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-4" aria-hidden />
              {bundle.patient.village}
            </span>
          )}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {bundle.profile && <RiskBadge level={bundle.profile.risk_level} showHindi />}
          {bundle.profile?.emergency_code && (
            <span className="rounded-full border border-border bg-card px-2.5 py-1 font-mono text-xs">
              {bundle.profile.emergency_code}
            </span>
          )}
        </div>
      </div>

      {flags.length > 0 && (
        <Card className="border-critical/40">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-critical">
              <AlertTriangle className="size-5" aria-hidden />
              Read first
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {flags.map((flag) => (
                <li
                  key={flag}
                  className="rounded-lg bg-critical-soft px-3 py-2 text-base font-semibold text-foreground"
                >
                  {flag}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {contacts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Call family · परिवार को फ़ोन करें</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {contacts.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {c.relationship ?? "Contact"} · {c.phone}
                  </p>
                </div>
                <Button asChild size="lg" className="h-11 shrink-0">
                  <a href={telHref(c.phone)}>
                    <Phone className="size-4" aria-hidden />
                    Call
                  </a>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Handover summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-base leading-relaxed">{summary}</p>
          <p className="text-xs text-muted-foreground">
            Summary of what is on record. Not a diagnosis and not clinically validated — confirm
            with the person or their family.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <RecordList
          title="Allergies"
          icon={<AlertTriangle className="size-4" aria-hidden />}
          empty="No allergies recorded."
          items={bundle.allergies.map((a) => ({
            id: a.id,
            primary: a.substance,
            secondary: [a.severity, a.reaction].filter(Boolean).join(" · ") || null,
            severe: (a.severity ?? "").toLowerCase().startsWith("severe"),
          }))}
        />
        <RecordList
          title="Conditions on record"
          icon={<HeartPulse className="size-4" aria-hidden />}
          empty="No long-term conditions recorded."
          items={bundle.conditions.map((c) => ({
            id: c.id,
            primary: c.name,
            secondary: [c.severity, c.diagnosed_on].filter(Boolean).join(" · ") || null,
            severe: (c.severity ?? "").toLowerCase().startsWith("severe"),
          }))}
        />
        <RecordList
          title="Regular medicines"
          icon={<Pill className="size-4" aria-hidden />}
          empty="No regular medicines recorded."
          items={activeMeds.map((m) => ({
            id: m.id,
            primary: m.name,
            secondary: [m.dosage, m.frequency].filter(Boolean).join(" · ") || null,
            severe: false,
          }))}
        />
        <RecordList
          title="Past surgeries"
          icon={<Scissors className="size-4" aria-hidden />}
          empty="No surgeries recorded."
          items={bundle.surgeries.map((s) => ({
            id: s.id,
            primary: s.procedure,
            secondary: [s.performed_on, s.hospital].filter(Boolean).join(" · ") || null,
            severe: false,
          }))}
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Opened {bundle.access.via === "break_glass" ? "with an emergency scan link" : "as a signed-in user"} on{" "}
        {formatWhen(bundle.access.at)}. This access is recorded in the person's own access log.
      </p>
    </div>
  );
}

function RecordList({
  title,
  icon,
  items,
  empty,
}: {
  title: string;
  icon: React.ReactNode;
  items: { id: string; primary: string; secondary: string | null; severe: boolean }[];
  empty: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="text-sm">
                <span className={item.severe ? "font-semibold text-critical" : "font-medium"}>
                  {item.primary}
                </span>
                {item.secondary && (
                  <span className="block text-muted-foreground capitalize">{item.secondary}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
