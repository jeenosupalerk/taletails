DROP POLICY IF EXISTS "Approved sellers can create their own cards" ON public.cards;
CREATE POLICY "Members can create their own cards"
ON public.cards FOR INSERT TO authenticated
WITH CHECK (auth.uid() = seller_id AND NOT public.is_banned(auth.uid()));

DROP POLICY IF EXISTS "Approved sellers can create auctions" ON public.auctions;
CREATE POLICY "Card owners can create auctions"
ON public.auctions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.cards c WHERE c.id = auctions.card_id AND c.seller_id = auth.uid())
  AND NOT public.is_banned(auth.uid())
);