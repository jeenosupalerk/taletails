ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'stripe_promptpay';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_payment_intent_id text;
CREATE INDEX IF NOT EXISTS orders_stripe_session_id_idx ON public.orders (stripe_session_id);