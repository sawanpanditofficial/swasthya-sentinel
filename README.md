# Swasthya Sentinel

You are a senior product engineer and UX designer.

Build a production-quality SIH hackathon prototype called "SwasthyaShadow".

PRODUCT:

SwasthyaShadow is an AI-assisted longitudinal health monitoring and early-warning platform for underserved communities in India.

CORE CONCEPT:

The system learns an individual's personal baseline from repeated low-cost, non-invasive smartphone-based signals and detects unusual deviations over time.

IMPORTANT MEDICAL SAFETY:

This is NOT a diagnostic system.

It must never claim that a user has a disease.

It must only identify unusual deviations from personal baseline and recommend monitoring or human clinical evaluation.

All risk/drift thresholds are prototype/demo thresholds and must be clearly labeled as non-clinical.

TARGET USERS:

1. Citizen/Patient

2. ASHA/community health worker

3. PHC/doctor

TECH STACK:

Frontend: React + TypeScript

UI: modern responsive healthcare dashboard

Backend integration: Supabase

Database: PostgreSQL

Charts: Recharts

Authentication: Supabase Auth

CORE PATIENT FLOW:

Login

→ Patient Dashboard

→ Daily Health Check

→ Voice Check

→ Reaction Time Test

→ Symptom Questionnaire

→ Optional Vital Entry

→ Analysis

→ Health Drift Result

→ Personal Health Trend

CORE HEALTH WORKER FLOW:

Login

→ Village Dashboard

→ Population Overview

→ Priority Queue

→ Patient Detail

→ Longitudinal Health Trend

→ Detected Deviations

→ Recommended Human Review

→ Referral Tracking

PATIENT DASHBOARD:

Show:

- today's health check status

- current prototype Health Drift indicator

- personal trend

- last completed check

- next recommended check

- privacy/consent status

DAILY HEALTH CHECK:

Step 1: Voice recording UI

Step 2: Reaction time test

Step 3: symptom questionnaire

Step 4: optional vitals

Step 5: review and submit

VOICE:

Create a polished recording interface.

For the prototype, allow simulated/demo voice analysis if real ML integration is unavailable.

Never claim that voice analysis diagnoses a disease.

REACTION TEST:

Implement a real browser-based reaction-time test.

Use randomized visual stimulus timing.

Collect multiple trials.

Calculate mean and median reaction time.

Store results.

SYMPTOMS:

Include:

fever

cough

fatigue

breathing difficulty

headache

loss of appetite

sleep quality

HEALTH DRIFT:

Display:

0–29 = Stable

30–59 = Monitor

60–79 = Review

80–100 = High Priority

Clearly label these as prototype thresholds, not clinically validated thresholds.

HEALTH WORKER DASHBOARD:

Show:

- total registered people

- stable

- monitor

- review

- high priority

- recent alerts

- priority queue

- village-level summary

PATIENT DETAIL:

Show:

- patient profile

- 14-day/30-day trend

- reaction-time trend

- activity trend

- symptom timeline

- voice-analysis status

- Health Drift indicator

- detected deviations

- recommendation for human clinical review

- referral status

DESIGN:

Make it look like a serious Indian digital-health platform, not a generic SaaS dashboard.

Use:

- clean medical UI

- excellent typography

- accessible contrast

- large touch targets

- mobile-first design

- Hindi-friendly text layout

- clear status indicators

- professional charts

- subtle animations

CREATE DEMO MODE:

Provide seeded synthetic patient data so the complete SIH demo works without real patient data.

Include:

- 20 synthetic patients

- different baseline profiles

- normal patients

- gradually deteriorating demo patient

- high-priority demo patient

- historical trend data

- alerts

Do NOT use real patient data.

ARCHITECTURE:

Keep frontend components modular.

Keep database access separate.

Keep AI/drift logic behind service functions/API interfaces so a Python FastAPI ML backend can be connected later.

Create clean reusable components:

PatientCard

HealthDriftCard

TrendChart

PriorityQueue

HealthCheckStepper

VoiceRecorder

ReactionTest

SymptomForm

VitalForm

AlertCard

PatientTimeline

ReferralCard

First create the complete frontend architecture, routes, components, Supabase schema, demo data, and responsive UI.

Do not invent clinical claims.

Do not present prototype scores as medical diagnosis.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6111601a-74a8-433b-b940-8788ea1194ec).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
