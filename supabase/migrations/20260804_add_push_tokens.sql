-- Agregar soporte para push notifications
alter table public.profiles add column if not exists push_token text;

-- Índice para buscar usuarios con tokens
create index if not exists idx_profiles_push_token on public.profiles(push_token) where push_token is not null;
