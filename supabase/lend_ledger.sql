-- =============================================================================
-- Lend book: customers who buy now and pay in parts (admin only).
--
-- Run this ONCE in Supabase → SQL Editor, after schema.sql (it uses
-- public.is_admin() and public.set_updated_at() from there). Safe to re-run.
--
--   lend_accounts  one row per thing a customer owes for (phone, repair, cash)
--   lend_payments  every part-payment against an account
--
-- Balance = total_amount − sum(lend_payments.amount). It is worked out in the
-- app, so there is nothing to keep in sync.
-- =============================================================================

create table if not exists public.lend_accounts (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null check (length(btrim(customer_name)) >= 2),
  phone          text,
  nic            text,
  item           text not null check (length(btrim(item)) >= 1),
  total_amount   numeric(12, 2) not null check (total_amount > 0),
  start_date     date not null default current_date,
  due_date       date,
  notes          text,
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists lend_accounts_created_idx on public.lend_accounts (created_at desc);

drop trigger if exists lend_accounts_set_updated_at on public.lend_accounts;
create trigger lend_accounts_set_updated_at
  before update on public.lend_accounts
  for each row execute function public.set_updated_at();

create table if not exists public.lend_payments (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.lend_accounts (id) on delete cascade,
  amount      numeric(12, 2) not null check (amount > 0),
  paid_on     date not null default current_date,
  method      text not null default 'cash' check (method in ('cash', 'bank', 'card', 'other')),
  note        text,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists lend_payments_account_idx
  on public.lend_payments (account_id, paid_on desc);

-- ---------- access: admins only ----------
revoke all on public.lend_accounts, public.lend_payments from anon, authenticated;
grant select, insert, update, delete on public.lend_accounts, public.lend_payments to authenticated;

alter table public.lend_accounts enable row level security;
alter table public.lend_payments enable row level security;

drop policy if exists "lend_accounts: admin all" on public.lend_accounts;
create policy "lend_accounts: admin all" on public.lend_accounts
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "lend_payments: admin all" on public.lend_payments;
create policy "lend_payments: admin all" on public.lend_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Make the API pick up the new tables straight away.
notify pgrst, 'reload schema';
