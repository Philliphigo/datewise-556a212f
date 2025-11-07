-- CRITICAL SECURITY FIX: Make verification-docs bucket private (if not already)
UPDATE storage.buckets 
SET public = false 
WHERE id = 'verification-docs';