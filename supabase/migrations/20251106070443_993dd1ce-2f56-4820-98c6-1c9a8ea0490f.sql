-- Fix Payment System RLS Policies
DROP POLICY IF EXISTS "System can create subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "System can update subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "System can delete subscriptions" ON subscriptions;

CREATE POLICY "Service role can manage subscriptions"
ON subscriptions FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

DROP POLICY IF EXISTS "System can create payments" ON payments;
DROP POLICY IF EXISTS "System can update payments" ON payments;

CREATE POLICY "Service role can manage payments"
ON payments FOR ALL
USING (auth.jwt()->>'role' = 'service_role')
WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Fix Storage Privacy for chat-attachments
UPDATE storage.buckets SET public = false WHERE id = 'chat-attachments';

-- Add RLS policies for chat-attachments storage
CREATE POLICY "Users can view their own chat attachments"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'chat-attachments' 
  AND EXISTS (
    SELECT 1 FROM matches m, messages msg
    WHERE msg.id::text = (storage.foldername(name))[1]
    AND msg.match_id = m.id
    AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can upload chat attachments to their matches"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own chat attachments"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'chat-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add photo_urls array to profiles for photo gallery
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS photo_urls text[] DEFAULT ARRAY[]::text[];

-- Add category column to posts for filtering
ALTER TABLE posts ADD COLUMN IF NOT EXISTS category text;

-- Add content length constraints via trigger
CREATE OR REPLACE FUNCTION validate_content_length()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'posts' THEN
    IF length(NEW.content) > 5000 THEN
      RAISE EXCEPTION 'Post content exceeds maximum length of 5000 characters';
    END IF;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    IF length(NEW.content) > 2000 THEN
      RAISE EXCEPTION 'Comment content exceeds maximum length of 2000 characters';
    END IF;
  ELSIF TG_TABLE_NAME = 'messages' THEN
    IF length(NEW.content) > 10000 THEN
      RAISE EXCEPTION 'Message content exceeds maximum length of 10000 characters';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS validate_posts_content ON posts;
CREATE TRIGGER validate_posts_content
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_content_length();

DROP TRIGGER IF EXISTS validate_comments_content ON post_comments;
CREATE TRIGGER validate_comments_content
  BEFORE INSERT OR UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_content_length();

DROP TRIGGER IF EXISTS validate_messages_content ON messages;
CREATE TRIGGER validate_messages_content
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_content_length();