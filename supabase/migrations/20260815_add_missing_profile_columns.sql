-- ============================================================
-- Migración: columnas faltantes en profiles
-- Ejecutar en Supabase SQL Editor si ya tienes datos (schema.sql
-- ya incluye estas columnas para instalaciones nuevas).
-- Seguro de ejecutar más de una vez (IF NOT EXISTS).
-- ============================================================

-- Vencimiento del examen médico obligatorio (NOM-004)
alter table public.profiles
  add column if not exists examen_medico_vigencia date;

-- Expo push token para notificaciones desde la app móvil
alter table public.profiles
  add column if not exists push_token text;
