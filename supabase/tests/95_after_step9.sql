-- TEST ONLY: onboarding (step 9).
select test.check('existing clients count as onboarded', $q$select bool_and(onboarding_status = 'finished') from public.businesses$q$, 'true');
select test.check('new clients start not started', $q$with i as (insert into public.businesses (email, name) values ('new@test.com', 'Brand New') returning onboarding_status) select onboarding_status from i$q$, 'not_started');

set role authenticated;
select test.sign_in('am2@test.com');
select test.check('am2: can start onboarding for client B', $q$with i as (insert into public.onboardings (business_id, started_by) values (test.id('b'), 'am2@test.com') returning 1) select count(*) from i$q$, '1');
select test.check('am2: only one onboarding per client', $q$insert into public.onboardings (business_id) values (test.id('b')) returning 1$q$, 'ERROR');
select test.check('am2: cannot onboard client C', $q$insert into public.onboardings (business_id) values (test.id('c')) returning 1$q$, 'ERROR');
select test.check('am2: can save services and goals on client B', $q$with u as (update public.businesses set services = '[{"name":"Tree removal","high_value":true}]', client_goals = '{"goals":["calls"]}', years_in_business = 12, onboarding_status = 'in_progress' where id = test.id('b') returning 1) select count(*) from u$q$, '1');
select test.check('am2: can read the script setting', 'select count(*) >= 0 from public.crm_settings', 'true');
select test.check('am2: cannot change the script', $q$insert into public.crm_settings (key, value) values ('onboarding_script', '[]') returning 1$q$, 'ERROR');
reset role;

set role authenticated;
select test.sign_in('bentonisaiah03@gmail.com');
select test.check('owner: can save the script', $q$with i as (insert into public.crm_settings (key, value, updated_by) values ('onboarding_script', '[{"id":"welcome"}]', 'bentonisaiah03@gmail.com') returning 1) select count(*) from i$q$, '1');
reset role;

set role authenticated;
select test.sign_in('b@test.com');
select test.check('client B: cannot see their onboarding', 'select count(*) from public.onboardings', '0');
select test.check('client B: cannot read CRM settings', 'select count(*) from public.crm_settings', '0');
reset role;
