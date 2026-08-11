ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS reminder_time text NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS consent_revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS best_streak integer NOT NULL DEFAULT 0;

ALTER TABLE public.alerts
  ADD COLUMN IF NOT EXISTS review_state text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS review_note text,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.case_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  alert_id uuid REFERENCES public.alerts(id) ON DELETE SET NULL,
  action text NOT NULL DEFAULT 'reviewed',
  note text,
  reviewer_id uuid,
  reviewer_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.case_reviews TO authenticated;
GRANT ALL ON public.case_reviews TO service_role;

ALTER TABLE public.case_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "case reviews readable" ON public.case_reviews
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "case reviews insertable" ON public.case_reviews
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS case_reviews_patient_idx ON public.case_reviews (patient_id, created_at DESC);