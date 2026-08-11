import { SYMPTOM_LABELS, type SymptomReport, type VitalReport } from "@/lib/health/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const LEVELS = [
  { value: 0, en: "None", hi: "नहीं" },
  { value: 1, en: "Mild", hi: "हल्का" },
  { value: 2, en: "Moderate", hi: "मध्यम" },
  { value: 3, en: "Severe", hi: "गंभीर" },
];

export function SymptomForm({
  symptoms,
  onChange,
}: {
  symptoms: SymptomReport;
  onChange: (next: SymptomReport) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Tap the level that matches today. आज जैसा महसूस हो रहा है, वह स्तर चुनें।
      </p>
      <ul className="space-y-3">
        {SYMPTOM_LABELS.map((s) => {
          const current = Number(symptoms[s.key] ?? 0);
          return (
            <li key={s.key} className="surface-card p-3">
              <p className="text-sm font-semibold text-foreground">
                {s.en} <span className="font-normal text-muted-foreground">· {s.hi}</span>
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2" role="group" aria-label={s.en}>
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    aria-pressed={current === l.value}
                    onClick={() => onChange({ ...symptoms, [s.key]: l.value })}
                    className={cn(
                      "min-h-11 rounded-lg border text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                      current === l.value
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    <span className="block">{l.en}</span>
                    <span className="block text-[10px] font-normal opacity-80">{l.hi}</span>
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
      <div>
        <Label htmlFor="notes" className="text-sm font-semibold">
          Anything else? / कुछ और?
        </Label>
        <Input
          id="notes"
          value={symptoms.notes ?? ""}
          maxLength={280}
          placeholder="Optional note for the health worker"
          onChange={(e) => onChange({ ...symptoms, notes: e.target.value })}
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

const VITALS: { key: keyof VitalReport; en: string; hi: string; unit: string; min: number; max: number }[] = [
  { key: "temp_c", en: "Temperature", hi: "तापमान", unit: "°C", min: 33, max: 43 },
  { key: "spo2", en: "SpO₂ (if available)", hi: "ऑक्सीजन", unit: "%", min: 70, max: 100 },
  { key: "pulse", en: "Pulse", hi: "नाड़ी", unit: "bpm", min: 35, max: 200 },
];


export function VitalsForm({
  vitals,
  steps,
  onVitals,
  onSteps,
  hideSteps = false,
}: {
  vitals: VitalReport;
  steps: number | null;
  onVitals: (next: VitalReport) => void;
  onSteps: (next: number | null) => void;
  /** Hidden when activity consent is paused. */
  hideSteps?: boolean;
}) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        All fields are optional — enter only what you can measure today.
      </p>
      {VITALS.map((v) => (
        <div key={v.key}>
          <Label htmlFor={v.key} className="text-sm font-semibold">
            {v.en} <span className="font-normal text-muted-foreground">· {v.hi} ({v.unit})</span>
          </Label>
          <Input
            id={v.key}
            type="number"
            inputMode="decimal"
            min={v.min}
            max={v.max}
            value={vitals[v.key] ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              onVitals({ ...vitals, [v.key]: raw === "" ? null : Number(raw) });
            }}
            className="mt-1.5 h-12"
          />
        </div>
      ))}
      {hideSteps ? (
        <p className="rounded-xl border border-border bg-secondary/40 p-3 text-xs text-muted-foreground">
          Step count is paused in your consent settings, so activity is not asked for or compared.
        </p>
      ) : (
      <div>
        <Label htmlFor="steps" className="text-sm font-semibold">
          Steps today <span className="font-normal text-muted-foreground">· आज के कदम</span>
        </Label>
        <Input
          id="steps"
          type="number"
          inputMode="numeric"
          min={0}
          max={60000}
          value={steps ?? ""}
          onChange={(e) => onSteps(e.target.value === "" ? null : Number(e.target.value))}
          className="mt-1.5 h-12"
        />
      </div>
      )}
    </div>
  );
}
