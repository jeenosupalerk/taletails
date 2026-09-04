CREATE OR REPLACE FUNCTION public.notify_outbid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_prev public.bids%ROWTYPE;
  v_card_name text;
  v_link text := '/auctions?id=' || NEW.auction_id::text;
BEGIN
  -- ผู้ที่เพิ่งเคาะราคา: การแจ้งเตือน "ถูกแซง" เดิมของรอบนี้ไม่เกี่ยวข้องอีกต่อไป
  UPDATE public.notifications
  SET read_at = now(), updated_at = now()
  WHERE user_id = NEW.user_id
    AND type = 'auction_outbid'
    AND link = v_link
    AND read_at IS NULL;

  -- ผู้ที่เป็นอันดับหนึ่งก่อนการเคาะครั้งนี้ (ไม่ว่าจะเป็นใคร)
  SELECT b.* INTO v_prev
  FROM public.bids b
  WHERE b.auction_id = NEW.auction_id
    AND b.id <> NEW.id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  -- ไม่มีใครมาก่อน หรือผู้เคาะกำลังเพิ่มราคาของตัวเอง -> ไม่ต้องแจ้ง
  IF NOT FOUND OR v_prev.user_id = NEW.user_id OR v_prev.amount >= NEW.amount THEN
    RETURN NEW;
  END IF;

  SELECT c.name INTO v_card_name
  FROM public.auctions a
  JOIN public.cards c ON c.id = a.card_id
  WHERE a.id = NEW.auction_id;

  PERFORM public.notify_user(
    v_prev.user_id,
    'auction_outbid',
    'มีคนเสนอราคาสูงกว่าคุณ',
    COALESCE(v_card_name, 'รายการประมูล') || ' ราคาปัจจุบัน ' || to_char(NEW.amount, 'FM999,999,999') || ' บาท',
    v_link
  );

  RETURN NEW;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.notify_outbid() FROM PUBLIC, anon, authenticated;