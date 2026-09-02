-- Realtime for auctions + bids
ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.bids REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- Winner order creation for auctions (race-safe)
CREATE OR REPLACE FUNCTION public.create_auction_order(
  _auction_id uuid,
  _payment_method payment_method DEFAULT 'slip'::payment_method,
  _shipping_name text DEFAULT NULL,
  _shipping_phone text DEFAULT NULL,
  _shipping_address text DEFAULT NULL,
  _note text DEFAULT NULL
)
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
    shipping_name, shipping_phone, shipping_address, note, status
  ) VALUES (
    v_uid, v_card.id, _auction_id, v_auction.current_price, _payment_method,
    _shipping_name, _shipping_phone, _shipping_address, _note, 'pending'
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

-- Storage policies for payment slips (private bucket, per-user folder)
CREATE POLICY "Users can upload their own payment slips"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'payment-slips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view their own payment slips"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-slips'
  AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can update their own payment slips"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'payment-slips' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'payment-slips' AND (storage.foldername(name))[1] = auth.uid()::text);
