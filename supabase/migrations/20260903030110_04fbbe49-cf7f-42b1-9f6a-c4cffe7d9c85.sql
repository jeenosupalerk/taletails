CREATE POLICY "Admins manage card images"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'card-images' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'card-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Card images readable by signed-in users"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'card-images');