-- Fix 1: Require authentication for profile access
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Fix 4: Make chat attachments bucket private
DROP POLICY IF EXISTS "Public read access for chat attachments" ON storage.objects;

CREATE POLICY "Users can read own match attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'chat-attachments' AND
  (
    -- File uploaded by the user
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- File is from a match conversation
    EXISTS (
      SELECT 1 FROM public.matches
      WHERE (user1_id = auth.uid() OR user2_id = auth.uid())
        AND (
          (storage.foldername(name))[1] = user1_id::text OR
          (storage.foldername(name))[1] = user2_id::text
        )
    )
  )
);

CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);