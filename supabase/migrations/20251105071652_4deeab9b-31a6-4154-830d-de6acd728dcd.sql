-- Create verification requests table
CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  document_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  CONSTRAINT status_check CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create report feedback table
CREATE TABLE IF NOT EXISTS public.report_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES auth.users(id),
  feedback_message TEXT NOT NULL,
  action_taken TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for verification_requests
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own verification requests"
ON public.verification_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all verification requests"
ON public.verification_requests FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update verification requests"
ON public.verification_requests FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Policies for report_feedback
CREATE POLICY "Users can view feedback on their reports"
ON public.report_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.reports
    WHERE reports.id = report_feedback.report_id
    AND reports.reporter_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage all report feedback"
ON public.report_feedback FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Storage bucket for verification documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-docs', 'verification-docs', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for verification documents
CREATE POLICY "Users can upload own verification docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'verification-docs' AND
  auth.uid() IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own verification docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-docs' AND
  auth.uid() IS NOT NULL AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all verification docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'verification-docs' AND
  has_role(auth.uid(), 'admin'::app_role)
);