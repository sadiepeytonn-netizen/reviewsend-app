-- TEST ONLY: recreates, in a throwaway local Postgres, the parts of Supabase
-- the migrations rely on (roles, auth.jwt(), storage) plus the client app's
-- current tables and its current "allow anyone" rules, as exported on
-- Oct 26, 2026. Never run this against a real project.

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;

create schema auth;
create function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid $$;
grant usage on schema auth to anon, authenticated, service_role;

create schema storage;
create table storage.buckets (id text primary key, name text, public boolean default false);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets(id), name text, owner uuid);
create function storage.foldername(name text) returns text[] language sql immutable as $$
  select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant all on storage.objects, storage.buckets to anon, authenticated, service_role;
insert into storage.buckets values ('business-photos','business-photos',true),('business-logos','business-logos',true),('client-files','client-files',false);
create policy "Public Access" on storage.objects for all using (true) with check (true);

-- Current public tables (columns as exported)
create table public.marketing_companies (id uuid primary key default gen_random_uuid(), created_at timestamp default now(), email text, name text, revenue_share numeric);
create table public.account_managers (id uuid primary key default gen_random_uuid(), created_at timestamp default now(), email text, marketing_company_id uuid references public.marketing_companies(id), name text);
create table public.businesses (id uuid primary key default gen_random_uuid(), account_manager_id uuid references public.account_managers(id), business_type text, city text, created_at timestamp default now(), email text unique, features jsonb, follow_up_template text, google_access_token text, google_account_id text, google_link text, google_location_id text, google_refresh_token text, google_token_expiry bigint, logo_url text, marketing_company_id uuid references public.marketing_companies(id), message_template text, name text, seo_keywords text[], short_description text, social_links jsonb, state text, yelp_link text);
create table public.appointments (id uuid primary key default gen_random_uuid(), account_manager_id uuid, business_id uuid references public.businesses(id), created_at timestamptz default now(), duration_minutes int, marketing_company_id uuid, notes text, starts_at timestamptz, title text);
create table public.bulk_sends (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id), created_at timestamp default now(), failed_count int, platform text, sent_by text, sent_count int, total_contacts int);
create table public.chat_messages (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id), created_at timestamptz default now(), message text, read boolean, sender_name text, sender_role text);
create table public.client_files (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id), created_at timestamptz default now(), file_name text, file_path text, file_size int, uploaded_by text);
create table public.client_notes (id uuid primary key default gen_random_uuid(), author_name text, business_id uuid references public.businesses(id), created_at timestamptz default now(), note text);
create table public.employees (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id), created_at timestamptz default now(), email text unique, name text, password text not null);
create table public.messages (id uuid primary key default gen_random_uuid(), business_id uuid references public.businesses(id), clicked boolean, clicked_at timestamp, customer_name text, customer_phone text, platform text, sent_at timestamp default now(), tracking_code text);
create table public.photos (id uuid primary key default gen_random_uuid(), applied_keywords text[], business_id uuid references public.businesses(id), caption text, created_at timestamp default now(), downloaded_at timestamp, file_name text, file_path text, posted_at timestamp, posted_platforms text[], status text, uploaded_by text);
create table public.rating_snapshots (business_id uuid references public.businesses(id), created_at timestamptz default now(), rating numeric, review_count int);

grant usage on schema public to anon, authenticated, service_role;
grant all on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;

-- Current rules: every table "allow anyone"
do $$ declare t text; begin
  foreach t in array array['account_managers','appointments','bulk_sends','businesses','chat_messages','client_files','client_notes','employees','marketing_companies','messages','photos','rating_snapshots'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "Allow all" on public.%I for all using (true) with check (true)', t);
  end loop;
end $$;
