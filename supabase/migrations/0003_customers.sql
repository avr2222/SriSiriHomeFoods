-- ============================================================
-- Sri Siri Home Foods — real customers table (owner-managed)
-- Replaces the read-only customers_summary view as the source for
-- the cockpit's Customers screen. Order stats are still derived by
-- matching on phone in the app. Additive; 0001/0002 already applied.
-- ============================================================

create table if not exists customers (
  id         uuid primary key default gen_random_uuid(),
  store_id   uuid not null default '00000000-0000-0000-0000-000000000001' references outlets(id),
  name       text not null,
  phone      text,
  address    text,
  notes      text,
  created_at timestamptz not null default now()
);

alter table customers enable row level security;

-- owner/super_admin full access
create policy cust_all on customers for all
  using (is_owner(auth.uid())) with check (is_owner(auth.uid()));
