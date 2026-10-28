-- ReviewSend client app — security step 1 of 3: foundation (ADDITIONS ONLY)
--
-- Safe to run while the current app is live: nothing existing is renamed,
-- removed, or locked. It only adds new tables, columns and helper functions
-- that the updated app and server use.
--
-- Run once in Supabase: SQL Editor → New query → paste this file → Run.

begin;

create schema if not exists private;
grant usage on schema private to authenticated;

-- ── Owners ────────────────────────────────────────────────────────────────
create table if not exists public.app_admins (
  email      text primary key,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
insert into public.app_admins (email) values ('bentonisaiah03@gmail.com'), ('sadiepeytonn@gmail.com') on conflict do nothing;

-- ── Google connection keys move to a private table ────────────────────────
-- No security rules are created on this table, so only the server (service
-- key) can ever read it. The browser loses all access to these keys.
create table if not exists public.business_google_tokens (
  business_id   uuid primary key references public.businesses(id) on delete cascade,
  access_token  text,
  refresh_token text,
  token_expiry  bigint,
  updated_at    timestamptz not null default now()
);
alter table public.business_google_tokens enable row level security;
revoke all on public.business_google_tokens from anon, authenticated;

insert into public.business_google_tokens (business_id, access_token, refresh_token, token_expiry)
select id, google_access_token, google_refresh_token, google_token_expiry
from public.businesses
where google_access_token is not null or google_refresh_token is not null
on conflict (business_id) do update
  set access_token  = excluded.access_token,
      refresh_token = coalesce(excluded.refresh_token, public.business_google_tokens.refresh_token),
      token_expiry  = excluded.token_expiry,
      updated_at    = now();

-- The app now checks this flag instead of looking at the keys themselves.
alter table public.businesses add column if not exists google_connected boolean not null default false;
update public.businesses
set google_connected = true
where google_access_token is not null or google_refresh_token is not null;

-- ── Employees get real logins ─────────────────────────────────────────────
alter table public.employees add column if not exists auth_user_id uuid;
-- New employees are created without a stored password.
alter table public.employees alter column password drop not null;

-- ── Tasks (the app already uses this table, but it was never created) ─────
create table if not exists public.tasks (
  id                   uuid primary key default gen_random_uuid(),
  marketing_company_id uuid references public.marketing_companies(id) on delete cascade,
  account_manager_id   uuid references public.account_managers(id) on delete set null,
  business_id          uuid references public.businesses(id) on delete cascade,
  title                text not null,
  notes                text,
  due_date             date,
  completed            boolean not null default false,
  completed_at         timestamptz,
  created_at           timestamptz not null default now()
);
alter table public.tasks enable row level security;
create index if not exists tasks_account_manager_idx on public.tasks (account_manager_id);
create index if not exists tasks_marketing_company_idx on public.tasks (marketing_company_id);

-- ── Internal client files bucket ──────────────────────────────────────────
-- The staff "Files" section uploads to a "client-files" storage bucket that
-- was never created. Create it as a private bucket.
insert into storage.buckets (id, name, public) values ('client-files', 'client-files', false)
on conflict (id) do nothing;

-- ── Helper functions used by the security rules ───────────────────────────
-- "security definer" lets these look up roles without tripping over the
-- security rules themselves. They only ever answer about the signed-in user.

create or replace function private.jwt_email() returns text
language sql stable
as $$ select lower(coalesce(auth.jwt() ->> 'email', '')) $$;

create or replace function private.is_service() returns boolean
language sql stable
as $$ select coalesce(auth.jwt() ->> 'role', '') = 'service_role' $$;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.app_admins where lower(email) = private.jwt_email()) $$;

create or replace function private.my_marketing_company_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select id from public.marketing_companies where lower(email) = private.jwt_email() $$;

create or replace function private.my_account_manager_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select id from public.account_managers where lower(email) = private.jwt_email() $$;

-- Marketing companies an account manager belongs to.
create or replace function private.my_am_company_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select marketing_company_id from public.account_managers
      where lower(email) = private.jwt_email() and marketing_company_id is not null $$;

-- Businesses this person works on as ReviewSend staff.
create or replace function private.staff_business_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select b.id from public.businesses b
  where private.is_admin()
     or b.marketing_company_id in (select private.my_marketing_company_ids())
     or b.account_manager_id  in (select private.my_account_manager_ids())
$$;

-- Businesses this person owns (the client's own login).
create or replace function private.owner_business_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select id from public.businesses where lower(email) = private.jwt_email() $$;

-- Businesses this person works for as a client employee.
create or replace function private.employee_business_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select business_id from public.employees where lower(email) = private.jwt_email() $$;

-- Owner or staff: may change the business's settings.
create or replace function private.manage_business_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select private.staff_business_ids() union select private.owner_business_ids() $$;

-- Anyone tied to the business, including its employees.
create or replace function private.member_business_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$ select private.manage_business_ids() union select private.employee_business_ids() $$;

grant execute on all functions in schema private to authenticated;

commit;
