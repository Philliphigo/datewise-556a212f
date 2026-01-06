-- User suspensions (temporary/permanent bans)
CREATE TABLE IF NOT EXISTS public.user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  suspended_until TIMESTAMP WITH TIME ZONE NULL,
  reason TEXT NULL,
  created_by UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_suspensions_user_id ON public.user_suspensions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_suspensions_created_at ON public.user_suspensions(created_at DESC);

ALTER TABLE public.user_suspensions ENABLE ROW LEVEL SECURITY;

-- Admins can manage all suspensions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_suspensions'
      AND policyname = 'Admins can manage suspensions'
  ) THEN
    CREATE POLICY "Admins can manage suspensions"
    ON public.user_suspensions
    FOR ALL
    USING (has_role(auth.uid(), 'admin'::public.app_role))
    WITH CHECK (has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END$$;

-- Users can view their own suspension status
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_suspensions'
      AND policyname = 'Users can view own suspensions'
  ) THEN
    CREATE POLICY "Users can view own suspensions"
    ON public.user_suspensions
    FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END$$;