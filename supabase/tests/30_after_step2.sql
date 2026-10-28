-- TEST ONLY: after step 2 each kind of login sees exactly what it should.

-- ── Not signed in ──
set role anon;
select test.sign_in('');
select test.check('anon: cannot read clients', 'select count(*) from public.businesses', 'ERROR');
select test.check('anon: cannot read employees', 'select count(*) from public.employees', 'ERROR');
select test.check('anon: cannot read customer phone numbers', 'select count(*) from public.messages', 'ERROR');
select test.check('anon: cannot read chat', 'select count(*) from public.chat_messages', 'ERROR');
select test.check('anon: cannot add a client', $q$insert into public.businesses (name) values ('x') returning 1$q$, 'ERROR');
reset role;

-- ── Owner (admin) ──
set role authenticated;
select test.sign_in('bentonisaiah03@gmail.com');
select test.check('owner: sees all 3 clients', 'select count(*) from public.businesses', '3');
select test.check('owner: sees all companies', 'select count(*) from public.marketing_companies', '2');
select test.check('owner: sees all internal notes', 'select count(*) from public.client_notes', '3');
select test.check('owner: sees all tasks', 'select count(*) from public.tasks', '3');
select test.check('owner: sees all photos', 'select count(*) from public.photos', '3');
select test.check('owner: cannot read Google keys from the browser', 'select count(*) from public.business_google_tokens', 'ERROR');
select test.check('owner: old Google key columns blanked', 'select count(*) from public.businesses where google_access_token is not null or google_refresh_token is not null', '0');
select test.check('owner: can change plan features', $q$with u as (update public.businesses set features = '{"send":true,"analytics":true}' where id = test.id('a') returning 1) select count(*) from u$q$, '1');
reset role;

-- ── Marketing company 1 (email stored in capitals on purpose) ──
set role authenticated;
select test.sign_in('mc1@test.com');
select test.check('mc1: sees only its 2 clients', 'select count(*) from public.businesses', '2');
select test.check('mc1: sees only its company', 'select count(*) from public.marketing_companies', '1');
select test.check('mc1: sees its 2 account managers', 'select count(*) from public.account_managers', '2');
select test.check('mc1: sees its calendar only', 'select count(*) from public.appointments', '2');
select test.check('mc1: sees its tasks only', 'select count(*) from public.tasks', '2');
select test.check('mc1: sees notes for its clients only', 'select count(*) from public.client_notes', '2');
select test.check('mc1: cannot see client C chat', $q$select count(*) from public.chat_messages where business_id = test.id('c')$q$, '0');
select test.check('mc1: can add a client to its own company', $q$with i as (insert into public.businesses (name, email, marketing_company_id) values ('Biz D', 'd@test.com', test.id('mc1')) returning 1) select count(*) from i$q$, '1');
select test.check('mc1: cannot add a client to another company', $q$insert into public.businesses (name, email, marketing_company_id) values ('Biz E', 'e@test.com', test.id('mc2')) returning 1$q$, 'ERROR');
select test.check('mc1: can reassign its client to an account manager', $q$with u as (update public.businesses set account_manager_id = test.id('am2') where name = 'Biz D' returning 1) select count(*) from u$q$, '1');
select test.check('mc1: can add an account manager to its team', $q$with i as (insert into public.account_managers (name, email, marketing_company_id) values ('AM Three', 'am3@test.com', test.id('mc1')) returning 1) select count(*) from i$q$, '1');
select test.check('mc1: cannot add an account manager to another company', $q$insert into public.account_managers (name, email, marketing_company_id) values ('AM X', 'amx@test.com', test.id('mc2')) returning 1$q$, 'ERROR');
reset role;

-- ── Account manager 1 ──
set role authenticated;
select test.sign_in('am1@test.com');
select test.check('am1: sees only client A', $q$select string_agg(name, ',') from public.businesses$q$, 'Biz A');
select test.check('am1: sees own row only', 'select count(*) from public.account_managers', '1');
select test.check('am1: sees own company', 'select count(*) from public.marketing_companies', '1');
select test.check('am1: sees own calendar', 'select count(*) from public.appointments', '1');
select test.check('am1: sees own tasks', 'select count(*) from public.tasks', '1');
select test.check('am1: can add own task', $q$with i as (insert into public.tasks (account_manager_id, business_id, title) values (test.id('am1'), test.id('a'), 'new') returning 1) select count(*) from i$q$, '1');
select test.check('am1: cannot add a task for client B', $q$insert into public.tasks (account_manager_id, business_id, title) values (test.id('am2'), test.id('b'), 'sneaky') returning 1$q$, 'ERROR');
select test.check('am1: can read client A notes', 'select count(*) from public.client_notes', '1');
select test.check('am1: can mark client A chat read', $q$with u as (update public.chat_messages set read = true where business_id = test.id('a') returning 1) select count(*) from u$q$, '1');
select test.check('am1: cannot touch client B photos', $q$with u as (update public.photos set status = 'posted' where business_id = test.id('b') returning 1) select count(*) from u$q$, '0');
select test.check('am1: can upload internal file for client A', $q$with i as (insert into storage.objects (bucket_id, name) values ('client-files', test.id('a') || '/new.pdf') returning 1) select count(*) from i$q$, '1');
select test.check('am1: cannot read client B internal files', $q$select count(*) from storage.objects where bucket_id = 'client-files' and name like test.id('b') || '/%'$q$, '0');
reset role;

-- ── Client A (business owner) ──
set role authenticated;
select test.sign_in('a@test.com');
select test.check('client A: sees only own business', $q$select string_agg(name, ',') from public.businesses$q$, 'Biz A');
select test.check('client A: sees own review requests only', 'select count(*) from public.messages', '1');
select test.check('client A: sees own photos only', 'select count(*) from public.photos', '1');
select test.check('client A: sees own chat only', 'select count(*) from public.chat_messages', '1');
select test.check('client A: sees own employees', 'select count(*) from public.employees', '1');
select test.check('client A: cannot see employee passwords', 'select count(password) from public.employees', 'ERROR');
select test.check('client A: can list employees by safe columns', 'select count(name) from public.employees', '1');
select test.check('client A: cannot see internal notes', 'select count(*) from public.client_notes', '0');
select test.check('client A: cannot see internal files', 'select count(*) from public.client_files', '0');
select test.check('client A: cannot see staff calendar', 'select count(*) from public.appointments', '0');
select test.check('client A: cannot see staff tasks', 'select count(*) from public.tasks', '0');
select test.check('client A: can see their own account manager', 'select count(*) from public.account_managers', '1');
select test.check('client A: cannot see marketing companies', 'select count(*) from public.marketing_companies', '0');
select test.check('client A: sees own rating history', 'select count(*) from public.rating_snapshots', '1');
select test.check('client A: can edit own settings', $q$with u as (update public.businesses set message_template = 'Hi {name}' where id = test.id('a') returning 1) select count(*) from u$q$, '1');
select test.check('client A: cannot unlock paid features', $q$update public.businesses set features = '{"send":true,"analytics":true,"history":true}' where id = test.id('a') returning 1$q$, 'ERROR');
select test.check('client A: cannot change own account manager', $q$update public.businesses set account_manager_id = null where id = test.id('a') returning 1$q$, 'ERROR');
select test.check('client A: cannot change login email', $q$update public.businesses set email = 'x@x.com' where id = test.id('a') returning 1$q$, 'ERROR');
select test.check('client A: cannot edit client B', $q$with u as (update public.businesses set name = 'hacked' where id = test.id('b') returning 1) select count(*) from u$q$, '0');
select test.check('client A: can log a review request', $q$with i as (insert into public.messages (business_id, customer_name) values (test.id('a'), 'New') returning 1) select count(*) from i$q$, '1');
select test.check('client A: cannot log one for client B', $q$insert into public.messages (business_id, customer_name) values (test.id('b'), 'New') returning 1$q$, 'ERROR');
select test.check('client A: can send chat to their manager', $q$with i as (insert into public.chat_messages (business_id, message, sender_role) values (test.id('a'), 'hello', 'owner') returning 1) select count(*) from i$q$, '1');
select test.check('client A: cannot remove client B employees', $q$with d as (delete from public.employees where business_id = test.id('b') returning 1) select count(*) from d$q$, '0');
select test.check('client A: cannot add employee directly (server only)', $q$insert into public.employees (business_id, email, name) values (test.id('a'), 'x@test.com', 'X') returning 1$q$, 'ERROR');
select test.check('client A: can upload a photo for own business', $q$with i as (insert into storage.objects (bucket_id, name) values ('business-photos', test.id('a') || '/2.jpg') returning 1) select count(*) from i$q$, '1');
select test.check('client A: cannot upload a photo into client B', $q$insert into storage.objects (bucket_id, name) values ('business-photos', test.id('b') || '/2.jpg') returning 1$q$, 'ERROR');
select test.check('client A: can upload own logo', $q$with i as (insert into storage.objects (bucket_id, name) values ('business-logos', test.id('a') || '/logo-1.png') returning 1) select count(*) from i$q$, '1');
select test.check('client A: cannot read internal files storage', $q$select count(*) from storage.objects where bucket_id = 'client-files'$q$, '0');
select test.check('client A: cannot list client B photos in storage', $q$select count(*) from storage.objects where name like test.id('b') || '/%'$q$, '0');
reset role;

-- ── Client A's employee ──
set role authenticated;
select test.sign_in('emp_a@test.com');
select test.check('employee: sees their business', $q$select string_agg(name, ',') from public.businesses$q$, 'Biz A');
select test.check('employee: can send review requests', $q$with i as (insert into public.messages (business_id, customer_name) values (test.id('a'), 'Walk-in') returning 1) select count(*) from i$q$, '1');
select test.check('employee: can add photos', $q$with i as (insert into public.photos (business_id, file_path, status) values (test.id('a'), test.id('a') || '/3.jpg', 'pending') returning 1) select count(*) from i$q$, '1');
select test.check('employee: cannot delete photos', $q$with d as (delete from public.photos where business_id = test.id('a') returning 1) select count(*) from d$q$, '0');
select test.check('employee: cannot change business settings', $q$with u as (update public.businesses set name = 'x' where id = test.id('a') returning 1) select count(*) from u$q$, '0');
select test.check('employee: sees only own employee row', 'select count(*) from public.employees', '1');
select test.check('employee: cannot see internal notes', 'select count(*) from public.client_notes', '0');
select test.check('employee: cannot see other businesses', $q$select count(*) from public.messages where business_id <> test.id('a')$q$, '0');
reset role;

-- ── Someone with an account but no role (a stranger who signs up) ──
set role authenticated;
select test.sign_in('stranger@test.com');
select test.check('stranger: sees no clients', 'select count(*) from public.businesses', '0');
select test.check('stranger: sees no phone numbers', 'select count(*) from public.messages', '0');
select test.check('stranger: sees no employees', 'select count(*) from public.employees', '0');
select test.check('stranger: sees no companies', 'select count(*) from public.marketing_companies', '0');
select test.check('stranger: cannot make themselves an owner', $q$insert into public.app_admins (email) values ('stranger@test.com') returning 1$q$, 'ERROR');
select test.check('stranger: cannot add a company', $q$insert into public.marketing_companies (name, email) values ('x', 'stranger@test.com') returning 1$q$, 'ERROR');
reset role;

-- ── The server (service key) is unaffected ──
set role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
select test.check('server: reads Google keys', 'select count(*) from public.business_google_tokens', '1');
select test.check('server: can set connected flag', $q$with u as (update public.businesses set google_connected = true where id = test.id('b') returning 1) select count(*) from u$q$, '1');
reset role;
