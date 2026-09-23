-- =============================================================================
-- K-Tech — remove the OLD demo schema (the previous supabase/schema.sql)
--
-- Only run this if you ran the old schema.sql in this Supabase project before.
-- It deletes the old demo tables AND ALL ROWS IN THEM (demo products, old
-- orders, repair requests, profiles). Supabase Auth users are NOT touched.
-- If you never ran the old schema.sql, you don't need this file.
-- =============================================================================

drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.order_items cascade;
drop table if exists public.orders cascade;
drop table if exists public.products cascade;
drop table if exists public.categories cascade;
drop table if exists public.repair_requests cascade;
drop table if exists public.site_settings cascade;
drop table if exists public.profiles cascade;

drop function if exists public.handle_new_user() cascade;
drop function if exists public.is_admin() cascade;
drop function if exists public.touch_updated_at() cascade;

drop policy if exists "product_images_public_read" on storage.objects;
drop policy if exists "product_images_admin_write" on storage.objects;
drop policy if exists "product_images_admin_update" on storage.objects;
drop policy if exists "product_images_admin_delete" on storage.objects;
