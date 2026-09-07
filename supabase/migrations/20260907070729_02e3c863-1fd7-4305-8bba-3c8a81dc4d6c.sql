CREATE TABLE public.user_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  label text NOT NULL DEFAULT 'ที่อยู่จัดส่ง',
  name text NOT NULL,
  phone text NOT NULL,
  address text NOT NULL,
  subdistrict text NOT NULL DEFAULT '',
  district text NOT NULL DEFAULT '',
  province text NOT NULL DEFAULT '',
  postcode text NOT NULL DEFAULT '',
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_addresses TO authenticated;
GRANT ALL ON public.user_addresses TO service_role;

ALTER TABLE public.user_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own addresses" ON public.user_addresses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own addresses" ON public.user_addresses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own addresses" ON public.user_addresses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own addresses" ON public.user_addresses
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX user_addresses_user_id_idx ON public.user_addresses (user_id);
CREATE UNIQUE INDEX user_addresses_one_default_idx ON public.user_addresses (user_id) WHERE is_default;

CREATE TRIGGER set_user_addresses_updated_at
  BEFORE UPDATE ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.unset_other_default_addresses()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_default THEN
    UPDATE public.user_addresses
      SET is_default = false
      WHERE user_id = NEW.user_id AND id <> NEW.id AND is_default;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_addresses_single_default
  BEFORE INSERT OR UPDATE OF is_default ON public.user_addresses
  FOR EACH ROW EXECUTE FUNCTION public.unset_other_default_addresses();