-- ============================================================
-- migration_telegram.sql — Telegram Bot integration
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- SESIONES TELEGRAM ----------
create table if not exists public.telegram_sessions (
  id uuid primary key default gen_random_uuid(),
  telegram_user_id text not null unique, -- id numérico de Telegram
  telegram_chat_id text not null,        -- chat_id para enviar mensajes
  user_id uuid not null references auth.users(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  authenticated_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  unique (user_id, company_id)
);

create index if not exists idx_telegram_sessions_user on public.telegram_sessions (user_id);
create index if not exists idx_telegram_sessions_company on public.telegram_sessions (company_id);

alter table public.telegram_sessions enable row level security;

-- Un usuario solo ve su propia sesión de Telegram
create policy "telegram_sessions: leer propia" on public.telegram_sessions
  for select using (auth.uid() = user_id);

create policy "telegram_sessions: crear propia" on public.telegram_sessions
  for insert with check (auth.uid() = user_id);

-- ---------- COLA OFFLINE ----------
-- Mensajes/fotos pendientes de sincronizar cuando no hay conexión
create table if not exists public.telegram_offline_queue (
  id uuid primary key default gen_random_uuid(),
  telegram_session_id uuid not null references public.telegram_sessions(id) on delete cascade,
  message_type text not null check (message_type in (
    'inspection_create',
    'inspection_photo',
    'inspection_checklist',
    'trip_start',
    'trip_close',
    'expense_submit',
    'document_upload'
  )),
  payload jsonb not null, -- {inspection_id, trip_id, photo_data, etc}
  retry_count int default 0 check (retry_count >= 0),
  last_error text,
  created_at timestamptz not null default now(),
  synced_at timestamptz
);

create index if not exists idx_queue_session on public.telegram_offline_queue (telegram_session_id);
create index if not exists idx_queue_pending on public.telegram_offline_queue (synced_at) where synced_at is null;

alter table public.telegram_offline_queue enable row level security;

-- El usuario solo ve su propia cola
create policy "telegram_queue: leer propia" on public.telegram_offline_queue
  for select using (
    exists (
      select 1 from public.telegram_sessions ts
      where ts.id = telegram_session_id and ts.user_id = auth.uid()
    )
  );

-- ---------- ESTADO DEL POLLING ----------
-- Guarda el último update_id procesado para evitar duplicados
create table if not exists public.telegram_poll_state (
  id uuid primary key default gen_random_uuid(),
  last_update_id bigint default 0,
  updated_at timestamptz not null default now()
);

-- Insertar fila inicial si no existe (función programada solo lee)
insert into public.telegram_poll_state (id, last_update_id)
select gen_random_uuid(), 0
where not exists (select 1 from public.telegram_poll_state);

-- ---------- ESTADO DE CONVERSACIÓN ----------
-- Guarda el estado del flujo conversacional (qué paso está en cada usuario)
create table if not exists public.telegram_conversation_state (
  id uuid primary key default gen_random_uuid(),
  telegram_session_id uuid not null unique references public.telegram_sessions(id) on delete cascade,
  flow_type text not null check (flow_type in (
    'none', 'inspection', 'trip', 'expense'
  )),
  current_step int default 0,
  context jsonb default '{}', -- {vehicle_id, trip_id, vehicle_economic_number, etc}
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_conv_session on public.telegram_conversation_state (telegram_session_id);
