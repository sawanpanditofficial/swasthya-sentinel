import { Flame, BellRing, BellOff, CalendarCheck } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatReminderTime, streakMessage, type StreakSummary } from "@/lib/health/streak";

/**
 * Daily-check adherence: streak, weekly grid and the reminder state.
 */
export function StreakCard({
  streak,
  weekDays,
  reminderEnabled,
  reminderTime,
  className,
}: {
  streak: StreakSummary;
  /** Oldest-first, 7 entries: whether a check exists for that day. */
  weekDays: { label: string; done: boolean; isToday: boolean }[];
  reminderEnabled: boolean;
  reminderTime: string;
  className?: string;
}) {
  return (
    <section className={cn("surface-card p-4 sm:p-5", className)} aria-label="Daily check streak">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Flame className={cn("size-4 shrink-0", streak.current > 0 ? "text-review" : "text-muted-foreground")} aria-hidden />
            Daily check streak
          </h2>
          <p className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {streak.current} day{streak.current === 1 ? "" : "s"}
            <span className="ml-2 text-xs font-semibold text-muted-foreground">
              best {streak.best}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{streakMessage(streak)}</p>
        </div>
        {!streak.checkedToday && (
          <Button asChild size="sm" className="shrink-0">
            <Link to="/check">
              <CalendarCheck className="size-4" aria-hidden /> Check in
            </Link>
          </Button>
        )}
      </div>

      <ul className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Last seven days">
        {weekDays.map((d, i) => (
          <li key={i} className="text-center">
            <span
              className={cn(
                "grid h-9 place-items-center rounded-lg border text-[11px] font-bold",
                d.done
                  ? "border-transparent bg-stable text-stable-foreground"
                  : "border-border bg-muted/60 text-muted-foreground",
                d.isToday && !d.done && "border-primary text-primary",
              )}
            >
              {d.done ? "✓" : "–"}
            </span>
            <span className="mt-1 block text-[10px] text-muted-foreground">{d.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
        {reminderEnabled ? (
          <>
            <BellRing className="size-3.5 shrink-0 text-primary" aria-hidden />
            Reminder set for {formatReminderTime(reminderTime)} every day
          </>
        ) : (
          <>
            <BellOff className="size-3.5 shrink-0" aria-hidden />
            Daily reminders are off
          </>
        )}
        <Link to="/settings" className="ml-auto font-semibold text-primary hover:underline">
          Change
        </Link>
      </p>
    </section>
  );
}
