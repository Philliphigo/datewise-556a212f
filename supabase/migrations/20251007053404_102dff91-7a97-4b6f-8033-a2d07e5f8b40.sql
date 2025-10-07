-- Create notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.notifications
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
ON public.notifications
FOR UPDATE
USING (auth.uid() = user_id);

-- System can insert notifications
CREATE POLICY "System can insert notifications"
ON public.notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Enable realtime for matches (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
  END IF;
END $$;

-- Enable realtime for likes (if not already enabled)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'likes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
  END IF;
END $$;

-- Function to create notification on new match
CREATE OR REPLACE FUNCTION notify_on_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Notify user1
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user1_id,
    'match',
    'New Match!',
    'You have a new match!',
    jsonb_build_object('match_id', NEW.id, 'user_id', NEW.user2_id)
  );
  
  -- Notify user2
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user2_id,
    'match',
    'New Match!',
    'You have a new match!',
    jsonb_build_object('match_id', NEW.id, 'user_id', NEW.user1_id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for match notifications
CREATE TRIGGER on_match_created
AFTER INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION notify_on_match();

-- Function to create notification on new message
CREATE OR REPLACE FUNCTION notify_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
BEGIN
  -- Find the recipient (the other user in the match)
  SELECT CASE
    WHEN m.user1_id = NEW.sender_id THEN m.user2_id
    ELSE m.user1_id
  END INTO recipient_id
  FROM public.matches m
  WHERE m.id = NEW.match_id;
  
  -- Create notification for recipient
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    recipient_id,
    'message',
    'New Message',
    LEFT(NEW.content, 50),
    jsonb_build_object('match_id', NEW.match_id, 'sender_id', NEW.sender_id, 'message_id', NEW.id)
  );
  
  RETURN NEW;
END;
$$;

-- Create trigger for message notifications
CREATE TRIGGER on_message_created
AFTER INSERT ON public.messages
FOR EACH ROW
EXECUTE FUNCTION notify_on_message();

-- Function to create notification on new like
CREATE OR REPLACE FUNCTION notify_on_like()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only notify if they haven't matched yet
  IF NOT EXISTS (
    SELECT 1 FROM public.matches
    WHERE (user1_id = NEW.liker_id AND user2_id = NEW.liked_id)
       OR (user1_id = NEW.liked_id AND user2_id = NEW.liker_id)
  ) THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.liked_id,
      'like',
      'Someone Liked You!',
      'You have a new like!',
      jsonb_build_object('liker_id', NEW.liker_id)
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for like notifications
CREATE TRIGGER on_like_created
AFTER INSERT ON public.likes
FOR EACH ROW
EXECUTE FUNCTION notify_on_like();