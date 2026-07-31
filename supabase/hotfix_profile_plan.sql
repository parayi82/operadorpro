-- ============================================================
-- hotfix_profile_plan.sql — Migración incremental idempotente
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
--
-- Motivo: el frontend (js/panel.js) ya distinguía entre plan
-- "esencial" y "protegido" (asesoría legal por WhatsApp) y el
-- checkout ya mandaba el plan elegido, pero la tabla profiles
-- nunca tuvo la columna `plan` ni la RLS que la protege. Sin este
-- hotfix, cualquier usuario podría en teoría editar su propio plan
-- vía la API REST con su anon key (el mismo tipo de brecha que ya
-- se cerró para subscription_status/stripe_customer_id).
-- Seguro de ejecutar aunque ya tengas datos: usa
-- "if not exists" / "create or replace" en todo.
-- ============================================================

alter table public.profiles
  add column if not exists plan text default 'esencial';

-- Si la columna YA existía (de un intento anterior de correr este mismo
-- script), el ADD COLUMN de arriba no hace nada — ni siquiera fija el
-- default. Sin esto, cualquier alta nueva (el trigger handle_new_user,
-- que no manda `plan` explícitamente) cae al default real de la columna
-- y truena el check constraint de abajo. Forzarlo aquí, sin condición,
-- es lo que lo vuelve a prueba de reintentos.
alter table public.profiles
  alter column plan set default 'esencial';

-- Normaliza cualquier valor previo fuera de rango (o NULL) antes de
-- exigir la regla: cubre el caso de que la columna ya existiera de un
-- intento anterior con datos sucios.
update public.profiles
  set plan = 'esencial'
  where plan is null or plan not in ('esencial','protegido');

alter table public.profiles
  alter column plan set not null;

alter table public.profiles
  drop constraint if exists profiles_plan_check;
alter table public.profiles
  add constraint profiles_plan_check check (plan in ('esencial','protegido'));

drop policy if exists "perfil: actualizar propio" on public.profiles;
create policy "perfil: actualizar propio" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- El estado de suscripción y el plan solo los modifica el webhook (service role)
    and subscription_status = (select p.subscription_status from public.profiles p where p.id = auth.uid())
    and coalesce(stripe_customer_id,'') = coalesce((select p.stripe_customer_id from public.profiles p where p.id = auth.uid()),'')
    and plan = (select p.plan from public.profiles p where p.id = auth.uid())
  );
