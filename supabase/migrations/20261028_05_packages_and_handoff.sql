-- ReviewSend — step 5: packages and the Sales handoff (ADDITIONS ONLY)
--
-- Safe while everything is live: adds two tables and a few columns. The client
-- app ignores all of it. Seeds the two packages from the spec (Starter, Pro).

-- ── Client status and contact (spec: Client Information → Contact, Account) ──
alter table public.businesses add column if not exists status       text not null default 'active';
alter table public.businesses add column if not exists contact_name text;
alter table public.businesses add column if not exists phone        text;
alter table public.businesses add column if not exists client_since date;
do $$ begin
  alter table public.businesses add constraint businesses_status_check
    check (status in ('onboarding', 'active', 'paused', 'canceled'));
exception when duplicate_object then null; end $$;

-- Clients still can't change who manages them; now also their status.
create or replace function private.protect_business_columns() returns trigger
language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  if private.is_service() or auth.uid() is null then return new; end if;
  if old.id in (select private.staff_business_ids()) then return new; end if;
  if new.features             is distinct from old.features
  or new.marketing_company_id is distinct from old.marketing_company_id
  or new.account_manager_id   is distinct from old.account_manager_id
  or new.email                is distinct from old.email
  or new.google_connected     is distinct from old.google_connected
  or new.status               is distinct from old.status
  or new.client_since         is distinct from old.client_since then
    raise exception 'Only ReviewSend staff can change plan features, account manager, login email, status or Google status.';
  end if;
  return new;
end $$;

-- ── Packages (decisions #24, #38, #41) ───────────────────────────────────
-- The current offer. Owners edit it in the CRM's Settings; the Sales CRM reads it.
create table if not exists public.packages (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  name           text not null,
  monthly_price  numeric(10,2) not null check (monthly_price >= 0),
  description    text,
  services       jsonb not null default '[]',  -- [{ "label": "...", "minutes": "35 min" }]
  checklist      jsonb not null default '[]',  -- ["Write and schedule this week's 7 Google posts", ...]
  active         boolean not null default true,
  sort           int not null default 0,
  version        int not null default 1,
  updated_by     text,
  updated_at     timestamptz not null default now(),
  created_at     timestamptz not null default now()
);
alter table public.packages enable row level security;

create policy "staff read packages" on public.packages for select to authenticated
  using (private.is_admin() or private.is_manager_admin()
         or exists (select 1 from public.account_managers where lower(email) = private.jwt_email())
         or exists (select 1 from public.marketing_companies where lower(email) = private.jwt_email()));
create policy "owners edit packages" on public.packages for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- Each edit bumps the version, so it's clear which terms a client signed up under.
create or replace function private.bump_package_version() returns trigger
language plpgsql as $$
begin
  if (new.name, new.monthly_price, new.services, new.checklist)
     is distinct from (old.name, old.monthly_price, old.services, old.checklist) then
    new.version := old.version + 1;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists packages_version on public.packages;
create trigger packages_version before update on public.packages
  for each row execute function private.bump_package_version();

insert into public.packages (slug, name, monthly_price, sort, description, services, checklist) values
('starter', 'Starter', 399, 1, 'Month-to-month, 30 days'' notice.',
 '[{"label":"Account manager 1:1","minutes":""},
   {"label":"Google posts, 7/week, written in one weekly batch","minutes":"35 min"},
   {"label":"Social media (Facebook + Instagram), 2 posts/week, same post on both","minutes":"20 min"},
   {"label":"Google and Yelp review responses","minutes":"10–15 min"},
   {"label":"GBP optimization, weekly check","minutes":"10 min"},
   {"label":"Google photos, uploaded whenever the client sends them","minutes":"5–10 min"}]',
 '["Write and schedule this week''s 7 Google posts",
   "Write 2 social posts; schedule each to Facebook and Instagram",
   "Respond to new Google reviews",
   "Respond to new Yelp reviews (manually on Yelp)",
   "Weekly GBP check: hours, services, categories, Google''s suggested edits; click Verified",
   "Handle new client photos and messages",
   "Log anything important in Notes"]'),
('pro', 'Pro', 549, 2, 'Month-to-month, 30 days'' notice. Everything in Starter plus a website.',
 '[{"label":"Account manager 1:1","minutes":""},
   {"label":"Google posts, 7/week, written in one weekly batch","minutes":"35 min"},
   {"label":"Social media (Facebook + Instagram), 2 posts/week, same post on both","minutes":"20 min"},
   {"label":"Google and Yelp review responses","minutes":"10–15 min"},
   {"label":"GBP optimization, weekly check","minutes":"10 min"},
   {"label":"Google photos, uploaded whenever the client sends them","minutes":"5–10 min"},
   {"label":"Website: build at onboarding, unlimited edits on request","minutes":"about 15 min"}]',
 '["Write and schedule this week''s 7 Google posts",
   "Write 2 social posts; schedule each to Facebook and Instagram",
   "Respond to new Google reviews",
   "Respond to new Yelp reviews (manually on Yelp)",
   "Weekly GBP check: hours, services, categories, Google''s suggested edits; click Verified",
   "Handle new client photos and messages",
   "Log anything important in Notes",
   "Open website edit requests"]')
on conflict (slug) do nothing;

-- ── A client's package (the terms they signed up for) ────────────────────
-- A copy of the package at signup, so later package edits never change it.
-- One current row per client; changing package ends the old row.
create table if not exists public.client_packages (
  id                      uuid primary key default gen_random_uuid(),
  business_id             uuid not null references public.businesses(id) on delete cascade,
  package_id              uuid references public.packages(id) on delete set null,
  package_name            text not null,
  package_version         int,
  monthly_price           numeric(10,2) not null check (monthly_price >= 0),
  setup_fee               numeric(10,2) not null default 0 check (setup_fee >= 0),
  services                jsonb not null default '[]',
  checklist               jsonb not null default '[]',
  started_at              timestamptz not null default now(),
  ended_at                timestamptz,
  source                  text not null default 'manual' check (source in ('sales_handoff', 'manual')),
  -- Sales handoff (read-only in the CRM)
  sales_sale_id           text unique,
  sold_by                 text,
  sales_notes             text,
  first_paid_at           timestamptz,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_by              text,
  created_at              timestamptz not null default now()
);
create unique index if not exists client_packages_one_current on public.client_packages (business_id) where ended_at is null;
create index if not exists client_packages_business_idx on public.client_packages (business_id, started_at desc);
alter table public.client_packages enable row level security;

create policy "staff read client packages" on public.client_packages for select to authenticated
  using (business_id in (select private.staff_business_ids()));
-- Owners and Manager Admins set or change a package (account managers request; decision #33).
create policy "managers add client packages" on public.client_packages for insert to authenticated
  with check ((private.is_admin() or private.is_manager_admin()) and source = 'manual' and sales_sale_id is null
              and business_id in (select private.staff_business_ids()));
create policy "managers end client packages" on public.client_packages for update to authenticated
  using ((private.is_admin() or private.is_manager_admin()) and business_id in (select private.staff_business_ids()))
  with check ((private.is_admin() or private.is_manager_admin()) and business_id in (select private.staff_business_ids()));

-- The Sales handoff details can't be rewritten from the CRM; only ended_at may change.
create or replace function private.protect_client_package() returns trigger
language plpgsql as $$
begin
  if private.is_service() or auth.uid() is null then return new; end if;
  if (to_jsonb(new) - 'ended_at') is distinct from (to_jsonb(old) - 'ended_at') then
    raise exception 'A client''s package terms can''t be edited; end it and set a new one.';
  end if;
  return new;
end $$;
drop trigger if exists client_packages_protect on public.client_packages;
create trigger client_packages_protect before update on public.client_packages
  for each row execute function private.protect_client_package();

-- Signed-out visitors get nothing from either table.
revoke all on public.packages, public.client_packages from anon;
