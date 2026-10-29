-- TEST ONLY: tasks and work sessions (step 8).
select test.check('old tasks default to manual/normal', $q$select count(*) = count(*) filter (where kind = 'manual' and priority = 'normal') from public.tasks$q$, 'true');

set role authenticated;
select test.sign_in('am1@test.com');
select test.check('am1: old-style task insert still works', $q$with i as (insert into public.tasks (business_id, title) values (test.id('a'), 'Call back') returning kind) select kind from i$q$, 'manual');
select test.check('am1: urgent review task', $q$with i as (insert into public.tasks (business_id, title, kind, priority, source_key) values (test.id('a'), '1-star review', 'low_review', 'urgent', 'review:1') returning 1) select count(*) from i$q$, '1');
select test.check('am1: same automatic task twice refused', $q$insert into public.tasks (business_id, title, source_key) values (test.id('a'), 'again', 'review:1') returning 1$q$, 'ERROR');
select test.check('am1: bad task kind refused', $q$insert into public.tasks (business_id, title, kind) values (test.id('a'), 'x', 'party') returning 1$q$, 'ERROR');
select test.check('am1: can start a session for client A', $q$with i as (insert into public.work_sessions (business_id, staff_email, week_start) values (test.id('a'), 'am1@test.com', '2026-10-26') returning 1) select count(*) from i$q$, '1');
select test.check('am1: second open session refused', $q$insert into public.work_sessions (business_id, staff_email, week_start) values (test.id('a'), 'am1@test.com', '2026-10-26') returning 1$q$, 'ERROR');
select test.check('am1: cannot start a session for client B', $q$insert into public.work_sessions (business_id, staff_email, week_start) values (test.id('b'), 'am1@test.com', '2026-10-26') returning 1$q$, 'ERROR');
select test.check('am1: add package items', $q$with i as (insert into public.session_items (session_id, business_id, label, kind, sort)
  select id, business_id, 'Respond to new Google reviews', 'package', 1 from public.work_sessions where business_id = test.id('a') returning 1) select count(*) from i$q$, '1');
select test.check('am1: add a one-off item', $q$with i as (insert into public.session_items (session_id, business_id, label, kind, sort)
  select id, business_id, 'Fix holiday hours', 'one_off', 9 from public.work_sessions where business_id = test.id('a') returning 1) select count(*) from i$q$, '1');
select test.check('am1: item pointing at another client refused', $q$insert into public.session_items (session_id, business_id, label)
  select id, test.id('b'), 'x' from public.work_sessions where business_id = test.id('a') returning 1$q$, 'ERROR');
select test.check('am1: can tick a package item', $q$with u as (update public.session_items set done = true where kind = 'package' returning 1) select count(*) from u$q$, '1');
select test.check('am1: cannot rename a package item', $q$update public.session_items set label = 'x' where kind = 'package' returning 1$q$, 'ERROR');
select test.check('am1: cannot delete a package item', $q$delete from public.session_items where kind = 'package' returning 1$q$, 'ERROR');
select test.check('am1: can delete a one-off item', $q$with d as (delete from public.session_items where kind = 'one_off' returning 1) select count(*) from d$q$, '1');
select test.check('am1: can finish the session', $q$with u as (update public.work_sessions set status = 'finished', finished_at = now(), running_since = null where business_id = test.id('a') returning 1) select count(*) from u$q$, '1');
select test.check('am1: new session after finishing is fine', $q$with i as (insert into public.work_sessions (business_id, staff_email, week_start) values (test.id('a'), 'am1@test.com', '2026-11-02') returning 1) select count(*) from i$q$, '1');
reset role;

set role authenticated;
select test.sign_in('am2@test.com');
select test.check('am2: cannot see client A sessions', 'select count(*) from public.work_sessions', '0');
select test.check('am2: cannot see client A checklist', 'select count(*) from public.session_items', '0');
reset role;

set role authenticated;
select test.sign_in('a@test.com');
select test.check('client A: cannot see their sessions', 'select count(*) from public.work_sessions', '0');
reset role;

select test.check('deleting a session works even with package items', $q$with d as (delete from public.work_sessions returning 1) select count(*) from d$q$, '2');
select test.check('…and its checklist goes with it', 'select count(*) from public.session_items', '0');
