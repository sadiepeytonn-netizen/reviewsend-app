-- ReviewSend client app — security step 2 of 3: replace "allow anyone" rules
--
-- RUN ONLY AFTER the updated app and server are live (see SECURITY_ROLLOUT.md).
-- The old app depends on the "allow anyone" rules; this file removes them.
--
-- Who can see what afterwards:
--   Owners (app_admins)            → everything
--   Marketing company login        → its own clients, account managers, calendar, tasks
--   Account manager login          → only clients assigned to them
--   Client (business owner) login  → only their own business
--   Client employee login          → their business's sending, photos and chat
--   Anyone not signed in           → nothing
--
-- The server uses the service key, which is not affected by these rules.

begin;

-- ── 1. Remove every existing rule on these tables ─────────────────────────
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('account_managers','appointments','bulk_sends','businesses','chat_messages',
                        'client_files','client_notes','employees','marketing_companies','messages',
                        'photos','rating_snapshots','tasks','app_admins','business_google_tokens')
  loop
    execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Make sure security is switched on everywhere.
alter table public.account_managers       enable row level security;
alter table public.appointments           enable row level security;
alter table public.bulk_sends             enable row level security;
alter table public.businesses             enable row level security;
alter table public.chat_messages          enable row level security;
alter table public.client_files           enable row level security;
alter table public.client_notes           enable row level security;
alter table public.employees              enable row level security;
alter table public.marketing_companies    enable row level security;
alter table public.messages               enable row level security;
alter table public.photos                 enable row level security;
alter table public.rating_snapshots       enable row level security;
alter table public.tasks                  enable row level security;
alter table public.app_admins             enable row level security;
alter table public.business_google_tokens enable row level security;

-- Visitors who aren't signed in get nothing.
revoke all on all tables in schema public from anon;

-- ── 2. New rules ──────────────────────────────────────────────────────────

-- Owners list: each person may only check their own row.
create policy "own row" on public.app_admins for select to authenticated
  using (lower(email) = private.jwt_email());

-- business_google_tokens: no rules at all = server only.

-- Businesses
create policy "members read" on public.businesses for select to authenticated
  using (id in (select private.member_business_ids()));
create policy "staff add" on public.businesses for insert to authenticated
  with check (private.is_admin() or marketing_company_id in (select private.my_marketing_company_ids()));
create policy "owner or staff edit" on public.businesses for update to authenticated
  using (id in (select private.manage_business_ids()))
  with check (id in (select private.manage_business_ids()));
create policy "staff delete" on public.businesses for delete to authenticated
  using (private.is_admin() or marketing_company_id in (select private.my_marketing_company_ids()));

-- A client may edit their own settings, but not which plan features they have,
-- who manages them, or the login email. Only staff (or the server) can change those.
create or replace function private.protect_business_columns() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  -- The server (service key) and direct database work (SQL editor, no signed-in user) are allowed.
  if private.is_service() or auth.uid() is null then return new; end if;
  if old.id in (select private.staff_business_ids()) then return new; end if;
  if new.features             is distinct from old.features
  or new.marketing_company_id is distinct from old.marketing_company_id
  or new.account_manager_id   is distinct from old.account_manager_id
  or new.email                is distinct from old.email
  or new.google_connected     is distinct from old.google_connected then
    raise exception 'Only ReviewSend staff can change plan features, account manager, login email or Google status.';
  end if;
  return new;
end $$;
drop trigger if exists protect_business_columns on public.businesses;
create trigger protect_business_columns before update on public.businesses
  for each row execute function private.protect_business_columns();

-- Marketing companies
create policy "read own company" on public.marketing_companies for select to authenticated
  using (private.is_admin()
         or id in (select private.my_marketing_company_ids())
         or id in (select private.my_am_company_ids()));
create policy "owners manage companies" on public.marketing_companies for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Account managers
create policy "read team" on public.account_managers for select to authenticated
  using (private.is_admin()
         or marketing_company_id in (select private.my_marketing_company_ids())
         or id in (select private.my_account_manager_ids())
         or id in (select account_manager_id from public.businesses where id in (select private.owner_business_ids())));
create policy "company manages team" on public.account_managers for all to authenticated
  using (private.is_admin() or marketing_company_id in (select private.my_marketing_company_ids()))
  with check (private.is_admin() or marketing_company_id in (select private.my_marketing_company_ids()));

-- Calendar and tasks: staff only
create policy "staff calendar" on public.appointments for all to authenticated
  using (private.is_admin()
         or marketing_company_id in (select private.my_marketing_company_ids())
         or account_manager_id  in (select private.my_account_manager_ids())
         or business_id         in (select private.staff_business_ids()))
  with check (private.is_admin()
         or marketing_company_id in (select private.my_marketing_company_ids())
         or account_manager_id  in (select private.my_account_manager_ids())
         or business_id         in (select private.staff_business_ids()));
create policy "staff tasks" on public.tasks for all to authenticated
  using (private.is_admin()
         or marketing_company_id in (select private.my_marketing_company_ids())
         or account_manager_id  in (select private.my_account_manager_ids())
         or business_id         in (select private.staff_business_ids()))
  with check (private.is_admin()
         or marketing_company_id in (select private.my_marketing_company_ids())
         or account_manager_id  in (select private.my_account_manager_ids())
         or business_id         in (select private.staff_business_ids()));

-- Internal notes and files: staff only
create policy "staff notes" on public.client_notes for all to authenticated
  using (business_id in (select private.staff_business_ids()))
  with check (business_id in (select private.staff_business_ids()));
create policy "staff files" on public.client_files for all to authenticated
  using (business_id in (select private.staff_business_ids()))
  with check (business_id in (select private.staff_business_ids()));

-- Review requests (messages) and bulk sends
create policy "members read" on public.messages for select to authenticated
  using (business_id in (select private.member_business_ids()));
create policy "members add" on public.messages for insert to authenticated
  with check (business_id in (select private.member_business_ids()));
create policy "owner or staff delete" on public.messages for delete to authenticated
  using (business_id in (select private.manage_business_ids()));

create policy "members read" on public.bulk_sends for select to authenticated
  using (business_id in (select private.member_business_ids()));
create policy "members add" on public.bulk_sends for insert to authenticated
  with check (business_id in (select private.member_business_ids()));
create policy "owner or staff delete" on public.bulk_sends for delete to authenticated
  using (business_id in (select private.manage_business_ids()));

-- Chat between client and account manager
create policy "members read" on public.chat_messages for select to authenticated
  using (business_id in (select private.member_business_ids()));
create policy "members add" on public.chat_messages for insert to authenticated
  with check (business_id in (select private.member_business_ids()));
create policy "members mark read" on public.chat_messages for update to authenticated
  using (business_id in (select private.member_business_ids()))
  with check (business_id in (select private.member_business_ids()));
create policy "staff delete" on public.chat_messages for delete to authenticated
  using (business_id in (select private.staff_business_ids()));

-- Photos
create policy "members read" on public.photos for select to authenticated
  using (business_id in (select private.member_business_ids()));
create policy "members add" on public.photos for insert to authenticated
  with check (business_id in (select private.member_business_ids()));
create policy "owner or staff edit" on public.photos for update to authenticated
  using (business_id in (select private.manage_business_ids()))
  with check (business_id in (select private.manage_business_ids()));
create policy "owner or staff delete" on public.photos for delete to authenticated
  using (business_id in (select private.manage_business_ids()));

-- Rating history: read only (the server writes it)
create policy "members read" on public.rating_snapshots for select to authenticated
  using (business_id in (select private.member_business_ids()));

-- Employees: the owner and staff see the team; each employee sees their own row.
-- Adding and removing employees goes through the server.
create policy "team read" on public.employees for select to authenticated
  using (business_id in (select private.manage_business_ids()) or lower(email) = private.jwt_email());
create policy "owner or staff remove" on public.employees for delete to authenticated
  using (business_id in (select private.manage_business_ids()));

-- Hide the old password column from the browser entirely, even for rows a
-- person is allowed to see: the browser may only read these columns.
-- (Step 3 deletes the password column.)
revoke select on public.employees from authenticated;
grant select (id, business_id, name, email, created_at, auth_user_id) on public.employees to authenticated;

-- The Google keys were copied to business_google_tokens in step 1 and the
-- server now reads them from there. Blank the old copies on the businesses
-- table so no browser can read them. (Step 3 deletes these columns.)
-- First, pick up any keys the old app saved after step 1 ran.
insert into public.business_google_tokens (business_id, access_token, refresh_token, token_expiry)
select id, google_access_token, google_refresh_token, google_token_expiry
from public.businesses
where google_refresh_token is not null
on conflict (business_id) do update
  set refresh_token = excluded.refresh_token,
      access_token  = excluded.access_token,
      token_expiry  = excluded.token_expiry,
      updated_at    = now()
  where public.business_google_tokens.refresh_token is distinct from excluded.refresh_token;
update public.businesses set google_connected = true
where google_refresh_token is not null and not google_connected;

update public.businesses
set google_access_token = null, google_refresh_token = null, google_token_expiry = null
where google_access_token is not null or google_refresh_token is not null or google_token_expiry is not null;

-- ── 3. File storage ───────────────────────────────────────────────────────
-- Every file path starts with the business id ("<business id>/file.jpg").
-- Photos and logos stay viewable by link (they are posted publicly and sent in
-- texts), but only the right people can upload, change or delete them.
-- Internal client files become private to staff.

do $$
declare r record;
begin
  for r in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (   coalesce(qual, '')       ~ '(business-photos|business-logos|client-files)'
           or coalesce(with_check, '') ~ '(business-photos|business-logos|client-files)'
           or coalesce(qual, '') = 'true'
           or coalesce(with_check, '') = 'true')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

update storage.buckets set public = false where id = 'client-files';

create policy "rs photos read" on storage.objects for select to authenticated
  using (bucket_id = 'business-photos' and (storage.foldername(name))[1] in (select id::text from private.member_business_ids() as id));
create policy "rs photos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-photos' and (storage.foldername(name))[1] in (select id::text from private.member_business_ids() as id));
create policy "rs photos edit" on storage.objects for update to authenticated
  using (bucket_id = 'business-photos' and (storage.foldername(name))[1] in (select id::text from private.manage_business_ids() as id));
create policy "rs photos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'business-photos' and (storage.foldername(name))[1] in (select id::text from private.manage_business_ids() as id));

create policy "rs logos read" on storage.objects for select to authenticated
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] in (select id::text from private.member_business_ids() as id));
create policy "rs logos add" on storage.objects for insert to authenticated
  with check (bucket_id = 'business-logos' and (storage.foldername(name))[1] in (select id::text from private.manage_business_ids() as id));
create policy "rs logos edit" on storage.objects for update to authenticated
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] in (select id::text from private.manage_business_ids() as id));
create policy "rs logos delete" on storage.objects for delete to authenticated
  using (bucket_id = 'business-logos' and (storage.foldername(name))[1] in (select id::text from private.manage_business_ids() as id));

create policy "rs client files" on storage.objects for all to authenticated
  using (bucket_id = 'client-files' and (storage.foldername(name))[1] in (select id::text from private.staff_business_ids() as id))
  with check (bucket_id = 'client-files' and (storage.foldername(name))[1] in (select id::text from private.staff_business_ids() as id));

commit;
