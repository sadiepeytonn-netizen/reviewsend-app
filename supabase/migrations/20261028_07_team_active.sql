-- ReviewSend — step 7: account managers can be marked inactive (ADDITION ONLY)
--
-- New clients from the Sales handoff go to the ACTIVE account manager with the
-- fewest clients (decision #106). Inactive ones keep their current clients but
-- get no new ones. Everyone starts active.
alter table public.account_managers add column if not exists active boolean not null default true;

-- Manager Admins may also change their team (decision #34); owners and the company login already can.
drop policy if exists "manager admins manage team" on public.account_managers;
create policy "manager admins manage team" on public.account_managers for update to authenticated
  using (private.is_manager_admin()) with check (private.is_manager_admin());
