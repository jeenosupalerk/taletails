REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_bid() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_card_status_from_order() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_banned(UUID) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.purchase_fixed_price_card(UUID, public.payment_method, TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pass_auction_to_next_bidder(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.purchase_fixed_price_card(UUID, public.payment_method, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pass_auction_to_next_bidder(UUID) TO authenticated;