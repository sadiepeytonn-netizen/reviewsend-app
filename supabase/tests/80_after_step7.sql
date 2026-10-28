-- TEST ONLY: account manager active flag (step 7).
select test.check('everyone starts active', 'select bool_and(active) from public.account_managers', 'true');
set role authenticated;
select test.sign_in('ma@test.com');
select test.check('manager admin: can mark am2 inactive', $q$with u as (update public.account_managers set active = false where email = 'am2@test.com' returning 1) select count(*) from u$q$, '1');
reset role;
set role authenticated;
select test.sign_in('am1@test.com');
select test.check('am1: cannot change the team', $q$with u as (update public.account_managers set active = false where email = 'am1@test.com' returning 1) select count(*) from u$q$, '0');
reset role;
set role authenticated;
select test.sign_in('a@test.com');
select test.check('client A: cannot change the team', $q$with u as (update public.account_managers set active = false returning 1) select count(*) from u$q$, '0');
reset role;
