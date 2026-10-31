create extension if not exists pgcrypto;

create type public.profile_role as enum ('customer', 'admin', 'compliance', 'support');
create type public.profile_status as enum ('active', 'restricted', 'closed');
create type public.trade_direction as enum ('buy', 'sell');
create type public.order_status as enum (
  'pending_review',
  'awaiting_deposit',
  'deposit_verification',
  'payout_pending',
  'completed',
  'rejected',
  'failed',
  'cancelled'
);
create type public.ledger_entry_type as enum (
  'customer_debit',
  'customer_credit',
  'fee',
  'adjustment',
  'reversal'
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  phone text,
  role public.profile_role not null default 'customer',
  status public.profile_status not null default 'active',
  email_verified_at timestamptz,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, email_verified_at)
  values (
    new.id,
    new.email,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email_confirmed_at
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create function public.has_staff_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'compliance', 'support')
      and status = 'active'
  );
$$;

create function public.has_admin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
      and status = 'active'
  );
$$;

create function public.has_compliance_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('admin', 'compliance')
      and status = 'active'
  );
$$;

revoke all on function public.has_staff_role() from public, anon;
revoke all on function public.has_admin_role() from public, anon;
revoke all on function public.has_compliance_role() from public, anon;
grant execute on function public.has_staff_role() to authenticated, service_role;
grant execute on function public.has_admin_role() to authenticated, service_role;
grant execute on function public.has_compliance_role() to authenticated, service_role;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  symbol text not null unique check (symbol = upper(symbol) and symbol ~ '^[A-Z0-9]{2,12}$'),
  name text not null,
  asset_type text not null check (asset_type in ('crypto', 'stablecoin')),
  decimals smallint not null check (decimals between 0 and 18),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger assets_set_updated_at
  before update on public.assets
  for each row execute function public.set_updated_at();

create table public.asset_networks (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets (id) on delete restrict,
  network_code text not null check (network_code = upper(network_code)),
  network_name text not null,
  confirmations_required integer not null default 1 check (confirmations_required > 0),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (asset_id, network_code)
);

create trigger asset_networks_set_updated_at
  before update on public.asset_networks
  for each row execute function public.set_updated_at();

create table public.exchange_settings (
  asset_id uuid primary key references public.assets (id) on delete restrict,
  ngn_per_unit numeric(24, 8) check (ngn_per_unit is null or ngn_per_unit > 0),
  buy_fee_bps integer not null default 100 check (buy_fee_bps between 0 and 10000),
  sell_fee_bps integer not null default 100 check (sell_fee_bps between 0 and 10000),
  minimum_ngn numeric(20, 2) not null default 0 check (minimum_ngn >= 0),
  maximum_ngn numeric(20, 2) check (maximum_ngn is null or maximum_ngn >= minimum_ngn),
  quote_ttl_seconds integer not null default 120 check (quote_ttl_seconds between 15 and 900),
  trading_enabled boolean not null default false,
  rate_source text,
  rate_updated_at timestamptz,
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);

create trigger exchange_settings_set_updated_at
  before update on public.exchange_settings
  for each row execute function public.set_updated_at();

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('OGX-' || upper(encode(gen_random_bytes(6), 'hex'))),
  user_id uuid not null references public.profiles (id) on delete restrict,
  asset_id uuid not null references public.assets (id) on delete restrict,
  network_id uuid references public.asset_networks (id) on delete restrict,
  direction public.trade_direction not null,
  status public.order_status not null default 'pending_review',
  asset_amount numeric(30, 12) not null check (asset_amount > 0),
  ngn_amount numeric(20, 2) not null check (ngn_amount > 0),
  fee_ngn numeric(20, 2) not null default 0 check (fee_ngn >= 0),
  quoted_rate numeric(24, 8) not null check (quoted_rate > 0),
  idempotency_key text not null check (length(idempotency_key) between 16 and 128),
  quote_expires_at timestamptz not null,
  payout_reference text unique,
  rejection_reason text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);

create index orders_user_created_idx on public.orders (user_id, created_at desc);
create index orders_status_created_idx on public.orders (status, created_at desc);
create index orders_asset_created_idx on public.orders (asset_id, created_at desc);

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete restrict,
  order_id uuid references public.orders (id) on delete restrict,
  entry_type public.ledger_entry_type not null,
  currency_code text not null check (currency_code = upper(currency_code)),
  amount numeric(30, 12) not null check (amount <> 0),
  external_reference text,
  description text not null,
  created_at timestamptz not null default now()
);

create index ledger_entries_user_created_idx on public.ledger_entries (user_id, created_at desc);
create index ledger_entries_order_idx on public.ledger_entries (order_id);
create unique index ledger_entries_external_reference_idx
  on public.ledger_entries (external_reference)
  where external_reference is not null;

create function public.prevent_ledger_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Ledger entries are append-only';
end;
$$;

create trigger ledger_entries_are_immutable
  before update or delete on public.ledger_entries
  for each row execute function public.prevent_ledger_mutation();

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  signature_verified boolean not null default false,
  payload_sha256 text not null check (payload_sha256 ~ '^[a-f0-9]{64}$'),
  order_id uuid references public.orders (id) on delete restrict,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_error text,
  unique (provider, provider_event_id)
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  message text not null,
  category text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  request_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_idx on public.audit_logs (created_at desc);
create index audit_logs_actor_created_idx on public.audit_logs (actor_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.assets enable row level security;
alter table public.asset_networks enable row level security;
alter table public.exchange_settings enable row level security;
alter table public.orders enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.payment_events enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

create policy "Customers and compliance can read permitted profiles"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.has_compliance_role()));

create policy "Customers can update their profile details"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Enabled assets are visible"
  on public.assets for select to authenticated
  using (enabled or (select public.has_staff_role()));

create policy "Enabled networks are visible"
  on public.asset_networks for select to authenticated
  using (enabled or (select public.has_staff_role()));

create policy "Customers can read their own orders"
  on public.orders for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_compliance_role()));

create policy "Customers can read their own ledger entries"
  on public.ledger_entries for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_compliance_role()));

create policy "Customers can read their own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_staff_role()));

create policy "Customers can mark their own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "Admins can read audit logs"
  on public.audit_logs for select to authenticated
  using ((select public.has_admin_role()));

revoke all on all tables in schema public from anon, authenticated;
grant usage on schema public to authenticated, service_role;
grant select on public.profiles, public.assets, public.asset_networks,
  public.orders, public.ledger_entries, public.notifications, public.audit_logs
  to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;
grant update (read_at) on public.notifications to authenticated;
grant select, insert, update, delete on all tables in schema public to service_role;

insert into public.assets (symbol, name, asset_type, decimals, enabled)
values
  ('BTC', 'Bitcoin', 'crypto', 8, false),
  ('ETH', 'Ethereum', 'crypto', 18, false),
  ('USDT', 'Tether', 'stablecoin', 6, false)
on conflict (symbol) do nothing;

insert into public.asset_networks (asset_id, network_code, network_name, enabled)
select id, 'BITCOIN', 'Bitcoin', false from public.assets where symbol = 'BTC'
union all
select id, 'ETHEREUM', 'Ethereum', false from public.assets where symbol = 'ETH'
union all
select id, 'ETHEREUM', 'Ethereum', false from public.assets where symbol = 'USDT'
union all
select id, 'TRON', 'Tron', false from public.assets where symbol = 'USDT'
on conflict (asset_id, network_code) do nothing;

insert into public.exchange_settings (asset_id, trading_enabled)
select id, false from public.assets
where symbol in ('BTC', 'ETH', 'USDT')
on conflict (asset_id) do nothing;
