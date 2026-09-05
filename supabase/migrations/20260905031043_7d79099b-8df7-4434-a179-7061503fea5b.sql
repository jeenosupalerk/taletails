GRANT SELECT ON public.cards TO anon;
GRANT SELECT ON public.auctions TO anon;
GRANT SELECT ON public.bids TO anon;

CREATE POLICY "Available and sold cards are viewable by everyone"
ON public.cards FOR SELECT TO anon
USING (status IN ('available', 'sold'));

CREATE POLICY "Active auctions are viewable by everyone"
ON public.auctions FOR SELECT TO anon
USING (status = 'active');

CREATE POLICY "Bids are viewable by everyone"
ON public.bids FOR SELECT TO anon
USING (true);