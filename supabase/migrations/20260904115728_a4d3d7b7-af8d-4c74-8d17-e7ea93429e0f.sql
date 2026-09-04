-- 1) penalty state on users
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS auction_strikes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auction_banned_until timestamptz,
  ADD COLUMN IF NOT EXISTS auction_ban_forever boolean NOT NULL DEFAULT false;

-- 2) penalty history
CREATE TABLE IF NOT EXISTS public.auction_penalties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  auction_id uuid REFERENCES public.auctions(id) ON DELETE SET NULL,
  strike_no integer NOT NULL DEFAULT 1,
  level text NOT NULL DEFAULT 'warning',
  banned_until timestamptz,
  is_permanent boolean NOT NULL DEFAULT false,
  reason text,
  cleared_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.auction_penalties TO authenticated;
GRANT ALL ON public.auction_penalties TO service_role;

ALTER TABLE public.auction_penalties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own penalties" ON public.auction_penalties;
CREATE POLICY "Users can view their own penalties"
  ON public.auction_penalties FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage penalties" ON public.auction_penalties;
CREATE POLICY "Admins can manage penalties"
  ON public.auction_penalties FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP TRIGGER IF EXISTS trg_auction_penalties_updated_at ON public.auction_penalties;
CREATE TRIGGER trg_auction_penalties_updated_at
  BEFORE UPDATE ON public.auction_penalties
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 3) ban helpers
CREATE OR REPLACE FUNCTION public.is_auction_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((
    SELECT auction_ban_forever OR (auction_banned_until IS NOT NULL AND auction_banned_until > now())
    FROM public.users WHERE id = _user_id
  ), false);
$$;

CREATE OR REPLACE FUNCTION public.apply_auction_strike(_user_id uuid, _order_id uuid, _auction_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_strike integer;
  v_level text;
  v_until timestamptz;
  v_forever boolean := false;
  v_title text;
  v_body text;
BEGIN
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
    v_body  := 'คุณไม่ได้ชำระเงินภายใน 15 นาที ครั้งต่อไปจะถูกห้ามประมูล 3 วัน';
  ELSIF v_strike = 2 THEN
    v_level := 'ban_3_days';
    v_until := now() + interval '3 days';
    v_title := 'ถูกห้ามประมูล 3 วัน';
    v_body  := 'คุณผิดนัดชำระเงินเป็นครั้งที่ 2 จึงถูกห้ามเข้าร่วมประมูลเป็นเวลา 3 วัน';
  ELSIF v_strike = 3 THEN
    v_level := 'ban_1_week';
    v_until := now() + interval '7 days';
    v_title := 'ถูกห้ามประมูล 1 สัปดาห์';
    v_body  := 'คุณผิดนัดชำระเงินเป็นครั้งที่ 3 จึงถูกห้ามเข้าร่วมประมูลเป็นเวลา 1 สัปดาห์';
  ELSIF v_strike = 4 THEN
    v_level := 'ban_1_month';
    v_until := now() + interval '1 month';
    v_title := 'ถูกห้ามประมูล 1 เดือน';
    v_body  := 'คุณผิดนัดชำระเงินเป็นครั้งที่ 4 จึงถูกห้ามเข้าร่วมประมูลเป็นเวลา 1 เดือน';
  ELSE
    v_level := 'ban_permanent';
    v_forever := true;
    v_title := 'ถูกห้ามประมูลถาวร';
    v_body  := 'คุณผิดนัดชำระเงินเกิน 4 ครั้ง จึงถูกห้ามเข้าร่วมประมูลอย่างถาวร กรุณาติดต่อทีมงานหากต้องการอุทธรณ์';
  END IF;

  UPDATE public.users
  SET auction_banned_until = GREATEST(COALESCE(auction_banned_until, now()), COALESCE(v_until, now())),
      auction_ban_forever = auction_ban_forever OR v_forever,
      updated_at = now()
  WHERE id = _user_id;

  IF v_until IS NULL AND NOT v_forever THEN
    UPDATE public.users SET auction_banned_until = NULL WHERE id = _user_id AND auction_strikes = 1;
  END IF;

  INSERT INTO public.auction_penalties (
    user_id, order_id, auction_id, strike_no, level, banned_until, is_permanent, reason
  ) VALUES (
    _user_id, _order_id, _auction_id, v_strike, v_level, v_until, v_forever,
    'ไม่ชำระเงินภายในเวลาที่กำหนด'
  );

  PERFORM public.notify_user(_user_id, 'auction_penalty', v_title, v_body, '/wins');
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_auction_ban(_user_id uuid, _reset_strikes boolean DEFAULT true)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้น';
  END IF;

  UPDATE public.users
  SET auction_banned_until = NULL,
      auction_ban_forever = false,
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
$$;

-- 4) 15-minute payment window for auction winners
CREATE OR REPLACE FUNCTION public.award_auction(_auction_id uuid, _user_id uuid, _amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    _user_id, v_auction.card_id, _auction_id, _amount, 'slip', 'pending', now() + interval '15 minutes'
  )
  RETURNING id INTO v_order_id;

  PERFORM public.notify_user(_user_id, 'auction_won',
    'ยินดีด้วย คุณชนะการประมูล',
    'กรุณาชำระเงินภายใน 15 นาที มิฉะนั้นสิทธิ์จะถูกยกให้ผู้เสนอราคาอันดับถัดไป และคุณจะได้รับบทลงโทษ',
    '/checkout/' || v_order_id::text);

  RETURN v_order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_auction_order(_auction_id uuid, _payment_method payment_method DEFAULT 'slip'::payment_method, _shipping_name text DEFAULT NULL::text, _shipping_phone text DEFAULT NULL::text, _shipping_address text DEFAULT NULL::text, _note text DEFAULT NULL::text)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    _shipping_name, _shipping_phone, _shipping_address, _note, 'pending', now() + interval '15 minutes'
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- 5) strikes when an auction order expires unpaid
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_o public.orders%ROWTYPE;
  v_next public.bids%ROWTYPE;
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

      SELECT b.* INTO v_next
      FROM public.bids b
      WHERE b.auction_id = v_o.auction_id
        AND b.user_id NOT IN (
          SELECT o2.user_id FROM public.orders o2 WHERE o2.auction_id = v_o.auction_id
        )
      ORDER BY b.amount DESC, b.created_at ASC
      LIMIT 1;

      IF FOUND THEN
        UPDATE public.auctions
        SET winner_id = v_next.user_id,
            current_price = v_next.amount,
            status = 'passed_to_next',
            updated_at = now()
        WHERE id = v_o.auction_id;

        PERFORM public.award_auction(v_o.auction_id, v_next.user_id, v_next.amount);
      ELSE
        UPDATE public.auctions
        SET status = 'ended', winner_id = NULL, updated_at = now()
        WHERE id = v_o.auction_id;
      END IF;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 6) banned users cannot bid
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
BEGIN
  IF public.is_auction_banned(NEW.user_id) THEN
    RAISE EXCEPTION 'บัญชีของคุณถูกห้ามเข้าร่วมการประมูลชั่วคราว';
  END IF;

  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = NEW.auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรอบประมูลนี้';
  END IF;

  IF v_auction.status <> 'active' THEN
    RAISE EXCEPTION 'รอบประมูลนี้ปิดรับการเคาะราคาแล้ว';
  END IF;

  IF v_auction.end_time <= now() THEN
    RAISE EXCEPTION 'หมดเวลาประมูลแล้ว';
  END IF;

  IF NEW.amount < GREATEST(
    v_auction.starting_price,
    v_auction.current_price + CASE WHEN v_auction.bid_count = 0 THEN 0 ELSE v_auction.bid_increment END
  ) THEN
    RAISE EXCEPTION 'ยอดบิดต้องไม่ต่ำกว่าราคาปัจจุบันบวกขั้นต่ำการเคาะ';
  END IF;

  UPDATE public.auctions
  SET current_price = NEW.amount,
      bid_count     = v_auction.bid_count + 1,
      winner_id     = NEW.user_id,
      updated_at    = now()
  WHERE id = v_auction.id;

  RETURN NEW;
END;
$$;