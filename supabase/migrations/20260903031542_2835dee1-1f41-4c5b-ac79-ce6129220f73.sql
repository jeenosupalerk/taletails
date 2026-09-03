CREATE TABLE public.email_otps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email text NOT NULL,
  code_hash text NOT NULL,
  purpose text NOT NULL DEFAULT 'login',
  pending_username text,
  attempts integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '10 minutes'),
  consumed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX email_otps_email_created_idx ON public.email_otps (email, created_at DESC);

GRANT ALL ON public.email_otps TO service_role;

ALTER TABLE public.email_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No client access to email otps"
ON public.email_otps FOR SELECT TO authenticated USING (false);

CREATE TRIGGER trg_email_otps_updated_at
BEFORE UPDATE ON public.email_otps
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();