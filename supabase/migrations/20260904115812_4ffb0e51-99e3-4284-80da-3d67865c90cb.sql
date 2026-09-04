REVOKE ALL ON FUNCTION public.apply_auction_strike(uuid, uuid, uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_auction_banned(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.clear_auction_ban(uuid, boolean) FROM anon;