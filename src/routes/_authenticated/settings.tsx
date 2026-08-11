import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BellRing,
  Database,
  Loader2,
  Lock,
  ShieldOff,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { AppShell } from "@/components/health/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { ensureProfile, saveReminderSettings, setConsent } from "@/lib/health/api";
import { DRIFT_BANDS, DRIFT_DISCLAIMER } from "@/lib/health/drift";
import {
  REMINDER_CHANNELS,
  REMINDER_TIME_OPTIONS,
  formatReminderTime,
  reminderChannelMeta,
  reminderPreview,
} from "@/lib/health/streak";
import type { ReminderChannel } from "@/lib/health/types";

import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({
    meta: [
      { title: "Consent & privacy — SwasthyaShadow" },
      {
        name: "description",
        content:
          "Exactly what SwasthyaShadow collects, the prototype thresholds it uses, how reminders work, and how to withdraw consent at any time.",
      },
      { property: "og:title", content: "Consent & privacy — SwasthyaShadow" },
      {
        property: "og:description",
        content: "Plain-language data disclosure and one-tap consent withdrawal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

const COLLECTED = [
  {
    title: "Voice sample",
    detail:
      "A few seconds of you saying a held vowel. In this prototype the recording is analysed in your browser for a stability index and is not uploaded or stored — only the derived number is kept.",
  },
  {
    title: "Tap reaction times",
    detail:
      "Five tap response times, stored as a mean and median in milliseconds. No screen recording, no keystroke capture.",
  },
  {
    title: "Daily activity",
    detail: "A step count you enter yourself, or one shared by a device you connect. Never location.",
  },
  {
    title: "Self-reported symptoms",
    detail:
      "The symptom checkboxes and sleep rating you fill in, plus an optional note in your own words.",
  },
  {
    title: "Optional vitals",
    detail: "Temperature, SpO₂ and pulse if you or an ASHA worker have a device to measure them.",
  },
  {
    title: "Account details",
    detail: "Your name, email and role. No Aadhaar, phone contacts, photos, or GPS location.",
  },
];

function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: () => ensureProfile(user!.id, user!.user_metadata?.["full_name"] as string | undefined),
  });
  const profile = profileQuery.data;
  const role = profile?.role === "doctor" ? "doctor" : profile?.role === "asha" ? "asha" : "patient";

  const channelMeta = reminderChannelMeta(profile?.reminder_channel ?? "in_app");
  const [contact, setContact] = useState("");
  // Keep the contact input in step with the saved profile value.
  useEffect(() => {
    setContact(profile?.reminder_contact ?? "");
  }, [profile?.reminder_contact, profile?.reminder_channel]);

  const reminders = useMutation({
    mutationFn: (patch: {
      reminder_enabled?: boolean;
      reminder_time?: string;
      reminder_channel?: ReminderChannel;
      reminder_contact?: string | null;
    }) => saveReminderSettings(user!.id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Reminder preferences saved.");
    },
    onError: () => toast.error("Could not save reminder preferences."),
  });


  const consent = useMutation({
    mutationFn: (next: boolean) => setConsent(user!.id, next),
    onSuccess: (_d, next) => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success(
        next
          ? "Consent restored. Monitoring has resumed."
          : "Consent withdrawn. New checks and alerts are paused.",
      );
    },
    onError: () => toast.error("Could not update consent."),
  });

  if (profileQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  const consentGiven = profile?.consent_given ?? true;

  return (
    <AppShell
      role={role}
      title="Consent & privacy"
      subtitle="What we collect, how the prototype decides something looks unusual, and how to stop it."
    >
      <div className="space-y-6">
        {/* Consent centre: per-signal consent, pause status, guardian and history */}
        {profile && <ConsentCenter profile={profile} />}


        {/* Reminders */}
        <section className="surface-card p-4 sm:p-5" aria-label="Daily reminders">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BellRing className="size-4 shrink-0 text-primary" aria-hidden /> Daily check reminders
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A gentle nudge at the same time each day. Reminders appear in the app; if you allow
            notifications, your device can also show them while the app is open.
          </p>
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
            <Label htmlFor="reminder-toggle" className="text-sm">
              Remind me every day
            </Label>
            <Switch
              id="reminder-toggle"
              checked={profile?.reminder_enabled ?? true}
              disabled={reminders.isPending}
              onCheckedChange={(v) => {
                reminders.mutate({ reminder_enabled: v });
                if (v && typeof Notification !== "undefined" && Notification.permission === "default") {
                  void Notification.requestPermission();
                }
              }}
            />
          </div>
          <fieldset className="mt-4" disabled={!(profile?.reminder_enabled ?? true)}>
            <legend className="text-xs font-semibold text-muted-foreground">Reminder time</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {REMINDER_TIME_OPTIONS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => reminders.mutate({ reminder_time: t })}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50",
                    profile?.reminder_time === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                >
                  {formatReminderTime(t)}
                </button>
              ))}
            </div>

            <legend className="mt-5 text-xs font-semibold text-muted-foreground">
              How should we reach you?
            </legend>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {REMINDER_CHANNELS.map((c) => {
                const selected = (profile?.reminder_channel ?? "in_app") === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => reminders.mutate({ reminder_channel: c.value })}
                    className={cn(
                      "rounded-xl border p-3 text-left transition-colors disabled:opacity-50",
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {c.label} · {c.hi}
                      </span>
                      {!c.live && (
                        <span className="rounded-full bg-monitor-soft px-2 py-0.5 text-[10px] font-bold tracking-wider text-monitor uppercase">
                          Demo
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                      {c.hint}
                    </span>
                  </button>
                );
              })}
            </div>

            {channelMeta.contactLabel && (
              <div className="mt-3">
                <Label htmlFor="reminder-contact" className="text-xs font-semibold">
                  {channelMeta.contactLabel}
                </Label>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <Input
                    id="reminder-contact"
                    className="h-11 min-w-[12rem] flex-1"
                    placeholder={channelMeta.placeholder}
                    inputMode={channelMeta.value === "email" ? "email" : "tel"}
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                  />
                  <Button
                    type="button"
                    className="h-11"
                    disabled={reminders.isPending || contact.trim() === (profile?.reminder_contact ?? "")}
                    onClick={() => reminders.mutate({ reminder_contact: contact.trim() || null })}
                  >
                    Save contact
                  </Button>
                </div>
              </div>
            )}

            <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground/85">Preview:</span>{" "}
              {reminderPreview(profile?.reminder_channel ?? "in_app", profile?.reminder_time ?? "08:00")}
              {!channelMeta.live &&
                " In this prototype nothing is actually sent — the preference is stored so a real gateway can be connected later."}
            </p>
          </fieldset>

        </section>

        {/* Data collected */}
        <section className="surface-card p-4 sm:p-5" aria-label="Data collected">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Database className="size-4 shrink-0 text-primary" aria-hidden /> What we collect
          </h2>
          <dl className="mt-3 divide-y divide-border">
            {COLLECTED.map((item) => (
              <div key={item.title} className="py-3">
                <dt className="text-sm font-semibold text-foreground">{item.title}</dt>
                <dd className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  {item.detail}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-2 flex gap-2 rounded-xl bg-primary-soft p-3 text-xs leading-relaxed text-secondary-foreground">
            <Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            <span className="min-w-0">
              Data is visible to you, and to the ASHA worker or clinician supporting your village. It
              is never sold, never used for advertising, and never shared with employers or insurers.
              In demo mode all 20 community members are synthetic.
            </span>
          </p>
        </section>

        {/* Thresholds */}
        <section className="surface-card p-4 sm:p-5" aria-label="Prototype thresholds">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <SlidersHorizontal className="size-4 shrink-0 text-primary" aria-hidden /> Prototype
            thresholds
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Health Drift is scored 0–100 against your own last 14 days. These cut-offs are
            hackathon heuristics, chosen for demonstration — not clinically validated values.
          </p>
          <ul className="mt-3 space-y-2">
            {DRIFT_BANDS.map((b) => (
              <li
                key={b.band}
                className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3 rounded-xl border border-border p-3"
              >
                <span
                  className={cn(
                    "mt-0.5 size-3 shrink-0 rounded-full",
                    b.band === "stable" && "bg-stable",
                    b.band === "monitor" && "bg-monitor",
                    b.band === "review" && "bg-review",
                    b.band === "high_priority" && "bg-critical",
                  )}
                  aria-hidden
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">
                    {b.label} · {b.range}{" "}
                    <span className="font-normal text-muted-foreground">({b.hi})</span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{b.action}</p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{DRIFT_DISCLAIMER}</p>
        </section>
      </div>
    </AppShell>
  );
}
