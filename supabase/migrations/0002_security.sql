-- ============================================================
-- Sri Siri Home Foods — security hardening
--  1. Block role self-escalation on profiles
--  2. Recompute order money server-side in place_order
-- 0001 is already applied; this migration is additive.
-- ============================================================

-- ---------- 1. prevent role self-escalation ----------
-- A logged-in non-admin cannot change any profile's role (incl. their own).
-- When there is no auth context (auth.uid() is null — i.e. the service_role
-- key, SQL editor, or dashboard), the change is allowed, so the documented
-- `update profiles set role='super_admin' ...` promotion still works.
create or replace function public.prevent_role_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null
     and new.role is distinct from old.role
     and not is_owner(auth.uid()) then
    raise exception 'not allowed to change role';
  end if;
  return new;
end; $$;

drop trigger if exists profiles_no_role_change on profiles;
create trigger profiles_no_role_change
  before update on profiles
  for each row execute function public.prevent_role_change();

-- ---------- 2. authoritative order totals ----------
-- Ignore any client-supplied money. Payload:
--   { addr, pay, coupon_code, items: [{ variant_id, qty }] }
-- Prices/cost come from product_variants, discount from coupons,
-- delivery from delivery_settings. Mirrors the cart logic in lib/cart.js.
create or replace function public.place_order(p jsonb)
returns orders language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_name text; v_phone text;
  v_subtotal numeric := 0;
  v_discount numeric := 0;
  v_delivery numeric := 0;
  v_freeship boolean := false;
  v_free_threshold numeric; v_flat numeric;
  it jsonb;
  v_price numeric; v_cost numeric; v_size text; v_pname text;
  v_pid uuid; v_mto boolean; v_vid uuid; v_pids uuid[] := '{}';
  c record;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select coalesce(name, 'Customer'), phone into v_name, v_phone from profiles where id = auth.uid();

  -- subtotal from authoritative variant prices
  for it in select * from jsonb_array_elements(p->'items') loop
    select pv.price into v_price from product_variants pv where pv.id = (it->>'variant_id')::uuid;
    if v_price is null then raise exception 'invalid variant %', it->>'variant_id'; end if;
    v_subtotal := v_subtotal + v_price * greatest(0, (it->>'qty')::int);
  end loop;

  -- coupon (server-validated against active + min)
  if coalesce(p->>'coupon_code', '') <> '' then
    select * into c from coupons where code = upper(p->>'coupon_code') and active = true;
    if found and v_subtotal >= c.min then
      if c.free_ship then v_freeship := true;
      elsif c.type = 'percent' then v_discount := round(v_subtotal * c.value / 100);
      else v_discount := c.value; end if;
    end if;
  end if;

  -- delivery from settings
  select free_threshold, flat_charge into v_free_threshold, v_flat from delivery_settings where id = 1;
  if v_subtotal >= coalesce(v_free_threshold, 500) or v_freeship then v_delivery := 0;
  elsif v_subtotal > 0 then v_delivery := coalesce(v_flat, 40);
  else v_delivery := 0; end if;

  insert into orders (customer_id, customer_name, phone, addr, subtotal, discount, delivery_fee, total, status, pay)
  values (auth.uid(), coalesce(v_name, 'Customer'), coalesce(nullif(p->>'phone', ''), v_phone), p->>'addr',
          v_subtotal, v_discount, v_delivery, greatest(0, v_subtotal - v_discount) + v_delivery, 'new', p->>'pay')
  returning * into v_order;

  -- order_items snapshot from catalog + decrement stock for non-MTO variants
  for it in select * from jsonb_array_elements(p->'items') loop
    select pv.price, pv.cost, pv.size, pr.name, pv.product_id, pv.mto, pv.id
      into v_price, v_cost, v_size, v_pname, v_pid, v_mto, v_vid
      from product_variants pv join products pr on pr.id = pv.product_id
      where pv.id = (it->>'variant_id')::uuid;
    insert into order_items (order_id, product_name, size, qty, price, cost)
    values (v_order.id, v_pname, v_size, greatest(0, (it->>'qty')::int), v_price, v_cost);
    if not coalesce(v_mto, false) then
      update product_variants set stock = greatest(0, stock - greatest(0, (it->>'qty')::int)) where id = v_vid;
    end if;
    v_pids := array_append(v_pids, v_pid);
  end loop;

  -- recompute denormalised stock_state for affected products (skip seasonal)
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
    where v.product_id = any(v_pids)
    group by v.product_id
  ) s
  where pr.id = s.product_id and pr.stock_state <> 'seasonal';

  return v_order;
end; $$;
