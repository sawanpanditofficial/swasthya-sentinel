-- 1) Helper: create + link a blank personal patient record for the current user
CREATE OR REPLACE FUNCTION public.ensure_own_patient()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pid uuid;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT linked_patient_id, coalesce(full_name, 'New member')
    INTO _pid, _name
  FROM public.profiles
  WHERE id = _uid;

  IF _pid IS NOT NULL THEN
    RETURN _pid;
  END IF;

  INSERT INTO public.patients (name, baseline_profile, drift_score, status, is_demo)
  VALUES (coalesce(_name, 'New member'), 'steady', 0, 'stable', true)
  RETURNING id INTO _pid;

  UPDATE public.profiles SET linked_patient_id = _pid WHERE id = _uid;

  RETURN _pid;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_own_patient() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_own_patient() TO authenticated;

-- 2) New sign-ups: create their own blank record via the signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role text := coalesce(NEW.raw_user_meta_data ->> 'role', 'patient');
  _name text := coalesce(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1));
  _pid uuid;
BEGIN
  IF _role = 'patient' THEN
    INSERT INTO public.patients (name, baseline_profile, drift_score, status, is_demo)
    VALUES (_name, 'steady', 0, 'stable', true)
    RETURNING id INTO _pid;
  END IF;

  INSERT INTO public.profiles (id, full_name, role, linked_patient_id)
  VALUES (NEW.id, _name, _role, _pid)
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3) Unlink accounts previously pointed at the shared seeded demo patients
UPDATE public.profiles
SET linked_patient_id = NULL
WHERE linked_patient_id IN (
  'a0000000-0000-4000-8000-000000000001'::uuid,
  'a0000001-0000-4000-8000-000000000001'::uuid
);