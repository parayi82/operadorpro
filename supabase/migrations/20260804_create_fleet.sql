-- ============================================================
-- Flota Básica (Unidades + Documentos + Alertas de Vencimiento)
-- ============================================================

create table public.units (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,

  -- Identificación
  name text not null, -- alias (ej: "Torton 01")
  placa text not null unique,
  config_vehicular text, -- C3, T3S2, T3S3, etc.
  anio_modelo integer,
  vin text,

  -- Status
  active boolean default true,

  -- Metadata
  notes text,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_units_user_id on public.units(user_id);
create index idx_units_active on public.units(active);
create index idx_units_placa on public.units(placa);

-- Documentos de la unidad (seguros, permisos, verificaciones, etc.)
create table public.unit_documents (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid references public.units(id) on delete cascade not null,

  -- Tipo de documento
  type text not null check (type in (
    'seguro_resp_civil',
    'permiso_sict',
    'verificacion_tecnica',
    'licencia_federal',
    'poliza_transporte',
    'constancia_no_deuda',
    'otro'
  )),

  -- Información
  number text,
  issuer text, -- Ej: Seguros ABC, SAT, etc.

  -- Fechas
  issued_at date,
  expires_at date not null,

  -- Archivo/URL
  file_url text,

  -- Alertas
  alert_sent_30d boolean default false,
  alert_sent_15d boolean default false,
  alert_sent_7d boolean default false,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_documents_unit_id on public.unit_documents(unit_id);
create index idx_documents_type on public.unit_documents(type);
create index idx_documents_expires_at on public.unit_documents(expires_at);

-- Vista: Documentos próximos a vencer (30 días)
create view public.expiring_documents as
  select
    d.id,
    d.unit_id,
    d.type,
    d.expires_at,
    u.name as unit_name,
    u.placa,
    u.user_id,
    extract(day from d.expires_at - now()) as days_until_expiry,
    case
      when extract(day from d.expires_at - now()) <= 7 then 'critical'
      when extract(day from d.expires_at - now()) <= 15 then 'warning'
      when extract(day from d.expires_at - now()) <= 30 then 'alert'
      else 'ok'
    end as alert_level
  from public.unit_documents d
  join public.units u on d.unit_id = u.id
  where d.expires_at > now()
    and d.expires_at <= now() + interval '30 days'
  order by d.expires_at asc;

-- Row Level Security
alter table public.units enable row level security;
alter table public.unit_documents enable row level security;

create policy "Users can view own units"
  on public.units for select using (auth.uid() = user_id);

create policy "Users can insert own units"
  on public.units for insert with check (auth.uid() = user_id);

create policy "Users can update own units"
  on public.units for update using (auth.uid() = user_id);

create policy "Users can delete own units"
  on public.units for delete using (auth.uid() = user_id);

create policy "Users can view documents for own units"
  on public.unit_documents for select using (
    unit_id in (select id from public.units where user_id = auth.uid())
  );

create policy "Users can insert documents for own units"
  on public.unit_documents for insert with check (
    unit_id in (select id from public.units where user_id = auth.uid())
  );

create policy "Users can update documents for own units"
  on public.unit_documents for update using (
    unit_id in (select id from public.units where user_id = auth.uid())
  );

create policy "Users can delete documents for own units"
  on public.unit_documents for delete using (
    unit_id in (select id from public.units where user_id = auth.uid())
  );

alter table public.expiring_documents enable row level security;

create policy "Users can view own expiring documents"
  on public.expiring_documents for select using (
    user_id = auth.uid()
  );
