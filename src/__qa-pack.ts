import { buildReviewPack } from "@/lib/health/report";
import type { CaseReview, HealthCheck, Patient } from "@/lib/health/types";
import { writeFileSync } from "node:fs";

const patient: Patient = { id: "p1", name: "Kamla Devi", age: 62, sex: "F", village: "Rampur", baseline_profile: "steady", drift_score: 74, status: "review", last_check_at: new Date().toISOString(), is_demo: true, created_at: new Date().toISOString() } as Patient;
const checks: HealthCheck[] = Array.from({ length: 20 }, (_, i) => {
  const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
  return {
    id: `c${i}`, patient_id: "p1", check_date: d, voice_status: "analysed",
    voice_jitter: 0.021 + (i === 0 ? 0.009 : Math.random() * 0.002),
    reaction_mean_ms: 420 + (i === 0 ? 120 : Math.round(Math.random() * 20)),
    reaction_median_ms: 410 + (i === 0 ? 110 : Math.round(Math.random() * 20)),
    activity_steps: i === 0 ? 2100 : 4200 + Math.round(Math.random() * 400),
    symptoms: i === 0 ? { fever: true, cough: true, fatigue: true, sleep_quality: 2 } : {},
    vitals: { temperature_c: 37.8, spo2: 95, pulse: 92 },
    drift_score: i === 0 ? 74 : 12 + Math.round(Math.random() * 10),
    drift_band: i === 0 ? "review" : "stable", deviations: [], source: "app", created_at: d,
  } as unknown as HealthCheck;
});
const reviews: CaseReview[] = [
  { id: "r1", patient_id: "p1", alert_id: null, action: "reopened", note: "Drift rose again after closure; breathing difficulty reported by family over the weekend.", reviewer_id: null, reviewer_name: "Dr A. Rao", created_at: new Date().toISOString() },
  { id: "r2", patient_id: "p1", alert_id: "a1", action: "closed", note: "Explained by fasting during festival week.", reviewer_id: null, reviewer_name: "Sunita (ASHA)", created_at: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "r3", patient_id: "p1", alert_id: "a1", action: "reviewed", note: "Home visit done, advised rest and fluids.", reviewer_id: null, reviewer_name: "Sunita (ASHA)", created_at: new Date(Date.now() - 6 * 86400000).toISOString() },
];
const doc = buildReviewPack(patient, checks, reviews, 14);
writeFileSync("/tmp/qa/pack.pdf", Buffer.from(doc.output("arraybuffer")));
console.log("written");
