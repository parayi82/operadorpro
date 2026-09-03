-- ============================================================
-- Migración: "La app del camionero"
-- Convierte OperadorPro en la herramienta diaria del chofer, el
-- hombre-camión y el pequeño flotero:
--   · Viajes con flete cobrado y kilometraje (cuentas claras: ¿cuánto
--     me quedó?), evidencia de entrega y nombre del cliente.
--   · Gastos sin foto obligatoria, con litros de diésel y odómetro
--     (rendimiento km/L).
--   · Mantenimiento de la unidad por kilometraje (aceite, llantas…).
--   · Un solo pago cubre a los choferes de la misma empresa
--     (fn_company_has_access).
--   · Código de patrón para que un chofer se una a la empresa de su
--     jefe sin que nadie tenga que "darlo de alta" a mano.
--   · El chofer puede abrir/cerrar sus propios viajes y subir sus
--     propios papeles (licencia, examen médico).
--
-- Ejecutar en Supabase Dashboard > SQL Editor. Seguro de correr más de
-- una vez (IF NOT EXISTS / OR REPLACE / DROP IF EXISTS).
-- ============================================================

-- ---------- VIAJES: flete, kilometraje, cliente, evidencia ----------
alter table public.trips add column if not exists freight_amount numeric(12,2) not null default 0 check (freight_amount >= 0);
alter table public.trips add column if not exists km_start int check (km_start is null or km_start >= 0);
alter table public.trips add column if not exists km_end int check (km_end is null or km_end >= 0);
alter table public.trips add column if not exists client_name text;
alter table public.trips add column if not exists pod_url text;
alter table public.trips add column if not exists notes text;

-- ---------- GASTOS: foto opcional, litros, odómetro, más categorías ----------
alter table public.expenses alter column receipt_url drop not null;
alter table public.expenses add column if not exists liters numeric(8,2) check (liters is null or liters > 0);
alter table public.expenses add column if not exists odometer_km int check (odometer_km is null or odometer_km >= 0);
alter table public.expenses drop constraint if exists expenses_category_check;
alter table public.expenses add constraint expenses_category_check
  check (category in ('diesel','caseta','comida','hospedaje','maniobras','taller','otro'));

-- ---------- UNIDADES: kilometraje actual ----------
alter table public.vehicles add column if not exists odometer_km int check (odometer_km is null or odometer_km >= 0);

-- ---------- EMPRESAS: código de patrón ----------
alter table public.companies add column if not exists invite_code text unique;

-- ---------- MANTENIMIENTO DE LA UNIDAD ----------
create table if not exists public.maintenance_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete cascade,
  kind text not null check (kind in ('aceite','llantas','frenos','verificacion','filtros','otro')),
  label text not null check (char_length(trim(label)) > 0),
  every_km int check (every_km is null or every_km > 0),
  last_km int check (last_km is null or last_km >= 0),
  last_date date,
  due_date date,
  notes text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_maintenance_vehicle on public.maintenance_items (vehicle_id);

alter table public.maintenance_items enable row level security;

drop policy if exists "mantenimiento: leer miembros" on public.maintenance_items;
create policy "mantenimiento: leer miembros" on public.maintenance_items
  for select using (public.fn_is_company_member(company_id, null));

-- Cualquier miembro (el chofer incluido) puede registrar el servicio de
-- su unidad: es el que está en el taller cuando se hace.
drop policy if exists "mantenimiento: escribir miembros" on public.maintenance_items;
create policy "mantenimiento: escribir miembros" on public.maintenance_items
  for all using (public.fn_is_company_member(company_id, null))
  with check (public.fn_is_company_member(company_id, null));

-- ---------- VISTA DE VIAJES: cuentas claras ----------
-- Se recrea (no "or replace") porque se agregan columnas en medio de la
-- lista (t.*). La función que la usa como tipo de retorno se vuelve a
-- crear abajo.
drop function if exists public.fn_close_trip_and_reconcile(uuid, uuid);
drop function if exists public.fn_close_trip_and_reconcile(uuid, uuid, int, text, numeric);
drop view if exists public.trip_reconciliation_v;

create view public.trip_reconciliation_v as
select
  t.*,
  coalesce(sum(e.amount), 0) as spent_amount,
  t.budget_amount - coalesce(sum(e.amount), 0) as remaining_amount,
  t.freight_amount - coalesce(sum(e.amount), 0) as profit_amount,
  coalesce(sum(e.amount) filter (where e.category = 'diesel'), 0) as diesel_amount,
  coalesce(sum(e.liters) filter (where e.category = 'diesel'), 0) as diesel_liters,
  case when t.km_end is not null and t.km_start is not null and t.km_end >= t.km_start
       then t.km_end - t.km_start else null end as distance_km
from public.trips t
left join public.expenses e on e.trip_id = t.id
group by t.id;

-- Cerrar viaje: ahora también lo puede hacer el chofer del viaje
-- (drivers.user_id = actor), no solo owner/admin. Guarda km final,
-- evidencia de entrega y flete (si se conoce hasta el cierre) y
-- actualiza el odómetro de la unidad — todo en una transacción.
create or replace function public.fn_close_trip_and_reconcile(
  p_actor_user_id uuid, p_trip_id uuid, p_km_end int, p_pod_url text, p_freight_amount numeric
) returns public.trip_reconciliation_v
language plpgsql security definer set search_path = public as $$
declare
  v_trip public.trips;
  v_result public.trip_reconciliation_v;
  v_is_driver boolean;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if v_trip.id is null then raise exception 'trip not found'; end if;

  select exists (
    select 1 from public.drivers d where d.id = v_trip.driver_id and d.user_id = p_actor_user_id
  ) into v_is_driver;

  if not v_is_driver and not public.fn_actor_has_role(p_actor_user_id, v_trip.company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_km_end is not null and v_trip.km_start is not null and p_km_end < v_trip.km_start then
    raise exception 'km_end must be >= km_start' using errcode = '22023';
  end if;

  update public.trips
     set status = 'cerrado',
         closed_at = now(),
         km_end = coalesce(p_km_end, km_end),
         pod_url = coalesce(p_pod_url, pod_url),
         freight_amount = coalesce(p_freight_amount, freight_amount)
   where id = p_trip_id;

  if p_km_end is not null then
    update public.vehicles
       set odometer_km = greatest(coalesce(odometer_km, 0), p_km_end)
     where id = v_trip.vehicle_id;
  end if;

  select * into v_result from public.trip_reconciliation_v where id = p_trip_id;
  return v_result;
end;
$$;

-- ---------- PAPELES: el chofer sube los suyos ----------
-- Un chofer puede registrar documentos SOLO sobre su propio registro de
-- chofer (licencia, examen médico); los de la unidad siguen siendo del
-- dueño/admin.
create or replace function public.fn_create_compliance_document(
  p_actor_user_id uuid,
  p_company_id uuid, p_vehicle_id uuid, p_driver_id uuid, p_doc_type text,
  p_doc_number text, p_file_url text, p_issued_at date, p_expires_at date
) returns public.compliance_documents
language plpgsql security definer set search_path = public as $$
declare
  v_doc public.compliance_documents;
  v_is_own_driver boolean := false;
begin
  if p_driver_id is not null and p_vehicle_id is null then
    select exists (
      select 1 from public.drivers d
      where d.id = p_driver_id and d.company_id = p_company_id and d.user_id = p_actor_user_id
    ) into v_is_own_driver;
  end if;

  if not v_is_own_driver and not public.fn_actor_has_role(p_actor_user_id, p_company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_vehicle_id is not null and not exists (
    select 1 from public.vehicles v where v.id = p_vehicle_id and v.company_id = p_company_id
  ) then
    raise exception 'vehicle does not belong to company' using errcode = '42501';
  end if;

  if p_driver_id is not null and not exists (
    select 1 from public.drivers d where d.id = p_driver_id and d.company_id = p_company_id
  ) then
    raise exception 'driver does not belong to company' using errcode = '42501';
  end if;

  insert into public.compliance_documents
    (company_id, vehicle_id, driver_id, doc_type, doc_number, file_url, issued_at, expires_at, created_by)
  values
    (p_company_id, p_vehicle_id, p_driver_id, p_doc_type, p_doc_number, p_file_url, p_issued_at, p_expires_at, p_actor_user_id)
  returning * into v_doc;

  insert into public.compliance_alerts (document_id, days_before, scheduled_for)
  select v_doc.id, db, v_doc.expires_at - (db || ' days')::interval
  from unnest(array[30,15,5]) as db
  where v_doc.expires_at - (db || ' days')::interval >= current_date;

  return v_doc;
end;
$$;

-- ---------- UNA SUSCRIPCIÓN CUBRE A LA EMPRESA ----------
-- La empresa "tiene acceso" si su dueño tiene plan activo. Así el
-- pequeño flotero paga una vez y sus choferes usan la app sin pagar
-- cada uno. Se llama desde el cliente (RLS no aplica: solo devuelve un
-- booleano y solo para empresas de las que el usuario es miembro).
create or replace function public.fn_company_has_access(p_company_id uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select public.fn_is_company_member(p_company_id, null)
     and exists (
       select 1 from public.companies c
       join public.profiles p on p.id = c.owner_user_id
       where c.id = p_company_id and p.subscription_status = 'active'
     );
$$;

-- ---------- CÓDIGO DE PATRÓN ----------
-- El dueño obtiene (o genera) un código corto que comparte por WhatsApp.
create or replace function public.fn_get_or_create_invite_code(p_actor_user_id uuid, p_company_id uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not public.fn_actor_has_role(p_actor_user_id, p_company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select invite_code into v_code from public.companies where id = p_company_id;
  if v_code is not null then return v_code; end if;

  loop
    -- 6 caracteres sin 0/O/1/I para dictarlo por teléfono sin confusión
    v_code := upper(translate(substr(md5(random()::text || clock_timestamp()::text), 1, 8), '01ioIO', 'ABCDEF'));
    v_code := substr(v_code, 1, 6);
    exit when not exists (select 1 from public.companies where invite_code = v_code);
  end loop;

  update public.companies set invite_code = v_code where id = p_company_id;
  return v_code;
end;
$$;

-- El chofer entra con el código de su patrón + el teléfono con el que el
-- patrón lo registró (los dos deben coincidir: el código solo no basta).
-- Si el patrón todavía no lo registró, se crea su registro de chofer
-- con el código como única llave — el patrón lo ve en su lista de
-- choferes y puede darlo de baja si no lo reconoce.
create or replace function public.fn_join_company_as_driver(
  p_user_id uuid, p_invite_code text, p_phone text, p_full_name text
) returns public.drivers
language plpgsql security definer set search_path = public as $$
declare
  v_company public.companies;
  v_driver public.drivers;
begin
  select * into v_company from public.companies where invite_code = upper(trim(p_invite_code));
  if v_company.id is null then
    raise exception 'invalid invite code' using errcode = 'P0002';
  end if;

  select * into v_driver from public.drivers
   where company_id = v_company.id and phone = p_phone
   for update;

  if v_driver.id is not null then
    if v_driver.user_id is not null and v_driver.user_id <> p_user_id then
      raise exception 'phone already linked to another account' using errcode = '23505';
    end if;
    update public.drivers set user_id = p_user_id, status = 'activo' where id = v_driver.id
    returning * into v_driver;
  else
    insert into public.drivers (company_id, user_id, full_name, phone)
    values (v_company.id, p_user_id, p_full_name, p_phone)
    returning * into v_driver;
  end if;

  insert into public.company_members (company_id, user_id, role)
  values (v_company.id, p_user_id, 'driver')
  on conflict (company_id, user_id) do update set status = 'active';

  return v_driver;
end;
$$;

-- ---------- ALTA EXPRESS DEL HOMBRE-CAMIÓN ----------
-- Un solo paso: la unidad + el propio dueño como chofer de su empresa.
create or replace function public.fn_setup_owner_operator(
  p_actor_user_id uuid, p_company_id uuid, p_economic_number text, p_plate text,
  p_full_name text, p_phone text, p_odometer_km int
) returns public.drivers
language plpgsql security definer set search_path = public as $$
declare
  v_driver public.drivers;
begin
  if not public.fn_actor_has_role(p_actor_user_id, p_company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into public.vehicles (company_id, economic_number, plate, odometer_km)
  values (p_company_id, p_economic_number, p_plate, p_odometer_km)
  on conflict (company_id, plate) do update set odometer_km = coalesce(excluded.odometer_km, public.vehicles.odometer_km);

  select * into v_driver from public.drivers
   where company_id = p_company_id and user_id = p_actor_user_id;

  if v_driver.id is null then
    insert into public.drivers (company_id, user_id, full_name, phone)
    values (p_company_id, p_actor_user_id, p_full_name, p_phone)
    on conflict (company_id, phone) do update set user_id = p_actor_user_id, full_name = excluded.full_name, status = 'activo'
    returning * into v_driver;
  end if;

  update public.companies set plan = 'hombre_camion' where id = p_company_id and plan = 'hombre_camion';
  return v_driver;
end;
$$;
