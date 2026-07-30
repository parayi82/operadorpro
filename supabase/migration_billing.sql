-- ============================================================
-- MIGRACIÓN: columnas de facturación de flota en companies.
-- Ejecutar en el SQL Editor de Supabase si ya corriste
-- schema_fleet.sql antes de que existieran estas columnas
-- (instalaciones nuevas ya las traen incluidas). Seguro de
-- ejecutar más de una vez.
-- ============================================================

alter table public.companies add column if not exists stripe_customer_id text;
alter table public.companies add column if not exists stripe_subscription_id text;

alter table public.companies add column if not exists subscription_status text not null default 'inactive';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'companies_subscription_status_check'
  ) then
    alter table public.companies
      add constraint companies_subscription_status_check
      check (subscription_status in ('inactive','active','past_due','canceled'));
  end if;
end $$;
