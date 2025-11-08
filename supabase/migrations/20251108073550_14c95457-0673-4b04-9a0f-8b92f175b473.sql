-- Add email_notifications preference to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT true;

-- Create system_messages table for admin broadcast and Team DateWise messages
CREATE TABLE IF NOT EXISTS system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT false,
  is_broadcast BOOLEAN DEFAULT false
);

-- Enable RLS on system_messages
ALTER TABLE system_messages ENABLE ROW LEVEL SECURITY;

-- Users can view their own system messages or broadcast messages
CREATE POLICY "Users can view system messages"
ON system_messages FOR SELECT
USING (auth.uid() = recipient_id OR (recipient_id IS NULL AND is_broadcast = true));

-- Users can update their own system messages (mark as read)
CREATE POLICY "Users can update own system messages"
ON system_messages FOR UPDATE
USING (auth.uid() = recipient_id);

-- Admins can insert system messages
CREATE POLICY "Admins can insert system messages"
ON system_messages FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert welcome message for all existing users
INSERT INTO system_messages (recipient_id, content, is_broadcast)
SELECT 
  id,
  'Welcome to DateWise! Come back here for tips to make sure you have the best possible experience. And when in doubt? Swipe Right®.',
  false
FROM auth.users
WHERE id NOT IN (SELECT recipient_id FROM system_messages WHERE recipient_id IS NOT NULL)
ON CONFLICT DO NOTHING;