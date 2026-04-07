-- Drop overly permissive policies
DROP POLICY "Service role can insert verification records" ON public.verification_records;
DROP POLICY "Service role can update verification records" ON public.verification_records;
DROP POLICY "Service role can insert api_keys" ON public.api_keys;
DROP POLICY "Service role can update api_keys" ON public.api_keys;

-- Recreate with service_role restriction (anon users cannot write)
CREATE POLICY "Only service role can insert verification records"
  ON public.verification_records FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update verification records"
  ON public.verification_records FOR UPDATE
  TO service_role
  USING (true);

CREATE POLICY "Only service role can insert api_keys"
  ON public.api_keys FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "Only service role can update api_keys"
  ON public.api_keys FOR UPDATE
  TO service_role
  USING (true);
