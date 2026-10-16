-- Phase 2: apply ONLY after the new login/PIN frontend is published.
-- Narrows the existing public access; does not change business records.
DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['products','customers','sales','sale_items','purchases',
    'cash_flow','bills','purchase_batches','inventory_movements','app_settings'] LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format('CREATE POLICY "Authorized app members" ON public.%I FOR ALL TO authenticated USING (public.is_app_member()) WITH CHECK (public.is_app_member())', t);
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.fifo_consume_batches(uuid,integer,uuid) FROM PUBLIC, anon, authenticated;
