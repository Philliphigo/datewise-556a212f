-- Fix security warning: Set search_path for validate_content_length function
DROP FUNCTION IF EXISTS validate_content_length() CASCADE;

CREATE OR REPLACE FUNCTION validate_content_length()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Recreate triggers
CREATE TRIGGER validate_posts_content
  BEFORE INSERT OR UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION validate_content_length();

CREATE TRIGGER validate_comments_content
  BEFORE INSERT OR UPDATE ON post_comments
  FOR EACH ROW
  EXECUTE FUNCTION validate_content_length();

CREATE TRIGGER validate_messages_content
  BEFORE INSERT OR UPDATE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION validate_content_length();