/**
 * Client-side patient report PDF.
 *
 * Deliberately plain-language and non-clinical: it reports deviation from the
 * person's own baseline and never names or rules out a disease.
 */

import { jsPDF } from "jspdf";
import { DRIFT_BANDS, DRIFT_DISCLAIMER, bandMeta, buildBaseline } from "./drift";
import { computeStreak } from "./streak";
import { explainCheck } from "./explain";
import { REVIEW_STATE_LABEL_TEXT } from "./review-labels";
import type { CaseReview, HealthCheck, Patient } from "./types";
import { SYMPTOM_LABELS } from "./types";

const INK = { r: 24, g: 42, b: 46 };
const TEAL = { r: 13, g: 106, b: 108 };
const MUTED = { r: 110, g: 124, b: 126 };
const BAND_RGB: Record<string, [number, number, number]> = {
  stable: [32, 122, 88],
  monitor: [186, 138, 32],
  review: [198, 92, 34],
  high_priority: [186, 52, 44],
};

type Metric = "drift_score" | "reaction_median_ms" | "voice_jitter" | "activity_steps";

function series(checks: HealthCheck[], metric: Metric, days: number) {
  return [...checks]
    .sort((a, b) => a.check_date.localeCompare(b.check_date))
    .slice(-days)
    .map((c) => ({ date: c.check_date, value: c[metric] as number | null }));
}

function drawChart(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  title: string,
  points: { date: string; value: number | null }[],
  opts: { unit?: string; band?: boolean } = {},
) {
  doc.setDrawColor(220, 228, 228);
  doc.setFillColor(250, 251, 251);
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(title, x + 4, y + 6);

  const values = points.map((p) => p.value).filter((v): v is number => typeof v === "number");
  if (values.length < 2) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
    doc.text("Not enough readings yet.", x + 4, y + h / 2 + 2);
    return;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const plotX = x + 4;
  const plotY = y + 9;
  const plotW = w - 8;
  const plotH = h - 17;

  if (opts.band) {
    // Light drift bands behind the line: stable -> high priority.
    const shades: [number, number, number, number][] = [
      [0, 30, 236, 246],
      [30, 60, 250, 246],
      [60, 100, 252, 238],
    ];
    shades.forEach(([lo, hi, g, b]) => {
      const yTop = plotY + plotH - (Math.min(hi, 100) / 100) * plotH;
      const yBot = plotY + plotH - (lo / 100) * plotH;
      doc.setFillColor(253, g, b);
      doc.rect(plotX, yTop, plotW, Math.max(0.5, yBot - yTop), "F");
    });
  }

  const step = plotW / Math.max(1, points.length - 1);
  doc.setDrawColor(TEAL.r, TEAL.g, TEAL.b);
  doc.setLineWidth(0.7);
  let prevX: number | null = null;
  let prevY = 0;
  points.forEach((p, i) => {
    if (p.value == null) {
      prevX = null;
      return;
    }
    const px = plotX + i * step;
    const py = plotY + plotH - ((p.value - min) / span) * plotH;
    if (prevX !== null) doc.line(prevX, prevY, px, py);
    prevX = px;
    prevY = py;
  });
  if (prevX !== null) {
    doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
    doc.circle(prevX, prevY, 0.9, "F");
  }

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  const unit = opts.unit ?? "";
  const fmt = (n: number) =>
    Number.isInteger(n)
      ? n.toLocaleString("en-IN")
      : Math.abs(n) < 1
        ? n.toFixed(3)
        : n.toFixed(1);
  doc.text(`low ${fmt(min)}${unit}`, plotX, y + h - 2.5);
  doc.text(`high ${fmt(max)}${unit}`, plotX + plotW, y + h - 2.5, { align: "right" });
}

function heading(doc: jsPDF, text: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(text, 14, y);
  doc.setDrawColor(TEAL.r, TEAL.g, TEAL.b);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1.6, 196, y + 1.6);
  return y + 8;
}

function body(doc: jsPDF, text: string, y: number, width = 182): number {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 76, 78);
  const lines = doc.splitTextToSize(text, width);
  doc.text(lines, 14, y);
  return y + lines.length * 4.4 + 2;
}

export function buildPatientReport(patient: Patient, checks: HealthCheck[], windowDays: 14 | 30) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const scoped = checks.filter((c) => {
    const age = (Date.now() - new Date(c.check_date).getTime()) / 86_400_000;
    return age <= windowDays + 1;
  });
  const latest = checks[0];
  const baseline = buildBaseline(checks.slice(1));
  const streak = computeStreak(checks);
  const meta = bandMeta(patient.status);

  // Header band
  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(0, 0, 210, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("SwasthyaShadow", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Personal baseline report · last ${windowDays} days`, 14, 18.5);
  doc.text(
    `Generated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    196,
    18.5,
    { align: "right" },
  );

  let y = 36;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(patient.name, 14, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `${patient.age ?? "—"} yrs · ${patient.sex ?? "—"} · ${patient.village ?? "village not recorded"} · baseline profile: ${patient.baseline_profile}`,
    14,
    y + 5,
  );
  y += 14;

  // Drift summary box
  const rgb = BAND_RGB[patient.status] ?? BAND_RGB["stable"]!;
  doc.setFillColor(248, 250, 250);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.roundedRect(14, y, 182, 24, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(String(patient.drift_score), 22, y + 16);
  doc.setFontSize(10.5);
  doc.text(`${meta.label} (${meta.range})`, 44, y + 11);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 76, 78);
  doc.text(doc.splitTextToSize(meta.action, 140), 44, y + 16.5);
  y += 32;

  // Adherence
  y = heading(doc, "Check-in consistency", y);
  y = body(
    doc,
    `${streak.totalChecks} checks recorded · current streak ${streak.current} day${streak.current === 1 ? "" : "s"} · best streak ${streak.best} days · baseline built from ${baseline.samples} recent check${baseline.samples === 1 ? "" : "s"}. A longer, unbroken history makes the personal baseline more reliable.`,
    y,
  );
  y += 2;

  // Trends
  y = heading(doc, `Trends over the last ${windowDays} days`, y);
  const cw = 88;
  const ch = 34;
  drawChart(doc, 14, y, cw, ch, "Health Drift", series(scoped, "drift_score", windowDays), {
    band: true,
  });
  drawChart(
    doc,
    108,
    y,
    cw,
    ch,
    "Reaction time (ms)",
    series(scoped, "reaction_median_ms", windowDays),
    { unit: " ms" },
  );
  y += ch + 4;
  drawChart(doc, 14, y, cw, ch, "Voice stability index", series(scoped, "voice_jitter", windowDays));
  drawChart(doc, 108, y, cw, ch, "Daily steps", series(scoped, "activity_steps", windowDays));
  y += ch + 8;

  // Baseline reference
  y = heading(doc, "Personal baseline reference", y);
  y = body(
    doc,
    `Reaction time: ${baseline.reactionMedianMs ?? "—"} ms · Daily steps: ${baseline.activitySteps?.toLocaleString("en-IN") ?? "—"} · Voice stability index: ${baseline.voiceJitter != null ? baseline.voiceJitter.toFixed(3) : "—"} · Typical symptom load: ${baseline.symptomLoad}. These are medians and averages of this person's own recent readings, not population norms.`,
    y,
  );
  y += 2;

  // Deviations
  y = heading(doc, "Deviations detected in the latest check", y);
  const deviations = latest?.deviations ?? [];
  if (deviations.length === 0) {
    y = body(doc, "No meaningful deviation from the personal baseline in the latest check.", y);
  } else {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 76, 78);
    deviations.slice(0, 8).forEach((d) => {
      const lines = doc.splitTextToSize(`•  ${d}`, 178);
      doc.text(lines, 16, y);
      y += lines.length * 4.4 + 1;
    });
    y += 2;
  }

  const symptoms = latest ? SYMPTOM_LABELS.filter((s) => Number(latest.symptoms[s.key]) > 0) : [];
  if (symptoms.length > 0) {
    y = body(doc, `Self-reported today: ${symptoms.map((s) => s.en).join(", ")}.`, y);
  }

  if (y > 236) {
    doc.addPage();
    y = 20;
  }

  // Thresholds
  y = heading(doc, "Prototype thresholds used", y);
  doc.setFontSize(8.5);
  DRIFT_BANDS.forEach((b) => {
    const c = BAND_RGB[b.band]!;
    doc.setFillColor(c[0], c[1], c[2]);
    doc.circle(16.5, y - 1.2, 1.3, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(INK.r, INK.g, INK.b);
    doc.text(`${b.label} (${b.range})`, 21, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(90, 104, 106);
    doc.text(doc.splitTextToSize(b.action, 110), 72, y);
    y += 7;
  });
  y += 2;

  // Explanation / disclaimer
  y = heading(doc, "How to read this report", y);
  y = body(
    doc,
    "Health Drift is a single number describing how far today's signals sit from this person's own usual pattern over the past two weeks. It is built from four low-cost signals: a short voice sample, a tap reaction test, daily activity, and self-reported symptoms. A rising score over several days matters far more than any single day.",
    y,
  );
  y = body(doc, DRIFT_DISCLAIMER, y);
  y = body(
    doc,
    "This report supports a conversation with an ASHA worker or clinician. It is not a diagnosis, not a triage decision, and not a substitute for clinical examination. Values in demo mode are synthetic.",
    y,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    "SwasthyaShadow — Smart India Hackathon prototype. Non-diagnostic. Data shown only with the person's consent.",
    105,
    288,
    { align: "center" },
  );

  return doc;
}

export function downloadPatientReport(
  patient: Patient,
  checks: HealthCheck[],
  windowDays: 14 | 30,
) {
  const doc = buildPatientReport(patient, checks, windowDays);
  const safe = patient.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`swasthyashadow-${safe}-${windowDays}day-report.pdf`);
}

/* ================= PHC review pack ================= */

/**
 * Draws one "baseline vs today" comparison row: two small bars, the signed
 * change, and the prototype threshold that produced the verdict.
 */
function drawCompareRow(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  row: {
    signal: string;
    today: string;
    baseline: string;
    change: string | null;
    verdict: string;
    threshold: string;
    reason: string;
    ratio: number | null;
  },
): number {
  const flagged = row.verdict === "flagged";
  const watch = row.verdict === "watch";
  const rgb: [number, number, number] = flagged
    ? [198, 92, 34]
    : watch
      ? [186, 138, 32]
      : [32, 122, 88];

  doc.setDrawColor(flagged ? rgb[0] : 220, flagged ? rgb[1] : 228, flagged ? rgb[2] : 228);
  doc.setFillColor(flagged ? 253 : 250, flagged ? 246 : 251, flagged ? 240 : 251);
  const h = 26;
  doc.roundedRect(x, y, w, h, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(row.signal, x + 4, y + 6);

  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.setFontSize(7);
  doc.text(row.verdict.replace("_", " ").toUpperCase(), x + w - 4, y + 6, { align: "right" });

  // Bars: baseline (grey) vs today (banded colour).
  const barX = x + 4;
  const barW = 58;
  const ratio = row.ratio == null ? null : Math.max(0.08, Math.min(1.6, row.ratio));
  doc.setFillColor(214, 222, 222);
  doc.rect(barX, y + 10, barW * 0.62, 2.6, "F");
  doc.setFillColor(rgb[0], rgb[1], rgb[2]);
  doc.rect(barX, y + 15, ratio == null ? barW * 0.62 : barW * 0.62 * ratio, 2.6, "F");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(`baseline  ${row.baseline}`, barX + barW + 2, y + 12.4);
  doc.setTextColor(INK.r, INK.g, INK.b);
  doc.text(`today  ${row.today}${row.change ? `  (${row.change})` : ""}`, barX + barW + 2, y + 17.4);

  doc.setTextColor(90, 104, 106);
  doc.setFontSize(6.8);
  const reason = doc.splitTextToSize(`${row.reason} ${row.threshold}.`, w - 8);
  doc.text(reason.slice(0, 2), x + 4, y + 22.2);

  return y + h + 3;
}

/** Numeric today/baseline ratio for the bar chart, when both are numbers. */
function ratioFor(today: string, baseline: string): number | null {
  const t = Number(today.replace(/[^0-9.]/g, ""));
  const b = Number(baseline.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(t) || !Number.isFinite(b) || b === 0) return null;
  return t / b;
}

/**
 * One-click "PHC review pack": the case activity timeline plus a baseline-vs-today
 * summary of every signal, so a clinician can see what changed, against what, and
 * what has already been decided. Non-diagnostic by design.
 */
export function buildReviewPack(
  patient: Patient,
  checks: HealthCheck[],
  reviews: CaseReview[],
  windowDays: 14 | 30 = 14,
) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const latest = checks[0];
  const explanation = latest ? explainCheck(latest, checks) : null;
  const scoped = checks.filter(
    (c) => (Date.now() - new Date(c.check_date).getTime()) / 86_400_000 <= windowDays + 1,
  );
  const meta = bandMeta(patient.status);

  // Header
  doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
  doc.rect(0, 0, 210, 26, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(255, 255, 255);
  doc.text("PHC review pack", 14, 12);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`SwasthyaShadow · ${patient.name} · last ${windowDays} days`, 14, 18.5);
  doc.text(
    `Generated ${new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}`,
    196,
    18.5,
    { align: "right" },
  );

  let y = 34;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    `${patient.age ?? "—"} yrs · ${patient.sex ?? "—"} · ${patient.village ?? "village not recorded"} · baseline profile: ${patient.baseline_profile}`,
    14,
    y,
  );
  y += 8;

  // Case status strip
  const rgb = BAND_RGB[patient.status] ?? BAND_RGB["stable"]!;
  const currentState = reviews[0]?.action ?? "open";
  doc.setFillColor(248, 250, 250);
  doc.setDrawColor(rgb[0], rgb[1], rgb[2]);
  doc.roundedRect(14, y, 182, 22, 2, 2, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(rgb[0], rgb[1], rgb[2]);
  doc.text(String(patient.drift_score), 22, y + 15);
  doc.setFontSize(10);
  doc.text(`${meta.label} (${meta.range})`, 44, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(60, 76, 78);
  doc.text(
    `Case status: ${REVIEW_STATE_LABEL_TEXT[currentState]} · ${reviews.length} recorded decision${reviews.length === 1 ? "" : "s"}`,
    44,
    y + 15.5,
  );
  y += 30;

  // Baseline vs today
  y = heading(doc, "Baseline vs today, signal by signal", y);
  if (!explanation) {
    y = body(doc, "No checks recorded yet, so there is nothing to compare.", y);
  } else {
    y = body(
      doc,
      `Every comparison uses this person's own last ${explanation.baselineSamples} check${explanation.baselineSamples === 1 ? "" : "s"} — never a population average.${explanation.baselineSufficient ? "" : " Baseline insufficient for some signals: continue monitoring rather than acting on the score."}`,
      y,
    );
    explanation.signals.forEach((s) => {
      if (y > 246) {
        doc.addPage();
        y = 20;
      }
      y = drawCompareRow(doc, 14, y, 182, {
        signal: s.signal,
        today: s.today,
        baseline: s.baseline,
        change: s.change,
        verdict: s.verdict,
        threshold: s.threshold,
        reason: s.reason,
        ratio: ratioFor(s.today, s.baseline),
      });
    });
  }

  // Trends
  if (y > 210) {
    doc.addPage();
    y = 20;
  }
  y = heading(doc, `Trend context (${windowDays} days)`, y);
  drawChart(doc, 14, y, 88, 32, "Health Drift", series(scoped, "drift_score", windowDays), {
    band: true,
  });
  drawChart(
    doc,
    108,
    y,
    88,
    32,
    "Reaction time (ms)",
    series(scoped, "reaction_median_ms", windowDays),
    { unit: " ms" },
  );
  y += 38;

  // Case activity timeline
  if (y > 220) {
    doc.addPage();
    y = 20;
  }
  y = heading(doc, "Case activity timeline", y);
  if (reviews.length === 0) {
    y = body(
      doc,
      "No reviewer activity recorded yet. This case has not been reviewed, escalated or closed.",
      y,
    );
  } else {
    reviews.forEach((r) => {
      if (y > 262) {
        doc.addPage();
        y = 20;
      }
      doc.setFillColor(TEAL.r, TEAL.g, TEAL.b);
      doc.circle(16.5, y - 1.2, 1.2, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(INK.r, INK.g, INK.b);
      doc.text(
        `${REVIEW_STATE_LABEL_TEXT[r.action]} — ${r.reviewer_name ?? "Health worker"}`,
        21,
        y,
      );
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
      doc.text(
        `${new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}${r.alert_id ? " · on a specific alert" : " · on this person's case"}`,
        21,
        y + 4,
      );
      y += 8;
      if (r.note) {
        doc.setFontSize(8);
        doc.setTextColor(60, 76, 78);
        const lines = doc.splitTextToSize(r.note, 168);
        doc.text(lines.slice(0, 4), 21, y);
        y += Math.min(4, lines.length) * 4 + 1;
      }
      y += 1.5;
    });
    y = body(
      doc,
      "Decisions are append-only and cannot be edited. Reopening a closed case always requires a fresh resolution note.",
      y + 1,
    );
  }

  // Recommendation + disclaimer
  if (y > 236) {
    doc.addPage();
    y = 20;
  }
  y = heading(doc, "Recommended next step", y);
  y = body(doc, explanation?.recommendation ?? meta.action, y);
  y = body(doc, DRIFT_DISCLAIMER, y);
  y = body(
    doc,
    "This pack is a prioritisation aid for human review. It names no disease, rules none out, and replaces no clinical examination. Demo-mode values are synthetic.",
    y,
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b);
  doc.text(
    "SwasthyaShadow — Smart India Hackathon prototype. Non-diagnostic. Shared only with the person's consent.",
    105,
    288,
    { align: "center" },
  );

  return doc;
}

export function downloadReviewPack(
  patient: Patient,
  checks: HealthCheck[],
  reviews: CaseReview[],
  windowDays: 14 | 30 = 14,
) {
  const doc = buildReviewPack(patient, checks, reviews, windowDays);
  const safe = patient.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`swasthyashadow-${safe}-phc-review-pack.pdf`);
}
