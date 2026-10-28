-- TEST ONLY: sample data and a tiny test helper.
--   Owner (admin):            bentonisaiah03@gmail.com
--   Marketing companies:      mc1@test.com (clients A, B), mc2@test.com (client C)
--   Account managers (MC1):   am1@test.com → client A, am2@test.com → client B
--   Client logins:            a@test.com, b@test.com, c@test.com
--   Client A's employee:      emp_a@test.com (underscore on purpose)

create schema test;
grant usage on schema test to anon, authenticated, service_role;

create table test.ids (name text primary key, id uuid);
grant select on test.ids to anon, authenticated, service_role;

-- Run a query as whoever is currently signed in and compare the answer.
create function test.check(label text, q text, expected text) returns text
language plpgsql as $$
declare got text;
begin
  begin
    execute q into got;
  exception when others then
    got := 'ERROR';
  end;
  if coalesce(got, 'NULL') = expected then return 'PASS  ' || label; end if;
  return 'FAIL  ' || label || '  (got ' || coalesce(got, 'NULL') || ', expected ' || expected || ')';
end $$;
grant execute on function test.check(text, text, text) to anon, authenticated, service_role;

create function test.id(n text) returns uuid language sql stable as $$ select id from test.ids where name = n $$;
grant execute on function test.id(text) to anon, authenticated, service_role;

do $$
declare mc1 uuid; mc2 uuid; am1 uuid; am2 uuid; a uuid; b uuid; c uuid;
begin
  insert into public.marketing_companies (email, name) values ('MC1@test.com', 'MC One') returning id into mc1;
  insert into public.marketing_companies (email, name) values ('mc2@test.com', 'MC Two') returning id into mc2;
  insert into public.account_managers (email, name, marketing_company_id) values ('am1@test.com', 'AM One', mc1) returning id into am1;
  insert into public.account_managers (email, name, marketing_company_id) values ('am2@test.com', 'AM Two', mc1) returning id into am2;
  insert into public.businesses (email, name, marketing_company_id, account_manager_id, google_access_token, google_refresh_token, google_token_expiry, features)
    values ('a@test.com', 'Biz A', mc1, am1, 'ya29.A', '1//refreshA', 123, '{"send":true}') returning id into a;
  insert into public.businesses (email, name, marketing_company_id, account_manager_id) values ('b@test.com', 'Biz B', mc1, am2) returning id into b;
  insert into public.businesses (email, name, marketing_company_id) values ('c@test.com', 'Biz C', mc2) returning id into c;
  insert into test.ids values ('mc1', mc1), ('mc2', mc2), ('am1', am1), ('am2', am2), ('a', a), ('b', b), ('c', c);

  insert into public.employees (business_id, email, name, password) values (a, 'emp_a@test.com', 'Emp A', 'secret123');
  insert into public.messages (business_id, customer_name, customer_phone) values (a, 'Cust A', '+15550000001'), (b, 'Cust B', '+15550000002'), (c, 'Cust C', '+15550000003');
  insert into public.photos (business_id, file_path, status) values (a, a || '/1.jpg', 'pending'), (b, b || '/1.jpg', 'pending'), (c, c || '/1.jpg', 'pending');
  insert into public.chat_messages (business_id, message, sender_role, read) values (a, 'hi A', 'owner', false), (b, 'hi B', 'owner', false), (c, 'hi C', 'owner', false);
  insert into public.client_notes (business_id, note) values (a, 'note A'), (b, 'note B'), (c, 'note C');
  insert into public.client_files (business_id, file_path) values (a, a || '/f.pdf'), (b, b || '/f.pdf'), (c, c || '/f.pdf');
  insert into public.appointments (business_id, account_manager_id, marketing_company_id, title) values (a, am1, mc1, 'A call'), (b, am2, mc1, 'B call'), (c, null, mc2, 'C call');
  insert into public.bulk_sends (business_id, sent_count) values (a, 1), (b, 1), (c, 1);
  insert into public.rating_snapshots (business_id, rating, review_count, created_at) values
    (a, 4.5, 10, '2026-10-01 12:00-04'), (a, 4.6, 11, '2026-10-01 18:00-04'), (b, 4.0, 5, '2026-10-01 12:00-04'), (c, 3.9, 2, '2026-10-01 12:00-04');
  insert into storage.objects (bucket_id, name) values ('business-photos', a || '/1.jpg'), ('client-files', a || '/f.pdf'), ('client-files', b || '/f.pdf');
end $$;

-- Sign in as someone (empty email = not signed in).
create function test.sign_in(email text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims',
    json_build_object('email', email, 'sub', md5(email)::uuid, 'role', 'authenticated')::text, false);
end $$;
grant execute on function test.sign_in(text) to anon, authenticated;
