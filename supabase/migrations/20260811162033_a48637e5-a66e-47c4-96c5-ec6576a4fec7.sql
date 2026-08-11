ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS is_seed boolean NOT NULL DEFAULT false;
UPDATE public.patients SET is_seed = true WHERE id::text LIKE 'a0000%';

CREATE OR REPLACE FUNCTION public.can_read_shadow(_user_id uuid, _patient_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.owns_patient(_user_id, _patient_id)
      OR public.can_view_patient(_user_id, _patient_id)
      OR (
        public.is_emergency_staff(_user_id)
        AND EXISTS (SELECT 1 FROM public.patients p WHERE p.id = _patient_id AND p.is_seed = true)
      )
$$;

DROP POLICY IF EXISTS "emergency staff read patients" ON public.patients;
CREATE POLICY "emergency staff read seed patients" ON public.patients
  FOR SELECT TO authenticated
  USING (is_seed = true AND public.is_emergency_staff(auth.uid()));

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_emergency_staff(uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.owns_patient(uuid, uuid) FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.can_read_shadow(uuid, uuid) FROM anon, authenticated;