-- Functions only: installing this file does not restore, clear or update data.
CREATE FUNCTION public.export_app_backup() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(714302916);
  -- A single statement provides one consistent snapshot, without API row limits.
  SELECT jsonb_build_object(
    'version','1.2','created_at',now(),
    'products',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.products t),'[]'),
    'customers',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.customers t),'[]'),
    'sales',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.sales t),'[]'),
    'sale_items',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.sale_items t),'[]'),
    'purchases',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.purchases t),'[]'),
    'purchase_batches',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.purchase_batches t),'[]'),
    'inventory_movements',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.inventory_movements t),'[]'),
    'bills',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.bills t),'[]'),
    'cash_flow',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.cash_flow t),'[]'),
    'sale_batch_consumptions',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.sale_batch_consumptions t),'[]'),
    'app_settings',COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM public.app_settings t),'[]')
  ) INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.export_app_backup() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.export_app_backup() TO authenticated;

CREATE FUNCTION public.restore_app_backup(p_backup jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE t text; arrays text[] := ARRAY['products','customers','purchases','bills','purchase_batches',
  'sales','sale_items','inventory_movements','cash_flow','sale_batch_consumptions','app_settings'];
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(714302916);
  IF (p_backup->>'version') IS NULL OR (p_backup->>'version') NOT IN ('1.1','1.2')
    OR (p_backup->>'created_at') IS NULL THEN RAISE EXCEPTION 'Versão de backup inválida'; END IF;
  PERFORM (p_backup->>'created_at')::timestamptz;
  FOREACH t IN ARRAY arrays LOOP
    IF p_backup->>'version'='1.1' AND t IN ('sale_batch_consumptions','app_settings') AND NOT p_backup ? t THEN CONTINUE; END IF;
    IF jsonb_typeof(p_backup->t) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Tabela ausente ou inválida: %',t; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_array_elements(p_backup->t) a WHERE jsonb_typeof(a) <> 'object') THEN
      RAISE EXCEPTION 'Registro inválido na tabela %',t;
    END IF;
  END LOOP;
  -- Refuse inconsistent stock, including legacy backups without their FIFO data.
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_backup->'products') p
    WHERE (p->>'stock_quantity')::integer IS DISTINCT FROM COALESCE((
      SELECT sum((b->>'remaining_quantity')::integer) FROM jsonb_array_elements(p_backup->'purchase_batches') b
      WHERE b->>'product_id'=p->>'id'),0)
  ) THEN RAISE EXCEPTION 'O estoque do backup não corresponde aos lotes; nenhum dado foi restaurado'; END IF;
  -- Also excludes writes from older clients during replacement.
  LOCK TABLE public.sale_batch_consumptions, public.inventory_movements, public.sale_items,
    public.sales, public.purchase_batches, public.purchases, public.cash_flow,
    public.bills, public.customers, public.products, public.app_settings IN ACCESS EXCLUSIVE MODE;
  DELETE FROM public.sale_batch_consumptions;
  DELETE FROM public.inventory_movements;
  DELETE FROM public.sale_items;
  DELETE FROM public.sales;
  DELETE FROM public.purchase_batches;
  DELETE FROM public.purchases;
  DELETE FROM public.cash_flow;
  DELETE FROM public.bills;
  DELETE FROM public.customers;
  DELETE FROM public.products;
  IF p_backup ? 'app_settings' THEN DELETE FROM public.app_settings; END IF;
  -- Parent purchases precede their batches. A failure rolls back ALL changes.
  FOREACH t IN ARRAY arrays LOOP
    IF NOT p_backup ? t THEN CONTINUE; END IF;
    EXECUTE format('INSERT INTO public.%I SELECT * FROM jsonb_populate_recordset(NULL::public.%I, $1)',t,t)
      USING p_backup->t;
  END LOOP;
  -- Preserve original product timestamps after the batch synchronization triggers.
  ALTER TABLE public.products DISABLE TRIGGER update_products_updated_at;
  UPDATE public.products p SET updated_at=(b->>'updated_at')::timestamptz
    FROM jsonb_array_elements(p_backup->'products') b WHERE p.id=(b->>'id')::uuid;
  ALTER TABLE public.products ENABLE TRIGGER update_products_updated_at;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_app_backup(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_app_backup(jsonb) TO authenticated;
