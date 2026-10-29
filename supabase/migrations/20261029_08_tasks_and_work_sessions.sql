-- ReviewSend — step 8: tasks and weekly work sessions (ADDITIONS ONLY)
--
-- Safe while everything is live: adds columns to tasks (the app's old staff
-- screens keep working; new columns have defaults) and two new tables.

-- ── Tasks (spec: "Tasks created as things arrive, each with a due date") ──
alter table public.tasks add column if not exists kind         text not null default 'manual';
alter table public.tasks add column if not exists priority     text not null default 'normal';
alter table public.tasks add column if not exists created_by   text;
alter table public.tasks add column if not exists completed_by text;
-- Stops the same automatic task being made twice (e.g. "review:<id>").
alter table public.tasks add column if not exists source_key   text;
do $$ begin
  alter table public.tasks add constraint tasks_kind_check check (kind in
    ('manual', 'onboarding', 'google_review', 'low_review', 'photo', 'message', 'website', 'payment', 'contact_change', 'session'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.tasks add constraint tasks_priority_check check (priority in ('normal', 'urgent'));
exception when duplicate_object then null; end $$;
create unique index if not exists tasks_source_key_unique on public.tasks (source_key) where source_key is not null;
create index if not exists tasks_business_open_idx on public.tasks (business_id, completed, due_date);

-- ── Work sessions (decisions #49–53) ──────────────────────────────────────
-- One weekly session per client. Time only counts while running (not paused).
create table if not exists public.work_sessions (
  id                  uuid primary key default gen_random_uuid(),
  business_id         uuid not null references public.businesses(id) on delete cascade,
  account_manager_id  uuid references public.account_managers(id) on delete set null,
  staff_email         text not null,
  staff_name          text,
  week_start          date not null,                -- Monday (Eastern) of the week it counts for
  status              text not null default 'running' check (status in ('running', 'paused', 'finished')),
  started_at          timestamptz not null default now(),
  running_since       timestamptz default now(),    -- set while running; null while paused
  active_seconds      int not null default 0,       -- time counted before running_since
  last_activity_at    timestamptz not null default now(),
  paused_reason       text,                         -- 'manual' or 'inactive'
  finished_at         timestamptz,
  summary             text,
  created_at          timestamptz not null default now()
);
create unique index if not exists work_sessions_one_open on public.work_sessions (business_id) where status <> 'finished';
create index if not exists work_sessions_business_idx on public.work_sessions (business_id, started_at desc);
create index if not exists work_sessions_open_idx on public.work_sessions (status) where status <> 'finished';
alter table public.work_sessions enable row level security;

create policy "staff sessions" on public.work_sessions for all to authenticated
  using (business_id in (select private.staff_business_ids()))
  with check (business_id in (select private.staff_business_ids()));

-- Checklist items for a session: from the package (can't be removed), one-offs, or carried over.
create table if not exists public.session_items (
  id             uuid primary key default gen_random_uuid(),
  session_id     uuid not null references public.work_sessions(id) on delete cascade,
  business_id    uuid not null references public.businesses(id) on delete cascade,
  label          text not null,
  kind           text not null default 'package' check (kind in ('package', 'one_off', 'carried')),
  sort           int not null default 0,
  done           boolean not null default false,
  done_at        timestamptz,
  done_by        text,
  not_done_reason text,                             -- required for unfinished items at Finish
  carried_from   uuid references public.session_items(id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists session_items_session_idx on public.session_items (session_id, sort);
alter table public.session_items enable row level security;

create policy "staff session items" on public.session_items for all to authenticated
  using (business_id in (select private.staff_business_ids()))
  with check (business_id in (select private.staff_business_ids()));

-- Package items can't be deleted (decision #52); the item must also belong to its session's client.
create or replace function private.protect_session_item() returns trigger
language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    if pg_trigger_depth() > 1 then return old; end if;  -- whole session or client removed
    if old.kind <> 'one_off' then raise exception 'Package checklist items can''t be removed.'; end if;
    return old;
  end if;
  if not exists (select 1 from public.work_sessions s where s.id = new.session_id and s.business_id = new.business_id) then
    raise exception 'Checklist item doesn''t match its session.';
  end if;
  if tg_op = 'UPDATE' and (new.kind, new.label, new.session_id) is distinct from (old.kind, old.label, old.session_id) and old.kind <> 'one_off' then
    raise exception 'Package checklist items can''t be renamed or moved.';
  end if;
  return new;
end $$;
drop trigger if exists session_items_protect on public.session_items;
create trigger session_items_protect before insert or update or delete on public.session_items
  for each row execute function private.protect_session_item();

revoke all on public.work_sessions, public.session_items from anon;
