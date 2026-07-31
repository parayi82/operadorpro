-- ============================================================
-- OperadorPro - Esquema de base de datos (Supabase / PostgreSQL)
-- Ejecutar completo en: Supabase Dashboard > SQL Editor > New query
-- ============================================================

-- ---------- PERFILES DE OPERADOR ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  curp text,
  licencia_numero text,
  licencia_categoria text, -- B, C, E, F (licencia federal SICT)
  licencia_vigencia date,
  experiencia_anios int default 0,
  unidades text[] default '{}', -- ej. {'Tractocamión 5a rueda','Doble remolque'}
  stripe_customer_id text,
  subscription_status text not null default 'inactive', -- inactive | active | past_due | canceled
  plan text not null default 'esencial' check (plan in ('esencial','protegido')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "perfil: leer propio" on public.profiles
  for select using (auth.uid() = id);

create policy "perfil: crear propio" on public.profiles
  for insert with check (auth.uid() = id);

create policy "perfil: actualizar propio" on public.profiles
  for update using (auth.uid() = id)
  with check (
    auth.uid() = id
    -- El estado de suscripción y el plan solo los modifica el webhook (service role)
    and subscription_status = (select p.subscription_status from public.profiles p where p.id = auth.uid())
    and coalesce(stripe_customer_id,'') = coalesce((select p.stripe_customer_id from public.profiles p where p.id = auth.uid()),'')
    and plan = (select p.plan from public.profiles p where p.id = auth.uid())
  );

-- Crear perfil automáticamente al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- PROGRESO DE LECCIONES ----------
create table if not exists public.course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  lesson_id text not null,
  completed_at timestamptz not null default now(),
  unique (user_id, course_id, lesson_id)
);

alter table public.course_progress enable row level security;

create policy "progreso: leer propio" on public.course_progress
  for select using (auth.uid() = user_id);

create policy "progreso: registrar propio" on public.course_progress
  for insert with check (auth.uid() = user_id);

-- ---------- INTENTOS DE EXAMEN ----------
create table if not exists public.exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null,
  score int not null,
  total int not null,
  passed boolean not null default false,
  answers jsonb,
  created_at timestamptz not null default now()
);

alter table public.exam_attempts enable row level security;

create policy "examen: leer propio" on public.exam_attempts
  for select using (auth.uid() = user_id);

create policy "examen: registrar propio" on public.exam_attempts
  for insert with check (auth.uid() = user_id);

-- ---------- CERTIFICADOS ----------
-- Solo se insertan desde la Netlify Function issue-certificate (service role).
-- La verificación pública se hace vía verify-certificate (service role),
-- por eso NO hay política de lectura pública: la tabla queda cerrada.
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  folio text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  course_id text not null,
  course_title text not null,
  score int not null,
  total int not null,
  issued_at timestamptz not null default now(),
  valid_until date not null default (current_date + interval '2 years'),
  status text not null default 'vigente', -- vigente | revocado
  unique (user_id, course_id)
);

alter table public.certificates enable row level security;

create policy "certificados: leer propios" on public.certificates
  for select using (auth.uid() = user_id);

-- ---------- ÍNDICES ----------
create index if not exists idx_progress_user on public.course_progress (user_id, course_id);
create index if not exists idx_attempts_user on public.exam_attempts (user_id, course_id);
create index if not exists idx_certificates_folio on public.certificates (folio);
