-- ============================================================
-- OperadorPro — Unificación de plataforma (persona física/moral,
-- alta automática de cuenta y administración de plataforma).
-- Ejecutar DESPUÉS de schema.sql y schema_fleet.sql.
-- Supabase Dashboard > SQL Editor > New query > pegar completo.
-- ============================================================

-- ---------- Tipo de contribuyente ----------
-- No cambia ningún permiso ni funcionalidad — es solo dato informativo
-- (formato de RFC: física = 13 caracteres, moral = 12). El servicio es
-- exactamente el mismo para ambos, tal como se pidió.
alter table public.companies
  add column if not exists entity_type text check (entity_type in ('fisica', 'moral'));

-- ---------- Alta automática de cuenta ----------
-- Un solo registro (correo + contraseña) le da acceso a TODO: cursos de
-- certificación y panel de flota, sea un chofer que solo certifica, un
-- "hombre-camión" dueño de su unidad, o una empresa con varias. Ya no
-- existe un paso separado de "crear empresa": se crea sola al registrarse,
-- con nombre editable después desde el perfil (Mi empresa).
create or replace function public.handle_new_user_company()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.companies (name, owner_user_id)
  values (
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)),
    new.id
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_company on auth.users;
create trigger on_auth_user_created_company
  after insert on auth.users
  for each row execute function public.handle_new_user_company();

-- Backfill: usuarios que se registraron ANTES de que existiera el
-- trigger de arriba (incluido todo el historial previo al módulo de
-- flota) nunca pasaron por "crear empresa" — sin esto se quedarían sin
-- una y el panel de flota/perfil no tendría dónde guardar sus datos.
-- Idempotente: solo crea una empresa para quien todavía no es dueño de
-- ninguna.
insert into public.companies (name, owner_user_id)
select
  coalesce(nullif(trim(u.raw_user_meta_data->>'full_name'), ''), split_part(u.email, '@', 1)),
  u.id
from auth.users u
where not exists (select 1 from public.companies c where c.owner_user_id = u.id);

-- ---------- Administradores de plataforma ----------
-- Acceso transversal a TODAS las empresas (fuera del modelo normal de
-- RLS por membresía). Deliberadamente sin ninguna política: con RLS
-- habilitado y cero "create policy", nadie puede leer ni escribir esta
-- tabla vía el cliente (ni siquiera el propio admin autenticado) — solo
-- la service role key (usada exclusivamente por las funciones
-- fleet-admin-*.js en el backend, después de verificar sesión) puede
-- tocarla. Es la única tabla del sistema con este nivel de blindaje
-- porque es la única que otorga acceso cruzado entre empresas.
create table if not exists public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;

create or replace function public.fn_is_platform_admin(p_user_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.platform_admins where user_id = p_user_id);
$$;

-- ---------- Sembrar el primer administrador ----------
-- Solo inserta si ya existe un usuario registrado con ese correo en
-- Supabase Auth (si aún no te registras con él en el sitio, este INSERT
-- no hace nada — vuelve a correrlo después de registrarte). Seguro de
-- ejecutar más de una vez.
insert into public.platform_admins (user_id)
select id from auth.users where email = 'serjuemsa@gmail.com'
on conflict (user_id) do nothing;
