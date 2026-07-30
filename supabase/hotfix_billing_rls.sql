-- ============================================================
-- HOTFIX DE SEGURIDAD: la política RLS de UPDATE en companies no
-- protegía subscription_status/stripe_customer_id/stripe_subscription_id.
--
-- Impacto real: cualquier owner autenticado podía llamar directo a la
-- API REST de Supabase (con su propio JWT + anon key, sin pasar por
-- Stripe ni por nuestras funciones) y hacer
--   PATCH /rest/v1/companies?id=eq.<su_empresa>  { "subscription_status": "active" }
-- para activar su propia suscripción gratis, sin pagar. Estas 3
-- columnas solo deben poder escribirse desde el backend (service role,
-- que ignora RLS) — vía el webhook de Stripe.
--
-- Ejecutar en el SQL Editor de Supabase. Seguro de ejecutar más de
-- una vez (DROP POLICY IF EXISTS + CREATE POLICY).
-- ============================================================

drop policy if exists "empresa: actualizar solo owner/admin" on public.companies;

create policy "empresa: actualizar solo owner/admin" on public.companies
  for update using (public.fn_is_company_member(id, array['owner','admin']))
  with check (
    public.fn_is_company_member(id, array['owner','admin'])
    and subscription_status = (select c.subscription_status from public.companies c where c.id = companies.id)
    and coalesce(stripe_customer_id, '') = coalesce((select c.stripe_customer_id from public.companies c where c.id = companies.id), '')
    and coalesce(stripe_subscription_id, '') = coalesce((select c.stripe_subscription_id from public.companies c where c.id = companies.id), '')
  );
