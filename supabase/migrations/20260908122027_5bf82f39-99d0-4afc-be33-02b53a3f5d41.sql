CREATE OR REPLACE FUNCTION public.award_auction(_auction_id uuid, _user_id uuid, _amount numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_auction FROM public.auctions WHERE id = _auction_id;

  UPDATE public.cards
  SET status = 'locked', locked_by = _user_id, locked_at = now(), updated_at = now()
  WHERE id = v_auction.card_id AND status <> 'sold';

  INSERT INTO public.orders (
    user_id, card_id, auction_id, total_amount, payment_method, status, payment_due_at
  ) VALUES (
    _user_id, v_auction.card_id, _auction_id, _amount, 'slip', 'pending', now() + interval '30 minutes'
  )
  RETURNING id INTO v_order_id;

  PERFORM public.notify_user(_user_id, 'auction_won',
    'ยินดีด้วย คุณชนะการประมูล',
    'กรุณาชำระเงินภายใน 30 นาที มิฉะนั้นสิทธิ์จะถูกยกเลิกและคุณจะได้รับบทลงโทษ',
    '/checkout/' || v_order_id::text);

  RETURN v_order_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_auction_order(_auction_id uuid, _payment_method payment_method DEFAULT 'slip'::payment_method, _shipping_name text DEFAULT NULL::text, _shipping_phone text DEFAULT NULL::text, _shipping_address text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid     uuid := auth.uid();
  v_auction public.auctions%ROWTYPE;
  v_card    public.cards%ROWTYPE;
  v_order   public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อนทำรายการ';
  END IF;
  IF public.is_banned(v_uid) THEN
    RAISE EXCEPTION 'บัญชีนี้ถูกระงับการใช้งาน';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรอบประมูลนี้';
  END IF;

  IF v_auction.end_time > now() AND v_auction.status = 'active' THEN
    RAISE EXCEPTION 'รอบประมูลยังไม่ปิด';
  END IF;

  IF v_auction.winner_id IS DISTINCT FROM v_uid THEN
    RAISE EXCEPTION 'คุณไม่ใช่ผู้ชนะการประมูลรอบนี้';
  END IF;

  SELECT * INTO v_order FROM public.orders
  WHERE auction_id = _auction_id AND user_id = v_uid AND status <> 'cancelled'
  LIMIT 1;
  IF FOUND THEN
    RETURN v_order;
  END IF;

  SELECT * INTO v_card FROM public.cards WHERE id = v_auction.card_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบการ์ดใบนี้';
  END IF;
  IF v_card.status = 'sold' THEN
    RAISE EXCEPTION 'การ์ดใบนี้ถูกขายไปแล้ว';
  END IF;

  UPDATE public.cards
  SET status = 'locked', locked_by = v_uid, locked_at = now(), updated_at = now()
  WHERE id = v_card.id;

  UPDATE public.auctions
  SET status = 'waiting_payment', updated_at = now()
  WHERE id = _auction_id;

  INSERT INTO public.orders (
    user_id, card_id, auction_id, total_amount, payment_method,
    shipping_name, shipping_phone, shipping_address, note, status, payment_due_at
  ) VALUES (
    v_uid, v_card.id, _auction_id, v_auction.current_price, _payment_method,
    _shipping_name, _shipping_phone, _shipping_address, _note, 'pending', now() + interval '30 minutes'
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$function$;

CREATE OR REPLACE FUNCTION public.purchase_fixed_price_card(_card_id uuid, _payment_method payment_method DEFAULT 'slip'::payment_method, _shipping_name text DEFAULT NULL::text, _shipping_phone text DEFAULT NULL::text, _shipping_address text DEFAULT NULL::text, _note text DEFAULT NULL::text)
 RETURNS orders
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid   UUID := auth.uid();
  v_card  public.cards%ROWTYPE;
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อนทำรายการ';
  END IF;

  IF public.is_banned(v_uid) THEN
    RAISE EXCEPTION 'บัญชีนี้ถูกระงับการใช้งาน';
  END IF;

  SELECT * INTO v_card
  FROM public.cards
  WHERE id = _card_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบการ์ดใบนี้';
  END IF;

  IF v_card.sale_type <> 'fixed_price' THEN
    RAISE EXCEPTION 'การ์ดใบนี้เปิดขายแบบประมูลเท่านั้น';
  END IF;

  IF v_card.status <> 'available' THEN
    RAISE EXCEPTION 'การ์ดใบนี้ถูกจองหรือขายไปแล้ว';
  END IF;

  UPDATE public.cards
  SET status     = 'locked',
      locked_by  = v_uid,
      locked_at  = now(),
      updated_at = now()
  WHERE id = v_card.id;

  INSERT INTO public.orders (
    user_id, card_id, auction_id, total_amount, payment_method,
    shipping_name, shipping_phone, shipping_address, note, status, payment_due_at
  )
  VALUES (
    v_uid, v_card.id, NULL, v_card.price, _payment_method,
    _shipping_name, _shipping_phone, _shipping_address, _note, 'pending', now() + interval '30 minutes'
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$function$;