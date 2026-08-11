-- ============ roles ============
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('patient','asha','doctor','responder','hospital','coordinator','admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own roles readable" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- true for responder / hospital / coordinator / doctor style emergency access
CREATE OR REPLACE FUNCTION public.is_emergency_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('responder','hospital','coordinator','doctor','admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.owns_patient(_user_id uuid, _patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id AND linked_patient_id = _patient_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_read_shadow(_user_id uuid, _patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.owns_patient(_user_id, _patient_id)
      OR public.can_view_patient(_user_id, _patient_id)
      OR public.is_emergency_staff(_user_id)
$$;

-- emergency staff may read the roster for triage
CREATE POLICY "emergency staff read patients" ON public.patients
  FOR SELECT TO authenticated USING (public.is_emergency_staff(auth.uid()));

-- ============ emergency profile ============
CREATE TABLE public.emergency_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL UNIQUE REFERENCES public.patients(id) ON DELETE CASCADE,
  blood_group text,
  date_of_birth date,
  gender text,
  address text,
  emergency_code text NOT NULL UNIQUE DEFAULT 'SSH-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 5)),
  ai_summary text,
  ai_summary_at timestamptz,
  ai_risk_flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  risk_level text NOT NULL DEFAULT 'stable',
  offline_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_profiles TO authenticated;
GRANT ALL ON public.emergency_profiles TO service_role;
ALTER TABLE public.emergency_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shadow readable" ON public.emergency_profiles FOR SELECT TO authenticated
  USING (public.can_read_shadow(auth.uid(), patient_id));
CREATE POLICY "own shadow insertable" ON public.emergency_profiles FOR INSERT TO authenticated
  WITH CHECK (public.owns_patient(auth.uid(), patient_id));
CREATE POLICY "own shadow updatable" ON public.emergency_profiles FOR UPDATE TO authenticated
  USING (public.owns_patient(auth.uid(), patient_id)) WITH CHECK (public.owns_patient(auth.uid(), patient_id));
CREATE TRIGGER emergency_profiles_updated_at BEFORE UPDATE ON public.emergency_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ medical detail lists ============
CREATE TABLE public.medical_conditions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate',
  diagnosed_on date,
  notes text,
  source text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.allergies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  substance text NOT NULL,
  severity text NOT NULL DEFAULT 'moderate',
  reaction text,
  source text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  dosage text,
  frequency text,
  started_on date,
  active boolean NOT NULL DEFAULT true,
  source text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.surgeries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  procedure text NOT NULL,
  performed_on date,
  hospital text,
  notes text,
  source text NOT NULL DEFAULT 'self',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.emergency_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text,
  phone text NOT NULL,
  priority integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.medical_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  mime_type text,
  storage_path text,
  status text NOT NULL DEFAULT 'uploaded',
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  extract_error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['medical_conditions','allergies','medications','surgeries','emergency_contacts','medical_documents']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "shadow list readable" ON public.%I FOR SELECT TO authenticated USING (public.can_read_shadow(auth.uid(), patient_id))', t);
    EXECUTE format('CREATE POLICY "own list insertable" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.owns_patient(auth.uid(), patient_id))', t);
    EXECUTE format('CREATE POLICY "own list updatable" ON public.%I FOR UPDATE TO authenticated USING (public.owns_patient(auth.uid(), patient_id)) WITH CHECK (public.owns_patient(auth.uid(), patient_id))', t);
    EXECUTE format('CREATE POLICY "own list deletable" ON public.%I FOR DELETE TO authenticated USING (public.owns_patient(auth.uid(), patient_id))', t);
  END LOOP;
END $$;

-- ============ emergency access tokens ============
CREATE TABLE public.emergency_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT md5(random()::text || clock_timestamp()::text) || md5(random()::text),
  label text,
  expires_at timestamptz,
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emergency_access_tokens TO authenticated;
GRANT ALL ON public.emergency_access_tokens TO service_role;
ALTER TABLE public.emergency_access_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tokens readable" ON public.emergency_access_tokens FOR SELECT TO authenticated
  USING (public.owns_patient(auth.uid(), patient_id));
CREATE POLICY "own tokens insertable" ON public.emergency_access_tokens FOR INSERT TO authenticated
  WITH CHECK (public.owns_patient(auth.uid(), patient_id));
CREATE POLICY "own tokens updatable" ON public.emergency_access_tokens FOR UPDATE TO authenticated
  USING (public.owns_patient(auth.uid(), patient_id)) WITH CHECK (public.owns_patient(auth.uid(), patient_id));
CREATE POLICY "own tokens deletable" ON public.emergency_access_tokens FOR DELETE TO authenticated
  USING (public.owns_patient(auth.uid(), patient_id));

-- ============ access log ============
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  actor_id uuid,
  actor_role text NOT NULL DEFAULT 'responder',
  actor_name text,
  actor_org text,
  action text NOT NULL DEFAULT 'viewed_emergency_profile',
  scope text NOT NULL DEFAULT 'emergency',
  via text NOT NULL DEFAULT 'signed_in',
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.access_logs TO authenticated;
GRANT ALL ON public.access_logs TO service_role;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "access log readable" ON public.access_logs FOR SELECT TO authenticated
  USING (public.owns_patient(auth.uid(), patient_id) OR public.is_emergency_staff(auth.uid()));
CREATE POLICY "access log insertable" ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (public.can_read_shadow(auth.uid(), patient_id));

-- ============ disaster module ============
CREATE TABLE public.hospitals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  district text,
  phone text,
  beds_total integer NOT NULL DEFAULT 0,
  beds_available integer NOT NULL DEFAULT 0,
  has_icu boolean NOT NULL DEFAULT false,
  latitude numeric,
  longitude numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hospitals TO authenticated;
GRANT ALL ON public.hospitals TO service_role;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hospitals readable" ON public.hospitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "hospitals updatable by staff" ON public.hospitals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'hospital') OR public.has_role(auth.uid(), 'coordinator'))
  WITH CHECK (public.has_role(auth.uid(), 'hospital') OR public.has_role(auth.uid(), 'coordinator'));
CREATE TRIGGER hospitals_updated_at BEFORE UPDATE ON public.hospitals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.disaster_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'landslide',
  region text,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  note text,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.disaster_events TO authenticated;
GRANT INSERT, UPDATE ON public.disaster_events TO authenticated;
GRANT ALL ON public.disaster_events TO service_role;
ALTER TABLE public.disaster_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disasters readable" ON public.disaster_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "disasters writable by coordinator" ON public.disaster_events FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE POLICY "disasters updatable by coordinator" ON public.disaster_events FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator')) WITH CHECK (public.has_role(auth.uid(), 'coordinator'));
CREATE TRIGGER disaster_events_updated_at BEFORE UPDATE ON public.disaster_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.patient_disaster_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  disaster_id uuid NOT NULL REFERENCES public.disaster_events(id) ON DELETE CASCADE,
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  risk_level text NOT NULL DEFAULT 'stable',
  triage_status text NOT NULL DEFAULT 'unassigned',
  assigned_to text,
  hospital_id uuid REFERENCES public.hospitals(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (disaster_id, patient_id)
);
GRANT SELECT, INSERT, UPDATE ON public.patient_disaster_status TO authenticated;
GRANT ALL ON public.patient_disaster_status TO service_role;
ALTER TABLE public.patient_disaster_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disaster status readable" ON public.patient_disaster_status FOR SELECT TO authenticated
  USING (public.can_read_shadow(auth.uid(), patient_id));
CREATE POLICY "disaster status insertable by staff" ON public.patient_disaster_status FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'hospital') OR public.has_role(auth.uid(), 'responder'));
CREATE POLICY "disaster status updatable by staff" ON public.patient_disaster_status FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'hospital') OR public.has_role(auth.uid(), 'responder'))
  WITH CHECK (public.has_role(auth.uid(), 'coordinator') OR public.has_role(auth.uid(), 'hospital') OR public.has_role(auth.uid(), 'responder'));
CREATE TRIGGER patient_disaster_status_updated_at BEFORE UPDATE ON public.patient_disaster_status
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ demo seed ============
INSERT INTO public.hospitals (name, district, phone, beds_total, beds_available, has_icu, latitude, longitude) VALUES
  ('District Hospital Mandi', 'Mandi', '+91 1905 222 111', 240, 38, true, 31.7080, 76.9320),
  ('Community Health Centre Kullu', 'Kullu', '+91 1902 224 555', 90, 12, false, 31.9576, 77.1092),
  ('Regional Hospital Shimla', 'Shimla', '+91 177 265 4321', 420, 61, true, 31.1048, 77.1734),
  ('PHC Rampur', 'Shimla', '+91 177 265 9090', 30, 9, false, 31.4478, 77.6272),
  ('Zonal Trauma Centre Bilaspur', 'Bilaspur', '+91 1978 224 700', 180, 24, true, 31.3300, 76.7600);

INSERT INTO public.emergency_profiles (patient_id, blood_group, gender, address, risk_level, date_of_birth)
SELECT p.id,
       (ARRAY['O+','B+','A+','AB+','O-','B-'])[1 + (('x' || substr(md5(p.id::text), 1, 6))::bit(24)::int % 6)],
       coalesce(p.sex, 'other'),
       coalesce(p.village, 'Unknown') || ' village, Himachal Pradesh',
       CASE WHEN p.status = 'high_priority' THEN 'critical'
            WHEN p.status = 'review' THEN 'high'
            WHEN p.status = 'monitor' THEN 'moderate'
            ELSE 'stable' END,
       (CURRENT_DATE - ((coalesce(p.age, 40)) * 365 + 120) * INTERVAL '1 day')::date
FROM public.patients p
WHERE p.is_demo = true
ON CONFLICT (patient_id) DO NOTHING;

INSERT INTO public.emergency_contacts (patient_id, name, relationship, phone, priority)
SELECT p.id, 'Sunita Devi', 'Sister', '+91 98' || lpad((('x' || substr(md5(p.id::text), 1, 6))::bit(24)::int % 10000000)::text, 8, '0'), 1
FROM public.patients p WHERE p.is_demo = true;

INSERT INTO public.medical_conditions (patient_id, name, severity, notes, source)
SELECT p.id,
       (ARRAY['Type 2 diabetes','Hypertension','Asthma','Anaemia'])[1 + (('x' || substr(md5(p.id::text || 'c'), 1, 6))::bit(24)::int % 4)],
       CASE WHEN p.status IN ('review','high_priority') THEN 'severe' ELSE 'moderate' END,
       'Recorded by the community health worker during registration.',
       'self'
FROM public.patients p WHERE p.is_demo = true;

INSERT INTO public.allergies (patient_id, substance, severity, reaction, source)
SELECT p.id, 'Penicillin', 'severe', 'Anaphylaxis', 'self'
FROM public.patients p
WHERE p.is_demo = true AND (('x' || substr(md5(p.id::text || 'a'), 1, 6))::bit(24)::int % 3) = 0;

INSERT INTO public.medications (patient_id, name, dosage, frequency, started_on, source)
SELECT p.id,
       (ARRAY['Metformin','Amlodipine','Salbutamol inhaler','Iron and folic acid'])[1 + (('x' || substr(md5(p.id::text || 'm'), 1, 6))::bit(24)::int % 4)],
       '500 mg', 'Twice daily', CURRENT_DATE - INTERVAL '240 days', 'self'
FROM public.patients p WHERE p.is_demo = true;

INSERT INTO public.surgeries (patient_id, procedure, performed_on, hospital, source)
SELECT p.id, 'Appendectomy', CURRENT_DATE - INTERVAL '900 days', 'District Hospital Mandi', 'self'
FROM public.patients p
WHERE p.is_demo = true AND (('x' || substr(md5(p.id::text || 's'), 1, 6))::bit(24)::int % 4) = 0;

INSERT INTO public.emergency_access_tokens (patient_id, label)
SELECT p.id, 'Emergency card' FROM public.patients p WHERE p.is_demo = true;

WITH d AS (
  INSERT INTO public.disaster_events (name, kind, region, status, note)
  VALUES ('Himachal Landslide Simulation', 'landslide', 'Mandi–Kullu corridor', 'active',
          'Prototype simulation for the SIH demo. No real incident.')
  RETURNING id
)
INSERT INTO public.patient_disaster_status (disaster_id, patient_id, risk_level, triage_status, note)
SELECT d.id, p.id,
       CASE WHEN p.status = 'high_priority' THEN 'critical'
            WHEN p.status = 'review' THEN 'high'
            WHEN p.status = 'monitor' THEN 'moderate'
            ELSE 'stable' END,
       'unassigned',
       'Auto-classified from prototype baseline signals — supporting prioritisation only.'
FROM d, public.patients p WHERE p.is_demo = true;