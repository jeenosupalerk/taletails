CREATE OR REPLACE FUNCTION public.admin_delete_card(_card_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_seller uuid;
BEGIN
  SELECT seller_id INTO v_seller FROM public.cards WHERE id = _card_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบการ์ดใบนี้';
  END IF;

  IF NOT (public.has_role(v_uid, 'admin') OR (v_seller IS NOT NULL AND v_seller = v_uid)) THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ลบการ์ดใบนี้';
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

  DELETE FROM public.point_transactions
  WHERE order_id IN (SELECT id FROM public.orders WHERE card_id = _card_id);

  DELETE FROM public.orders WHERE card_id = _card_id;

  DELETE FROM public.bids
  WHERE auction_id IN (SELECT id FROM public.auctions WHERE card_id = _card_id);

  DELETE FROM public.auctions WHERE card_id = _card_id;

  DELETE FROM public.cards WHERE id = _card_id;
END;
$function$;