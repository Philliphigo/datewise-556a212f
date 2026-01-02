-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
USING (auth.uid() = id);

-- Users can view other profiles ONLY if not blocked (either direction)
CREATE POLICY "Users can view discoverable profiles"
ON profiles FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND id != auth.uid()
  AND NOT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE (blocker_id = id AND blocked_id = auth.uid())
       OR (blocker_id = auth.uid() AND blocked_id = id)
  )
);

-- Admins can view all profiles for moderation
CREATE POLICY "Admins can view all profiles"
ON profiles FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));