-- =============================================================================
-- K-Tech e-commerce — Supabase database setup
--
-- Creates: profiles, admin_users, categories, products, product_images, offers,
--          carts, cart_items, order_statuses, orders, order_items,
--          repair_requests, site_settings
-- Plus:    helper functions, triggers, the product_catalog view,
--          Row Level Security policies and Storage buckets.
--
-- Run the whole file once in Supabase → SQL Editor → New query → Run.
-- It is safe to run again (every statement is idempotent).
--
-- Passwords are handled ONLY by Supabase Auth (auth.users). No table here
-- stores passwords, and admin rights come from admin_users — never from email.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- 0. Stop if the old demo schema (text product ids) is still installed
-- -----------------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products'
      and column_name = 'id' and data_type = 'text'
  ) then
    raise exception
      'The old K-Tech demo schema is installed. Run supabase/reset_old_demo_schema.sql first, then run this file again.';
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- 1. Shared helpers
-- -----------------------------------------------------------------------------

-- Keeps updated_at current on every UPDATE.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Price after applying one discount. Never below zero, rounded to 2 decimals.
create or replace function public.apply_discount(
  p_price numeric,
  p_discount_type text,
  p_discount_value numeric
)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_discount_type is null or p_discount_value is null then p_price
    when p_discount_type = 'percentage'
      then greatest(0, round(p_price - (p_price * p_discount_value / 100), 2))
    when p_discount_type = 'fixed'
      then greatest(0, round(p_price - p_discount_value, 2))
    else p_price
  end;
$$;


-- -----------------------------------------------------------------------------
-- 2. Profiles (one row per auth.users row)
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Create the profile when someone signs up (email/password or Google).
-- Google puts the name in full_name/name and the photo in avatar_url/picture.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep email in sync, and fill name/photo if they were empty (e.g. the user
-- later links a Google account).
create or replace function public.handle_user_updated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles p
  set email      = new.email,
      full_name  = coalesce(p.full_name,
                            new.raw_user_meta_data ->> 'full_name',
                            new.raw_user_meta_data ->> 'name'),
      avatar_url = coalesce(p.avatar_url,
                            new.raw_user_meta_data ->> 'avatar_url',
                            new.raw_user_meta_data ->> 'picture')
  where p.id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.handle_user_updated();

-- Backfill profiles for anyone who signed up before this script ran.
insert into public.profiles (id, email, full_name, avatar_url)
select u.id,
       u.email,
       coalesce(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'),
       coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture')
from auth.users u
on conflict (id) do nothing;


-- -----------------------------------------------------------------------------
-- 3. Administrators
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

-- True when the signed-in user is listed in admin_users. SECURITY DEFINER so
-- it can read admin_users regardless of that table's own policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_users a where a.user_id = auth.uid()
  );
$$;


-- -----------------------------------------------------------------------------
-- 4. Categories
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  name         text not null check (length(btrim(name)) > 0),
  slug         text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description  text,
  image_url    text,
  sort_order   integer not null default 0,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 5. Products
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null check (length(btrim(name)) > 0),
  slug               text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description  text,                                   -- one-line tagline for cards
  description        text not null default '',
  price              numeric(12, 2) not null check (price >= 0),
  compare_price      numeric(12, 2) check (compare_price is null or compare_price >= 0),
  stock_quantity     integer not null default 0 check (stock_quantity >= 0),
  category_id        uuid references public.categories (id) on delete set null,
  image_url          text,          -- main image; kept in sync with product_images
  brand              text,
  sku                text unique,
  condition          text,          -- e.g. New, Excellent, Good (used phones)
  specifications     jsonb not null default '[]'::jsonb
                     check (jsonb_typeof(specifications) = 'array'),  -- [{"label":"RAM","value":"8GB"}]
  features           text[] not null default '{}',
  is_featured        boolean not null default false,
  is_active          boolean not null default true,
  created_by         uuid default auth.uid() references auth.users (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  search_vector      tsvector generated always as (
                       to_tsvector('simple',
                         coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' ||
                         coalesce(sku, '') || ' ' || coalesce(short_description, ''))
                     ) stored
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_active_created_idx on public.products (is_active, created_at desc);
create index if not exists products_featured_idx on public.products (is_featured) where is_featured;
create index if not exists products_search_idx on public.products using gin (search_vector);

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 6. Product images (files live in the product-images Storage bucket)
-- -----------------------------------------------------------------------------
create table if not exists public.product_images (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid not null references public.products (id) on delete cascade,
  image_url     text not null,      -- public URL shown in the shop
  storage_path  text,               -- path inside the bucket, used to delete the file
  alt_text      text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_order);

-- products.image_url always points at the first image (lowest sort_order).
create or replace function public.sync_product_main_image()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_product_id uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
  set image_url = (
    select i.image_url
    from public.product_images i
    where i.product_id = v_product_id
    order by i.sort_order, i.created_at
    limit 1
  )
  where p.id = v_product_id;

  -- An image moved to another product: refresh the old product too.
  if tg_op = 'UPDATE' and old.product_id is distinct from new.product_id then
    update public.products p
    set image_url = (
      select i.image_url from public.product_images i
      where i.product_id = old.product_id
      order by i.sort_order, i.created_at limit 1
    )
    where p.id = old.product_id;
  end if;

  return null;
end;
$$;

drop trigger if exists product_images_sync_main on public.product_images;
create trigger product_images_sync_main
  after insert or update or delete on public.product_images
  for each row execute function public.sync_product_main_image();


-- -----------------------------------------------------------------------------
-- 7. Offers (admin-only writes)
-- -----------------------------------------------------------------------------
create table if not exists public.offers (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  title           text not null check (length(btrim(title)) > 0),
  description     text,
  discount_type   text not null check (discount_type in ('percentage', 'fixed')),
  discount_value  numeric(12, 2) not null check (discount_value > 0),
  start_date      timestamptz not null default now(),
  end_date        timestamptz not null,
  is_active       boolean not null default true,
  created_by      uuid default auth.uid() references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint offers_dates_valid check (end_date > start_date),
  constraint offers_percentage_max check (discount_type <> 'percentage' or discount_value <= 100)
);

create index if not exists offers_product_idx on public.offers (product_id);
create index if not exists offers_window_idx on public.offers (is_active, start_date, end_date);

drop trigger if exists offers_set_updated_at on public.offers;
create trigger offers_set_updated_at
  before update on public.offers
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 8. Catalog view: product + category + best running offer + final price
--    security_invoker = the caller's RLS applies (customers only see active
--    products and running offers; admins see everything).
-- -----------------------------------------------------------------------------
drop view if exists public.product_catalog;
create view public.product_catalog
with (security_invoker = true)
as
select
  p.id,
  p.name,
  p.slug,
  p.short_description,
  p.description,
  p.price,
  p.compare_price,
  p.stock_quantity,
  p.category_id,
  c.name  as category_name,
  c.slug  as category_slug,
  p.image_url,
  p.brand,
  p.sku,
  p.condition,
  p.specifications,
  p.features,
  p.is_featured,
  p.is_active,
  p.created_at,
  p.updated_at,
  p.search_vector,
  o.id              as offer_id,
  o.title           as offer_title,
  o.discount_type   as offer_discount_type,
  o.discount_value  as offer_discount_value,
  o.start_date      as offer_start_date,
  o.end_date        as offer_end_date,
  coalesce(
    public.apply_discount(p.price, o.discount_type, o.discount_value),
    p.price
  ) as final_price
from public.products p
left join public.categories c on c.id = p.category_id
left join lateral (
  select o.*
  from public.offers o
  where o.product_id = p.id
    and o.is_active
    and o.start_date <= now()
    and o.end_date > now()
  order by public.apply_discount(p.price, o.discount_type, o.discount_value) asc, o.end_date asc
  limit 1
) o on true;


-- -----------------------------------------------------------------------------
-- 9. Carts (one per user) and cart items
-- -----------------------------------------------------------------------------
create table if not exists public.carts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique default auth.uid() references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists carts_set_updated_at on public.carts;
create trigger carts_set_updated_at
  before update on public.carts
  for each row execute function public.set_updated_at();

create table if not exists public.cart_items (
  id          uuid primary key default gen_random_uuid(),
  cart_id     uuid not null references public.carts (id) on delete cascade,
  product_id  uuid not null references public.products (id) on delete cascade,
  quantity    integer not null check (quantity between 1 and 999),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (cart_id, product_id)
);

create index if not exists cart_items_cart_idx on public.cart_items (cart_id);

drop trigger if exists cart_items_set_updated_at on public.cart_items;
create trigger cart_items_set_updated_at
  before update on public.cart_items
  for each row execute function public.set_updated_at();

-- Adds a product to the signed-in user's cart (creating the cart if needed).
-- Runs with the caller's permissions, so RLS still applies.
create or replace function public.add_to_cart(p_product_id uuid, p_quantity integer default 1)
returns public.cart_items
language plpgsql
set search_path = ''
as $$
declare
  v_cart_id uuid;
  v_item public.cart_items;
begin
  if auth.uid() is null then
    raise exception 'Please sign in to use the cart.' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 1 then
    raise exception 'Quantity must be at least 1.' using errcode = '22023';
  end if;

  insert into public.carts (user_id) values (auth.uid())
  on conflict (user_id) do nothing;

  select id into v_cart_id from public.carts where user_id = auth.uid();

  insert into public.cart_items (cart_id, product_id, quantity)
  values (v_cart_id, p_product_id, least(p_quantity, 999))
  on conflict (cart_id, product_id)
  do update set quantity = least(public.cart_items.quantity + excluded.quantity, 999)
  returning * into v_item;

  return v_item;
end;
$$;


-- -----------------------------------------------------------------------------
-- 10. Order statuses (lookup table — add/rename statuses here, not in code)
-- -----------------------------------------------------------------------------
create table if not exists public.order_statuses (
  code        text primary key check (code ~ '^[a-z_]+$'),
  label       text not null,
  sort_order  integer not null default 0,
  is_final    boolean not null default false
);

insert into public.order_statuses (code, label, sort_order, is_final) values
  ('pending',    'Pending',    10, false),
  ('confirmed',  'Confirmed',  20, false),
  ('processing', 'Processing', 30, false),
  ('shipped',    'Shipped',    40, false),
  ('delivered',  'Delivered',  50, true),
  ('cancelled',  'Cancelled',  60, true)
on conflict (code) do nothing;


-- -----------------------------------------------------------------------------
-- 11. Shop settings (single row). Also holds the shipping rule used at checkout.
-- -----------------------------------------------------------------------------
create table if not exists public.site_settings (
  id                       text primary key default 'default' check (id = 'default'),
  shop_name                text not null default 'K-Tech',
  whatsapp_number          text not null default '94725544428',
  phone                    text not null default '+94 72 554 4428',
  email                    text not null default 'info@ktech.shop',
  address                  text not null default 'Shop #12, Main Bazaar, Lahore, Pakistan',
  currency                 text not null default 'Rs.',
  shipping_fee             numeric(12, 2) not null default 250 check (shipping_fee >= 0),
  free_shipping_threshold  numeric(12, 2) not null default 5000 check (free_shipping_threshold >= 0),
  updated_at               timestamptz not null default now()
);

insert into public.site_settings (id) values ('default') on conflict (id) do nothing;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 12. Orders and order items
--     order_items keeps the name and price at the time of purchase, so later
--     price changes never rewrite order history.
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id                uuid primary key default gen_random_uuid(),
  order_number      bigint generated always as identity unique,
  user_id           uuid references auth.users (id) on delete set null,
  status            text not null default 'pending'
                    references public.order_statuses (code) on update cascade,
  subtotal          numeric(12, 2) not null check (subtotal >= 0),   -- list prices × qty
  discount          numeric(12, 2) not null default 0 check (discount >= 0),
  shipping_fee      numeric(12, 2) not null default 0 check (shipping_fee >= 0),
  total             numeric(12, 2) not null check (total >= 0),
  shipping_address  jsonb not null check (jsonb_typeof(shipping_address) = 'object'),
  customer_email    text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists orders_user_created_idx on public.orders (user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create table if not exists public.order_items (
  id                   uuid primary key default gen_random_uuid(),
  order_id             uuid not null references public.orders (id) on delete cascade,
  product_id           uuid references public.products (id) on delete set null,
  product_name         text not null,
  sku                  text,
  image_url            text,
  original_unit_price  numeric(12, 2) not null check (original_unit_price >= 0),
  unit_price           numeric(12, 2) not null check (unit_price >= 0),  -- price paid per unit
  offer_id             uuid references public.offers (id) on delete set null,
  quantity             integer not null check (quantity > 0),
  subtotal             numeric(12, 2) not null check (subtotal >= 0)     -- unit_price × quantity
);

create index if not exists order_items_order_idx on public.order_items (order_id);

-- Stock handling on status changes:
--  * moving an order to 'cancelled' puts its items back in stock
--  * a cancelled order cannot be reopened (place a new order instead)
create or replace function public.handle_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status then
    if old.status = 'cancelled' then
      raise exception 'A cancelled order cannot be reopened.' using errcode = '22023';
    end if;

    if new.status = 'cancelled' then
      update public.products p
      set stock_quantity = p.stock_quantity + i.quantity
      from (
        select product_id, sum(quantity)::integer as quantity
        from public.order_items
        where order_id = new.id and product_id is not null
        group by product_id
      ) i
      where p.id = i.product_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists orders_status_change on public.orders;
create trigger orders_status_change
  before update of status on public.orders
  for each row execute function public.handle_order_status_change();

-- Priced lines of a cart: list price and best running offer per product.
-- Internal helper for place_order() (not callable from the website).
create or replace function public.cart_order_lines(p_cart_id uuid)
returns table (
  product_id           uuid,
  quantity             integer,
  name                 text,
  sku                  text,
  image_url            text,
  original_unit_price  numeric,
  offer_id             uuid,
  unit_price           numeric
)
language sql
stable
set search_path = ''
as $$
  select
    ci.product_id,
    ci.quantity,
    p.name,
    p.sku,
    p.image_url,
    p.price,
    best.offer_id,
    coalesce(best.offer_price, p.price)
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  left join lateral (
    select o.id as offer_id,
           public.apply_discount(p.price, o.discount_type, o.discount_value) as offer_price
    from public.offers o
    where o.product_id = p.id
      and o.is_active
      and o.start_date <= now()
      and o.end_date > now()
    order by 2 asc, o.end_date asc
    limit 1
  ) best on true
  where ci.cart_id = p_cart_id;
$$;

-- Places an order from the signed-in user's cart.
-- Prices, offers, shipping and stock are all checked here on the server, so a
-- customer cannot change what they pay. Returns the new order id.
--
-- p_shipping_address must include: full_name, phone, address_line1, city
-- (address_line2, postal_code, etc. are optional).
create or replace function public.place_order(
  p_shipping_address jsonb,
  p_notes text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id    uuid := auth.uid();
  v_cart_id    uuid;
  v_order_id   uuid;
  v_subtotal   numeric(12, 2);
  v_paid       numeric(12, 2);
  v_shipping   numeric(12, 2);
  v_settings   public.site_settings;
  v_problem    text;
  v_key        text;
begin
  if v_user_id is null then
    raise exception 'Please sign in to place an order.' using errcode = '42501';
  end if;

  if p_shipping_address is null or jsonb_typeof(p_shipping_address) <> 'object' then
    raise exception 'A delivery address is required.' using errcode = '22023';
  end if;
  foreach v_key in array array['full_name', 'phone', 'address_line1', 'city'] loop
    if length(btrim(coalesce(p_shipping_address ->> v_key, ''))) = 0 then
      raise exception 'Delivery address is missing %.', replace(v_key, '_', ' ')
        using errcode = '22023';
    end if;
  end loop;

  select id into v_cart_id from public.carts where user_id = v_user_id;
  if v_cart_id is null or not exists (select 1 from public.cart_items where cart_id = v_cart_id) then
    raise exception 'Your cart is empty.' using errcode = '22023';
  end if;

  -- Lock the products in the cart so two orders can't oversell the same stock.
  perform 1
  from public.products p
  join public.cart_items ci on ci.product_id = p.id
  where ci.cart_id = v_cart_id
  for update of p;

  select string_agg(
           case
             when not p.is_active then p.name || ' is no longer available'
             else p.name || ' has only ' || p.stock_quantity || ' left'
           end, '; ')
    into v_problem
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.cart_id = v_cart_id
    and (not p.is_active or p.stock_quantity < ci.quantity);

  if v_problem is not null then
    raise exception '%', v_problem using errcode = '22023';
  end if;

  select sum(original_unit_price * quantity), sum(unit_price * quantity)
    into v_subtotal, v_paid
  from public.cart_order_lines(v_cart_id);

  select * into v_settings from public.site_settings where id = 'default';
  v_shipping := case
    when v_settings.id is null then 0
    when v_paid > v_settings.free_shipping_threshold then 0
    else v_settings.shipping_fee
  end;

  insert into public.orders (
    user_id, status, subtotal, discount, shipping_fee, total,
    shipping_address, customer_email, notes
  )
  values (
    v_user_id, 'pending', v_subtotal, v_subtotal - v_paid, v_shipping, v_paid + v_shipping,
    p_shipping_address,
    (select email from auth.users where id = v_user_id),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning id into v_order_id;

  insert into public.order_items (
    order_id, product_id, product_name, sku, image_url,
    original_unit_price, unit_price, offer_id, quantity, subtotal
  )
  select v_order_id, product_id, name, sku, image_url,
         original_unit_price, unit_price, offer_id, quantity, unit_price * quantity
  from public.cart_order_lines(v_cart_id);

  update public.products p
  set stock_quantity = p.stock_quantity - l.quantity
  from public.cart_items l
  where l.cart_id = v_cart_id and p.id = l.product_id;

  delete from public.cart_items where cart_id = v_cart_id;

  return v_order_id;
end;
$$;

-- Lets a customer cancel their own order while it is still pending.
create or replace function public.cancel_my_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.orders
  set status = 'cancelled'
  where id = p_order_id
    and user_id = auth.uid()
    and status = 'pending';

  if not found then
    raise exception 'Only your own pending orders can be cancelled.' using errcode = '42501';
  end if;
end;
$$;


-- -----------------------------------------------------------------------------
-- 13. Repair requests (public form on the site; admins manage them)
-- -----------------------------------------------------------------------------
create table if not exists public.repair_requests (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid default auth.uid() references auth.users (id) on delete set null,
  customer_name  text not null check (length(btrim(customer_name)) >= 2),
  phone_number   text not null,
  phone_brand    text not null,
  phone_model    text not null,
  issue          text not null,
  message        text,
  status         text not null default 'new'
                 check (status in ('new', 'contacted', 'in_progress', 'completed', 'cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists repair_requests_status_idx on public.repair_requests (status, created_at desc);

drop trigger if exists repair_requests_set_updated_at on public.repair_requests;
create trigger repair_requests_set_updated_at
  before update on public.repair_requests
  for each row execute function public.set_updated_at();


-- -----------------------------------------------------------------------------
-- 14. Admin dashboard numbers in one call (admins only)
-- -----------------------------------------------------------------------------
create or replace function public.admin_dashboard_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'total_products',   (select count(*) from public.products),
    'active_products',  (select count(*) from public.products where is_active),
    'low_stock',        (select count(*) from public.products where is_active and stock_quantity <= 5),
    'total_users',      (select count(*) from public.profiles),
    'active_offers',    (select count(*) from public.offers
                          where is_active and start_date <= now() and end_date > now()),
    'total_orders',     (select count(*) from public.orders),
    'pending_orders',   (select count(*) from public.orders where status = 'pending'),
    'revenue',          (select coalesce(sum(total), 0) from public.orders where status <> 'cancelled'),
    'new_repairs',      (select count(*) from public.repair_requests where status = 'new')
  );
end;
$$;


-- =============================================================================
-- 15. Privileges (least privilege; RLS below decides which ROWS)
--     Supabase grants everything to anon/authenticated by default, so we
--     reset and grant only what each role needs.
-- =============================================================================
-- API roles need to reach the schema (explicit, in case "Automatically expose
-- new tables" was switched off when the project was created).
grant usage on schema public to anon, authenticated;

revoke all on
  public.profiles, public.admin_users, public.categories, public.products,
  public.product_images, public.offers, public.carts, public.cart_items,
  public.order_statuses, public.orders, public.order_items,
  public.repair_requests, public.site_settings, public.product_catalog
from anon, authenticated;

-- Catalogue: readable by everyone (RLS hides inactive rows)
grant select on
  public.categories, public.products, public.product_images, public.offers,
  public.order_statuses, public.site_settings, public.product_catalog
to anon, authenticated;

-- Catalogue writes: signed-in users only, and RLS limits them to admins
grant insert, update, delete on
  public.categories, public.products, public.product_images, public.offers,
  public.order_statuses
to authenticated;
grant update on public.site_settings to authenticated;

-- Profiles: read (own / admin), edit only these columns
grant select on public.profiles to authenticated;
grant update (full_name, avatar_url, phone) on public.profiles to authenticated;

-- Admin list
grant select, insert, delete on public.admin_users to authenticated;

-- Cart
grant select, insert, update, delete on public.carts, public.cart_items to authenticated;

-- Orders: created only through place_order(); admins may change status/notes/address
grant select on public.orders, public.order_items to authenticated;
grant update (status, notes, shipping_address) on public.orders to authenticated;

-- Repair requests: anyone can submit; admins read/manage
grant insert on public.repair_requests to anon, authenticated;
grant select, update, delete on public.repair_requests to authenticated;

-- Functions
revoke execute on function
  public.place_order(jsonb, text),
  public.cancel_my_order(uuid),
  public.add_to_cart(uuid, integer),
  public.admin_dashboard_stats()
from public, anon;
grant execute on function
  public.place_order(jsonb, text),
  public.cancel_my_order(uuid),
  public.add_to_cart(uuid, integer),
  public.admin_dashboard_stats()
to authenticated;

grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.apply_discount(numeric, text, numeric) to anon, authenticated;

-- Trigger functions are never called directly
revoke execute on function
  public.handle_new_user(), public.handle_user_updated(),
  public.handle_order_status_change(), public.sync_product_main_image(),
  public.set_updated_at(), public.cart_order_lines(uuid)
from public, anon, authenticated;


-- =============================================================================
-- 16. Row Level Security
-- =============================================================================
alter table public.profiles         enable row level security;
alter table public.admin_users      enable row level security;
alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_images   enable row level security;
alter table public.offers           enable row level security;
alter table public.carts            enable row level security;
alter table public.cart_items       enable row level security;
alter table public.order_statuses   enable row level security;
alter table public.orders           enable row level security;
alter table public.order_items      enable row level security;
alter table public.repair_requests  enable row level security;
alter table public.site_settings    enable row level security;

-- ---------- profiles: own row (admins can read everyone) ----------
drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------- admin_users: you can see your own row; admins manage the list ----------
drop policy if exists "admin_users: read own or admin" on public.admin_users;
create policy "admin_users: read own or admin" on public.admin_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "admin_users: admins add" on public.admin_users;
create policy "admin_users: admins add" on public.admin_users
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists "admin_users: admins remove others" on public.admin_users;
create policy "admin_users: admins remove others" on public.admin_users
  for delete to authenticated
  using (public.is_admin() and user_id <> auth.uid());   -- can't lock yourself out

-- ---------- categories ----------
drop policy if exists "categories: read active or admin" on public.categories;
create policy "categories: read active or admin" on public.categories
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "categories: admin insert" on public.categories;
create policy "categories: admin insert" on public.categories
  for insert to authenticated with check (public.is_admin());

drop policy if exists "categories: admin update" on public.categories;
create policy "categories: admin update" on public.categories
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "categories: admin delete" on public.categories;
create policy "categories: admin delete" on public.categories
  for delete to authenticated using (public.is_admin());

-- ---------- products ----------
drop policy if exists "products: read active or admin" on public.products;
create policy "products: read active or admin" on public.products
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "products: admin insert" on public.products;
create policy "products: admin insert" on public.products
  for insert to authenticated with check (public.is_admin());

drop policy if exists "products: admin update" on public.products;
create policy "products: admin update" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "products: admin delete" on public.products;
create policy "products: admin delete" on public.products
  for delete to authenticated using (public.is_admin());

-- ---------- product_images (visible when the product is) ----------
drop policy if exists "product_images: read with product" on public.product_images;
create policy "product_images: read with product" on public.product_images
  for select to anon, authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

drop policy if exists "product_images: admin insert" on public.product_images;
create policy "product_images: admin insert" on public.product_images
  for insert to authenticated with check (public.is_admin());

drop policy if exists "product_images: admin update" on public.product_images;
create policy "product_images: admin update" on public.product_images
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "product_images: admin delete" on public.product_images;
create policy "product_images: admin delete" on public.product_images
  for delete to authenticated using (public.is_admin());

-- ---------- offers: customers see running offers on active products ----------
drop policy if exists "offers: read running or admin" on public.offers;
create policy "offers: read running or admin" on public.offers
  for select to anon, authenticated
  using (
    public.is_admin()
    or (
      is_active
      and start_date <= now()
      and end_date > now()
      and exists (select 1 from public.products p where p.id = product_id and p.is_active)
    )
  );

drop policy if exists "offers: admin insert" on public.offers;
create policy "offers: admin insert" on public.offers
  for insert to authenticated with check (public.is_admin());

drop policy if exists "offers: admin update" on public.offers;
create policy "offers: admin update" on public.offers
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "offers: admin delete" on public.offers;
create policy "offers: admin delete" on public.offers
  for delete to authenticated using (public.is_admin());

-- ---------- carts: only your own ----------
drop policy if exists "carts: own" on public.carts;
create policy "carts: own" on public.carts
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---------- cart_items: only items in your own cart, only active products ----------
drop policy if exists "cart_items: read own" on public.cart_items;
create policy "cart_items: read own" on public.cart_items
  for select to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

drop policy if exists "cart_items: add own" on public.cart_items;
create policy "cart_items: add own" on public.cart_items
  for insert to authenticated
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid())
    and exists (select 1 from public.products p where p.id = product_id and p.is_active)
  );

drop policy if exists "cart_items: update own" on public.cart_items;
create policy "cart_items: update own" on public.cart_items
  for update to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

drop policy if exists "cart_items: delete own" on public.cart_items;
create policy "cart_items: delete own" on public.cart_items
  for delete to authenticated
  using (exists (select 1 from public.carts c where c.id = cart_id and c.user_id = auth.uid()));

-- ---------- order_statuses ----------
drop policy if exists "order_statuses: read" on public.order_statuses;
create policy "order_statuses: read" on public.order_statuses
  for select to anon, authenticated using (true);

drop policy if exists "order_statuses: admin write" on public.order_statuses;
create policy "order_statuses: admin write" on public.order_statuses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- orders: your own; admins see and update all ----------
drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- (no INSERT/DELETE policies: orders are created by place_order() only)

-- ---------- order_items: follow their order ----------
drop policy if exists "order_items: read own or admin" on public.order_items;
create policy "order_items: read own or admin" on public.order_items
  for select to authenticated
  using (
    public.is_admin()
    or exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );

-- ---------- repair_requests ----------
drop policy if exists "repair_requests: anyone submits" on public.repair_requests;
create policy "repair_requests: anyone submits" on public.repair_requests
  for insert to anon, authenticated
  with check (status = 'new' and (user_id is null or user_id = auth.uid()));

drop policy if exists "repair_requests: admin read" on public.repair_requests;
create policy "repair_requests: admin read" on public.repair_requests
  for select to authenticated using (public.is_admin());

drop policy if exists "repair_requests: admin update" on public.repair_requests;
create policy "repair_requests: admin update" on public.repair_requests
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "repair_requests: admin delete" on public.repair_requests;
create policy "repair_requests: admin delete" on public.repair_requests
  for delete to authenticated using (public.is_admin());

-- ---------- site_settings ----------
drop policy if exists "site_settings: read" on public.site_settings;
create policy "site_settings: read" on public.site_settings
  for select to anon, authenticated using (true);

drop policy if exists "site_settings: admin update" on public.site_settings;
create policy "site_settings: admin update" on public.site_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());


-- =============================================================================
-- 17. Storage buckets
--     product-images: public to view, only admins upload/replace/delete.
--       Suggested layout: product-images/<product-id>/<file>.webp
--     avatars: public to view, each user manages files in avatars/<their-id>/
-- =============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product-images: public read" on storage.objects;
create policy "product-images: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product-images: admin upload" on storage.objects;
create policy "product-images: admin upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: admin update" on storage.objects;
create policy "product-images: admin update" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: admin delete" on storage.objects;
create policy "product-images: admin delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'avatars');

drop policy if exists "avatars: own upload" on storage.objects;
create policy "avatars: own upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: own update" on storage.objects;
create policy "avatars: own update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars: own delete" on storage.objects;
create policy "avatars: own delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);


-- =============================================================================
-- 18. Starting categories for the shop (edit or delete them in the admin panel)
--     No products or offers are inserted — add those from the admin panel.
-- =============================================================================
insert into public.categories (name, slug, sort_order) values
  ('Brand New Phones',  'brand-new-phones',  10),
  ('Used Phones',       'used-phones',       20),
  ('Accessories',       'accessories',       30),
  ('Chargers & Cables', 'chargers-cables',   40),
  ('Other Accessories', 'other-accessories', 50)
on conflict (slug) do nothing;


-- =============================================================================
-- NEXT STEP — make yourself an admin (run once, after you have signed up):
--
--   insert into public.admin_users (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict (user_id) do nothing;
--
-- Run it here in the SQL Editor. It cannot be done from the website: only an
-- existing admin can add another admin.
-- =============================================================================
