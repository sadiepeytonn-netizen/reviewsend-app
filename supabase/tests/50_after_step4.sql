-- TEST ONLY: CRM foundation (step 4).
insert into public.account_managers (email, name, marketing_company_id, is_manager_admin) values ('ma@test.com', 'Manager Admin', test.id('mc1'), true);

set role authenticated;
select test.sign_in('ma@test.com');
select test.check('manager admin: sees every client', 'select count(*) = (select count(*) from public.businesses) from public.businesses', 'true');
select test.check('manager admin: sees whole team', 'select count(*) >= 3 from public.account_managers', 'true');
reset role;

set role authenticated;
select test.sign_in('am1@test.com');
select test.check('am1: still sees only client A', 'select count(*) from public.businesses', '1');
select test.check('am1: can add a Google note, pinned', $q$with i as (insert into public.client_notes (business_id, note, category, pinned, title) values (test.id('a'), 'Use a friendly tone', 'google', true, 'Reply tone') returning 1) select count(*) from i$q$, '1');
select test.check('am1: bad note category refused', $q$insert into public.client_notes (business_id, note, category) values (test.id('a'), 'x', 'tiktok') returning 1$q$, 'ERROR');
select test.check('am1: can log an action in own name', $q$with i as (insert into public.activity_log (business_id, actor_email, action, summary) values (test.id('a'), 'am1@test.com', 'note.added', 'Added a note') returning 1) select count(*) from i$q$, '1');
select test.check('am1: cannot log in someone else''s name', $q$insert into public.activity_log (business_id, actor_email, action, summary) values (test.id('a'), 'boss@test.com', 'x', 'x') returning 1$q$, 'ERROR');
select test.check('am1: cannot log for client B', $q$insert into public.activity_log (business_id, actor_email, action, summary) values (test.id('b'), 'am1@test.com', 'x', 'x') returning 1$q$, 'ERROR');
select test.check('am1: cannot edit a log entry', $q$with u as (update public.activity_log set summary = 'changed' returning 1) select count(*) from u$q$, '0');
select test.check('am1: cannot delete a log entry', $q$with d as (delete from public.activity_log returning 1) select count(*) from d$q$, '0');
reset role;

set role authenticated;
select test.sign_in('a@test.com');
select test.check('client A: cannot read the activity log', 'select count(*) from public.activity_log', '0');
reset role;

-- Database owner, directly: still permanent; but deleting a whole client takes its log with it.
select test.check('owner sql: log entry still cannot be edited', $q$update public.activity_log set summary = 'x' returning 1$q$, 'ERROR');
select test.check('deleting a client removes its log', $q$with d as (delete from public.businesses where name = 'Biz Blank' returning 1) select count(*) from d$q$, '1');
