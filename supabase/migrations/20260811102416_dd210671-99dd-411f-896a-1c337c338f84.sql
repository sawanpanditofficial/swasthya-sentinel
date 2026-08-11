CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  role text NOT NULL DEFAULT 'patient' CHECK (role IN ('patient','asha','doctor')),
  linked_patient_id uuid,
  consent_given boolean NOT NULL DEFAULT true,
  language text NOT NULL DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  age int,
  sex text,
  village text,
  baseline_profile text NOT NULL DEFAULT 'steady',
  drift_score int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'stable' CHECK (status IN ('stable','monitor','review','high_priority')),
  last_check_at timestamptz,
  is_demo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.patients TO authenticated;
GRANT ALL ON public.patients TO service_role;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo patients readable" ON public.patients FOR SELECT TO authenticated USING (is_demo = true);
CREATE POLICY "demo patients updatable" ON public.patients FOR UPDATE TO authenticated USING (is_demo = true) WITH CHECK (is_demo = true);

CREATE TABLE public.health_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  check_date date NOT NULL DEFAULT current_date,
  voice_status text NOT NULL DEFAULT 'pending',
  voice_jitter numeric,
  reaction_mean_ms int,
  reaction_median_ms int,
  activity_steps int,
  symptoms jsonb NOT NULL DEFAULT '{}'::jsonb,
  vitals jsonb NOT NULL DEFAULT '{}'::jsonb,
  drift_score int NOT NULL DEFAULT 0,
  drift_band text NOT NULL DEFAULT 'stable',
  deviations jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'app',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX health_checks_patient_date_idx ON public.health_checks (patient_id, check_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.health_checks TO authenticated;
GRANT ALL ON public.health_checks TO service_role;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "demo checks readable" ON public.health_checks FOR SELECT TO authenticated USING (true);
CREATE POLICY "checks insertable" ON public.health_checks FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  severity text NOT NULL DEFAULT 'low' CHECK (severity IN ('low','medium','high')),
  title text NOT NULL,
  body text,
  requires_review boolean NOT NULL DEFAULT false,
  acknowledged boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alerts TO authenticated;
GRANT ALL ON public.alerts TO service_role;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alerts readable" ON public.alerts FOR SELECT TO authenticated USING (true);
CREATE POLICY "alerts writable" ON public.alerts FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "alerts insertable" ON public.alerts FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','completed','declined')),
  reason text,
  facility text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "referrals readable" ON public.referrals FOR SELECT TO authenticated USING (true);
CREATE POLICY "referrals insertable" ON public.referrals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "referrals updatable" ON public.referrals FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    NEW.id,
    coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    coalesce(NEW.raw_user_meta_data ->> 'role', 'patient')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.patients (id, name, age, sex, village, baseline_profile) VALUES
('a0000000-0000-4000-8000-000000000001','Aarti Devi',39,'F','Rampur','variable'),
('a0000001-0000-4000-8000-000000000001','Ramesh Kumar',28,'M','Bhilwara Khurd','steady'),
('a0000002-0000-4000-8000-000000000001','Sunita Kumari',44,'F','Manikpur','steady'),
('a0000003-0000-4000-8000-000000000001','Mohan Singh',52,'M','Sonapur','variable'),
('a0000004-0000-4000-8000-000000000001','Kavita Yadav',31,'F','Chandanpur','steady'),
('a0000005-0000-4000-8000-000000000001','Prakash Patil',60,'M','Rampur','steady'),
('a0000006-0000-4000-8000-000000000001','Lakshmi Bai',67,'F','Bhilwara Khurd','variable'),
('a0000007-0000-4000-8000-000000000001','Devendra Verma',35,'M','Manikpur','steady'),
('a0000008-0000-4000-8000-000000000001','Meena Sharma',24,'F','Sonapur','steady'),
('a0000009-0000-4000-8000-000000000001','Suresh Prasad',48,'M','Chandanpur','variable'),
('a000000a-0000-4000-8000-000000000001','Radha Devi',71,'F','Rampur','steady'),
('a000000b-0000-4000-8000-000000000001','Vijay Kumar',22,'M','Bhilwara Khurd','steady'),
('a000000c-0000-4000-8000-000000000001','Anita Kumari',37,'F','Manikpur','variable'),
('a000000d-0000-4000-8000-000000000001','Gopal Singh',56,'M','Sonapur','steady'),
('a000000e-0000-4000-8000-000000000001','Shanti Yadav',63,'F','Chandanpur','steady'),
('a000000f-0000-4000-8000-000000000001','Naresh Patil',41,'M','Rampur','variable'),
('a0000010-0000-4000-8000-000000000001','Pooja Bai',29,'F','Bhilwara Khurd','steady'),
('a0000011-0000-4000-8000-000000000001','Bhola Verma',58,'M','Manikpur','steady'),
('a0000012-0000-4000-8000-000000000001','Rekha Sharma',33,'F','Sonapur','variable'),
('a0000013-0000-4000-8000-000000000001','Ishwar Prasad',45,'M','Chandanpur','steady');

INSERT INTO public.health_checks
  (patient_id, check_date, voice_status, voice_jitter, reaction_mean_ms, reaction_median_ms,
   activity_steps, symptoms, vitals, drift_score, drift_band, deviations, source)
SELECT
  c.pid, c.day, c.voice_status, c.jitter, c.rt, c.rt - 8, c.steps,
  jsonb_build_object(
    'fever', CASE WHEN c.sev > 0.55 THEN 1 ELSE 0 END,
    'cough', CASE WHEN c.sev > 0.35 THEN 1 ELSE 0 END,
    'fatigue', CASE WHEN c.sev > 0.25 THEN 1 ELSE 0 END,
    'breathing_difficulty', CASE WHEN c.sev > 0.7 THEN 1 ELSE 0 END,
    'headache', CASE WHEN c.sev > 0.45 THEN 1 ELSE 0 END,
    'loss_of_appetite', CASE WHEN c.sev > 0.5 THEN 1 ELSE 0 END,
    'sleep_quality', GREATEST(1, LEAST(5, round(4 - c.sev * 2)::int))
  ),
  jsonb_build_object(
    'temp_c', round((36.6 + c.sev * 1.4)::numeric, 1),
    'spo2', (98 - round(c.sev * 5))::int,
    'pulse', (76 + round(c.sev * 22))::int
  ),
  c.drift,
  CASE WHEN c.drift < 30 THEN 'stable' WHEN c.drift < 60 THEN 'monitor'
       WHEN c.drift < 80 THEN 'review' ELSE 'high_priority' END,
  (SELECT coalesce(jsonb_agg(x), '[]'::jsonb) FROM (
      SELECT 'Reaction time slower than personal baseline' AS x WHERE c.rt > c.base_rt + 60
      UNION ALL SELECT 'Daily activity below personal baseline' WHERE c.steps < 4000
      UNION ALL SELECT 'Self-reported fever present' WHERE c.sev > 0.55
      UNION ALL SELECT 'Reported SpO2 below usual personal range' WHERE c.sev > 0.6
   ) dv),
  'demo'
FROM (
  SELECT
    p.id AS pid,
    (current_date - d) AS day,
    b.base_rt,
    CASE WHEN (r.n % 100) < 12 THEN 'pending' ELSE 'analysed' END AS voice_status,
    round((1.1 + s.sev * 1.6 + (r.n % 7)::numeric / 40)::numeric, 2) AS jitter,
    CASE
      WHEN p.k = 0 THEN b.base_rt + round(s.prog * 120)::int + (r.n % 25) - 12
      WHEN p.k = 1 THEN b.base_rt + round(GREATEST(0, s.prog - 0.4) * 220)::int + (r.n % 25) - 12
      ELSE b.base_rt + (r.n % 45) - 22
    END AS rt,
    CASE
      WHEN p.k = 0 THEN 5200 - round(s.prog * 2600)::int + (r.n % 500) - 250
      WHEN p.k = 1 THEN 4800 - round(GREATEST(0, s.prog - 0.4) * 3000)::int + (r.n % 500) - 250
      ELSE 4200 + (r.n % 3400)
    END AS steps,
    s.sev,
    GREATEST(0, LEAST(100,
      CASE
        WHEN p.k = 0 THEN 8 + round(s.prog * 62)::int + (r.n % 9) - 4
        WHEN p.k = 1 THEN CASE WHEN s.prog > 0.4 THEN 30 + round(s.prog * 55)::int + (r.n % 11) - 5
                               ELSE 20 + (r.n % 13) - 6 END
        WHEN p.k % 7 = 0 THEN 20 + (r.n % 29)
        ELSE 4 + (r.n % 23)
      END)) AS drift
  FROM (
    SELECT id, (row_number() OVER (ORDER BY created_at, id) - 1)::int AS k
    FROM public.patients WHERE is_demo
  ) p
  CROSS JOIN generate_series(29, 0, -1) AS d
  CROSS JOIN LATERAL (SELECT 280 + (abs(('x' || substr(md5(p.id::text), 1, 8))::bit(32)::int) % 100) AS base_rt) b
  CROSS JOIN LATERAL (SELECT abs(('x' || substr(md5(p.id::text || d::text), 1, 8))::bit(32)::int)::bigint AS n) r
  CROSS JOIN LATERAL (
    SELECT ((29 - d)::numeric / 29) AS prog,
           CASE
             WHEN p.k = 0 THEN ((29 - d)::numeric / 29)
             WHEN p.k = 1 THEN GREATEST(0, ((29 - d)::numeric / 29) - 0.3)
             ELSE 0.1
           END AS sev
  ) s
) c;

UPDATE public.patients p SET
  drift_score = l.drift_score,
  status = l.drift_band,
  last_check_at = now()
FROM (
  SELECT DISTINCT ON (patient_id) patient_id, drift_score, drift_band
  FROM public.health_checks ORDER BY patient_id, check_date DESC
) l
WHERE l.patient_id = p.id;

INSERT INTO public.alerts (patient_id, severity, title, body, requires_review)
SELECT id,
  CASE WHEN drift_score >= 80 THEN 'high' WHEN drift_score >= 60 THEN 'medium' ELSE 'low' END,
  CASE WHEN drift_score >= 60 THEN 'Sustained deviation from personal baseline'
       ELSE 'Mild deviation observed' END,
  name || ' shows a multi-day deviation from their personal baseline. Prototype signal only - not a diagnosis. Human clinical review recommended.',
  drift_score >= 60
FROM public.patients WHERE drift_score >= 30;

INSERT INTO public.referrals (patient_id, status, reason, facility)
SELECT id,
  CASE WHEN drift_score >= 80 THEN 'pending' ELSE 'in_review' END,
  'Recommended human clinical evaluation after sustained baseline deviation (prototype signal).',
  'PHC ' || village
FROM public.patients WHERE drift_score >= 60;