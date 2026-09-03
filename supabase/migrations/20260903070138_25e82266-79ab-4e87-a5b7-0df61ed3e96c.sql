-- 1) users: restrict reads to signed-in users
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.users;
CREATE POLICY "Profiles are viewable by signed-in users"
  ON public.users FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.users FROM anon;

-- 2) bids: restrict reads to signed-in users
DROP POLICY IF EXISTS "Bids are viewable by everyone" ON public.bids;
CREATE POLICY "Bids are viewable by signed-in users"
  ON public.bids FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.bids FROM anon;

-- 3) cards & auctions: restrict reads to signed-in users
DROP POLICY IF EXISTS "Cards are viewable by everyone" ON public.cards;
CREATE POLICY "Cards are viewable by signed-in users"
  ON public.cards FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.cards FROM anon;

DROP POLICY IF EXISTS "Auctions are viewable by everyone" ON public.auctions;
CREATE POLICY "Auctions are viewable by signed-in users"
  ON public.auctions FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.auctions FROM anon;

-- 4) internal SECURITY DEFINER functions must not be callable from the API
REVOKE ALL ON FUNCTION public.award_auction(uuid, uuid, numeric) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.close_expired_auctions() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.expire_unpaid_orders() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.pass_auction_to_next_bidder(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_user(uuid, text, text, text, text) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_bid() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_order_status() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_card_status_from_order() FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.award_auction(uuid, uuid, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO service_role;
GRANT EXECUTE ON FUNCTION public.pass_auction_to_next_bidder(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text) TO service_role;