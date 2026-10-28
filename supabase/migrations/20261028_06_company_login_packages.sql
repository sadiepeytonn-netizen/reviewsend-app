-- ReviewSend — step 6: the company login may set packages for its own clients.
--
-- The CRM treats a marketing-company login (the in-house company account) as a
-- Manager Admin for that company's clients. Step 5 only let owners and Manager
-- Admins set a client's package; this adds the company login, for its own clients.

drop policy if exists "managers add client packages" on public.client_packages;
create policy "managers add client packages" on public.client_packages for insert to authenticated
  with check (source = 'manual' and sales_sale_id is null
              and (((private.is_admin() or private.is_manager_admin()) and business_id in (select private.staff_business_ids()))
                   or business_id in (select id from public.businesses
                                      where marketing_company_id in (select private.my_marketing_company_ids()))));

drop policy if exists "managers end client packages" on public.client_packages;
create policy "managers end client packages" on public.client_packages for update to authenticated
  using (((private.is_admin() or private.is_manager_admin()) and business_id in (select private.staff_business_ids()))
         or business_id in (select id from public.businesses
                            where marketing_company_id in (select private.my_marketing_company_ids())))
  with check (((private.is_admin() or private.is_manager_admin()) and business_id in (select private.staff_business_ids()))
         or business_id in (select id from public.businesses
                            where marketing_company_id in (select private.my_marketing_company_ids())));
