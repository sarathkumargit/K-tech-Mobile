-- Security & behaviour tests for supabase/schema.sql. Use run.sh (local Postgres only).
\set ON_ERROR_STOP 1
set client_min_messages = warning;

-- ---------- test helpers (run as the current role, so RLS applies) ----------
create schema if not exists test;
grant usage on schema test to anon, authenticated;
create table test.results (n serial, label text, ok boolean, detail text);
grant all on test.results to anon, authenticated;
grant usage on sequence test.results_n_seq to anon, authenticated;

create or replace function test.ok(cond boolean, label text, detail text default null)
returns void language plpgsql as $$
begin
  insert into test.results(label, ok, detail) values (label, coalesce(cond, false), detail);
end $$;

-- Passes when the statement raises an error.
create or replace function test.fails(stmt text, label text)
returns void language plpgsql as $$
begin
  execute stmt;
  insert into test.results(label, ok, detail) values (label, false, 'no error raised');
exception when others then
  insert into test.results(label, ok, detail) values (label, true, sqlerrm);
end $$;

-- Passes when the statement succeeds but changes 0 rows.
create or replace function test.no_rows(stmt text, label text)
returns void language plpgsql as $$
declare n int;
begin
  execute stmt;
  get diagnostics n = row_count;
  insert into test.results(label, ok, detail) values (label, n = 0, n || ' rows changed');
exception when others then
  insert into test.results(label, ok, detail) values (label, true, 'blocked: ' || sqlerrm);
end $$;
grant execute on all functions in schema test to anon, authenticated;

-- ---------- users (as if they signed up through Supabase Auth) ----------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@ktech.test', '{"full_name":"Shop Admin"}'),
  ('00000000-0000-0000-0000-0000000000a1', 'alice@gmail.com',
     '{"name":"Alice Google","picture":"https://lh3.googleusercontent.com/a/alice"}'),
  ('00000000-0000-0000-0000-0000000000b0', 'bob@ktech.test', '{"full_name":"Bob"}');

select test.ok((select count(*) = 3 from public.profiles), 'signup trigger creates a profile for each user');
select test.ok((select full_name = 'Alice Google' and avatar_url like 'https://lh3%' from public.profiles
                where email = 'alice@gmail.com'), 'Google name + picture copied into profile');

update auth.users set email = 'bob.new@ktech.test' where email = 'bob@ktech.test';
select test.ok((select email = 'bob.new@ktech.test' from public.profiles
                where id = '00000000-0000-0000-0000-0000000000b0'), 'email change syncs to profile');

-- first admin is added from the SQL editor (postgres role)
insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-00000000000a');

-- =========================================================================
-- ANONYMOUS VISITOR
-- =========================================================================
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select test.ok((select count(*) = 5 from public.categories), 'anon: can read the 5 starting categories');
select test.ok(not public.is_admin(), 'anon: is_admin() is false');
select test.fails($$insert into public.products (name, slug, price) values ('Hack', 'hack', 1)$$,
                  'anon: cannot create products');
select test.fails($$insert into public.categories (name, slug) values ('X', 'x')$$,
                  'anon: cannot create categories');
select test.fails($$select * from public.profiles$$, 'anon: cannot read profiles');
select test.fails($$select * from public.orders$$, 'anon: cannot read orders');
select test.fails($$select public.add_to_cart(gen_random_uuid(), 1)$$, 'anon: cannot use a cart');
select test.fails($$select public.place_order('{}'::jsonb)$$, 'anon: cannot place orders');
insert into public.repair_requests (customer_name, phone_number, phone_brand, phone_model, issue)
values ('Walk In', '03001234567', 'Samsung', 'S21', 'Cracked screen');
select test.ok(true, 'anon: can submit a repair request');
select test.fails($$select * from public.repair_requests$$, 'anon: cannot read repair requests');
select test.fails($$insert into public.repair_requests (customer_name, phone_number, phone_brand, phone_model, issue, status)
                    values ('Sneaky', '0300', 'X', 'Y', 'z', 'completed')$$,
                  'anon: cannot submit a repair request with a forged status');
select test.fails($$insert into storage.objects (bucket_id, name) values ('product-images', 'x/evil.png')$$,
                  'anon: cannot upload product images');
select test.ok((select count(*) = 1 from public.site_settings), 'anon: can read shop settings');
select test.fails($$update public.site_settings set shop_name = 'Hacked'$$, 'anon: cannot change shop settings');

reset role;

-- =========================================================================
-- ADMIN
-- =========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

select test.ok(public.is_admin(), 'admin: is_admin() is true');

insert into public.products (id, name, slug, price, compare_price, stock_quantity, brand, sku, category_id)
values
  ('10000000-0000-0000-0000-00000000000a', 'Aurora Pro 5G', 'aurora-pro-5g', 1000, 1200, 5, 'Aurora', 'AUR-PRO',
     (select id from public.categories where slug = 'brand-new-phones')),
  ('10000000-0000-0000-0000-00000000000b', 'Hidden Draft', 'hidden-draft', 500, null, 10, 'K-Tech', 'DRAFT', null),
  ('10000000-0000-0000-0000-00000000000c', 'USB-C Cable', 'usb-c-cable', 200, null, 10, 'K-Tech', 'CB-2M',
     (select id from public.categories where slug = 'chargers-cables'));
update public.products set is_active = false where slug = 'hidden-draft';

select test.ok((select created_by = '00000000-0000-0000-0000-00000000000a' from public.products where slug = 'aurora-pro-5g'),
               'admin: created_by is filled in automatically');

insert into public.product_images (product_id, image_url, storage_path, sort_order) values
  ('10000000-0000-0000-0000-00000000000a', 'https://cdn/aurora-2.webp', 'aurora/2.webp', 1),
  ('10000000-0000-0000-0000-00000000000a', 'https://cdn/aurora-1.webp', 'aurora/1.webp', 0);
select test.ok((select image_url = 'https://cdn/aurora-1.webp' from public.products where slug = 'aurora-pro-5g'),
               'admin: product main image = first image by sort order');
delete from public.product_images where storage_path = 'aurora/1.webp';
select test.ok((select image_url = 'https://cdn/aurora-2.webp' from public.products where slug = 'aurora-pro-5g'),
               'admin: main image moves to the next image when one is deleted');

insert into public.offers (product_id, title, discount_type, discount_value, start_date, end_date) values
  ('10000000-0000-0000-0000-00000000000a', '20% off Aurora', 'percentage', 20, now() - interval '1 hour', now() + interval '2 days'),
  ('10000000-0000-0000-0000-00000000000a', 'Rs 100 off Aurora', 'fixed', 100, now() - interval '1 hour', now() + interval '2 days'),
  ('10000000-0000-0000-0000-00000000000c', 'Coming soon', 'percentage', 50, now() + interval '1 day', now() + interval '3 days'),
  ('10000000-0000-0000-0000-00000000000c', 'Switched off', 'percentage', 50, now() - interval '1 day', now() + interval '3 days');
update public.offers set is_active = false where title = 'Switched off';

select test.fails($$insert into public.offers (product_id, title, discount_type, discount_value, end_date)
                    values ('10000000-0000-0000-0000-00000000000a', 'Bad', 'percentage', 150, now() + interval '1 day')$$,
                  'admin: percentage offers above 100% are rejected');
select test.fails($$insert into public.offers (product_id, title, discount_type, discount_value, start_date, end_date)
                    values ('10000000-0000-0000-0000-00000000000a', 'Bad', 'fixed', 10, now(), now() - interval '1 day')$$,
                  'admin: offers that end before they start are rejected');
select test.fails($$insert into public.products (name, slug, price) values ('Bad slug', 'Bad Slug!', 1)$$,
                  'admin: invalid slugs are rejected');

insert into storage.objects (bucket_id, name) values ('product-images', '10000000-0000-0000-0000-00000000000a/1.webp');
select test.ok(true, 'admin: can upload to product-images');

insert into public.categories (name, slug) values ('Tablets', 'tablets');
update public.categories set is_active = false where slug = 'tablets';
select test.ok(true, 'admin: can create and deactivate categories');

select test.ok((select count(*) = 3 from public.products), 'admin: sees inactive products too');

reset role;

-- =========================================================================
-- CUSTOMER: ALICE
-- =========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);

select test.ok(not public.is_admin(), 'alice: is_admin() is false');
select test.ok((select count(*) = 2 from public.products), 'alice: sees only active products');
select test.ok((select count(*) = 5 from public.categories), 'alice: inactive category is hidden');
select test.ok((select count(*) = 2 from public.offers), 'alice: sees only running offers (not upcoming / switched off)');
select test.ok((select final_price = 800 and offer_title = '20% off Aurora' from public.product_catalog where slug = 'aurora-pro-5g'),
               'alice: catalog picks the best running offer (1000 → 800)');
select test.ok((select final_price = 200 and offer_id is null from public.product_catalog where slug = 'usb-c-cable'),
               'alice: product without a running offer keeps its price');
select test.ok((select count(*) = 1 from public.product_images), 'alice: can see images of active products');

select test.fails($$insert into public.products (name, slug, price) values ('Mine', 'mine', 1)$$,
                  'alice: cannot create products');
select test.no_rows($$update public.products set price = 1$$, 'alice: cannot change prices');
select test.no_rows($$delete from public.products$$, 'alice: cannot delete products');
select test.fails($$insert into public.offers (product_id, title, discount_type, discount_value, end_date)
                    values ('10000000-0000-0000-0000-00000000000a', 'Free', 'percentage', 100, now() + interval '1 day')$$,
                  'alice: cannot create offers');
select test.fails($$insert into public.admin_users (user_id) values ('00000000-0000-0000-0000-0000000000a1')$$,
                  'alice: cannot make herself an admin');
select test.fails($$insert into storage.objects (bucket_id, name) values ('product-images', 'x/1.png')$$,
                  'alice: cannot upload product images');
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a1/me.png');
select test.ok(true, 'alice: can upload her own avatar');
select test.fails($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000b0/me.png')$$,
                  'alice: cannot upload into bob''s avatar folder');
select test.fails($$select public.admin_dashboard_stats()$$, 'alice: cannot read admin dashboard stats');

-- profile
select test.ok((select count(*) = 1 from public.profiles), 'alice: sees only her own profile');
update public.profiles set full_name = 'Alice A.', phone = '03001112223' where id = auth.uid();
select test.ok((select full_name = 'Alice A.' from public.profiles where id = auth.uid()), 'alice: can edit her name/phone');
select test.fails($$update public.profiles set email = 'x@y.z' where id = auth.uid()$$, 'alice: cannot overwrite her email column');
select test.no_rows($$update public.profiles set full_name = 'Hacked' where id = '00000000-0000-0000-0000-0000000000b0'$$,
                    'alice: cannot edit bob''s profile');

-- cart
select public.add_to_cart('10000000-0000-0000-0000-00000000000a', 2);
select public.add_to_cart('10000000-0000-0000-0000-00000000000c', 1);
select public.add_to_cart('10000000-0000-0000-0000-00000000000a', 1);
select test.ok((select quantity = 3 from public.cart_items where product_id = '10000000-0000-0000-0000-00000000000a'),
               'alice: adding the same product again increases quantity');
select test.fails($$select public.add_to_cart('10000000-0000-0000-0000-00000000000b', 1)$$,
                  'alice: cannot add an inactive product to her cart');

-- orders
select test.fails($$insert into public.orders (user_id, subtotal, total, shipping_address)
                    values (auth.uid(), 0, 0, '{}')$$, 'alice: cannot insert an order directly (must use place_order)');
select test.fails($$select public.place_order('{"full_name":"Alice","phone":"0300","address_line1":"1 Road"}'::jsonb)$$,
                  'alice: order needs a full delivery address');

create temp table alice_order as
select public.place_order(
  '{"full_name":"Alice A.","phone":"03001112223","address_line1":"12 Main Road","city":"Lahore"}'::jsonb,
  'Call before delivery') as id;
grant select on alice_order to authenticated;

select test.ok((select subtotal = 3200 and discount = 600 and shipping_fee = 250 and total = 2850 and status = 'pending'
                from public.orders where id = (select id from alice_order)),
               'alice: order totals computed on the server (3200 − 600 offer + 250 shipping = 2850)',
               (select format('subtotal=%s discount=%s shipping=%s total=%s', subtotal, discount, shipping_fee, total)
                from public.orders where id = (select id from alice_order)));
select test.ok((select count(*) = 2 and sum(subtotal) = 2600 from public.order_items where order_id = (select id from alice_order)),
               'alice: order items store the price paid');
select test.ok((select unit_price = 800 and original_unit_price = 1000 and product_name = 'Aurora Pro 5G'
                from public.order_items where order_id = (select id from alice_order) and sku = 'AUR-PRO'),
               'alice: order item keeps name + list price + offer price at purchase time');
select test.ok((select count(*) = 0 from public.cart_items), 'alice: cart is emptied after ordering');
select test.ok((select stock_quantity = 2 from public.products where slug = 'aurora-pro-5g'), 'alice: stock went down 5 → 2');
select test.no_rows($$update public.orders set status = 'delivered'$$, 'alice: cannot change her order status');
select test.fails($$update public.orders set total = 0$$, 'alice: cannot change order totals');

-- oversell protection
select public.add_to_cart('10000000-0000-0000-0000-00000000000a', 3);
select test.fails($$select public.place_order('{"full_name":"A","phone":"1","address_line1":"x","city":"y"}'::jsonb)$$,
                  'alice: cannot order more than is in stock');

reset role;

-- =========================================================================
-- CUSTOMER: BOB (must not see or touch Alice's data)
-- =========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b0', false);

select test.ok((select count(*) = 0 from public.orders), 'bob: cannot see alice''s orders');
select test.ok((select count(*) = 0 from public.order_items), 'bob: cannot see alice''s order items');
select test.ok((select count(*) = 0 from public.carts), 'bob: cannot see alice''s cart');
select test.ok((select count(*) = 0 from public.cart_items), 'bob: cannot see alice''s cart items');
select test.no_rows($$update public.cart_items set quantity = 99$$, 'bob: cannot change alice''s cart');
select test.no_rows($$delete from public.cart_items$$, 'bob: cannot delete alice''s cart items');
select test.no_rows($$insert into public.cart_items (cart_id, product_id, quantity)
                    select id, '10000000-0000-0000-0000-00000000000c', 1 from public.carts$$,
                  'bob: cannot add items to someone else''s cart (no cart visible)');
select test.fails(format('select public.cancel_my_order(%L)', (select id from alice_order)),
                  'bob: cannot cancel alice''s order');
select public.add_to_cart('10000000-0000-0000-0000-00000000000c', 2);
select test.ok((select count(*) = 1 and sum(quantity) = 2 from public.cart_items), 'bob: has his own separate cart');

reset role;

-- Bob tries to write into Alice's cart id directly (he knows the uuid somehow)
create temp table alice_cart as select id from public.carts where user_id = '00000000-0000-0000-0000-0000000000a1';
grant select on alice_cart to authenticated;
set role authenticated;
select test.fails(format($$insert into public.cart_items (cart_id, product_id, quantity) values (%L, '10000000-0000-0000-0000-00000000000c', 5)$$,
                  (select id from alice_cart)),
                  'bob: cannot insert into alice''s cart even with its id');
reset role;

-- =========================================================================
-- ALICE cancels her pending order → stock comes back
-- =========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', false);
select public.cancel_my_order((select id from alice_order));
select test.ok((select status = 'cancelled' from public.orders where id = (select id from alice_order)), 'alice: can cancel her pending order');
select test.ok((select stock_quantity = 5 from public.products where slug = 'aurora-pro-5g'), 'alice: cancelling restores stock 2 → 5');
-- place a second order (clears the oversell attempt first)
delete from public.cart_items;
select public.add_to_cart('10000000-0000-0000-0000-00000000000c', 1);
create temp table alice_order2 as
select public.place_order('{"full_name":"Alice","phone":"0300","address_line1":"12 Main Road","city":"Lahore"}'::jsonb) as id;
grant select on alice_order2 to authenticated;
reset role;

-- =========================================================================
-- ADMIN manages orders
-- =========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
select test.ok((select count(*) = 2 from public.orders), 'admin: sees all orders');
select test.ok((select count(*) = 3 from public.profiles), 'admin: can list all users');
update public.orders set status = 'shipped' where id = (select id from alice_order2);
select test.ok((select status = 'shipped' from public.orders where id = (select id from alice_order2)), 'admin: can update order status');
select test.fails(format($$update public.orders set status = 'pending' where id = %L$$, (select id from alice_order)),
                  'admin: cancelled orders cannot be reopened');
select test.fails($$update public.orders set total = 1$$, 'admin: cannot rewrite order totals');
select test.fails(format($$update public.orders set status = 'lost_in_space' where id = %L$$, (select id from alice_order2)),
                  'admin: status must exist in order_statuses');
select test.ok((select (public.admin_dashboard_stats() ->> 'total_orders')::int = 2), 'admin: dashboard stats work');
select test.no_rows($$delete from public.admin_users where user_id = auth.uid()$$, 'admin: cannot remove their own admin access');
select test.ok((select count(*) = 1 from public.repair_requests), 'admin: can read repair requests');
update public.site_settings set shipping_fee = 300;
select test.ok(true, 'admin: can change shop settings');
reset role;

-- ---------- report ----------
\pset footer off
select n, case when ok then 'PASS' else 'FAIL' end as result, label, left(detail, 70) as detail
from test.results order by n;
select count(*) filter (where ok) as passed, count(*) filter (where not ok) as failed from test.results;
