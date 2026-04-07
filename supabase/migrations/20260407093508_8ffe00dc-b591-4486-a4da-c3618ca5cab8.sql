-- Create verification_records table
CREATE TABLE public.verification_records (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_verified' CHECK (status IN ('not_verified', 'pending', 'verified', 'failed')),
  tx_signature TEXT,
  hash TEXT,
  nonce TEXT,
  challenge_proof TEXT,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(wallet_address)
);

-- Create api_keys table
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_address TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  label TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.verification_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Verification records: anyone can read (public API)
CREATE POLICY "Anyone can read verification records"
  ON public.verification_records FOR SELECT USING (true);

CREATE POLICY "Service role can insert verification records"
  ON public.verification_records FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update verification records"
  ON public.verification_records FOR UPDATE USING (true);

-- API keys: public read, insert, update for edge function management
CREATE POLICY "Anyone can read api_keys"
  ON public.api_keys FOR SELECT USING (true);

CREATE POLICY "Service role can insert api_keys"
  ON public.api_keys FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update api_keys"
  ON public.api_keys FOR UPDATE USING (true);

-- Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_verification_records_updated_at
  BEFORE UPDATE ON public.verification_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Indexes
CREATE INDEX idx_verification_wallet ON public.verification_records(wallet_address);
CREATE INDEX idx_api_keys_wallet ON public.api_keys(wallet_address);
CREATE INDEX idx_api_keys_key ON public.api_keys(api_key);
