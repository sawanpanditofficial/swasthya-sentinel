import { useEffect, useRef, useState } from "react";
import { Mic, Square, RotateCcw, CheckCircle2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { simulateVoiceAnalysis } from "@/lib/health/drift";
import type { VoiceSample } from "@/lib/health/types";
import { cn } from "@/lib/utils";

const PROMPT = {
  en: "Say the vowel “aaaa” steadily for about 6 seconds, then read: “I am doing my daily health check today.”",
  hi: "लगभग 6 सेकंड तक “आssss” बोलें, फिर पढ़ें: “मैं आज अपनी दैनिक स्वास्थ्य जांच कर रहा/रही हूँ।”",
};

export function VoiceRecorder({
  value,
  onChange,
}: {
  value: VoiceSample | null;
  onChange: (sample: VoiceSample | null) => void;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [levels, setLevels] = useState<number[]>(Array.from({ length: 32 }, () => 0.12));
  const [notes, setNotes] = useState<string[]>([]);
  const [micDenied, setMicDenied] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => () => stopStream(), []);

  function stopStream() {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function start() {
    setSeconds(0);
    setNotes([]);
    onChange(null);
    try {
      if (navigator.mediaDevices?.getUserMedia) {
        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
        setMicDenied(false);
      }
    } catch {
      // Prototype fallback: demo mode records a simulated sample.
      setMicDenied(true);
    }
    setRecording(true);
    timer.current = setInterval(() => {
      setSeconds((s) => {
        const next = s + 0.1;
        if (next >= 8) finish(8);
        return next;
      });
      setLevels((prev) => [...prev.slice(1), 0.15 + Math.random() * 0.85]);
    }, 100);
  }

  function finish(duration?: number) {
    const dur = Number((duration ?? seconds).toFixed(1));
    stopStream();
    setRecording(false);
    setLevels(Array.from({ length: 32 }, () => 0.12));
    if (dur < 2) {
      setNotes(["Sample too short — please record at least 3 seconds."]);
      onChange(null);
      return;
    }
    const result = simulateVoiceAnalysis(dur);
    setNotes(result.notes);
    onChange({ durationSec: dur, jitter: result.jitter, status: "analysed" });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-primary-soft p-4">
        <p className="text-sm font-semibold text-secondary-foreground">{PROMPT.en}</p>
        <p className="mt-1 text-sm text-secondary-foreground/80">{PROMPT.hi}</p>
      </div>

      <div className="surface-card grid place-items-center gap-5 p-6">
        <div
          className={cn(
            "grid size-28 place-items-center rounded-full transition-colors",
            recording ? "animate-pulse-ring bg-critical/15" : "bg-primary-soft",
          )}
        >
          <button
            type="button"
            onClick={recording ? () => finish() : start}
            aria-label={recording ? "Stop recording" : "Start recording"}
            className={cn(
              "grid size-20 place-items-center rounded-full text-primary-foreground transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none",
              recording ? "bg-critical" : "bg-primary",
            )}
          >
            {recording ? <Square className="size-7" aria-hidden /> : <Mic className="size-8" aria-hidden />}
          </button>
        </div>

        <div className="flex h-14 w-full items-end justify-center gap-[3px]" aria-hidden>
          {levels.map((l, i) => (
            <span
              key={i}
              className={cn("w-1.5 rounded-full transition-all duration-100", recording ? "bg-primary" : "bg-border")}
              style={{ height: `${Math.max(6, l * 56)}px` }}
            />
          ))}
        </div>

        <p className="font-display text-2xl font-bold tabular-nums">{seconds.toFixed(1)}s</p>
        <p className="text-center text-xs text-muted-foreground">
          {recording ? "Recording… speak clearly, hold the phone 20 cm away." : "Tap the microphone to begin."}
        </p>
        {micDenied && (
          <p className="text-center text-xs font-medium text-monitor-foreground">
            Microphone unavailable — running in demo mode with a simulated sample.
          </p>
        )}
      </div>

      {value && (
        <div className="animate-rise rounded-xl border border-stable/30 bg-stable-soft p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-stable">
            <CheckCircle2 className="size-4" aria-hidden /> Sample captured ({value.durationSec}s)
          </p>
          <p className="mt-1 text-sm text-foreground/80">
            Acoustic stability index: <strong>{value.jitter}</strong> (compared only with this person's own
            past samples)
          </p>
          <ul className="mt-2 space-y-1">
            {notes.map((n) => (
              <li key={n} className="flex gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                <span className="min-w-0">{n}</span>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={start}>
            <RotateCcw className="size-3.5" aria-hidden /> Record again
          </Button>
        </div>
      )}

      <p className="text-xs leading-relaxed text-muted-foreground">
        Voice analysis in this prototype is simulated and produces only a personal stability index. It does not
        detect, name or rule out any disease.
      </p>
    </div>
  );
}
