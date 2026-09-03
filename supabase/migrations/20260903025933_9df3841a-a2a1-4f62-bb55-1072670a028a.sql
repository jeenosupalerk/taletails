REVOKE EXECUTE ON FUNCTION public.close_expired_auctions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.expire_unpaid_orders() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.close_expired_auctions() TO service_role;
GRANT EXECUTE ON FUNCTION public.expire_unpaid_orders() TO service_role;