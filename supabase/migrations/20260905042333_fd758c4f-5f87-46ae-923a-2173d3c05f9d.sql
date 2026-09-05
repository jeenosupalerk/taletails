ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'completed';

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS received_at timestamp with time zone;

CREATE OR REPLACE FUNCTION public.confirm_order_received(_order_id uuid)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ต้องเข้าสู่ระบบก่อนทำรายการ';
  END IF;

  SELECT * INTO v_order FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบคำสั่งซื้อนี้';
  END IF;

  IF v_order.user_id <> v_uid AND NOT public.has_role(v_uid, 'admin') THEN
    RAISE EXCEPTION 'คุณไม่มีสิทธิ์ยืนยันคำสั่งซื้อนี้';
  END IF;

  IF v_order.status = 'completed' THEN
    RETURN v_order;
  END IF;

  IF v_order.status <> 'shipped' THEN
    RAISE EXCEPTION 'ยืนยันรับสินค้าได้เมื่อสถานะเป็นจัดส่งแล้วเท่านั้น';
  END IF;

  UPDATE public.orders
  SET status = 'completed', received_at = now(), updated_at = now()
  WHERE id = _order_id
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_complete_shipped_orders()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  WITH upd AS (
    UPDATE public.orders
    SET status = 'completed', received_at = now(), updated_at = now()
    WHERE status = 'shipped'
      AND shipped_at IS NOT NULL
      AND shipped_at <= now() - interval '7 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_order_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'paid' THEN
    PERFORM public.notify_user(NEW.user_id, 'order',
      'ยืนยันการชำระเงินแล้ว',
      'คำสั่งซื้อ ' || upper(left(NEW.id::text, 8)) || ' ได้รับการยืนยันเรียบร้อย ทีมงานกำลังเตรียมจัดส่ง',
      '/purchases/' || NEW.id::text);
  ELSIF NEW.status = 'shipped' THEN
    PERFORM public.notify_user(NEW.user_id, 'shipping',
      'จัดส่งพัสดุแล้ว',
      COALESCE('หมายเลขพัสดุ ' || NEW.tracking_number, 'พัสดุของคุณถูกจัดส่งแล้ว'),
      '/purchases/' || NEW.id::text);
  ELSIF NEW.status = 'completed' THEN
    PERFORM public.notify_user(NEW.user_id, 'order',
      'รายการสำเร็จแล้ว',
      'คำสั่งซื้อ ' || upper(left(NEW.id::text, 8)) || ' ถูกปิดเป็นสำเร็จเรียบร้อย ขอบคุณที่ใช้บริการ',
      '/purchases/' || NEW.id::text);
  ELSIF NEW.status = 'cancelled' THEN
    PERFORM public.notify_user(NEW.user_id, 'order',
      'คำสั่งซื้อถูกยกเลิก',
      'คำสั่งซื้อ ' || upper(left(NEW.id::text, 8)) || ' ถูกยกเลิกแล้ว',
      '/profile');
  END IF;

  RETURN NEW;
END;
$$;