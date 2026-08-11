import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { summariseReaction } from "@/lib/health/drift";
import type { ReactionResult } from "@/lib/health/types";
import { cn } from "@/lib/utils";
import { Zap, RotateCcw } from "lucide-react";

const TRIALS = 5;
type Phase = "idle" | "waiting" | "go" | "done";

export function ReactionTest({
  value,
  onChange,
}: {
  value: ReactionResult | null;
  onChange: (result: ReactionResult | null) => void;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [trials, setTrials] = useState<number[]>([]);
  const [tooSoon, setTooSoon] = useState(false);
  const goAt = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clear = () => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
  };
  useEffect(() => clear, []);

  const scheduleGo = useCallback(() => {
    setTooSoon(false);
    setPhase("waiting");
    clear();
    timeout.current = setTimeout(
      () => {
        goAt.current = performance.now();
        setPhase("go");
      },
      1200 + Math.random() * 2300,
    );
  }, []);

  function begin() {
    setTrials([]);
    onChange(null);
    scheduleGo();
  }

  function handleTap() {
    if (phase === "idle" || phase === "done") return begin();
    if (phase === "waiting") {
      clear();
      setTooSoon(true);
      setPhase("idle");
      return;
    }
    const ms = Math.round(performance.now() - goAt.current);
    const next = [...trials, ms];
    setTrials(next);
    if (next.length >= TRIALS) {
      setPhase("done");
      onChange(summariseReaction(next));
    } else {
      scheduleGo();
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-primary-soft p-4">
        <p className="text-sm font-semibold text-secondary-foreground">
          Tap the circle as soon as it turns green. {TRIALS} rounds.
        </p>
        <p className="mt-1 text-sm text-secondary-foreground/80">
          जैसे ही घेरा हरा हो, तुरंत टैप करें। {TRIALS} बार।
        </p>
      </div>

      <button
        type="button"
        onClick={handleTap}
        aria-label="Reaction test target"
        className={cn(
          "grid h-56 w-full place-items-center rounded-2xl border-2 text-center transition-colors select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          phase === "go" && "border-stable bg-stable text-primary-foreground",
          phase === "waiting" && "border-review bg-review-soft",
          (phase === "idle" || phase === "done") && "border-border bg-card",
        )}
      >
        <span className="px-6">
          {phase === "go" && <span className="font-display text-3xl font-bold">TAP NOW</span>}
          {phase === "waiting" && (
            <span className="font-display text-xl font-semibold text-review">Wait for green…</span>
          )}
          {phase === "idle" && (
            <span className="font-display text-xl font-semibold text-foreground">
              {tooSoon ? "Too soon — tap to retry" : "Tap to start"}
            </span>
          )}
          {phase === "done" && (
            <span className="font-display text-xl font-semibold text-foreground">Test complete</span>
          )}
        </span>
      </button>

      <div className="flex flex-wrap items-center gap-2">
        {Array.from({ length: TRIALS }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums",
              trials[i] != null ? "bg-secondary text-secondary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            {trials[i] != null ? `${trials[i]} ms` : `#${i + 1}`}
          </span>
        ))}
      </div>

      {value && (
        <div className="animate-rise rounded-xl border border-stable/30 bg-stable-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-stable">
            <Zap className="size-4" aria-hidden /> Median {value.medianMs} ms
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            Mean {value.meanMs} ms across {value.trials.length} rounds. Compared only with this
            person's own history.

          </p>
          <Button variant="ghost" size="sm" className="mt-2" onClick={begin}>
            <RotateCcw className="size-3.5" aria-hidden /> Redo test
          </Button>
        </div>
      )}
    </div>
  );
}
