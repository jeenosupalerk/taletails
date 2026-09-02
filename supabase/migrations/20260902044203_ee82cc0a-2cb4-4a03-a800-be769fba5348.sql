-- =========================================================
-- TaleTails :: Core schema (production-ready)
-- =========================================================

-- ---------- ENUM TYPES ----------
CREATE TYPE public.app_role       AS ENUM ('customer', 'admin');
CREATE TYPE public.sale_type      AS ENUM ('auction', 'fixed_price');
CREATE TYPE public.card_status    AS ENUM ('available', 'locked', 'sold');
CREATE TYPE public.auction_status AS ENUM ('active', 'ended', 'waiting_payment', 'passed_to_next');
CREATE TYPE public.payment_method AS ENUM ('slip', 'qr_promptpay');
CREATE TYPE public.order_status   AS ENUM ('pending', 'paid', 'shipped', 'cancelled');

-- ---------- SHARED TRIGGER FUNCTION ----------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================================================
-- 1) users  (profile linked to auth.users)
-- =========================================================
CREATE TABLE public.users (
  id         UUID PRIMARY KEY,
  email      TEXT NOT NULL,
  username   TEXT UNIQUE,
  avatar_url TEXT,
  phone      TEXT,
  is_banned  BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
GRANT ALL ON public.users TO service_role;

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================================================
-- 2) user_roles  (roles MUST live in a separate table)
-- =========================================================
CREATE TABLE public.user_roles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role       public.app_role NOT NULL DEFAULT 'customer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_banned(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_banned FROM public.users WHERE id = _user_id), true);
$$;

-- users policies
CREATE POLICY "Profiles are viewable by everyone"
ON public.users FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own profile"
ON public.users FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.users FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(COALESCE(NEW.email, 'user'), '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'customer')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 3) cards
-- =========================================================
CREATE TABLE public.cards (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  details           TEXT,
  images            TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
  set_name          TEXT,
  card_no           TEXT,
  language          TEXT,
  rarity            TEXT,
  year              INTEGER,
  condition         TEXT,
  grade             TEXT,
  grading_company   TEXT,
  certification_no  TEXT,
  sale_type         public.sale_type   NOT NULL DEFAULT 'fixed_price',
  price             NUMERIC(12,2)      NOT NULL DEFAULT 0 CHECK (price >= 0),
  status            public.card_status NOT NULL DEFAULT 'available',
  locked_by         UUID REFERENCES public.users(id) ON DELETE SET NULL,
  locked_at         TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_status    ON public.cards (status);
CREATE INDEX idx_cards_sale_type ON public.cards (sale_type);
CREATE INDEX idx_cards_seller    ON public.cards (seller_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT SELECT ON public.cards TO anon;
GRANT ALL ON public.cards TO service_role;

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_cards_updated_at
BEFORE UPDATE ON public.cards
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Cards are viewable by everyone"
ON public.cards FOR SELECT
USING (true);

CREATE POLICY "Sellers can create their own cards"
ON public.cards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = seller_id AND NOT public.is_banned(auth.uid()));

CREATE POLICY "Sellers can update their own cards"
ON public.cards FOR UPDATE TO authenticated
USING (auth.uid() = seller_id)
WITH CHECK (auth.uid() = seller_id);

CREATE POLICY "Sellers can delete their own cards"
ON public.cards FOR DELETE TO authenticated
USING (auth.uid() = seller_id AND status = 'available');

CREATE POLICY "Admins can manage all cards"
ON public.cards FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 4) auctions
-- =========================================================
CREATE TABLE public.auctions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id        UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
  starting_price NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (starting_price >= 0),
  current_price  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_price >= 0),
  bid_increment  NUMERIC(12,2) NOT NULL DEFAULT 50 CHECK (bid_increment > 0),
  bid_count      INTEGER NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
  start_time     TIMESTAMPTZ NOT NULL DEFAULT now(),
  end_time       TIMESTAMPTZ NOT NULL,
  winner_id      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  status         public.auction_status NOT NULL DEFAULT 'active',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_auctions_status   ON public.auctions (status);
CREATE INDEX idx_auctions_end_time ON public.auctions (end_time);
CREATE INDEX idx_auctions_card     ON public.auctions (card_id);

GRANT SELECT, INSERT, UPDATE ON public.auctions TO authenticated;
GRANT SELECT ON public.auctions TO anon;
GRANT ALL ON public.auctions TO service_role;

ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_auctions_updated_at
BEFORE UPDATE ON public.auctions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Auctions are viewable by everyone"
ON public.auctions FOR SELECT
USING (true);

CREATE POLICY "Card owners can create auctions"
ON public.auctions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.seller_id = auth.uid())
  AND NOT public.is_banned(auth.uid())
);

CREATE POLICY "Card owners can update their auctions"
ON public.auctions FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.seller_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.seller_id = auth.uid()));

CREATE POLICY "Admins can manage all auctions"
ON public.auctions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 5) bids
-- =========================================================
CREATE TABLE public.bids (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount     NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_bids_auction_amount ON public.bids (auction_id, amount DESC, created_at ASC);
CREATE INDEX idx_bids_user           ON public.bids (user_id);

GRANT SELECT, INSERT ON public.bids TO authenticated;
GRANT SELECT ON public.bids TO anon;
GRANT ALL ON public.bids TO service_role;

ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bids are viewable by everyone"
ON public.bids FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can place their own bids"
ON public.bids FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

CREATE POLICY "Admins can manage all bids"
ON public.bids FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- validate + apply each bid atomically (row lock on the auction)
CREATE OR REPLACE FUNCTION public.handle_new_bid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
BEGIN
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

  IF NEW.amount < GREATEST(v_auction.starting_price, v_auction.current_price + CASE WHEN v_auction.bid_count = 0 THEN 0 ELSE v_auction.bid_increment END) THEN
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

CREATE TRIGGER trg_bids_apply
BEFORE INSERT ON public.bids
FOR EACH ROW EXECUTE FUNCTION public.handle_new_bid();

-- =========================================================
-- 6) orders
-- =========================================================
CREATE TABLE public.orders (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_id         UUID NOT NULL REFERENCES public.cards(id) ON DELETE RESTRICT,
  auction_id      UUID REFERENCES public.auctions(id) ON DELETE SET NULL,
  total_amount    NUMERIC(12,2) NOT NULL CHECK (total_amount >= 0),
  payment_method  public.payment_method NOT NULL DEFAULT 'slip',
  slip_url        TEXT,
  tracking_number TEXT,
  shipping_name   TEXT,
  shipping_phone  TEXT,
  shipping_address TEXT,
  note            TEXT,
  status          public.order_status NOT NULL DEFAULT 'pending',
  paid_at         TIMESTAMPTZ,
  shipped_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_orders_active_card
  ON public.orders (card_id)
  WHERE status <> 'cancelled';

CREATE INDEX idx_orders_user   ON public.orders (user_id);
CREATE INDEX idx_orders_status ON public.orders (status);

GRANT SELECT, INSERT, UPDATE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Buyers can view their own orders"
ON public.orders FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Sellers can view orders of their cards"
ON public.orders FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.cards c WHERE c.id = card_id AND c.seller_id = auth.uid()));

CREATE POLICY "Buyers can create their own orders"
ON public.orders FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id AND NOT public.is_banned(auth.uid()));

CREATE POLICY "Buyers can update their own pending orders"
ON public.orders FOR UPDATE TO authenticated
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can manage all orders"
ON public.orders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 7) CONCURRENCY CONTROL :: fixed-price buy now
-- =========================================================
CREATE OR REPLACE FUNCTION public.purchase_fixed_price_card(
  _card_id          UUID,
  _payment_method   public.payment_method DEFAULT 'slip',
  _shipping_name    TEXT DEFAULT NULL,
  _shipping_phone   TEXT DEFAULT NULL,
  _shipping_address TEXT DEFAULT NULL,
  _note             TEXT DEFAULT NULL
)
RETURNS public.orders
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- row-level lock: only one transaction can hold this card at a time
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
    shipping_name, shipping_phone, shipping_address, note, status
  )
  VALUES (
    v_uid, v_card.id, NULL, v_card.price, _payment_method,
    _shipping_name, _shipping_phone, _shipping_address, _note, 'pending'
  )
  RETURNING * INTO v_order;

  RETURN v_order;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purchase_fixed_price_card(UUID, public.payment_method, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- keep card status in sync with the order lifecycle
CREATE OR REPLACE FUNCTION public.sync_card_status_from_order()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'cancelled' THEN
    UPDATE public.cards
    SET status = 'available', locked_by = NULL, locked_at = NULL, updated_at = now()
    WHERE id = NEW.card_id AND status <> 'sold';
  ELSIF NEW.status IN ('paid', 'shipped') THEN
    UPDATE public.cards
    SET status = 'sold', updated_at = now()
    WHERE id = NEW.card_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_orders_sync_card
AFTER UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.sync_card_status_from_order();

-- =========================================================
-- 8) AUCTION SETTLEMENT :: pass to the runner-up
-- =========================================================
CREATE OR REPLACE FUNCTION public.pass_auction_to_next_bidder(_auction_id UUID)
RETURNS public.auctions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_auction public.auctions%ROWTYPE;
  v_next    public.bids%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'เฉพาะผู้ดูแลระบบเท่านั้น';
  END IF;

  SELECT * INTO v_auction FROM public.auctions WHERE id = _auction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบรอบประมูลนี้';
  END IF;

  SELECT * INTO v_next
  FROM public.bids
  WHERE auction_id = _auction_id
    AND (v_auction.winner_id IS NULL OR user_id <> v_auction.winner_id)
  ORDER BY amount DESC, created_at ASC
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.auctions
    SET status = 'ended', winner_id = NULL, updated_at = now()
    WHERE id = _auction_id
    RETURNING * INTO v_auction;
    RETURN v_auction;
  END IF;

  UPDATE public.auctions
  SET winner_id     = v_next.user_id,
      current_price = v_next.amount,
      status        = 'passed_to_next',
      updated_at    = now()
  WHERE id = _auction_id
  RETURNING * INTO v_auction;

  RETURN v_auction;
END;
$$;

GRANT EXECUTE ON FUNCTION public.pass_auction_to_next_bidder(UUID) TO authenticated;

-- =========================================================
-- 9) REALTIME
-- =========================================================
ALTER TABLE public.auctions REPLICA IDENTITY FULL;
ALTER TABLE public.bids     REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.auctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bids;