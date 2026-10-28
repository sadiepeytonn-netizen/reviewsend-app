-- TEST ONLY: after step 1 the CURRENT app must keep working exactly as before.

-- The old app talks to the database without a login (anon) and needs full access.
set role anon;
select test.check('step1: old app (not signed in) still reads every client', 'select count(*) from public.businesses', '3');
select test.check('step1: old app can still save Google keys on the client row', $q$with u as (update public.businesses set google_access_token = 'ya29.new' where name = 'Biz B' returning 1) select count(*) from u$q$, '1');
select test.check('step1: old app can still add an employee with a password', $q$with i as (insert into public.employees (business_id, email, name, password) select id, 'emp_b@test.com', 'Emp B', 'pw1234' from public.businesses where name = 'Biz B' returning 1) select count(*) from i$q$, '1');
reset role;

-- New pieces are in place.
select test.check('step1: Google keys copied to the private table', 'select count(*) from public.business_google_tokens', '1');
select test.check('step1: copied refresh key is correct', 'select refresh_token from public.business_google_tokens', '1//refreshA');
select test.check('step1: connected flag set from existing keys', $q$select string_agg(name || '=' || google_connected, ',' order by name) from public.businesses$q$, 'Biz A=true,Biz B=false,Biz C=false');
select test.check('step1: private client-files bucket created', $q$select public::text from storage.buckets where id = 'client-files'$q$, 'false');
select test.check('step1: tasks table now exists', 'select count(*) from public.tasks', '0');
select test.check('step1: owner listed in app_admins', 'select count(*) from public.app_admins', '1');

-- Seed a task per marketing company for step 2 tests (as the database owner).
insert into public.tasks (marketing_company_id, account_manager_id, business_id, title) values
  (test.id('mc1'), test.id('am1'), test.id('a'), 'task A'),
  (test.id('mc1'), test.id('am2'), test.id('b'), 'task B'),
  (test.id('mc2'), null, test.id('c'), 'task C');

-- Internal files for step 2 tests (bucket exists now).
insert into storage.objects (bucket_id, name) values ('client-files', test.id('a') || '/f.pdf'), ('client-files', test.id('b') || '/f.pdf');
