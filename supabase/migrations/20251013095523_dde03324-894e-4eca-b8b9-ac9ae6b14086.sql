-- Add parent_id column to post_comments for threaded replies
ALTER TABLE public.post_comments
ADD COLUMN parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE;