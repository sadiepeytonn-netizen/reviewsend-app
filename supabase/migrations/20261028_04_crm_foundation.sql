-- ReviewSend — step 4: what the Account Manager CRM needs (ADDITIONS ONLY)
--
-- Safe while everything is live: adds columns and one new table, and lets
-- Manager Admins (none exist yet) see every client. Nothing existing changes
-- for clients, the client app, or current staff.

-- ── Manager Admins (decisions #34–37) ─────────────────────────────────────
alter table public.account_managers add column if not exists is_manager_admin boolean not null default false;

create or replace function private.is_manager_admin() returns boolean
language sql stable security definer set search_path = public, pg_temp
as $$ select exists (select 1 from public.account_managers
                     where lower(email) = private.jwt_email() and is_manager_admin) $$;
grant execute on function private.is_manager_admin() to authenticated;

-- Staff access now includes Manager Admins, who see every client.
create or replace function private.staff_business_ids() returns setof uuid
language sql stable security definer set search_path = public, pg_temp
as $$
  select b.id from public.businesses b
  where private.is_admin()
     or private.is_manager_admin()
     or b.marketing_company_id in (select private.my_marketing_company_ids())
     or b.account_manager_id  in (select private.my_account_manager_ids())
$$;

-- Manager Admins also see the whole team and company list.
drop policy if exists "read team" on public.account_managers;
create policy "read team" on public.account_managers for select to authenticated
  using (private.is_admin() or private.is_manager_admin()
         or marketing_company_id in (select private.my_marketing_company_ids())
         or id in (select private.my_account_manager_ids())
         or id in (select account_manager_id from public.businesses where id in (select private.owner_business_ids())));
drop policy if exists "read own company" on public.marketing_companies;
create policy "read own company" on public.marketing_companies for select to authenticated
  using (private.is_admin() or private.is_manager_admin()
         or id in (select private.my_marketing_company_ids())
         or id in (select private.my_am_company_ids()));

-- ── Notes by platform, with pinning (decision #8) ─────────────────────────
alter table public.client_notes add column if not exists category text not null default 'general';
alter table public.client_notes add column if not exists title text;
alter table public.client_notes add column if not exists pinned boolean not null default false;
alter table public.client_notes add column if not exists author_email text;
alter table public.client_notes add column if not exists updated_at timestamptz;
do $$ begin
  alter table public.client_notes add constraint client_notes_category_check
    check (category in ('google', 'facebook', 'instagram', 'website', 'general'));
exception when duplicate_object then null; end $$;

-- ── Permanent Activity Log (decisions #19, #87–90) ────────────────────────
create table if not exists public.activity_log (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses(id) on delete cascade,
  actor_email  text,
  actor_name   text,
  action       text not null,       -- e.g. note.added, task.completed
  summary      text not null,       -- plain-language line shown in the log
  detail       jsonb,               -- before/after values where relevant
  created_at   timestamptz not null default now()
);
create index if not exists activity_log_business_idx on public.activity_log (business_id, created_at desc);
alter table public.activity_log enable row level security;

create policy "staff read log" on public.activity_log for select to authenticated
  using (business_id in (select private.staff_business_ids()));
-- Staff can only add entries in their own name, for their own clients.
create policy "staff add to log" on public.activity_log for insert to authenticated
  with check (business_id in (select private.staff_business_ids())
              and lower(coalesce(actor_email, '')) = private.jwt_email());

-- Entries can never be changed or deleted, by anyone signed in.
create or replace function private.block_log_changes() returns trigger
language plpgsql as $$
begin
  -- Deleting a whole client removes its log with it (that cascade runs one trigger level deeper).
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then return old; end if;
  raise exception 'Activity Log entries are permanent and cannot be changed or deleted.';
end $$;
drop trigger if exists activity_log_permanent on public.activity_log;
create trigger activity_log_permanent before update or delete on public.activity_log
  for each row execute function private.block_log_changes();
