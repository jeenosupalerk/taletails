-- 1. notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'system',
  title text NOT NULL,
  body text,
  link text,
  email_to text,
  email_sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_notifications_updated_at BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_notifications_user_created ON public.notifications (user_id, created_at DESC);
CREATE INDEX idx_notifications_pending_email ON public.notifications (created_at) WHERE email_sent_at IS NULL;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 2. orders payment deadline
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_due_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours');

-- 3. helper to push a notification
CREATE OR REPLACE FUNCTION public.notify_user(_user_id uuid, _type text, _title text, _body text, _link text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_email text;
BEGIN
  SELECT email INTO v_email FROM public.users WHERE id = _user_id;
  INSERT INTO public.notifications (user_id, type, title, body, link, email_to)
  VALUES (_user_id, _type, _title, _body, _link, v_email);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;

-- 4. order status notifications
CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid' THEN
    PERFORM public.notify_user(NEW.user_id, 'order',
      'ยืนยันการชำระเงินแล้ว',
      'คำสั่งซื้อ ' || upper(left(NEW.id::text, 8)) || ' ได้รับการยืนยันเรียบร้อย ทีมงานกำลังเตรียมจัดส่ง',
      '/order/' || NEW.id::text);
  ELSIF NEW.status = 'shipped' THEN
    PERFORM public.notify_user(NEW.user_id, 'shipping',
      'จัดส่งพัสดุแล้ว',
      COALESCE('หมายเลขพัสดุ ' || NEW.tracking_number, 'พัสดุของคุณถูกจัดส่งแล้ว'),
      '/order/' || NEW.id::text);
  ELSIF NEW.status = 'cancelled' THEN
    PERFORM public.notify_user(NEW.user_id, 'order',
      'คำสั่งซื้อถูกยกเลิก',
      'คำสั่งซื้อ ' || upper(left(NEW.id::text, 8)) || ' ถูกยกเลิกแล้ว',
      '/profile');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_orders_notify ON public.orders;
CREATE TRIGGER trg_orders_notify AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.notify_order_status();

REVOKE EXECUTE ON FUNCTION public.notify_order_status() FROM PUBLIC, anon, authenticated;

-- 5. internal: award an auction to a bidder (creates order + notification)
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
    _user_id, v_auction.card_id, _auction_id, _amount, 'slip', 'pending', now() + interval '24 hours'
  )
  RETURNING id INTO v_order_id;

  PERFORM public.notify_user(_user_id, 'auction_won',
    'ยินดีด้วย คุณชนะการประมูล',
    'กรุณาชำระเงินภายใน 24 ชั่วโมง มิฉะนั้นสิทธิ์จะถูกยกให้ผู้เสนอราคาอันดับถัดไป',
    '/checkout/' || v_order_id::text);

  RETURN v_order_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.award_auction(uuid, uuid, numeric) FROM PUBLIC, anon, authenticated;

-- 6. close auctions that reached their end time
CREATE OR REPLACE FUNCTION public.close_expired_auctions()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_a public.auctions%ROWTYPE;
  v_count integer := 0;
BEGIN
  FOR v_a IN
    SELECT * FROM public.auctions
    WHERE status = 'active' AND end_time <= now()
    ORDER BY end_time
    FOR UPDATE
  LOOP
    IF v_a.winner_id IS NULL THEN
      UPDATE public.auctions SET status = 'ended', updated_at = now() WHERE id = v_a.id;
    ELSE
      UPDATE public.auctions SET status = 'waiting_payment', updated_at = now() WHERE id = v_a.id;
      IF NOT EXISTS (
        SELECT 1 FROM public.orders
        WHERE auction_id = v_a.id AND user_id = v_a.winner_id AND status <> 'cancelled'
      ) THEN
        PERFORM public.award_auction(v_a.id, v_a.winner_id, v_a.current_price);
      END IF;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.close_expired_auctions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO authenticated;

-- 7. cancel overdue orders and pass auctions to the next bidder
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

REVOKE EXECUTE ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO authenticated;