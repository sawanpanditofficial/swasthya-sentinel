-- ============ 1. Worker assignments (village coverage + permission grants) ============
CREATE TABLE public.worker_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  worker_id uuid NOT NULL,
  village text NOT NULL,
  can_review boolean NOT NULL DEFAULT true,
  can_escalate boolean NOT NULL DEFAULT false,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (worker_id, village)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.worker_assignments TO authenticated;
GRANT ALL ON public.worker_assignments TO service_role;

ALTER TABLE public.worker_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own assignments readable" ON public.worker_assignments
  FOR SELECT TO authenticated USING (auth.uid() = worker_id);
CREATE POLICY "own assignments insertable" ON public.worker_assignments
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "own assignments updatable" ON public.worker_assignments
  FOR UPDATE TO authenticated USING (auth.uid() = worker_id) WITH CHECK (auth.uid() = worker_id);
CREATE POLICY "own assignments deletable" ON public.worker_assignments
  FOR DELETE TO authenticated USING (auth.uid() = worker_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_worker_assignments_updated_at
  BEFORE UPDATE ON public.worker_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 2. Scoping helper functions (security definer, no RLS recursion) ============
CREATE OR REPLACE FUNCTION public.can_view_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = _user_id AND p.linked_patient_id = _patient_id
  ) OR EXISTS (
    SELECT 1
    FROM public.worker_assignments wa
    JOIN public.patients pt ON pt.id = _patient_id
    WHERE wa.worker_id = _user_id
      AND (wa.village = '*' OR wa.village = pt.village)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_review_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.worker_assignments wa
    JOIN public.patients pt ON pt.id = _patient_id
    WHERE wa.worker_id = _user_id
      AND wa.can_review = true
      AND (wa.village = '*' OR wa.village = pt.village)
  )
$$;

CREATE OR REPLACE FUNCTION public.can_escalate_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.worker_assignments wa
    JOIN public.patients pt ON pt.id = _patient_id
    WHERE wa.worker_id = _user_id
      AND wa.can_escalate = true
      AND (wa.village = '*' OR wa.village = pt.village)
  )
$$;

-- ============ 3. Re-scope existing policies to assignments ============
DROP POLICY IF EXISTS "demo patients readable" ON public.patients;
DROP POLICY IF EXISTS "demo patients updatable" ON public.patients;
CREATE POLICY "assigned patients readable" ON public.patients
  FOR SELECT TO authenticated USING (is_demo = true AND public.can_view_patient(auth.uid(), id));
CREATE POLICY "assigned patients updatable" ON public.patients
  FOR UPDATE TO authenticated
  USING (is_demo = true AND public.can_view_patient(auth.uid(), id))
  WITH CHECK (is_demo = true AND public.can_view_patient(auth.uid(), id));

DROP POLICY IF EXISTS "demo checks readable" ON public.health_checks;
DROP POLICY IF EXISTS "checks insertable" ON public.health_checks;
CREATE POLICY "assigned checks readable" ON public.health_checks
  FOR SELECT TO authenticated USING (public.can_view_patient(auth.uid(), patient_id));
CREATE POLICY "assigned checks insertable" ON public.health_checks
  FOR INSERT TO authenticated WITH CHECK (public.can_view_patient(auth.uid(), patient_id));

DROP POLICY IF EXISTS "alerts readable" ON public.alerts;
DROP POLICY IF EXISTS "alerts insertable" ON public.alerts;
DROP POLICY IF EXISTS "alerts writable" ON public.alerts;
CREATE POLICY "assigned alerts readable" ON public.alerts
  FOR SELECT TO authenticated USING (public.can_view_patient(auth.uid(), patient_id));
CREATE POLICY "assigned alerts insertable" ON public.alerts
  FOR INSERT TO authenticated WITH CHECK (public.can_view_patient(auth.uid(), patient_id));
CREATE POLICY "assigned alerts writable" ON public.alerts
  FOR UPDATE TO authenticated
  USING (public.can_review_patient(auth.uid(), patient_id))
  WITH CHECK (public.can_review_patient(auth.uid(), patient_id));

DROP POLICY IF EXISTS "referrals readable" ON public.referrals;
DROP POLICY IF EXISTS "referrals insertable" ON public.referrals;
DROP POLICY IF EXISTS "referrals updatable" ON public.referrals;
CREATE POLICY "assigned referrals readable" ON public.referrals
  FOR SELECT TO authenticated USING (public.can_view_patient(auth.uid(), patient_id));
CREATE POLICY "assigned referrals insertable" ON public.referrals
  FOR INSERT TO authenticated WITH CHECK (public.can_escalate_patient(auth.uid(), patient_id));
CREATE POLICY "assigned referrals updatable" ON public.referrals
  FOR UPDATE TO authenticated
  USING (public.can_escalate_patient(auth.uid(), patient_id))
  WITH CHECK (public.can_escalate_patient(auth.uid(), patient_id));

DROP POLICY IF EXISTS "case reviews readable" ON public.case_reviews;
DROP POLICY IF EXISTS "case reviews insertable" ON public.case_reviews;
CREATE POLICY "assigned case reviews readable" ON public.case_reviews
  FOR SELECT TO authenticated USING (public.can_view_patient(auth.uid(), patient_id));
CREATE POLICY "assigned case reviews insertable" ON public.case_reviews
  FOR INSERT TO authenticated
  WITH CHECK (public.can_review_patient(auth.uid(), patient_id) AND reviewer_id = auth.uid());

-- ============ 4. Delivery attempt history ============
CREATE TABLE public.delivery_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'in_app',
  contact text,
  kind text NOT NULL DEFAULT 'reminder',
  status text NOT NULL DEFAULT 'simulated',
  message text,
  error text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.delivery_attempts TO authenticated;
GRANT ALL ON public.delivery_attempts TO service_role;

ALTER TABLE public.delivery_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own delivery attempts readable" ON public.delivery_attempts
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own delivery attempts insertable" ON public.delivery_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE INDEX delivery_attempts_user_created_idx
  ON public.delivery_attempts (user_id, created_at DESC);

-- ============ 5. Consent centre ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS consent_voice boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_reaction boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_activity boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_symptoms boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS consent_vitals boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS guardian_name text,
  ADD COLUMN IF NOT EXISTS guardian_relation text;

CREATE TABLE public.consent_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'all',
  granted boolean NOT NULL,
  actor text NOT NULL DEFAULT 'self',
  actor_name text,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.consent_events TO authenticated;
GRANT ALL ON public.consent_events TO service_role;

ALTER TABLE public.consent_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own consent events readable" ON public.consent_events
  FOR SELECT TO authenticated USING (auth.uid() = profile_id);
CREATE POLICY "own consent events insertable" ON public.consent_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = profile_id);

CREATE INDEX consent_events_profile_created_idx
  ON public.consent_events (profile_id, created_at DESC);