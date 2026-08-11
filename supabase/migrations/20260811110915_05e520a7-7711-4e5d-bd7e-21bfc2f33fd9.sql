REVOKE EXECUTE ON FUNCTION public.can_view_patient(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_review_patient(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_escalate_patient(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_patient(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_patient(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_escalate_patient(uuid, uuid) TO authenticated;