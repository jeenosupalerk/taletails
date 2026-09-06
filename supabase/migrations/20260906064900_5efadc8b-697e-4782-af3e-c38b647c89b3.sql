-- 1) Strike system with 6-month decay
CREATE OR REPLACE FUNCTION public.apply_auction_strike(_user_id uuid, _order_id uuid, _auction_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_last timestamptz;
  v_strike integer;
  v_level text;
  v_until timestamptz;
  v_suspend boolean := false;
  v_title text;
  v_body text;
BEGIN
  -- ล้างสถิติผิดนัดหากไม่มีการผิดนัดใหม่ติดต่อกัน 6 เดือน
  SELECT max(created_at) INTO v_last
  FROM public.auction_penalties
  WHERE user_id = _user_id;

  IF v_last IS NULL OR v_last < now() - interval '6 months' THEN
    UPDATE public.users
    SET auction_strikes = 0, auction_banned_until = NULL, auction_ban_forever = false, updated_at = now()
    WHERE id = _user_id;
  END IF;

  UPDATE public.users
  SET auction_strikes = auction_strikes + 1, updated_at = now()
  WHERE id = _user_id
  RETURNING auction_strikes INTO v_strike;

  IF v_strike IS NULL THEN
    RETURN;
  END IF;

  IF v_strike = 1 THEN
    v_level := 'warning';
    v_title := 'คำเตือนครั้งที่ 1: ไม่ชำระเงินตามเวลา';
    v_body  := 'คุณไม่ได้ชำระเงินภายในเวลาที่กำหนด ครั้งต่อไปจะถูกห้ามประมูล 7 วัน (ประวัตินี้จะถูกล้างหากไม่ผิดนัดอีกภายใน 6 เดือน)';
  ELSIF v_strike = 2 THEN
    v_level := 'ban_7_days';
    v_until := now() + interval '7 days';
    v_title := 'ถูกห้ามประมูล 7 วัน';
    v_body  := 'คุณผิดนัดชำระเงินเป็นครั้งที่ 2 จึงถูกห้ามเข้าร่วมประมูลเป็นเวลา 7 วัน';
  ELSIF v_strike = 3 THEN
    v_level := 'ban_30_days';
    v_until := now() + interval '30 days';
    v_title := 'ถูกห้ามประมูล 30 วัน';
    v_body  := 'คุณผิดนัดชำระเงินเป็นครั้งที่ 3 จึงถูกห้ามเข้าร่วมประมูลเป็นเวลา 30 วัน';
  ELSE
    v_level := 'account_suspended';
    v_suspend := true;
    v_title := 'บัญชีถูกระงับ • ต้องยืนยันตัวตนเพิ่มเติม';
    v_body  := 'คุณผิดนัดชำระเงินครบ 4 ครั้ง บัญชีของคุณถูกระงับชั่วคราว กรุณาติดต่อทีมงานเพื่อยืนยันตัวตนเพิ่มเติมก่อนกลับมาใช้งาน';
  END IF;

  UPDATE public.users
  SET auction_banned_until = CASE WHEN v_until IS NULL THEN auction_banned_until ELSE GREATEST(COALESCE(auction_banned_until, now()), v_until) END,
      is_banned = is_banned OR v_suspend,
      updated_at = now()
  WHERE id = _user_id;

  INSERT INTO public.auction_penalties (
    user_id, order_id, auction_id, strike_no, level, banned_until, is_permanent, reason
  ) VALUES (
    _user_id, _order_id, _auction_id, v_strike, v_level, v_until, v_suspend,
    'ไม่ชำระเงินภายในเวลาที่กำหนด'
  );

  PERFORM public.notify_user(_user_id, 'auction_penalty', v_title, v_body, '/wins');
END;
$function$;

-- 2) Unpaid winner: end the auction instead of passing to the next bidder
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_o public.orders%ROWTYPE;
  v_count integer := 0;
BEGIN
  FOR v_o IN
    SELECT * FROM public.orders
    WHERE status = 'pending' AND payment_due_at <= now()
    ORDER BY payment_due_at
    FOR UPDATE
  LOOP
    UPDATE public.orders SET status = 'cancelled', updated_at = now() WHERE id = v_o.id;
    v_count := v_count + 1;

    IF v_o.auction_id IS NOT NULL THEN
      PERFORM public.apply_auction_strike(v_o.user_id, v_o.id, v_o.auction_id);

      UPDATE public.auctions
      SET status = 'ended', winner_id = NULL, updated_at = now()
      WHERE id = v_o.auction_id;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$function$;

-- 3) Admin relists the card for a brand-new auction round
CREATE OR REPLACE FUNCTION public.relist_auction(_auction_id uuid, _end_time timestamp with time zone)
 RETURNS auctions
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_auction public.auctions%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้น';
  END IF;

  IF _end_time <= now() THEN
    RAISE EXCEPTION 'เวลาปิดประมูลต้องอยู่ในอนาคต';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรอบประมูลนี้';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.orders
    WHERE auction_id = _auction_id AND status IN ('paid', 'shipped', 'completed')
  ) THEN
    RAISE EXCEPTION 'รอบประมูลนี้มีการชำระเงินแล้ว ไม่สามารถเปิดประมูลใหม่ได้';
  END IF;

  DELETE FROM public.bids WHERE auction_id = _auction_id;

  UPDATE public.auctions
  SET status = 'active',
      winner_id = NULL,
      current_price = starting_price,
      bid_count = 0,
      start_time = now(),
      end_time = _end_time,
      updated_at = now()
  WHERE id = _auction_id
  RETURNING * INTO v_auction;

  UPDATE public.cards
  SET status = 'available', locked_by = NULL, locked_at = NULL, updated_at = now()
  WHERE id = v_auction.card_id AND status <> 'sold';

  RETURN v_auction;
END;
$function$;

-- 4) Admin clears an auction ban (also lifts the suspension from strike 4)
CREATE OR REPLACE FUNCTION public.clear_auction_ban(_user_id uuid, _reset_strikes boolean DEFAULT true)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้น';
  END IF;

  UPDATE public.users
  SET auction_banned_until = NULL,
      auction_ban_forever = false,
      is_banned = false,
      auction_strikes = CASE WHEN _reset_strikes THEN 0 ELSE auction_strikes END,
      updated_at = now()
  WHERE id = _user_id;

  UPDATE public.auction_penalties
  SET cleared_at = now(), updated_at = now()
  WHERE user_id = _user_id AND cleared_at IS NULL;

  PERFORM public.notify_user(_user_id, 'auction_penalty',
    'ยกเลิกการห้ามประมูลแล้ว',
    'ผู้ดูแลระบบได้ยกเลิกการห้ามเข้าร่วมประมูลของคุณ คุณสามารถกลับมาเสนอราคาได้ทันที',
    '/auctions');
END;
$function$;