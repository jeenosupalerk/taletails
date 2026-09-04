GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cards TO authenticated;
GRANT ALL ON public.cards TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auctions TO authenticated;
GRANT ALL ON public.auctions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bids TO authenticated;
GRANT ALL ON public.bids TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.auction_penalties TO authenticated;
GRANT ALL ON public.auction_penalties TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.articles TO authenticated;
GRANT SELECT ON public.articles TO anon;
GRANT ALL ON public.articles TO service_role;

GRANT ALL ON public.email_otps TO service_role;