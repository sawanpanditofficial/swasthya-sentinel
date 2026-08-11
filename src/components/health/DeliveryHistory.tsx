import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Clock, MinusCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { listDeliveryAttempts, logDeliveryAttempt } from "@/lib/health/api";
import { reminderChannelMeta, reminderPreview } from "@/lib/health/streak";
import type { DeliveryAttempt, DeliveryStatus, Profile } from "@/lib/health/types";

const STATUS: Record<DeliveryStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  sent: { label: "Sent", tone: "bg-stable text-stable-foreground", icon: CheckCircle2 },
  simulated: { label: "Simulated", tone: "bg-monitor text-monitor-foreground", icon: Clock },
  failed: { label: "Failed", tone: "bg-critical text-critical-foreground", icon: AlertCircle },
  skipped: { label: "Skipped", tone: "bg-secondary text-secondary-foreground", icon: MinusCircle },
};

function when(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "medium" });
}

/**
 * Decides the outcome of a delivery attempt in demo mode: the in-app channel
 * really fires, the outside channels are simulated, and a missing or malformed
 * contact is recorded as a failure with the reason kept on the row.
 */
export function evaluateDelivery(
  channel: Profile["reminder_channel"],
  contact: string | null,
): { status: DeliveryStatus; error: string | null } {
  if (channel === "in_app") return { status: "sent", error: null };
  const value = (contact ?? "").trim();
  if (!value)
    return {
      status: "failed",
      error: `No ${channel === "email" ? "email address" : "mobile number"} saved for this channel.`,
    };
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value))
    return { status: "failed", error: `"${value}" is not a valid email address.` };
  if (channel !== "email" && value.replace(/\D/g, "").length < 10)
    return { status: "failed", error: `"${value}" is not a valid 10-digit mobile number.` };
  return {
    status: "simulated",
    error: null,
  };
}

/**
 * Delivery attempt history: every test send and scheduled reminder with its
 * timestamp, channel, status and, when something went wrong, the error.
 */
export function DeliveryHistory({
  profile,
  className,
}: {
  profile: Profile;
  className?: string;
}) {
  const queryClient = useQueryClient();
  const meta = reminderChannelMeta(profile.reminder_channel);

  const historyQuery = useQuery({
    queryKey: ["deliveries", profile.id],
    queryFn: () => listDeliveryAttempts(profile.id, 25),
  });

  const send = useMutation({
    mutationFn: () => {
      const outcome = evaluateDelivery(profile.reminder_channel, profile.reminder_contact);
      return logDeliveryAttempt({
        userId: profile.id,
        channel: profile.reminder_channel,
        contact: profile.reminder_contact,
        kind: "test",
        status: outcome.status,
        message: reminderPreview(profile.reminder_channel, profile.reminder_time),
        error: outcome.error,
      });
    },
    onSuccess: (row: DeliveryAttempt) => {
      queryClient.invalidateQueries({ queryKey: ["deliveries", profile.id] });
      if (row.status === "failed") toast.error(row.error ?? "Test delivery failed.");
      else if (row.status === "sent") toast.success("Test nudge shown in the app.");
      else toast.success("Test recorded — simulated in demo mode, nothing was sent.");
    },
    onError: () => toast.error("Could not record that delivery attempt."),
  });

  const attempts = historyQuery.data ?? [];

  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Delivery history">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Send className="size-4 shrink-0 text-primary" aria-hidden /> Delivery history
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Every reminder attempt on this account, newest first — channel, exact time, outcome and
            the error when one occurred. {meta.live ? "" : `${meta.label} is simulated in demo mode.`}
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0"
          disabled={send.isPending}
          onClick={() => send.mutate()}
        >
          {send.isPending ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Send className="size-3.5" aria-hidden />
          )}
          Send test
        </Button>
      </div>

      {historyQuery.isLoading ? (
        <div className="mt-4 grid place-items-center py-4">
          <Loader2 className="size-5 animate-spin text-primary" aria-hidden />
        </div>
      ) : attempts.length === 0 ? (
        <p className="mt-3 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          No delivery attempts yet. Use “Send test” to record one against the channel you selected.
        </p>
      ) : (
        <ol className="mt-3 divide-y divide-border">
          {attempts.map((a) => {
            const s = STATUS[a.status];
            const channel = reminderChannelMeta(a.channel);
            return (
              <li key={a.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 py-3">
                <span className={cn("mt-0.5 grid size-7 shrink-0 place-items-center rounded-full", s.tone)}>
                  <s.icon className="size-3.5" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-foreground">
                    {channel.label}
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tracking-wider text-secondary-foreground uppercase">
                      {a.kind === "test" ? "Test" : "Reminder"}
                    </span>
                    <span className="text-xs font-normal text-muted-foreground">{s.label}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {when(a.created_at)}
                    {a.contact ? ` · ${a.contact}` : ""}
                  </p>
                  {a.error && (
                    <p className="mt-1.5 rounded-lg border border-critical/40 bg-critical-soft/40 p-2 text-xs text-critical">
                      {a.error}
                    </p>
                  )}
                  {a.message && !a.error && (
                    <p className="mt-1.5 line-clamp-2 rounded-lg border border-border bg-card/70 p-2 text-xs text-foreground/80">
                      {a.message}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
