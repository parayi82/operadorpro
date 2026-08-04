-- ============================================================
-- Inspecciones Pre-Viaje (Checklist + Fotos + Firma + QR)
-- ============================================================

create table public.inspections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  unit_id uuid not null, -- se linkea con flota después
  carta_porte_id uuid references public.carta_portes(id) on delete set null,

  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'failed')),

  -- Checklist como JSON array de {id, category, label, status: 'ok'|'fail'|'na', photo_url?, notes?}
  checklist jsonb not null default '[]',

  -- Geolocalización
  latitude numeric(10,8),
  longitude numeric(11,8),
  accuracy numeric(10,2),
  location_timestamp timestamptz,

  -- Firma del operador (base64 o URL)
  operator_signature text,

  -- Fechas
  started_at timestamptz default now(),
  completed_at timestamptz,

  -- Archivos generados
  pdf_url text,
  qr_public_id text unique, -- para verificación pública

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_inspections_user_id on public.inspections(user_id);
create index idx_inspections_unit_id on public.inspections(unit_id);
create index idx_inspections_status on public.inspections(status);
create index idx_inspections_qr_public_id on public.inspections(qr_public_id);

-- Almacenar fotos de inspección en Storage (via Supabase Storage)
-- Path: inspections/{user_id}/{inspection_id}/{item_id}.jpg

-- Tabla de vista pública de inspecciones (para verificar QR)
create view public.inspections_public as
  select
    id,
    qr_public_id,
    status,
    checklist,
    completed_at,
    created_at
  from public.inspections
  where qr_public_id is not null and status = 'completed';

-- Row Level Security
alter table public.inspections enable row level security;

create policy "Users can view own inspections"
  on public.inspections for select using (auth.uid() = user_id);

create policy "Users can insert own inspections"
  on public.inspections for insert with check (auth.uid() = user_id);

create policy "Users can update own inspections"
  on public.inspections for update using (auth.uid() = user_id);

create policy "Users can delete own inspections"
  on public.inspections for delete using (auth.uid() = user_id);

-- Vista pública es read-only (sin políticas de modify)
alter table public.inspections_public enable row level security;

create policy "Anyone can read public inspections"
  on public.inspections_public for select using (true);
