-- Fix payment method constraint to include paychangu
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_payment_method_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_payment_method_check 
  CHECK (payment_method IN ('airtel', 'tnm', 'paychangu', 'paypal', 'stripe', 'crypto'));