-- Enable realtime updates for profiles table (online status and last seen)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Create trigger to update last_seen when user comes online
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_online = true AND OLD.is_online = false THEN
    NEW.last_seen = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for last_seen
DROP TRIGGER IF EXISTS update_last_seen_trigger ON public.profiles;
CREATE TRIGGER update_last_seen_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_last_seen();