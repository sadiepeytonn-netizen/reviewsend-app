-- TEST ONLY: after step 3 the old secrets are gone and the app still works.
select test.check('step3: employee passwords deleted', $q$select count(*) from information_schema.columns where table_name = 'employees' and column_name = 'password'$q$, '0');
select test.check('step3: old Google key columns deleted', $q$select count(*) from information_schema.columns where table_name = 'businesses' and column_name like 'google_%token%'$q$, '0');
set role authenticated;
select test.sign_in('a@test.com');
select test.check('step3: client still reads own business', $q$select string_agg(name, ',') from public.businesses$q$, 'Biz A');
select test.check('step3: client still lists employees', 'select count(*) from public.employees', '1');
reset role;
