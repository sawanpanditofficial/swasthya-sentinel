CREATE POLICY "own medical documents readable" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'medical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own medical documents insertable" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own medical documents deletable" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medical-documents' AND (storage.foldername(name))[1] = auth.uid()::text);