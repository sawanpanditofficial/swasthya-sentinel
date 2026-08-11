/**
 * Daily-check streak + reminder scheduling helpers.
 * Pure functions so they stay testable and free of database concerns.
 */

import type { HealthCheck, ReminderChannel } from "./types";

export interface StreakSummary {
  /** Consecutive days ending today (or yesterday, if today is still pending). */
  current: number;
  /** Longest run found in the available history. */
  best: number;
  checkedToday: boolean;
  /** Days since the most recent check, null when there is no history. */
  daysSinceLast: number | null;
  totalChecks: number;
}

function toKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const ms = new Date(`${a}T00:00:00Z`).getTime() - new Date(`${b}T00:00:00Z`).getTime();
  return Math.round(ms / 86_400_000);
}

export function computeStreak(checks: HealthCheck[], today = new Date()): StreakSummary {
  const days = [...new Set(checks.map((c) => c.check_date.slice(0, 10)))].sort((a, b) =>
    b.localeCompare(a),
  );
  if (days.length === 0) {
    return { current: 0, best: 0, checkedToday: false, daysSinceLast: null, totalChecks: 0 };
  }

  const todayKey = toKey(today);
  const checkedToday = days[0] === todayKey;
  const daysSinceLast = dayDiff(todayKey, days[0]!);

  // Current streak: allow a run that ends today or yesterday.
  let current = 0;
  if (daysSinceLast <= 1) {
    current = 1;
    for (let i = 1; i < days.length; i += 1) {
      if (dayDiff(days[i - 1]!, days[i]!) === 1) current += 1;
      else break;
    }
  }

  let best = 1;
  let run = 1;
  for (let i = 1; i < days.length; i += 1) {
    if (dayDiff(days[i - 1]!, days[i]!) === 1) run += 1;
    else run = 1;
    if (run > best) best = run;
  }

  return {
    current,
    best: Math.max(best, current),
    checkedToday,
    daysSinceLast,
    totalChecks: days.length,
  };
}

/** Encouraging, non-clinical copy for the current streak state. */
export function streakMessage(s: StreakSummary): string {
  if (s.totalChecks === 0) return "Start today to build your personal baseline.";
  if (s.checkedToday)
    return s.current >= 7
      ? `${s.current} days in a row — your baseline is getting sharper.`
      : "Today's check is done. See you tomorrow.";
  if (s.daysSinceLast === 1) return "Your streak is still alive — check in today to keep it.";
  return `${s.daysSinceLast} days since your last check. A fresh check helps re-learn your baseline.`;
}

/** Milliseconds until the next occurrence of an "HH:MM" local reminder time. */
export function msUntilReminder(reminderTime: string, now = new Date()): number {
  const [h, m] = reminderTime.split(":").map((v) => Number(v));
  const next = new Date(now);
  next.setHours(h ?? 8, m ?? 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
}

export function formatReminderTime(reminderTime: string): string {
  const [h, m] = reminderTime.split(":").map((v) => Number(v));
  const d = new Date();
  d.setHours(h ?? 8, m ?? 0, 0, 0);
  return d.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
}

export const REMINDER_TIME_OPTIONS = ["07:00", "08:00", "09:00", "12:00", "18:00", "20:00"];

/**
 * Reminder delivery channels. DEMO MODE: only the in-app nudge actually fires
 * in this prototype — email/SMS/WhatsApp record the person's preference and
 * show a simulated preview, so no message is ever sent to a real number.
 */
export const REMINDER_CHANNELS: {
  value: ReminderChannel;
  label: string;
  hi: string;
  hint: string;
  contactLabel: string | null;
  placeholder: string;
  live: boolean;
}[] = [
  {
    value: "in_app",
    label: "In-app nudge",
    hi: "ऐप में",
    hint: "A card and browser notification while SwasthyaShadow is open. Works offline-first, costs nothing.",
    contactLabel: null,
    placeholder: "",
    live: true,
  },
  {
    value: "email",
    label: "Email",
    hi: "ईमेल",
    hint: "A short daily reminder email. Simulated in demo mode — nothing is sent.",
    contactLabel: "Email address",
    placeholder: "name@example.com",
    live: false,
  },
  {
    value: "sms",
    label: "SMS",
    hi: "एसएमएस",
    hint: "A plain text message for basic phones with no data pack. Simulated in demo mode.",
    contactLabel: "Mobile number",
    placeholder: "+91 98765 43210",
    live: false,
  },
  {
    value: "whatsapp",
    label: "WhatsApp",
    hi: "व्हाट्सएप",
    hint: "A WhatsApp reminder in your chosen language. Simulated in demo mode.",
    contactLabel: "WhatsApp number",
    placeholder: "+91 98765 43210",
    live: false,
  },
];

export function reminderChannelMeta(channel: ReminderChannel) {
  return REMINDER_CHANNELS.find((c) => c.value === channel) ?? REMINDER_CHANNELS[0]!;
}

/** Preview of the exact message a person would receive on that channel. */
export function reminderPreview(channel: ReminderChannel, time: string): string {
  const at = formatReminderTime(time);
  if (channel === "email")
    return `Subject: Your two-minute check · SwasthyaShadow — "It is ${at}. A quick voice, tap and symptom check keeps your baseline accurate."`;
  if (channel === "sms")
    return `SwasthyaShadow: Time for your 2-minute health check (${at}). Reply STOP to pause reminders.`;
  if (channel === "whatsapp")
    return `SwasthyaShadow · ${at}: Namaste! Your daily two-minute check is ready. Tap to open.`;
  return `A card appears on your dashboard at ${at} while the app is open.`;
}
