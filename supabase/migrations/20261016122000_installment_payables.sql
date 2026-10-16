-- Optional metadata only; existing bills retain their amounts, dates and status.
ALTER TABLE public.bills ADD COLUMN installment_group_id uuid;
ALTER TABLE public.bills ADD COLUMN installment_number integer;
ALTER TABLE public.bills ADD COLUMN installment_count integer;
ALTER TABLE public.bills ADD COLUMN purchase_id uuid REFERENCES public.purchases(id) ON DELETE SET NULL;
CREATE INDEX bills_purchase_id_idx ON public.bills(purchase_id) WHERE purchase_id IS NOT NULL;

CREATE FUNCTION public.insert_bill_installments(
  p_description text, p_total numeric, p_count integer, p_first_due date, p_purchase_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  cents bigint; base bigint; remainder integer; i integer; group_id uuid := gen_random_uuid();
  bill public.bills; result jsonb := '[]';
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  IF p_description IS NULL OR length(trim(p_description))=0 THEN RAISE EXCEPTION 'Informe a descrição'; END IF;
  IF p_total IS NULL OR p_total<=0 OR p_total::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Valor inválido'; END IF;
  IF p_count IS NULL OR p_count<1 OR p_count>120 THEN RAISE EXCEPTION 'Informe de 1 a 120 parcelas'; END IF;
  IF p_first_due IS NULL OR NOT isfinite(p_first_due) THEN RAISE EXCEPTION 'Vencimento inválido'; END IF;
  cents := round(p_total*100)::bigint;
  IF cents<p_count THEN RAISE EXCEPTION 'As parcelas precisam ter pelo menos R$ 0,01'; END IF;
  base:=cents/p_count; remainder:=(cents%p_count)::integer;
  FOR i IN 1..p_count LOOP
    INSERT INTO public.bills(description,amount,due_date,installment_group_id,installment_number,installment_count,purchase_id)
      VALUES(trim(p_description)||CASE WHEN p_count>1 THEN ' · Parcela '||i||'/'||p_count ELSE '' END,
        (base+CASE WHEN i<=remainder THEN 1 ELSE 0 END)::numeric/100,
        (p_first_due + make_interval(months => i-1))::date,group_id,i,p_count,p_purchase_id)
      RETURNING * INTO bill;
    result:=result||to_jsonb(bill);
  END LOOP;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.insert_bill_installments(text,numeric,integer,date,uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.create_bill_plan(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(714302916);
  RETURN public.insert_bill_installments(p_payload->>'description',(p_payload->>'total')::numeric,
    (p_payload->>'installment_count')::integer,(p_payload->>'first_due_date')::date);
END;
$$;
REVOKE ALL ON FUNCTION public.create_bill_plan(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_bill_plan(jsonb) TO authenticated;

CREATE FUNCTION public.create_credit_purchase(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  pid uuid := (p_payload->>'product_id')::uuid; qty integer;
  price numeric := round((p_payload->>'unit_cost')::numeric,2); name text;
  purchase public.purchases; batch public.purchase_batches; stock integer; installments jsonb;
  first_due date := (p_payload->>'first_due_date')::date;
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(714302916);
  IF (p_payload->>'payment_method') IS DISTINCT FROM 'credito' THEN RAISE EXCEPTION 'Esta operação exige cartão de crédito'; END IF;
  IF (p_payload->>'quantity')::numeric <> trunc((p_payload->>'quantity')::numeric) THEN RAISE EXCEPTION 'Quantidade deve ser inteira'; END IF;
  qty:=(p_payload->>'quantity')::integer;
  IF qty IS NULL OR qty<=0 OR price IS NULL OR price<=0 OR price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade ou custo inválido'; END IF;
  IF first_due IS NULL OR NOT isfinite(first_due) OR first_due <= (now() AT TIME ZONE 'America/Manaus')::date
    THEN RAISE EXCEPTION 'O primeiro vencimento deve ser uma data futura'; END IF;
  SELECT p.name INTO STRICT name FROM public.products p WHERE p.id=pid FOR UPDATE;
  INSERT INTO public.purchases(product_id,quantity,unit_cost,total_amount,payment_method,supplier)
    VALUES(pid,qty,price,qty*price,'credito',nullif(trim(p_payload->>'supplier'),'')) RETURNING * INTO purchase;
  INSERT INTO public.purchase_batches(product_id,initial_quantity,remaining_quantity,purchase_price,purchase_id,supplier)
    VALUES(pid,qty,qty,price,purchase.id,purchase.supplier) RETURNING * INTO batch;
  SELECT stock_quantity INTO stock FROM public.products WHERE id=pid;
  INSERT INTO public.inventory_movements(product_id,batch_id,movement_type,quantity,unit_price,origin,reference_id,resulting_stock)
    VALUES(pid,batch.id,'entrada',qty,price,'compra',purchase.id,stock);
  installments:=public.insert_bill_installments('Compra de '||name||CASE WHEN purchase.supplier IS NOT NULL THEN ' · '||purchase.supplier ELSE '' END,
    purchase.total_amount,(p_payload->>'installment_count')::integer,first_due,purchase.id);
  -- No cash_flow insert here. pay_bill records each installment only when paid.
  RETURN to_jsonb(purchase)||jsonb_build_object('installments',installments);
END;
$$;
REVOKE ALL ON FUNCTION public.create_credit_purchase(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_credit_purchase(jsonb) TO authenticated;
