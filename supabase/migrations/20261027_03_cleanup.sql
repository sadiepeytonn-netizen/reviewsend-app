-- ReviewSend client app — security step 3 of 3: delete the old secrets
--
-- RUN ONLY AFTER step 2 has been live for a few days with no login problems
-- (see SECURITY_ROLLOUT.md). This permanently deletes:
--   • the plain-text employee passwords (employees now sign in through Supabase)
--   • the old Google key columns on businesses (keys now live in business_google_tokens)

begin;

-- Stop if any employee still has no real login: they would be locked out.
do $$
declare n int;
begin
  select count(*) into n from public.employees where auth_user_id is null;
  if n > 0 then
    raise exception '% employee(s) still have no Supabase login. Run scripts/migrate-employees.js --apply (server repo) first, or remove those employees.', n;
  end if;
end $$;

alter table public.employees  drop column if exists password;
alter table public.businesses drop column if exists google_access_token;
alter table public.businesses drop column if exists google_refresh_token;
alter table public.businesses drop column if exists google_token_expiry;

commit;
