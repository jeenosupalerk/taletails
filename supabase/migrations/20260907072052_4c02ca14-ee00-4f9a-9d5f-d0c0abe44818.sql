CREATE OR REPLACE FUNCTION public.admin_delete_card(_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้น';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE card_id = _card_id AND status IN ('paid', 'shipped', 'completed')
  ) THEN
    RAISE EXCEPTION 'การ์ดใบนี้มีคำสั่งซื้อที่ชำระเงินแล้ว ไม่สามารถลบได้';
  END IF;

  DELETE FROM public.auction_penalties
  WHERE auction_id IN (SELECT id FROM public.auctions WHERE card_id = _card_id)
     OR order_id IN (SELECT id FROM public.orders WHERE card_id = _card_id);

  DELETE FROM public.orders WHERE card_id = _card_id;

  DELETE FROM public.bids
  WHERE auction_id IN (SELECT id FROM public.auctions WHERE card_id = _card_id);

  DELETE FROM public.auctions WHERE card_id = _card_id;

  DELETE FROM public.cards WHERE id = _card_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_card(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_card(uuid) TO authenticated;