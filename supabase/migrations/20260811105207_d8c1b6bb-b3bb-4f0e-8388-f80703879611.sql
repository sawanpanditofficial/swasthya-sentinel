ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS reminder_channel text NOT NULL DEFAULT 'in_app',
  ADD COLUMN IF NOT EXISTS reminder_contact text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_reminder_channel_check
  CHECK (reminder_channel = ANY (ARRAY['in_app'::text, 'email'::text, 'sms'::text, 'whatsapp'::text]));