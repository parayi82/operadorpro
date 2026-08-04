-- ============================================================
-- Cobranza de Fletes (Freight Collections)
-- WhatsApp deep links para recordatorios (sin costo de API)
-- ============================================================

create table public.freight_collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  carta_porte_id uuid references public.carta_portes(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete set null,

  -- Monto
  amount numeric(12,2) not null,
  currency text default 'MXN',

  -- Status del cobro
  status text not null default 'pending' check (status in ('pending', 'partial', 'paid', 'cancelled')),

  -- Fechas
  due_date date,
  last_reminder_sent_at timestamptz,
  paid_at timestamptz,

  -- Notas
  notes text,

  -- Recordatorio enviado
  reminders_sent integer default 0,

  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_collections_user_id on public.freight_collections(user_id);
create index idx_collections_status on public.freight_collections(status);
create index idx_collections_carta_porte_id on public.freight_collections(carta_porte_id);

-- Tabla de auditoría de recordatorios
create table public.collection_reminders (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.freight_collections(id) on delete cascade not null,
  reminder_type text check (reminder_type in ('whatsapp', 'email', 'sms')),
  status text check (status in ('sent', 'failed', 'pending')),
  sent_at timestamptz default now(),
  notes text
);

create index idx_reminders_collection_id on public.collection_reminders(collection_id);

-- Row Level Security
alter table public.freight_collections enable row level security;
alter table public.collection_reminders enable row level security;

create policy "Users can view own collections"
  on public.freight_collections for select using (auth.uid() = user_id);

create policy "Users can insert own collections"
  on public.freight_collections for insert with check (auth.uid() = user_id);

create policy "Users can update own collections"
  on public.freight_collections for update using (auth.uid() = user_id);

create policy "Users can delete own collections"
  on public.freight_collections for delete using (auth.uid() = user_id);

create policy "Users can view own reminders"
  on public.collection_reminders for select
  using (collection_id in (
    select id from public.freight_collections where user_id = auth.uid()
  ));

create policy "Users can insert reminders for own collections"
  on public.collection_reminders for insert with check (
    collection_id in (
      select id from public.freight_collections where user_id = auth.uid()
    )
  );
