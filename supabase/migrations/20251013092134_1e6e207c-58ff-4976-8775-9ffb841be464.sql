-- Fix critical security issues

-- 1. Require authentication for profiles
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 2. Require authentication for posts
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;
CREATE POLICY "Posts are viewable by everyone" 
ON public.posts 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 3. Require authentication for comments
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.post_comments;
CREATE POLICY "Comments are viewable by everyone" 
ON public.post_comments 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- 4. Fix notifications - only system can insert
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "System can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (false);

-- 5. Add proper match creation policy
CREATE POLICY "System can create matches" 
ON public.matches 
FOR INSERT 
WITH CHECK (false);

-- 6. Add payment policies (backend only)
CREATE POLICY "System can create payments" 
ON public.payments 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "System can update payments" 
ON public.payments 
FOR UPDATE 
USING (false);

-- 7. Add subscription policies (backend only)
CREATE POLICY "System can create subscriptions" 
ON public.subscriptions 
FOR INSERT 
WITH CHECK (false);

CREATE POLICY "System can update subscriptions" 
ON public.subscriptions 
FOR UPDATE 
USING (false);

CREATE POLICY "System can delete subscriptions" 
ON public.subscriptions 
FOR DELETE 
USING (false);

-- 8. Add delete policy for posts by author
CREATE POLICY "Users can delete own post comments" 
ON public.post_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- 9. Add update policy for posts
CREATE POLICY "Users can update own post comments" 
ON public.post_comments 
FOR UPDATE 
USING (auth.uid() = user_id);