CREATE TABLE public.card_listing_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  card_id uuid NOT NULL UNIQUE,
  seller_id uuid,
  name text NOT NULL,
  set_name text,
  grade text,
  condition text,
  image_url text,
  sale_type sale_type NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  final_price numeric,
  card_status card_status NOT NULL DEFAULT 'available',
  order_status order_status,
  sold_at timestamp with time zone,
  listed_at timestamp with time zone NOT NULL DEFAULT now(),
  deleted_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.card_listing_history TO authenticated;
GRANT ALL ON public.card_listing_history TO service_role;

ALTER TABLE public.card_listing_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sellers read own listing history"
ON public.card_listing_history FOR SELECT TO authenticated
USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX card_listing_history_seller_idx
ON public.card_listing_history (seller_id, created_at DESC);

CREATE TRIGGER card_listing_history_updated_at
BEFORE UPDATE ON public.card_listing_history
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- บันทึก/อัปเดตประวัติจากตาราง cards
CREATE OR REPLACE FUNCTION public.sync_listing_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.cards;
  v_deleted timestamptz := NULL;
BEGIN
  IF TG_OP = 'DELETE' THEN
    c := OLD;
    v_deleted := now();
  ELSE
    c := NEW;
  END IF;

  INSERT INTO public.card_listing_history AS h (
    card_id, seller_id, name, set_name, grade, condition, image_url,
    sale_type, price, card_status, listed_at, deleted_at
  ) VALUES (
    c.id, c.seller_id, c.name, c.set_name, c.grade, c.condition,
    CASE WHEN array_length(c.images, 1) > 0 THEN c.images[1] ELSE NULL END,
    c.sale_type, c.price, c.status, c.created_at, v_deleted
  )
  ON CONFLICT (card_id) DO UPDATE SET
    seller_id = EXCLUDED.seller_id,
    name = EXCLUDED.name,
    set_name = EXCLUDED.set_name,
    grade = EXCLUDED.grade,
    condition = EXCLUDED.condition,
    image_url = COALESCE(EXCLUDED.image_url, h.image_url),
    sale_type = EXCLUDED.sale_type,
    price = EXCLUDED.price,
    card_status = EXCLUDED.card_status,
    deleted_at = COALESCE(EXCLUDED.deleted_at, h.deleted_at),
    updated_at = now();

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER cards_sync_listing_history
AFTER INSERT OR UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_history();

CREATE TRIGGER cards_sync_listing_history_delete
BEFORE DELETE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_history();

-- อัปเดตสถานะคำสั่งซื้อ/ยอดขายในประวัติ
CREATE OR REPLACE FUNCTION public.sync_listing_history_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.card_listing_history
  SET order_status = NEW.status,
      final_price = CASE WHEN NEW.status IN ('paid','shipped','completed')
                         THEN NEW.total_amount ELSE final_price END,
      sold_at = CASE WHEN NEW.status IN ('paid','shipped','completed')
                     THEN COALESCE(sold_at, COALESCE(NEW.paid_at, now())) ELSE sold_at END,
      updated_at = now()
  WHERE card_id = NEW.card_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER orders_sync_listing_history
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_listing_history_order();

-- เติมประวัติจากสินค้าที่มีอยู่แล้ว
INSERT INTO public.card_listing_history (
  card_id, seller_id, name, set_name, grade, condition, image_url,
  sale_type, price, card_status, listed_at
)
SELECT c.id, c.seller_id, c.name, c.set_name, c.grade, c.condition,
       CASE WHEN array_length(c.images, 1) > 0 THEN c.images[1] ELSE NULL END,
       c.sale_type, c.price, c.status, c.created_at
FROM public.cards c
ON CONFLICT (card_id) DO NOTHING;

UPDATE public.card_listing_history h
SET order_status = o.status,
    final_price = CASE WHEN o.status IN ('paid','shipped','completed') THEN o.total_amount END,
    sold_at = CASE WHEN o.status IN ('paid','shipped','completed') THEN COALESCE(o.paid_at, o.created_at) END
FROM (
  SELECT DISTINCT ON (card_id) card_id, status, total_amount, paid_at, created_at
  FROM public.orders ORDER BY card_id, created_at DESC
) o
WHERE h.card_id = o.card_id;

-- ลบได้ถึงสถานะชำระเงินแล้ว ห้ามลบเฉพาะช่วงลูกค้ากำลังชำระเงิน
CREATE OR REPLACE FUNCTION public.admin_delete_card(_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    WHERE card_id = _card_id
      AND status = 'pending'
      AND payment_due_at > now()
  ) THEN
    RAISE EXCEPTION 'ลูกค้ากำลังดำเนินการชำระเงินอยู่ ไม่สามารถลบได้ในตอนนี้';
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
$$;