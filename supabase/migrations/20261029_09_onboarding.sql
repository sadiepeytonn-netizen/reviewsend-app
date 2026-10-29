-- ReviewSend — step 9: guided onboarding (ADDITIONS ONLY)
--
-- Safe while everything is live: adds columns to businesses (the app ignores
-- them), an onboardings table, and a small settings table for the script.
-- Existing clients are marked "onboarding finished"; new clients from Sales start "not started".

-- ── Business details the onboarding call collects (spec: Business Information) ──
alter table public.businesses add column if not exists website              text;
alter table public.businesses add column if not exists address              text;
alter table public.businesses add column if not exists business_hours       text;
alter table public.businesses add column if not exists years_in_business    int;
alter table public.businesses add column if not exists services             jsonb not null default '[]';  -- [{ "name": "...", "high_value": true }]
alter table public.businesses add column if not exists service_areas        text;
alter table public.businesses add column if not exists what_makes_different text;
alter table public.businesses add column if not exists client_goals         jsonb not null default '{}';  -- { "goals": [...], "note": "..." }

alter table public.businesses add column if not exists onboarding_status text not null default 'finished';
alter table public.businesses alter column onboarding_status set default 'not_started';
do $$ begin
  alter table public.businesses add constraint businesses_onboarding_status_check
    check (onboarding_status in ('not_started', 'in_progress', 'finished'));
exception when duplicate_object then null; end $$;

-- ── One onboarding per client; each step records who finished it and when ──
create table if not exists public.onboardings (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null unique references public.businesses(id) on delete cascade,
  status       text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  steps        jsonb not null default '{}',   -- { "<step>": { "done": true, "by": "email", "name": "...", "at": "..." } }
  answers      jsonb not null default '{}',   -- what was typed in each step, kept for reference
  started_by   text,
  started_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  finished_by  text,
  finished_at  timestamptz
);
alter table public.onboardings enable row level security;
create policy "staff onboardings" on public.onboardings for all to authenticated
  using (business_id in (select private.staff_business_ids()))
  with check (business_id in (select private.staff_business_ids()));

-- ── CRM settings owners edit (the onboarding script; later: caption and reply rules) ──
create table if not exists public.crm_settings (
  key         text primary key,
  value       jsonb not null,
  updated_by  text,
  updated_at  timestamptz not null default now()
);
alter table public.crm_settings enable row level security;
create policy "staff read crm settings" on public.crm_settings for select to authenticated
  using (private.is_admin() or private.is_manager_admin()
         or exists (select 1 from public.account_managers where lower(email) = private.jwt_email())
         or exists (select 1 from public.marketing_companies where lower(email) = private.jwt_email()));
create policy "owners edit crm settings" on public.crm_settings for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

revoke all on public.onboardings, public.crm_settings from anon;

-- The script itself is seeded by the CRM the first time it's needed (so the
-- wording lives in one place); owners can edit it in Settings → Onboarding script.
