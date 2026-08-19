-- ============================================================
-- Cartera de clientes del módulo "panel despacho".
-- Un usuario-despacho puede gestionar múltiples clientes
-- (empresas empleadoras) identificados por nombre y RFC.
-- ============================================================

create table if not exists public.despacho_cartera (
  id              uuid         primary key default gen_random_uuid(),
  despacho_user_id uuid        not null references auth.users(id) on delete cascade,
  client_nombre   text         not null,
  client_rfc      text         not null,
  created_at      timestamptz  not null default now(),
  constraint despacho_cartera_unique unique (despacho_user_id, client_rfc)
);

alter table public.despacho_cartera enable row level security;

create policy "despacho_cartera: ver propia"
  on public.despacho_cartera for select
  using (auth.uid() = despacho_user_id);

create policy "despacho_cartera: insertar propia"
  on public.despacho_cartera for insert
  with check (auth.uid() = despacho_user_id);

create policy "despacho_cartera: actualizar propia"
  on public.despacho_cartera for update
  using (auth.uid() = despacho_user_id)
  with check (auth.uid() = despacho_user_id);

create policy "despacho_cartera: eliminar propia"
  on public.despacho_cartera for delete
  using (auth.uid() = despacho_user_id);
