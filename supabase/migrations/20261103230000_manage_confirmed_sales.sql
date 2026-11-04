-- Paid edits/deletions remain atomic with batch restoration and cash correction.
-- Installing this migration does not alter any existing sale or receipt.
CREATE OR REPLACE FUNCTION public.app_operation(p_payload jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  action text := p_payload->>'action'; sid uuid; s public.sales; bill public.bills;
  receipt_count integer; receipt_amount numeric; purchase public.purchases; batch public.purchase_batches; item jsonb;
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
    IF action='pay_sale' AND s.status<>'pendente' THEN RAISE EXCEPTION 'A venda já foi paga ou não está pendente'; END IF;
    IF s.status NOT IN ('pago','pendente') THEN RAISE EXCEPTION 'Status da venda inválido'; END IF;
    IF action IN ('update_sale','delete_sale') THEN
      SELECT count(*),COALESCE(sum(amount),0) INTO receipt_count,receipt_amount FROM public.cash_flow
        WHERE reference_id=sid AND type='entrada' AND reference_type IN ('sale','venda');
      IF (s.status='pago' AND (receipt_count<>1 OR receipt_amount<>s.total_amount))
        OR (s.status='pendente' AND receipt_count<>0) THEN
        RAISE EXCEPTION 'Recebimento da venda inconsistente; confira o caixa antes de alterar ou excluir';
      END IF;
      status:=s.status;
    END IF;
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
      DELETE FROM public.cash_flow WHERE reference_id=sid AND type='entrada' AND reference_type IN ('sale','venda');
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
      fifo:=public.consume_sale_batches_atomic(pid,qty,sid);
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
    IF action='update_sale' AND s.status='pago' THEN
      UPDATE public.cash_flow SET amount=s.total_amount
        WHERE reference_id=sid AND type='entrada' AND reference_type IN ('sale','venda');
    END IF;
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
