-- ============================================================
-- Carta Porte 3.1 - Tablas principales
-- ============================================================

-- Clientes (destinatarios de cartas porte)
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  rfc text,
  name text not null,
  fiscal_address text,
  email text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_clients_user_id on public.clients(user_id);

-- Cartas Porte
create table public.carta_portes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,

  -- Status workflow
  status text not null default 'draft' check (status in ('draft', 'ready', 'stamped', 'cancelled')),

  -- Folio y fechas
  folio text unique,
  fecha_emision timestamptz default now(),

  -- Origen (de dónde se carga)
  origen_rfc text,
  origen_nombre text,
  origen_domicilio text,
  origen_fecha_hora timestamptz,

  -- Destino (a dónde va)
  destino_rfc text,
  destino_nombre text,
  destino_domicilio text,
  destino_fecha_hora timestamptz,

  -- Mercancías (JSON array de {descripcion, cantidad, unidad, peso_kg})
  mercancias jsonb not null default '[]',

  -- Vehículo
  placa_vm text,
  anio_modelo_vm integer,
  permiso_sict text,
  config_vehicular text,
  asegura_resp_civil text,
  poliza_resp_civil text,

  -- Operador
  operador_rfc text,
  operador_nombre text,
  operador_licencia text,
  operador_residencia text,

  -- Archivos generados
  pdf_url text,
  qr_data text,

  -- Metadata
  observaciones text,
  template_id uuid,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_carta_portes_user_id on public.carta_portes(user_id);
create index idx_carta_portes_status on public.carta_portes(status);
create index idx_carta_portes_folio on public.carta_portes(folio);

-- Plantillas de Carta Porte
create table public.carta_porte_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  data jsonb not null, -- snapshot de campos reutilizables
  created_at timestamptz default now()
);

create index idx_templates_user_id on public.carta_porte_templates(user_id);

-- Row Level Security
alter table public.clients enable row level security;
alter table public.carta_portes enable row level security;
alter table public.carta_porte_templates enable row level security;

create policy "Users can view own clients"
  on public.clients for select using (auth.uid() = user_id);

create policy "Users can insert own clients"
  on public.clients for insert with check (auth.uid() = user_id);

create policy "Users can update own clients"
  on public.clients for update using (auth.uid() = user_id);

create policy "Users can delete own clients"
  on public.clients for delete using (auth.uid() = user_id);

create policy "Users can view own carta portes"
  on public.carta_portes for select using (auth.uid() = user_id);

create policy "Users can insert own carta portes"
  on public.carta_portes for insert with check (auth.uid() = user_id);

create policy "Users can update own carta portes"
  on public.carta_portes for update using (auth.uid() = user_id);

create policy "Users can delete own carta portes"
  on public.carta_portes for delete using (auth.uid() = user_id);

create policy "Users can view own templates"
  on public.carta_porte_templates for select using (auth.uid() = user_id);

create policy "Users can manage own templates"
  on public.carta_porte_templates for insert with check (auth.uid() = user_id);

create policy "Users can update own templates"
  on public.carta_porte_templates for update using (auth.uid() = user_id);

create policy "Users can delete own templates"
  on public.carta_porte_templates for delete using (auth.uid() = user_id);
