-- Admins can grant/revoke roles (needed for shop approval)
CREATE POLICY "Admins can grant roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can revoke roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, DELETE ON public.user_roles TO authenticated;

-- Only approved sellers (or admins) may list cards
DROP POLICY IF EXISTS "Sellers can create their own cards" ON public.cards;
CREATE POLICY "Approved sellers can create their own cards"
ON public.cards FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = seller_id
  AND NOT public.is_banned(auth.uid())
  AND (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
);

DROP POLICY IF EXISTS "Card owners can create auctions" ON public.auctions;
CREATE POLICY "Approved sellers can create auctions"
ON public.auctions FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.cards c WHERE c.id = auctions.card_id AND c.seller_id = auth.uid())
  AND NOT public.is_banned(auth.uid())
  AND (public.has_role(auth.uid(), 'seller') OR public.has_role(auth.uid(), 'admin'))
);