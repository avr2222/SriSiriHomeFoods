-- ============================================================
-- Sri Siri Home Foods — initial schema, RLS, RPCs, seed
-- Scope: HQ's own business. `store_id`/`outlets` is a forward-
-- compat anchor for a future franchise phase (no franchise
-- behaviour is built here).
-- ============================================================

-- ---------- helpers ----------
create extension if not exists pgcrypto;

-- ---------- outlets (forward-compat anchor) ----------
create table outlets (
  id   uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'hq' check (kind in ('hq','franchise'))
);
insert into outlets (id, name, kind)
  values ('00000000-0000-0000-0000-000000000001', 'Sri Siri HQ', 'hq');

-- ---------- profiles ----------
create table profiles (
  id    uuid primary key references auth.users(id) on delete cascade,
  role  text not null default 'customer' check (role in ('customer','owner','worker','super_admin')),
  name  text,
  email text,
  phone text,
  created_at timestamptz not null default now()
);

-- "is_owner" = has cockpit/admin access: super_admin (HQ) now, plus the
-- future franchise outlet `owner`. Every RLS policy + RPC references this.
create or replace function public.is_owner(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = uid and role in ('owner','super_admin'));
$$;

-- create a profile row automatically on signup (email / Google)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''), '@', 1), 'Customer'),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end; $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- catalog ----------
create table categories (
  id   text primary key,
  name text not null,
  tint text not null,
  icon text not null,
  sort int  not null default 0
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  cat         text not null references categories(id),
  description text,
  rating      numeric default 5.0,
  reviews     int default 0,
  badge       text,
  tint        text default '#c2611f',
  stock_state text not null default 'in',
  season      text,
  image_url   text,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);

create table product_variants (
  id         uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  size       text not null,
  price      numeric not null,
  cost       numeric not null default 0,
  stock      int not null default 0,
  mto        boolean not null default false,
  sort       int not null default 0
);

-- ---------- orders ----------
create sequence if not exists order_no_seq start 1043;

create table orders (
  id            uuid primary key default gen_random_uuid(),
  order_no      int not null unique default nextval('order_no_seq'),
  store_id      uuid not null default '00000000-0000-0000-0000-000000000001' references outlets(id),
  customer_id   uuid references auth.users(id),
  customer_name text not null,
  phone         text,
  addr          text,
  subtotal      numeric not null default 0,
  discount      numeric not null default 0,
  delivery_fee  numeric not null default 0,
  total         numeric not null default 0,
  status        text not null default 'new' check (status in ('new','preparing','out','delivered','cancelled')),
  pay           text,
  channel       text,
  worker        text,
  created_at    timestamptz not null default now()
);

create table order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references orders(id) on delete cascade,
  product_name text not null,
  size         text,
  qty          int not null,
  price        numeric not null,
  cost         numeric not null default 0
);

-- ---------- operations (owner-only) ----------
create table expenses (
  id        uuid primary key default gen_random_uuid(),
  store_id  uuid not null default '00000000-0000-0000-0000-000000000001' references outlets(id),
  cat       text not null,
  amount    numeric not null,
  payee     text,
  note      text,
  spent_on  date not null default current_date,
  recurring boolean not null default false,
  created_at timestamptz not null default now()
);

create table workers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null default '00000000-0000-0000-0000-000000000001' references outlets(id),
  name       text not null,
  role       text,
  salary     numeric not null default 0,
  advance    numeric not null default 0,
  join_date  text,
  status     text default 'Active',
  attendance int default 100
);

create table coupons (
  code        text primary key,
  type        text not null,
  value       numeric not null default 0,
  min         numeric not null default 0,
  description text,
  free_ship   boolean not null default false,
  active      boolean not null default true
);

create table delivery_settings (
  id             int primary key default 1 check (id = 1),
  free_threshold numeric not null default 500,
  flat_charge    numeric not null default 40
);

-- ---------- derived customers view ----------
create view customers_summary with (security_invoker = on) as
  select
    md5(coalesce(max(phone), customer_name)) as id,
    customer_name as name,
    max(phone) as phone,
    count(*)::int as orders,
    sum(total) as spent,
    to_char(max(created_at), 'DD Mon') as last,
    case
      when sum(total) >= 6000 then 'High-value'
      when count(*) = 1 then 'New'
      else 'Repeat'
    end as seg
  from orders
  group by customer_name;

-- ============================================================
-- RPCs (security definer): atomic order creation
-- ============================================================
create or replace function public.place_order(p jsonb)
returns orders language plpgsql security definer set search_path = public as $$
declare
  v_order orders;
  v_name  text;
  v_phone text;
  it jsonb;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select coalesce(name, 'Customer'), phone into v_name, v_phone from profiles where id = auth.uid();

  insert into orders (customer_id, customer_name, phone, addr, subtotal, discount, delivery_fee, total, status, pay)
  values (auth.uid(), coalesce(v_name,'Customer'), v_phone, p->>'addr',
          (p->>'subtotal')::numeric, (p->>'discount')::numeric, (p->>'delivery')::numeric, (p->>'total')::numeric,
          'new', p->>'pay')
  returning * into v_order;

  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_name, size, qty, price, cost)
    values (v_order.id, it->>'name', it->>'size', (it->>'qty')::int, (it->>'price')::numeric, (it->>'cost')::numeric);
  end loop;

  return v_order;
end; $$;

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
  values (null, coalesce(p->>'customer','Walk-in customer'), p->>'phone', 'In-store / counter',
          v_subtotal, v_discount, 0, greatest(0, v_subtotal - v_discount), 'delivered', p->>'pay', 'counter', 'Counter')
  returning * into v_order;

  for it in select * from jsonb_array_elements(p->'items') loop
    insert into order_items (order_id, product_name, size, qty, price, cost)
    values (v_order.id, it->>'name', it->>'size', (it->>'qty')::int, (it->>'price')::numeric, (it->>'cost')::numeric);
  end loop;

  return v_order;
end; $$;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table profiles          enable row level security;
alter table categories        enable row level security;
alter table products          enable row level security;
alter table product_variants  enable row level security;
alter table orders            enable row level security;
alter table order_items       enable row level security;
alter table expenses          enable row level security;
alter table workers           enable row level security;
alter table coupons           enable row level security;
alter table delivery_settings enable row level security;
alter table outlets           enable row level security;

-- profiles: self read/write; owner reads all
create policy profiles_self_read   on profiles for select using (id = auth.uid() or is_owner(auth.uid()));
create policy profiles_self_write  on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- public catalog: anyone can read; owner writes
create policy cat_read   on categories       for select using (true);
create policy cat_write  on categories       for all    using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy prod_read  on products         for select using (true);
create policy prod_write on products         for all    using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy var_read   on product_variants for select using (true);
create policy var_write  on product_variants for all    using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy coup_read  on coupons          for select using (true);
create policy coup_write on coupons          for all    using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy dlv_read   on delivery_settings for select using (true);
create policy dlv_write  on delivery_settings for all    using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy outlet_read on outlets         for select using (true);

-- orders: customer reads own; owner reads/updates all (insert is via RPC)
create policy ord_read    on orders for select using (customer_id = auth.uid() or is_owner(auth.uid()));
create policy ord_update  on orders for update using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy oitem_read  on order_items for select using (
  exists (select 1 from orders o where o.id = order_id and (o.customer_id = auth.uid() or is_owner(auth.uid())))
);

-- owner-only operations
create policy exp_all  on expenses for all using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
create policy wrk_all  on workers  for all using (is_owner(auth.uid())) with check (is_owner(auth.uid()));

-- ============================================================
-- Seed (from packages/shared/src/data/seed.js)
-- ============================================================
insert into categories (id, name, tint, icon, sort) values
  ('pickles','Pickles','#8a2a33','fire',1),
  ('sweets','Sweets','#a8821f','sparkle',2),
  ('snacks','Snacks','#c2611f','bolt',3),
  ('powders','Powders','#9a5a12','leaf',4),
  ('breakfast','Breakfast','#1f5d43','clock',5),
  ('lunch','Lunch','#3a6d2a','leaf',6),
  ('seasonal','Seasonal','#7a3a8a','star',7);

-- products + variants
do $$
declare pid uuid;
begin
  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,badge,tint,sort) values (pid,'Avakaya Mango Pickle','pickles','Traditional Andhra cut-mango pickle in cold-pressed sesame oil, sun-matured for deep flavour.',4.9,212,'limited','Bestseller','#8a2a33',1);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',180,96,14,0),(pid,'500g',340,182,8,1),(pid,'1kg',640,350,3,2);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Gongura Pickle','pickles','Tangy sorrel-leaf pickle, a Telugu classic. Bold, spicy, and unmistakably homemade.',4.8,138,'in','#7a2530',2);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',170,90,20,0),(pid,'500g',320,170,11,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Tomato Pickle','pickles','Slow-cooked tomato pickle with garlic and fenugreek. Pairs with rice, idli, dosa.',4.7,96,'out','#9c3a2a',3);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',150,78,0,0),(pid,'500g',280,150,0,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,badge,tint,sort) values (pid,'Kaja (Madatha)','sweets','Crisp, flaky layered sweet soaked in light sugar syrup. Festival favourite.',4.8,154,'in','New','#a8821f',4);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',160,84,18,0),(pid,'500g',300,160,9,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Boondi Laddu','sweets','Soft ghee laddus made fresh to order. Rich, fragrant, never too sweet.',4.9,201,'mto','#b58a23',5);
  insert into product_variants(product_id,size,price,cost,stock,mto,sort) values (pid,'6 pcs',180,95,0,true,0),(pid,'12 pcs',340,185,0,true,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Dry Fruit Mysore Pak','sweets','Melt-in-the-mouth gram-flour sweet loaded with cashew and almond.',4.7,88,'limited','#9c7a1e',6);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',240,140,7,0),(pid,'500g',460,270,4,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Chekkalu (Rice Crackers)','snacks','Crunchy spiced rice crackers with sesame and chana dal. Perfect with chai.',4.6,74,'in','#c2611f',7);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',130,66,22,0),(pid,'500g',240,128,13,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,badge,tint,sort) values (pid,'Murukku','snacks','Hand-twisted crispy murukku, light and savoury. Made in small batches.',4.7,110,'in','Hot','#cf7022',8);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',120,60,16,0),(pid,'500g',220,118,6,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Sakinalu','snacks','Festive Telangana sesame spirals — crunchy, delicate, deeply traditional.',4.8,62,'limited','#b85e1e',9);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',150,80,9,0);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,badge,tint,sort) values (pid,'Idli Podi (Gunpowder)','powders','Roasted lentil & chilli podi. Mix with sesame oil for idli, dosa, rice.',4.9,178,'in','Bestseller','#9a5a12',10);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'200g',140,70,25,0),(pid,'500g',320,165,14,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Kandi Podi (Toor Dal)','powders','Protein-rich lentil powder with a warm, nutty roast. A daily staple.',4.6,54,'in','#8a5414',11);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'200g',130,65,19,0);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Sambar Powder','powders','House-blend sambar masala, stone-ground in small lots for freshness.',4.7,69,'in','#a86319',12);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'200g',120,58,21,0);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Pesarattu Batter','breakfast','Fresh green-gram dosa batter, ground each morning. Same-day delivery only.',4.8,91,'mto','#1f5d43',13);
  insert into product_variants(product_id,size,price,cost,stock,mto,sort) values (pid,'1kg',120,62,0,true,0);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,badge,tint,sort) values (pid,'Idli / Dosa Batter','breakfast','Naturally fermented rice & urad batter. Soft idlis, crisp dosas guaranteed.',4.9,240,'in','Bestseller','#247a57',14);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'1kg',90,46,12,0),(pid,'2kg',170,90,6,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Veg Lunch Box','lunch','Rice, sambar, two curries, curd & pickle. Wholesome homestyle meal, made to order.',4.7,130,'mto','#3a6d2a',15);
  insert into product_variants(product_id,size,price,cost,stock,mto,sort) values (pid,'1 box',140,78,0,true,0);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,tint,sort) values (pid,'Andhra Meal (Non-Veg)','lunch','Chicken curry, rice, rasam, curry & curd. Spicy, hearty, made fresh.',4.8,84,'mto','#2f5d23',16);
  insert into product_variants(product_id,size,price,cost,stock,mto,sort) values (pid,'1 box',220,128,0,true,0);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,season,tint,sort) values (pid,'Bobbatlu (Holige)','seasonal','Festival sweet flatbread stuffed with jaggery & lentil. Available this season.',4.9,120,'seasonal','Available till 30 Jun','#7a3a8a',17);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'6 pcs',240,135,10,0),(pid,'12 pcs',460,262,5,1);

  pid := gen_random_uuid(); insert into products(id,name,cat,description,rating,reviews,stock_state,season,tint,sort) values (pid,'Mango Thokku','seasonal','Grated raw-mango relish, summer-only. Bright, tangy, small-batch.',4.8,46,'seasonal','Summer special','#8a5a8a',18);
  insert into product_variants(product_id,size,price,cost,stock,sort) values (pid,'250g',190,100,8,0);
end $$;

insert into coupons (code,type,value,min,description,free_ship) values
  ('WELCOME10','percent',10,0,'10% off your first order',false),
  ('FESTIVE50','flat',50,400,'₹50 off above ₹400',false),
  ('FREESHIP','percent',0,300,'Free delivery above ₹300',true);

insert into delivery_settings (id, free_threshold, flat_charge) values (1, 500, 40);

insert into workers (name, role, salary, advance, join_date, status, attendance) values
  ('Ravi Teja','Kitchen & Delivery',14000,2000,'Jan 2024','Active',96),
  ('Sunitha','Kitchen Helper',11000,0,'Mar 2024','Active',99),
  ('Mahesh','Delivery',9000,1500,'Aug 2024','Active',88);

insert into expenses (cat, amount, payee, note, spent_on, recurring) values
  ('Worker Salary',14000,'Ravi Teja','May salary', current_date - 22, true),
  ('Worker Salary',11000,'Sunitha','May salary', current_date - 22, true),
  ('Power Bill',3200,'TSSPDCL','Electricity', current_date - 20, true),
  ('Raw Groceries',4850,'Rythu Bazaar','Mangoes, oil, chilli', current_date - 19, false),
  ('Raw Groceries',2600,'Wholesale Mandi','Rice, dal, sugar', current_date - 17, false),
  ('Packaging',1800,'Sri Packers','Jars & boxes', current_date - 17, false),
  ('Gas / Fuel',1100,'HP Gas','Cylinder refill', current_date - 16, false),
  ('Rent',6000,'Landlord','Kitchen space', current_date - 22, true);

-- demo orders (consume order_no 1037..1042; next sequence value is 1043)
insert into orders (order_no, customer_name, phone, addr, subtotal, discount, delivery_fee, total, status, pay, worker, created_at) values
  (1037,'Suresh Kumar','+91 99887 33221','Kondapur, Hyderabad',390,0,40,430,'delivered','COD','Mahesh', now() - interval '1 day 2 hour'),
  (1038,'Lakshmi Devi','+91 97000 44556','Banjara Hills, Hyderabad',330,33,40,337,'delivered','UPI','Ravi Teja', now() - interval '1 day 1 hour'),
  (1039,'Ramesh Gupta','+91 90000 22113','5-9-22, Kukatpally, Hyderabad 500072',320,0,40,360,'out','UPI','Ravi Teja', now() - interval '2 hour'),
  (1040,'Priya Sharma','+91 98480 12345','Road 12, Jubilee Hills, Hyderabad 500033',740,0,0,740,'preparing','UPI','Sunitha', now() - interval '1 hour'),
  (1041,'Anitha Rao','+91 91234 55678','8-2-120, Madhapur, Hyderabad 500081',460,46,40,454,'new','COD',null, now() - interval '22 min'),
  (1042,'Lakshmi Devi','+91 97000 44556','12-3-45, Banjara Hills, Hyderabad 500034',480,0,40,520,'new','UPI',null, now() - interval '5 min');

insert into order_items (order_id, product_name, size, qty, price, cost)
  select id,'Chekkalu (Rice Crackers)','500g',1,240,128 from orders where order_no=1037
  union all select id,'Sakinalu','250g',1,150,80 from orders where order_no=1037
  union all select id,'Sambar Powder','200g',2,120,58 from orders where order_no=1038
  union all select id,'Idli / Dosa Batter','1kg',1,90,46 from orders where order_no=1038
  union all select id,'Gongura Pickle','500g',1,320,170 from orders where order_no=1039
  union all select id,'Boondi Laddu','12 pcs',1,340,185 from orders where order_no=1040
  union all select id,'Kaja (Madatha)','250g',1,160,84 from orders where order_no=1040
  union all select id,'Dry Fruit Mysore Pak','250g',1,240,140 from orders where order_no=1040
  union all select id,'Avakaya Mango Pickle','500g',1,340,182 from orders where order_no=1041
  union all select id,'Murukku','250g',1,120,60 from orders where order_no=1041
  union all select id,'Idli / Dosa Batter','2kg',2,170,90 from orders where order_no=1042
  union all select id,'Idli Podi (Gunpowder)','200g',1,140,70 from orders where order_no=1042;

-- realtime for the owner inbox
alter publication supabase_realtime add table orders;

-- ============================================================
-- Storage: public product photos bucket (owner writes, anyone reads)
-- ============================================================
insert into storage.buckets (id, name, public)
  values ('product-photos', 'product-photos', true)
  on conflict (id) do nothing;

create policy "product photos public read"
  on storage.objects for select
  using (bucket_id = 'product-photos');

create policy "product photos owner write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'product-photos' and is_owner(auth.uid()));

create policy "product photos owner update"
  on storage.objects for update to authenticated
  using (bucket_id = 'product-photos' and is_owner(auth.uid()));

create policy "product photos owner delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'product-photos' and is_owner(auth.uid()));
