-- TEST ONLY: packages and the Sales handoff (step 5).
select test.check('two packages seeded', 'select count(*) from public.packages', '2');
select test.check('Starter has 7 checklist items, Pro 8', $q$select string_agg(jsonb_array_length(checklist)::text, ',' order by sort) from public.packages$q$, '7,8');
select test.check('existing clients default to active', $q$select bool_and(status = 'active') from public.businesses$q$, 'true');

-- Owner edits a package → version goes up.
set role authenticated;
select test.sign_in('bentonisaiah03@gmail.com');
select test.check('owner: can change Pro price', $q$with u as (update public.packages set monthly_price = 599 where slug = 'pro' returning version) select version from u$q$, '2');
select test.check('owner: can give client A Starter', $q$with i as (insert into public.client_packages (business_id, package_id, package_name, package_version, monthly_price, checklist)
  select test.id('a'), id, name, version, monthly_price, checklist from public.packages where slug = 'starter' returning 1) select count(*) from i$q$, '1');
select test.check('owner: second current package for A refused', $q$insert into public.client_packages (business_id, package_name, monthly_price) values (test.id('a'), 'Pro', 549) returning 1$q$, 'ERROR');
select test.check('owner: cannot fake a sales handoff', $q$insert into public.client_packages (business_id, package_name, monthly_price, source, sales_sale_id) values (test.id('b'), 'Pro', 549, 'sales_handoff', 'x1') returning 1$q$, 'ERROR');
select test.check('owner: cannot rewrite terms', $q$update public.client_packages set monthly_price = 1 where business_id = test.id('a') returning 1$q$, 'ERROR');
select test.check('owner: can end a package', $q$with u as (update public.client_packages set ended_at = now() where business_id = test.id('a') returning 1) select count(*) from u$q$, '1');
reset role;

set role authenticated;
select test.sign_in('am1@test.com');
select test.check('am1: can read packages', 'select count(*) from public.packages', '2');
select test.check('am1: cannot edit packages', $q$with u as (update public.packages set monthly_price = 1 returning 1) select count(*) from u$q$, '0');
select test.check('am1: sees client A''s package history', 'select count(*) from public.client_packages', '1');
select test.check('am1: cannot set a package (request only)', $q$insert into public.client_packages (business_id, package_name, monthly_price) values (test.id('a'), 'Pro', 549) returning 1$q$, 'ERROR');
select test.check('am1: can set client A status', $q$with u as (update public.businesses set status = 'paused' where id = test.id('a') returning 1) select count(*) from u$q$, '1');
reset role;

set role authenticated;
select test.sign_in('ma@test.com');
select test.check('manager admin: can set client B package', $q$with i as (insert into public.client_packages (business_id, package_name, monthly_price) values (test.id('b'), 'Pro', 549) returning 1) select count(*) from i$q$, '1');
select test.check('manager admin: cannot edit packages', $q$with u as (update public.packages set monthly_price = 1 returning 1) select count(*) from u$q$, '0');
reset role;

set role authenticated;
select test.sign_in('b@test.com');
select test.check('client B: cannot see packages', 'select count(*) from public.packages', '0');
select test.check('client B: cannot see own package terms', 'select count(*) from public.client_packages', '0');
select test.check('client B: cannot change own status', $q$update public.businesses set status = 'canceled' where id = test.id('b') returning 1$q$, 'ERROR');
select test.check('client B: can still edit own city', $q$with u as (update public.businesses set city = 'Reno' where id = test.id('b') returning 1) select count(*) from u$q$, '1');
reset role;

set role anon;
select test.sign_in('');
select test.check('signed out: no packages', 'select count(*) from public.packages', 'ERROR');
reset role;

-- The server (service key) records a handoff.
set role service_role;
select set_config('request.jwt.claims', '{"role":"service_role"}', false);
select test.check('server: can record a sales handoff', $q$with i as (insert into public.client_packages (business_id, package_name, monthly_price, setup_fee, source, sales_sale_id, sold_by) values (test.id('c'), 'Pro', 549, 250, 'sales_handoff', 'sale-1', 'Ryan') returning 1) select count(*) from i$q$, '1');
select test.check('server: same sale twice refused', $q$insert into public.client_packages (business_id, package_name, monthly_price, source, sales_sale_id) values (test.id('c'), 'Pro', 549, 'sales_handoff', 'sale-1') returning 1$q$, 'ERROR');
reset role;
