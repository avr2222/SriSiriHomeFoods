-- ============================================================
-- Sri Siri Home Foods — operations improvements
--  1. order_items.variant_id (so stock can be restored on cancel)
--  2. restore stock when an order is cancelled/rejected
--  3. auto-capture customers from orders + counter sales
--  4. final place_order / counter_sale (supersede earlier versions)
-- Requires 0001–0003. Re-runnable (create or replace / if not exists).
-- ============================================================

alter table order_items add column if not exists variant_id uuid references product_variants(id);

-- ---------- helper: add a customer if their phone is new ----------
create or replace function public.upsert_customer(p_name text, p_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare v_norm text;
begin
  v_norm := right(regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'), 10);
  if length(v_norm) < 10 then return; end if;
  if not exists (
    select 1 from customers where right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = v_norm
  ) then
    insert into customers (name, phone) values (coalesce(nullif(p_name, ''), 'Customer'), p_phone);
  end if;
end; $$;

-- ---------- shared: recompute denormalised stock_state for products ----------
create or replace function public.recompute_stock_state(p_pids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update products pr set stock_state = s.state
  from (
    select v.product_id,
      case
        when bool_or(v.mto) and coalesce(sum(case when v.mto then 0 else v.stock end), 0) = 0 then 'mto'
        when coalesce(sum(case when v.mto then 0 else v.stock end), 0) = 0 then 'out'
        when coalesce(sum(case when v.mto then 0 else v.stock end), 0) <= 5 then 'limited'
        else 'in'
      end as state
    from product_variants v
    where v.product_id = any(p_pids)
    group by v.product_id
  ) s
  where pr.id = s.product_id and pr.stock_state <> 'seasonal';
end; $$;

-- ---------- final place_order: trusted totals + stock + variant_id + auto-customer ----------
create or replace function public.place_order(p jsonb)
returns orders language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_name text; v_phone text; v_ophone text;
  v_subtotal numeric := 0; v_discount numeric := 0; v_delivery numeric := 0;
  v_freeship boolean := false; v_free_threshold numeric; v_flat numeric;
  it jsonb;
  v_price numeric; v_cost numeric; v_size text; v_pname text;
  v_pid uuid; v_mto boolean; v_vid uuid; v_pids uuid[] := '{}';
  c record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select coalesce(name, 'Customer'), phone into v_name, v_phone from profiles where id = auth.uid();
  v_ophone := coalesce(nullif(p->>'phone', ''), v_phone);

  for it in select * from jsonb_array_elements(p->'items') loop
    select pv.price into v_price from product_variants pv where pv.id = (it->>'variant_id')::uuid;
    if v_price is null then raise exception 'invalid variant %', it->>'variant_id'; end if;
    v_subtotal := v_subtotal + v_price * greatest(0, (it->>'qty')::int);
  end loop;

  if coalesce(p->>'coupon_code', '') <> '' then
    select * into c from coupons where code = upper(p->>'coupon_code') and active = true;
    if found and v_subtotal >= c.min then
      if c.free_ship then v_freeship := true;
      elsif c.type = 'percent' then v_discount := round(v_subtotal * c.value / 100);
      else v_discount := c.value; end if;
    end if;
  end if;

  select free_threshold, flat_charge into v_free_threshold, v_flat from delivery_settings where id = 1;
  if v_subtotal >= coalesce(v_free_threshold, 500) or v_freeship then v_delivery := 0;
  elsif v_subtotal > 0 then v_delivery := coalesce(v_flat, 40);
  else v_delivery := 0; end if;

  insert into orders (customer_id, customer_name, phone, addr, subtotal, discount, delivery_fee, total, status, pay)
  values (auth.uid(), coalesce(v_name, 'Customer'), v_ophone, p->>'addr',
          v_subtotal, v_discount, v_delivery, greatest(0, v_subtotal - v_discount) + v_delivery, 'new', p->>'pay')
  returning * into v_order;

  for it in select * from jsonb_array_elements(p->'items') loop
    select pv.price, pv.cost, pv.size, pr.name, pv.product_id, pv.mto, pv.id
      into v_price, v_cost, v_size, v_pname, v_pid, v_mto, v_vid
      from product_variants pv join products pr on pr.id = pv.product_id
      where pv.id = (it->>'variant_id')::uuid;
    insert into order_items (order_id, variant_id, product_name, size, qty, price, cost)
    values (v_order.id, v_vid, v_pname, v_size, greatest(0, (it->>'qty')::int), v_price, v_cost);
    if not coalesce(v_mto, false) then
      update product_variants set stock = greatest(0, stock - greatest(0, (it->>'qty')::int)) where id = v_vid;
    end if;
    v_pids := array_append(v_pids, v_pid);
  end loop;

  perform recompute_stock_state(v_pids);
  perform upsert_customer(coalesce(v_name, 'Customer'), v_ophone);
  return v_order;
end; $$;

-- ---------- shared: recompute denormalised stock_state for products ----------
create or replace function public.recompute_stock_state(p_pids uuid[])
returns void language plpgsql security definer set search_path = public as $$
begin
  update products pr set stock_state = s.state
  from (
    select v.product_id,
      case
        when bool_or(v.mto) and coalesce(sum(case when v.mto then 0 else v.stock end), 0) = 0 then 'mto'
        when coalesce(sum(case when v.mto then 0 else v.stock end), 0) = 0 then 'out'
        when coalesce(sum(case when v.mto then 0 else v.stock end), 0) <= 5 then 'limited'
        else 'in'
      end as state
    from product_variants v
    where v.product_id = any(p_pids)
    group by v.product_id
  ) s
  where pr.id = s.product_id and pr.stock_state <> 'seasonal';
end; $$;

-- ---------- final counter_sale: + auto-customer ----------
create or replace function public.counter_sale(p jsonb)
returns orders language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_subtotal numeric := 0;
  v_discount numeric := coalesce((p->>'discount')::numeric, 0);
  it jsonb;
begin
  if not is_owner(auth.uid()) then raise exception 'owner only'; end if;
  for it in select * from jsonb_array_elements(p->'items') loop
    v_subtotal := v_subtotal + (it->>'price')::numeric * (it->>'qty')::int;
  end loop;

  insert into orders (customer_id, customer_name, phone, addr, subtotal, discount, delivery_fee, total, status, pay, channel, worker)
  values (null, coalesce(p->>'customer', 'Walk-in customer'), p->>'phone', 'In-store / counter',
          v_subtotal, v_discount, 0, greatest(0, v_subtotal - v_discount), 'delivered', p->>'pay', 'counter', 'Counter')
  returning * into v_order;

  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_name, size, qty, price, cost)
    values (v_order.id, it->>'name', it->>'size', (it->>'qty')::int, (it->>'price')::numeric, (it->>'cost')::numeric);
  end loop;

  perform upsert_customer(p->>'customer', p->>'phone');
  return v_order;
end; $$;

-- ---------- restore stock when an order is cancelled/rejected ----------
create or replace function public.restore_stock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_pids uuid[];
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update product_variants pv set stock = pv.stock + oi.qty
    from order_items oi
    where oi.order_id = new.id and oi.variant_id = pv.id and pv.mto = false;

    select array_agg(distinct pv.product_id) into v_pids
    from order_items oi join product_variants pv on pv.id = oi.variant_id
    where oi.order_id = new.id;
    if v_pids is not null then perform recompute_stock_state(v_pids); end if;
  end if;
  return new;
end; $$;

drop trigger if exists orders_restore_stock on orders;
create trigger orders_restore_stock
  after update on orders
  for each row execute function public.restore_stock_on_cancel();
