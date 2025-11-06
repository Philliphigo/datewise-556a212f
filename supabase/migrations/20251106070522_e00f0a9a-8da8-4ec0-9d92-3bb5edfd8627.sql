-- Fix all functions to have search_path set
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF NEW.is_online = true AND OLD.is_online = false THEN
    NEW.last_seen = now();
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_default_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data)
  VALUES (
    NEW.user1_id,
    'match',
    'New Match!',
    'You have a new match!',
    jsonb_build_object('match_id', NEW.id, 'user_id', NEW.user2_id)
  );
  
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  recipient_id UUID;
BEGIN
  SELECT CASE
    WHEN m.user1_id = NEW.sender_id THEN m.user2_id
    ELSE m.user1_id
  END INTO recipient_id
  FROM public.matches m
  WHERE m.id = NEW.match_id;
  
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
$function$;

CREATE OR REPLACE FUNCTION public.notify_on_like()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
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
$function$;

CREATE OR REPLACE FUNCTION public.update_post_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'post_comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_and_create_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.likes
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) THEN
    INSERT INTO public.matches (user1_id, user2_id)
    VALUES (
      LEAST(NEW.liker_id, NEW.liked_id),
      GREATEST(NEW.liker_id, NEW.liked_id)
    )
    ON CONFLICT (user1_id, user2_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;