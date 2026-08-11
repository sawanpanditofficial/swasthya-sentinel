import { buildPatientReport } from "@/lib/health/report";
import type { HealthCheck, Patient } from "@/lib/health/types";
import { writeFileSync } from "fs";

const patient: Patient = { id: "p1", name: "Lakshmi Devi", age: 54, sex: "female", village: "Rampur Khurd", baseline_profile: "gradual_decline", drift_score: 74, status: "review", last_check_at: new Date().toISOString(), is_demo: true, created_at: "" };
const checks: HealthCheck[] = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(); d.setDate(d.getDate() - i);
  return { id: String(i), patient_id: "p1", check_date: d.toISOString().slice(0,10), voice_status: "analysed", voice_jitter: 0.012 + i*0.0004, reaction_mean_ms: 420 + i*3, reaction_median_ms: 410 + (29-i)*4, activity_steps: 5200 - (29-i)*70, symptoms: i===0?{fever:1,fatigue:1,sleep_quality:2}:{}, vitals: {}, drift_score: Math.max(5, 74 - i*2), drift_band: "review", deviations: i===0?["Reaction time 24% slower than your 14-day median","Daily steps down 31% from your usual range","Voice stability index above your typical variability","New self-reported symptoms: fever, fatigue"]:[], source: "app", created_at: d.toISOString() } as HealthCheck;
});
writeFileSync("/tmp/qa/r14.pdf", Buffer.from(buildPatientReport(patient, checks, 14).output("arraybuffer") as ArrayBuffer));
writeFileSync("/tmp/qa/r30.pdf", Buffer.from(buildPatientReport(patient, checks, 30).output("arraybuffer") as ArrayBuffer));
console.log("ok");
