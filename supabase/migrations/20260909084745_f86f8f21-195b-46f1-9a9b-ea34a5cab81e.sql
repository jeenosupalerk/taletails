ALTER TABLE public.users ADD COLUMN IF NOT EXISTS tt_points integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_redeemed integer NOT NULL DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_discount numeric NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.point_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  kind text NOT NULL,
  points integer NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.point_transactions TO authenticated;
GRANT ALL ON public.point_transactions TO service_role;

ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own point transactions"
ON public.point_transactions FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS point_transactions_user_created_idx
ON public.point_transactions (user_id, created_at DESC);

CREATE TRIGGER trg_point_transactions_updated_at
BEFORE UPDATE ON public.point_transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- keep the running balance in sync
CREATE OR REPLACE FUNCTION public.sync_points_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET tt_points = GREATEST(0, tt_points + NEW.points), updated_at = now()
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_point_transactions_sync
AFTER INSERT ON public.point_transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_points_balance();

-- earn on payment, refund on cancellation
CREATE OR REPLACE FUNCTION public.handle_order_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paid numeric;
  v_earn integer;
  v_card text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_card FROM public.cards WHERE id = NEW.card_id;

  IF NEW.status IN ('paid', 'shipped', 'completed')
     AND OLD.status NOT IN ('paid', 'shipped', 'completed') THEN
    v_paid := GREATEST(0, COALESCE(NEW.total_amount, 0) - COALESCE(NEW.points_discount, 0));
    v_earn := floor(v_paid / 25)::integer;
    IF v_earn > 0 AND NOT EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE order_id = NEW.id AND kind = 'earn'
    ) THEN
      INSERT INTO public.point_transactions (user_id, order_id, kind, points, amount, description)
      VALUES (NEW.user_id, NEW.id, 'earn', v_earn, v_paid,
        'รับแต้มจากคำสั่งซื้อ ' || COALESCE(v_card, upper(left(NEW.id::text, 8))));

      PERFORM public.notify_user(NEW.user_id, 'order',
        'ได้รับ ' || v_earn || ' TT Points',
        'จากยอดชำระ ' || to_char(v_paid, 'FM999,999,999') || ' บาท',
        '/points');
    END IF;
  END IF;

  IF NEW.status = 'cancelled' AND COALESCE(NEW.points_redeemed, 0) > 0 THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.point_transactions
      WHERE order_id = NEW.id AND kind = 'refund'
    ) THEN
      INSERT INTO public.point_transactions (user_id, order_id, kind, points, amount, description)
      VALUES (NEW.user_id, NEW.id, 'refund', NEW.points_redeemed, NEW.points_discount,
        'คืนแต้มจากคำสั่งซื้อที่ยกเลิก ' || COALESCE(v_card, upper(left(NEW.id::text, 8))));
    END IF;
    NEW.points_redeemed := 0;
    NEW.points_discount := 0;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_points
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.handle_order_points();

-- redeem points as a discount on a pending order (pass 0 to clear)
CREATE OR REPLACE FUNCTION public.redeem_order_points(_order_id uuid, _points integer)
RETURNS orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_balance integer;
  v_max integer;
  v_points integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อนใช้แต้ม';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบคำสั่งซื้อนี้';
  END IF;
  IF v_order.user_id <> v_uid THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ใช้แต้มกับคำสั่งซื้อนี้';
  END IF;
  IF v_order.status <> 'pending' THEN
    RAISE EXCEPTION 'ใช้แต้มได้เฉพาะคำสั่งซื้อที่ยังรอชำระเงิน';
  END IF;

  -- return any previously reserved points first
  IF COALESCE(v_order.points_redeemed, 0) > 0 THEN
    INSERT INTO public.point_transactions (user_id, order_id, kind, points, amount, description)
    VALUES (v_uid, _order_id, 'refund', v_order.points_redeemed, v_order.points_discount,
      'ยกเลิกการใช้แต้มกับคำสั่งซื้อ ' || upper(left(_order_id::text, 8)));
  END IF;

  SELECT tt_points INTO v_balance FROM public.users WHERE id = v_uid;
  v_balance := COALESCE(v_balance, 0);

  v_points := GREATEST(0, COALESCE(_points, 0));
  v_max := floor(COALESCE(v_order.total_amount, 0) / 0.5)::integer;
  v_points := LEAST(v_points, v_balance, v_max);

  IF v_points > 0 THEN
    INSERT INTO public.point_transactions (user_id, order_id, kind, points, amount, description)
    VALUES (v_uid, _order_id, 'redeem', -v_points, v_points * 0.5,
      'ใช้แต้มเป็นส่วนลดคำสั่งซื้อ ' || upper(left(_order_id::text, 8)));
  END IF;

  UPDATE public.orders
  SET points_redeemed = v_points,
      points_discount = v_points * 0.5,
      updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;