-- ============================================================
-- Cursos + Certificados con QR Verificable
-- ============================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  duration_minutes integer,
  video_url text,
  order_index integer default 0,
  is_active boolean default true,
  created_at timestamptz default now()
);

create table public.course_lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  title text not null,
  content text, -- markdown
  video_url text,
  order_index integer default 0,
  created_at timestamptz default now()
);

create table public.course_quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade not null,
  question text not null,
  options jsonb not null, -- [{id: 'a', text: 'Opción A'}, ...]
  correct_option_id text not null,
  created_at timestamptz default now()
);

create table public.user_course_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  status text default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  score integer,
  completed_at timestamptz,
  created_at timestamptz default now(),
  unique(user_id, course_id)
);

create table public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete cascade not null,
  public_id text unique not null, -- para verificar por QR
  issued_at timestamptz default now(),
  pdf_url text,
  metadata jsonb -- {name, email, rfc, course_title, score}
);

-- Índices
create index idx_courses_active on public.courses(is_active);
create index idx_lessons_course_id on public.course_lessons(course_id);
create index idx_quizzes_course_id on public.course_quizzes(course_id);
create index idx_progress_user_id on public.user_course_progress(user_id);
create index idx_progress_status on public.user_course_progress(status);
create index idx_certificates_user_id on public.certificates(user_id);
create index idx_certificates_public_id on public.certificates(public_id);

-- Vista pública: Certificados verificables
create view public.certificates_public as
  select
    c.id,
    c.public_id,
    c.issued_at,
    c.metadata,
    p.full_name,
    p.email,
    co.title as course_title
  from public.certificates c
  join public.profiles p on c.user_id = p.id
  join public.courses co on c.course_id = co.id
  where c.public_id is not null;

-- Row Level Security
alter table public.courses enable row level security;
alter table public.course_lessons enable row level security;
alter table public.course_quizzes enable row level security;
alter table public.user_course_progress enable row level security;
alter table public.certificates enable row level security;

-- Cursos públicos (todos pueden leer)
create policy "Anyone can view active courses"
  on public.courses for select using (is_active = true);

create policy "Anyone can view course lessons"
  on public.course_lessons for select
  using (course_id in (select id from public.courses where is_active = true));

create policy "Anyone can view course quizzes"
  on public.course_quizzes for select
  using (course_id in (select id from public.courses where is_active = true));

-- Progreso de usuario (privado)
create policy "Users can view own progress"
  on public.user_course_progress for select using (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.user_course_progress for update using (auth.uid() = user_id);

create policy "Users can insert progress"
  on public.user_course_progress for insert with check (auth.uid() = user_id);

-- Certificados
create policy "Users can view own certificates"
  on public.certificates for select using (auth.uid() = user_id);

create policy "Users can insert own certificates"
  on public.certificates for insert with check (auth.uid() = user_id);

-- Vista pública: cualquiera puede verificar certificados
alter table public.certificates_public enable row level security;

create policy "Anyone can verify certificates"
  on public.certificates_public for select using (true);

-- ============================================================
-- Datos iniciales: 5 cursos de transporte en México
-- ============================================================

insert into public.courses (title, description, duration_minutes, order_index, is_active)
values
  (
    'Carta Porte 3.1 - Lo Esencial',
    'Aprende los conceptos clave del sistema de Carta Porte 3.1 en México. Requisitos, campos obligatorios y buenas prácticas.',
    20,
    1,
    true
  ),
  (
    'Inspección Pre-Viaje y NOM-012',
    'Checklist completo de inspección según NOM-012-SCT-2-2017. Seguridad y cumplimiento normativo.',
    25,
    2,
    true
  ),
  (
    'Tiempos de Conducción - NOM-087',
    'Regulaciones sobre horas de manejo, descansos obligatorios y manejo seguro. Norma Oficial NOM-087-SSA1-2016.',
    20,
    3,
    true
  ),
  (
    'Sujeción y Estiba de Carga - NOM-015',
    'Técnicas correctas de amarre y distribución de carga. Evita accidentes y multas. NOM-015-SCT-2-1994.',
    25,
    4,
    true
  ),
  (
    'Materiales Peligrosos - Introducción',
    'Conceptos básicos sobre transporte de materiales peligrosos. Clasificación, etiquetado y documentación.',
    30,
    5,
    true
  );

-- Agregar lecciones de ejemplo al primer curso
insert into public.course_lessons (course_id, title, content, order_index)
values
  (
    (select id from public.courses where title = 'Carta Porte 3.1 - Lo Esencial' limit 1),
    '¿Qué es la Carta Porte 3.1?',
    '# Carta Porte 3.1

La Carta Porte es un **documento fiscal electrónico** que comprueba el traslado de mercancías en territorio mexicano.

## Requisitos principales:
- RFC del remitente y destinatario
- Descripción y peso de mercancías
- Datos del vehículo y operador
- Número de operación (folio)

## Validez:
- Válida en todo México
- Válida ante autoridades (FMVQ, SAT)
- Obligatoria desde 2023',
    1
  );

-- Agregar quiz de ejemplo
insert into public.course_quizzes (course_id, question, options, correct_option_id)
values
  (
    (select id from public.courses where title = 'Carta Porte 3.1 - Lo Esencial' limit 1),
    '¿Cuál es el principal requisito de la Carta Porte?',
    '[
      {"id": "a", "text": "Tener seguro de responsabilidad civil"},
      {"id": "b", "text": "Llevar RFC del remitente y destinatario"},
      {"id": "c", "text": "Contar con licencia de conducir"},
      {"id": "d", "text": "Pagar impuestos mensuales"}
    ]'::jsonb,
    'b'
  );
