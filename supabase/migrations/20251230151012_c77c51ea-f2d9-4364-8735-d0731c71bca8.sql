-- Add reaction_type column to post_likes table to track different reaction types
ALTER TABLE public.post_likes 
ADD COLUMN reaction_type text NOT NULL DEFAULT 'like';

-- Add index for faster queries on reaction type
CREATE INDEX idx_post_likes_reaction_type ON public.post_likes(post_id, reaction_type);