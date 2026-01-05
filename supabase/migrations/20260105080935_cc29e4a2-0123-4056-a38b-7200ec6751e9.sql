-- Allow users to delete their own pending verification requests
CREATE POLICY "Users can delete own pending verification requests" 
ON public.verification_requests 
FOR DELETE 
USING (auth.uid() = user_id AND status = 'pending');