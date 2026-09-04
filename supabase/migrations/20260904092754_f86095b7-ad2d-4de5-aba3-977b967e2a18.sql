CREATE OR REPLACE FUNCTION public.notify_outbid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_prev_user uuid;
  v_card_name text;
BEGIN
  SELECT b.user_id INTO v_prev_user
  FROM public.bids b
  WHERE b.auction_id = NEW.auction_id
    AND b.id <> NEW.id
    AND b.user_id <> NEW.user_id
  ORDER BY b.amount DESC, b.created_at ASC
  LIMIT 1;

  IF v_prev_user IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only notify when the previous top bidder was actually beaten.
  IF NOT EXISTS (
    SELECT 1 FROM public.bids b
    WHERE b.auction_id = NEW.auction_id
      AND b.user_id = v_prev_user
      AND b.amount >= NEW.amount
  ) THEN
    SELECT c.name INTO v_card_name
    FROM public.auctions a
    JOIN public.cards c ON c.id = a.card_id
    WHERE a.id = NEW.auction_id;

    PERFORM public.notify_user(
      v_prev_user,
      'auction_outbid',
      'มีคนเสนอราคาสูงกว่าคุณ',
      COALESCE(v_card_name, 'รายการประมูล') || ' ราคาปัจจุบัน ' || to_char(NEW.amount, 'FM999,999,999') || ' บาท',
      '/auctions?id=' || NEW.auction_id::text
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_bids_notify_outbid ON public.bids;
CREATE TRIGGER trg_bids_notify_outbid
AFTER INSERT ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.notify_outbid();