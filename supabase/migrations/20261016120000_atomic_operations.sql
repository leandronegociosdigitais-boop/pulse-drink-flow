-- Additive upgrade. No existing business records are updated or deleted here.
-- Existing accounts retain access; new accounts require explicit authorization.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users) THEN
    RAISE EXCEPTION 'Nenhuma conta de acesso cadastrada. Cadastre o responsável antes de ativar a autorização do aplicativo.';
  END IF;
END $$;
-- Some deployed schemas do not yet have these nullable metadata columns.
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS paid_at timestamptz;
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS supplier text;

CREATE TABLE public.app_members (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
);
INSERT INTO public.app_members(user_id) SELECT id FROM auth.users;
ALTER TABLE public.app_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read own membership" ON public.app_members FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE FUNCTION public.is_app_member() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_members WHERE user_id = auth.uid());
$$;
REVOKE ALL ON FUNCTION public.is_app_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_app_member() TO authenticated;

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

-- Exact batch allocation for new/edited sales. Legacy sales are not rewritten.
CREATE TABLE public.sale_batch_consumptions (
  sale_id uuid NOT NULL REFERENCES public.sales(id) ON DELETE CASCADE,
  batch_id uuid NOT NULL REFERENCES public.purchase_batches(id) ON DELETE RESTRICT,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (sale_id, batch_id)
);
ALTER TABLE public.sale_batch_consumptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authorized app members" ON public.sale_batch_consumptions FOR ALL TO authenticated
  USING (public.is_app_member()) WITH CHECK (public.is_app_member());

CREATE OR REPLACE FUNCTION public.fifo_consume_batches(p_product_id uuid, p_quantity integer, p_sale_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b record; n integer := p_quantity; q integer; cost numeric := 0; consumed jsonb := '[]'; stock integer;
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  PERFORM pg_advisory_xact_lock(714302916);
  IF p_quantity IS NULL OR p_quantity <= 0 THEN RAISE EXCEPTION 'Quantidade inválida'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sales WHERE id = p_sale_id) THEN RAISE EXCEPTION 'Venda inexistente'; END IF;
  PERFORM 1 FROM public.products WHERE id = p_product_id FOR UPDATE;
  PERFORM 1 FROM public.purchase_batches WHERE product_id = p_product_id ORDER BY created_at, id FOR UPDATE;
  IF COALESCE((SELECT sum(remaining_quantity) FROM public.purchase_batches WHERE product_id = p_product_id),0) < p_quantity
    THEN RAISE EXCEPTION 'Estoque insuficiente nos lotes deste produto'; END IF;
  FOR b IN SELECT * FROM public.purchase_batches WHERE product_id = p_product_id AND remaining_quantity > 0 ORDER BY created_at, id LOOP
    EXIT WHEN n = 0;
    q := LEAST(n,b.remaining_quantity);
    UPDATE public.purchase_batches SET remaining_quantity = remaining_quantity - q WHERE id = b.id;
    INSERT INTO public.sale_batch_consumptions VALUES (p_sale_id,b.id,p_product_id,q)
      ON CONFLICT (sale_id,batch_id) DO UPDATE SET quantity = sale_batch_consumptions.quantity + EXCLUDED.quantity;
    SELECT stock_quantity INTO stock FROM public.products WHERE id = p_product_id;
    INSERT INTO public.inventory_movements(product_id,batch_id,movement_type,quantity,unit_price,origin,reference_id,resulting_stock)
      VALUES(p_product_id,b.id,'venda',q,b.purchase_price,'venda',p_sale_id,stock);
    consumed := consumed || jsonb_build_object('batchId',b.id,'qty',q,'price',b.purchase_price);
    cost := cost + q * b.purchase_price;
    n := n-q;
  END LOOP;
  RETURN jsonb_build_object('totalCost',cost,'batchConsumptions',consumed);
END;
$$;
-- Only the complete sale transaction may call FIFO, never a browser directly.
REVOKE ALL ON FUNCTION public.fifo_consume_batches(uuid,integer,uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.restore_sale_batches(p_sale_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE b record; item record; n integer; q integer; stock integer;
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.sale_batch_consumptions WHERE sale_id = p_sale_id) THEN
    -- Legacy history with previous edits is ambiguous: refuse rather than guess.
    IF EXISTS (SELECT 1 FROM public.inventory_movements WHERE reference_id=p_sale_id AND movement_type='ajuste') THEN
      RAISE EXCEPTION 'Esta venda antiga tem estornos anteriores e precisa de conferência dos lotes antes de ser alterada';
    END IF;
    FOR item IN SELECT product_id,sum(quantity)::integer AS quantity FROM public.sale_items WHERE sale_id=p_sale_id GROUP BY product_id LOOP
      n := item.quantity;
      FOR b IN SELECT * FROM public.inventory_movements WHERE reference_id=p_sale_id AND product_id=item.product_id AND movement_type='venda' ORDER BY created_at DESC,id DESC LOOP
        EXIT WHEN n=0;
        q := LEAST(n,b.quantity);
        IF b.batch_id IS NULL OR q <= 0 THEN RAISE EXCEPTION 'Histórico de lotes incompleto'; END IF;
        INSERT INTO public.sale_batch_consumptions VALUES(p_sale_id,b.batch_id,item.product_id,q)
          ON CONFLICT(sale_id,batch_id) DO UPDATE SET quantity=sale_batch_consumptions.quantity+EXCLUDED.quantity;
        n:=n-q;
      END LOOP;
      IF n<>0 THEN RAISE EXCEPTION 'Histórico de lotes insuficiente para restaurar a venda'; END IF;
    END LOOP;
  END IF;
  FOR b IN SELECT a.*, pb.purchase_price, pb.remaining_quantity, pb.initial_quantity
    FROM public.sale_batch_consumptions a JOIN public.purchase_batches pb ON pb.id=a.batch_id
    WHERE a.sale_id=p_sale_id ORDER BY a.product_id,a.batch_id FOR UPDATE OF pb LOOP
    IF b.remaining_quantity+b.quantity>b.initial_quantity THEN RAISE EXCEPTION 'Estorno ultrapassaria a quantidade original do lote'; END IF;
    UPDATE public.purchase_batches SET remaining_quantity=remaining_quantity+b.quantity WHERE id=b.batch_id;
    SELECT stock_quantity INTO stock FROM public.products WHERE id=b.product_id;
    INSERT INTO public.inventory_movements(product_id,batch_id,movement_type,quantity,unit_price,origin,reference_id,resulting_stock)
      VALUES(b.product_id,b.batch_id,'ajuste',b.quantity,b.purchase_price,'ajuste',p_sale_id,stock);
  END LOOP;
  DELETE FROM public.sale_batch_consumptions WHERE sale_id=p_sale_id;
END;
$$;
REVOKE ALL ON FUNCTION public.restore_sale_batches(uuid) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.app_operation(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  action text := p_payload->>'action'; sid uuid; s public.sales; bill public.bills;
  purchase public.purchases; batch public.purchase_batches; item jsonb;
  pid uuid; qty integer; price numeric; cost numeric; gross numeric := 0; total_cost numeric := 0;
  discount numeric := round(COALESCE((p_payload->>'discount_amount')::numeric,0),2); fifo jsonb; stock integer;
  payment text := p_payload->>'payment_method'; status text := COALESCE(p_payload->>'status','pago');
BEGIN
  IF NOT public.is_app_member() THEN RAISE EXCEPTION 'Acesso não autorizado'; END IF;
  -- Serializes all gateway operations, including backup/restore, for one store.
  PERFORM pg_advisory_xact_lock(714302916);
  IF action IN ('create_sale','update_sale','create_purchase') THEN
    IF payment IS NULL OR payment NOT IN ('dinheiro','pix','credito','debito','cartao') THEN RAISE EXCEPTION 'Forma de pagamento inválida'; END IF;
  END IF;
  IF action IN ('pay_sale','update_sale','delete_sale') THEN
    SELECT * INTO STRICT s FROM public.sales WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
    sid:=s.id;
    IF s.status<>'pendente' THEN RAISE EXCEPTION 'A venda já foi paga ou não está pendente'; END IF;
  END IF;
  IF action='pay_sale' THEN
    UPDATE public.sales SET status='pago',paid_at=now() WHERE id=sid RETURNING * INTO s;
    INSERT INTO public.cash_flow(type,category,description,amount,reference_id,reference_type)
      VALUES('entrada','venda','Venda #'||left(sid::text,8)||' (pago)',s.total_amount,sid,'sale');
    RETURN to_jsonb(s);
  ELSIF action IN ('create_sale','update_sale','delete_sale') THEN
    IF action IN ('update_sale','delete_sale') THEN
      PERFORM public.restore_sale_batches(sid);
      DELETE FROM public.sale_items WHERE sale_id=sid;
    END IF;
    IF action='delete_sale' THEN
      DELETE FROM public.sales WHERE id=sid;
      RETURN jsonb_build_object('id',sid);
    END IF;
    IF jsonb_typeof(p_payload->'items') IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Itens inválidos'; END IF;
    IF jsonb_array_length(p_payload->'items')=0 THEN RAISE EXCEPTION 'Adicione pelo menos um produto'; END IF;
    IF discount<0 OR discount::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Desconto inválido'; END IF;
    IF status NOT IN ('pago','pendente') THEN RAISE EXCEPTION 'Status inválido'; END IF;
    IF action='create_sale' THEN
      INSERT INTO public.sales(customer_id,payment_method,status,discount_amount,paid_at)
        VALUES((p_payload->>'customer_id')::uuid,payment,status,discount,CASE WHEN status='pago' THEN now() END) RETURNING id INTO sid;
    END IF;
    FOR item IN SELECT value FROM jsonb_array_elements(p_payload->'items') LOOP
      pid:=(item->>'product_id')::uuid;
      IF (item->>'quantity')::numeric <> trunc((item->>'quantity')::numeric) THEN RAISE EXCEPTION 'Quantidade deve ser inteira'; END IF;
      qty:=(item->>'quantity')::integer;
      price:=round((item->>'unit_price')::numeric,2);
      IF qty IS NULL OR qty<=0 OR price IS NULL OR price<0 OR price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade ou preço inválido'; END IF;
      fifo:=public.fifo_consume_batches(pid,qty,sid);
      cost:=(fifo->>'totalCost')::numeric;
      INSERT INTO public.sale_items(sale_id,product_id,quantity,unit_price,unit_cost,subtotal,profit)
        VALUES(sid,pid,qty,price,cost/qty,price*qty,price*qty-cost);
      gross:=gross+price*qty;
      total_cost:=total_cost+cost;
    END LOOP;
    IF discount>gross THEN RAISE EXCEPTION 'Desconto maior que o valor da venda'; END IF;
    -- Allocate cents exactly, so item profits add up to sale profit.
    IF gross>0 AND discount>0 THEN
      WITH shares AS (
        SELECT id,subtotal,round(discount*subtotal/gross,2) AS share,
          row_number() OVER(ORDER BY subtotal DESC,id) AS rn FROM public.sale_items WHERE sale_id=sid
      ), adjusted AS (
        SELECT id,share+CASE WHEN rn=1 THEN discount-sum(share) OVER() ELSE 0 END AS share FROM shares
      ) UPDATE public.sale_items si SET profit=si.profit-a.share FROM adjusted a WHERE si.id=a.id;
    END IF;
    UPDATE public.sales SET customer_id=(p_payload->>'customer_id')::uuid,payment_method=payment,
      discount_amount=discount,total_amount=gross-discount,total_profit=gross-discount-total_cost
      WHERE id=sid RETURNING * INTO s;
    IF action='create_sale' AND status='pago' THEN
      INSERT INTO public.cash_flow(type,category,description,amount,reference_id,reference_type)
        VALUES('entrada','venda','Venda #'||left(sid::text,8),s.total_amount,sid,'sale');
    END IF;
    RETURN to_jsonb(s);
  ELSIF action='pay_bill' THEN
    SELECT * INTO STRICT bill FROM public.bills WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
    IF bill.is_paid THEN RAISE EXCEPTION 'Conta já está paga'; END IF;
    UPDATE public.bills SET is_paid=true,paid_at=now() WHERE id=bill.id RETURNING * INTO bill;
    INSERT INTO public.cash_flow(type,category,description,amount,reference_id,reference_type)
      VALUES('saida','conta','Pagamento: '||bill.description,bill.amount,bill.id,'bill');
    RETURN to_jsonb(bill);
  ELSIF action='create_purchase' THEN
    pid:=(p_payload->>'product_id')::uuid;
    IF (p_payload->>'quantity')::numeric <> trunc((p_payload->>'quantity')::numeric) THEN RAISE EXCEPTION 'Quantidade deve ser inteira'; END IF;
    qty:=(p_payload->>'quantity')::integer;
    price:=round((p_payload->>'unit_cost')::numeric,2);
    IF qty IS NULL OR qty<=0 OR price IS NULL OR price<0 OR price::text IN ('NaN','Infinity','-Infinity') THEN RAISE EXCEPTION 'Quantidade ou custo inválido'; END IF;
    PERFORM 1 FROM public.products WHERE id=pid FOR UPDATE;
    INSERT INTO public.purchases(product_id,quantity,unit_cost,total_amount,payment_method,supplier)
      VALUES(pid,qty,price,qty*price,payment,p_payload->>'supplier') RETURNING * INTO purchase;
    INSERT INTO public.purchase_batches(product_id,initial_quantity,remaining_quantity,purchase_price,purchase_id,supplier)
      VALUES(pid,qty,qty,price,purchase.id,p_payload->>'supplier') RETURNING * INTO batch;
    SELECT stock_quantity INTO stock FROM public.products WHERE id=pid;
    INSERT INTO public.inventory_movements(product_id,batch_id,movement_type,quantity,unit_price,origin,reference_id,resulting_stock)
      VALUES(pid,batch.id,'entrada',qty,price,'compra',purchase.id,stock);
    INSERT INTO public.cash_flow(type,category,description,amount,reference_id,reference_type)
      VALUES('saida','compra','Compra de estoque',purchase.total_amount,purchase.id,'purchase');
    RETURN to_jsonb(purchase);
  END IF;
  RAISE EXCEPTION 'Operação inválida';
END;
$$;
REVOKE ALL ON FUNCTION public.app_operation(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.app_operation(jsonb) TO authenticated;
