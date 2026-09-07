CREATE OR REPLACE FUNCTION public.market_sales()
RETURNS TABLE (
  card_id uuid,
  card_name text,
  set_name text,
  grade text,
  image text,
  is_auction boolean,
  price numeric,
  sold_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    COALESCE(c.set_name, ''),
    COALESCE(NULLIF(c.grade, ''), COALESCE(c.condition, '')),
    COALESCE(c.images[1], ''),
    o.auction_id IS NOT NULL,
    o.total_amount,
    COALESCE(o.paid_at, o.updated_at, o.created_at)
  FROM public.orders o
  JOIN public.cards c ON c.id = o.card_id
  WHERE o.status IN ('paid', 'shipped', 'completed')
  ORDER BY COALESCE(o.paid_at, o.updated_at, o.created_at) DESC
  LIMIT 2000;
$$;

GRANT EXECUTE ON FUNCTION public.market_sales() TO anon, authenticated, service_role;