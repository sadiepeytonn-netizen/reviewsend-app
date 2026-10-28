-- TEST ONLY: company login and packages (step 6).
set role authenticated;
select test.sign_in('mc1@test.com');
select test.check('company login: can end client B package', $q$with u as (update public.client_packages set ended_at = now() where business_id = test.id('b') and ended_at is null returning 1) select count(*) from u$q$, '1');
select test.check('company login: can set client B package', $q$with i as (insert into public.client_packages (business_id, package_name, monthly_price) values (test.id('b'), 'Starter', 399) returning 1) select count(*) from i$q$, '1');
select test.check('company login: cannot set another company''s client', $q$insert into public.client_packages (business_id, package_name, monthly_price) values (test.id('c'), 'Starter', 399) returning 1$q$, 'ERROR');
reset role;
set role authenticated;
select test.sign_in('am2@test.com');
select test.check('am2: still cannot set a package', $q$insert into public.client_packages (business_id, package_name, monthly_price) values (test.id('a'), 'Pro', 549) returning 1$q$, 'ERROR');
reset role;
