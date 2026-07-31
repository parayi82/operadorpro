-- ============================================================
-- OperadorPro Flota — Esquema del módulo de gestión de flota
-- Ejecutar DESPUÉS de supabase/schema.sql (reutiliza auth.users).
-- Supabase Dashboard > SQL Editor > New query > pegar completo.
-- ============================================================

-- ---------- EMPRESAS (tenant) ----------
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) > 0),
  rfc text unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  plan text not null default 'hombre_camion'
    check (plan in ('hombre_camion','flota_pequena','flota_mediana')),
  -- Columnas legacy de un modelo de cobro por unidad que se descartó
  -- antes de lanzar (Flota ahora está incluida en la suscripción de
  -- certificación, ver requireActiveSubscription en _lib/auth.js).
  -- Sin uso, se dejan por si se retoma un tier de flota grande a futuro.
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text not null default 'inactive'
    check (subscription_status in ('inactive','active','past_due','canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_companies_owner on public.companies (owner_user_id);

-- ---------- MEMBRESÍAS (RBAC) ----------
create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','admin','driver')),
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create index if not exists idx_members_user on public.company_members (user_id);
create index if not exists idx_members_company_role on public.company_members (company_id, role);

-- Helper: ¿pertenece el usuario actual a la empresa, con alguno de estos roles?
-- Se apoya en auth.uid(), por lo que SOLO es válido cuando quien ejecuta la
-- consulta es el propio usuario autenticado (RLS de políticas, llamadas desde
-- el cliente con su JWT). auth.uid() es NULL cuando la llamada llega vía la
-- service role key (backend) — para eso existe fn_actor_has_role de abajo.
create or replace function public.fn_is_company_member(p_company_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id
      and m.user_id = auth.uid()
      and m.status = 'active'
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

-- Helper: ¿el usuario indicado explícitamente (p_user_id) pertenece a la
-- empresa con alguno de estos roles? Usar SIEMPRE que la verificación se haga
-- desde una función de Postgres invocada por el backend con la service role
-- key (donde auth.uid() no está disponible) — el backend ya validó el JWT del
-- usuario y pasa su id explícito.
create or replace function public.fn_actor_has_role(p_user_id uuid, p_company_id uuid, p_roles text[])
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.company_members m
    where m.company_id = p_company_id
      and m.user_id = p_user_id
      and m.status = 'active'
      and (p_roles is null or m.role = any(p_roles))
  );
$$;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;

create policy "empresa: leer si soy miembro" on public.companies
  for select using (public.fn_is_company_member(id, null));

create policy "empresa: crear como dueño" on public.companies
  for insert with check (owner_user_id = auth.uid());

-- El estado de suscripción y los IDs de Stripe NO pueden cambiar por esta
-- vía (RLS con el JWT del owner/admin): solo los escribe el webhook de
-- Stripe con la service role key. Sin este "with check", cualquier owner
-- podría marcarse subscription_status='active' directo por la API de
-- Supabase sin pagar (mismo patrón de protección que profiles.subscription_status
-- en schema.sql).
create policy "empresa: actualizar solo owner/admin" on public.companies
  for update using (public.fn_is_company_member(id, array['owner','admin']))
  with check (
    public.fn_is_company_member(id, array['owner','admin'])
    and subscription_status = (select c.subscription_status from public.companies c where c.id = companies.id)
    and coalesce(stripe_customer_id, '') = coalesce((select c.stripe_customer_id from public.companies c where c.id = companies.id), '')
    and coalesce(stripe_subscription_id, '') = coalesce((select c.stripe_subscription_id from public.companies c where c.id = companies.id), '')
  );

create policy "membresias: leer de mi empresa" on public.company_members
  for select using (public.fn_is_company_member(company_id, null));

create policy "membresias: gestionar owner/admin" on public.company_members
  for insert with check (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "membresias: actualizar owner/admin" on public.company_members
  for update using (public.fn_is_company_member(company_id, array['owner','admin']));

-- Al crear una empresa, su dueño se vuelve miembro 'owner' automáticamente
create or replace function public.handle_new_company()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, new.owner_user_id, 'owner')
  on conflict (company_id, user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_company_created on public.companies;
create trigger on_company_created
  after insert on public.companies
  for each row execute function public.handle_new_company();

-- ---------- UNIDADES ----------
create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  economic_number text not null check (char_length(trim(economic_number)) > 0),
  plate text not null check (char_length(trim(plate)) > 0),
  vin text,
  brand text,
  model text,
  year int check (year between 1980 and 2100),
  status text not null default 'activa' check (status in ('activa','taller','baja')),
  created_at timestamptz not null default now(),
  unique (company_id, economic_number),
  unique (company_id, plate)
);

create index if not exists idx_vehicles_company on public.vehicles (company_id, status);

-- ---------- OPERADORES (choferes) ----------
create table if not exists public.drivers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null check (char_length(trim(full_name)) > 0),
  phone text not null check (phone ~ '^\+?[0-9]{10,15}$'),
  curp text check (curp is null or char_length(curp) = 18),
  license_number text,
  license_category text check (license_category is null or license_category in ('A','B','C','D','E','F')),
  license_expiry date,
  status text not null default 'activo' check (status in ('activo','baja')),
  created_at timestamptz not null default now(),
  unique (company_id, phone)
);

create index if not exists idx_drivers_company on public.drivers (company_id, status);

alter table public.vehicles enable row level security;
alter table public.drivers enable row level security;

create policy "vehiculos: leer miembros" on public.vehicles
  for select using (public.fn_is_company_member(company_id, null));
create policy "vehiculos: escribir owner/admin" on public.vehicles
  for all using (public.fn_is_company_member(company_id, array['owner','admin']))
  with check (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "choferes: leer miembros" on public.drivers
  for select using (public.fn_is_company_member(company_id, null));
create policy "choferes: escribir owner/admin" on public.drivers
  for all using (public.fn_is_company_member(company_id, array['owner','admin']))
  with check (public.fn_is_company_member(company_id, array['owner','admin']));

-- ============================================================
-- MÓDULO 1 — Cumplimiento documental (licencias, pólizas, etc.)
-- ============================================================
create table if not exists public.compliance_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid references public.vehicles(id) on delete cascade,
  driver_id uuid references public.drivers(id) on delete cascade,
  doc_type text not null check (doc_type in (
    'licencia_federal','poliza_seguro','tarjeta_circulacion',
    'verificacion','permiso_sct','carta_porte_config','otro'
  )),
  doc_number text,
  file_url text not null,
  issued_at date,
  expires_at date not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  check (vehicle_id is not null or driver_id is not null)
);

create index if not exists idx_docs_company_expiry on public.compliance_documents (company_id, expires_at);
create index if not exists idx_docs_vehicle on public.compliance_documents (vehicle_id);
create index if not exists idx_docs_driver on public.compliance_documents (driver_id);

-- Vista de estatus (semáforo) calculado, nunca almacenado como texto suelto
create or replace view public.compliance_status_v as
select
  d.*,
  (d.expires_at - current_date) as days_to_expire,
  case
    when d.expires_at < current_date then 'vencido'
    when d.expires_at <= current_date + interval '15 days' then 'por_vencer'
    else 'vigente'
  end as semaforo
from public.compliance_documents d;

create table if not exists public.compliance_alerts (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.compliance_documents(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email')),
  days_before int not null check (days_before in (30,15,5)),
  scheduled_for date not null,
  sent_at timestamptz,
  status text not null default 'pendiente' check (status in ('pendiente','enviado','fallido','cancelado')),
  unique (document_id, days_before)
);

create index if not exists idx_alerts_pending on public.compliance_alerts (scheduled_for) where status = 'pendiente';

alter table public.compliance_documents enable row level security;
alter table public.compliance_alerts enable row level security;

create policy "docs: leer miembros" on public.compliance_documents
  for select using (public.fn_is_company_member(company_id, null));
create policy "docs: escribir owner/admin" on public.compliance_documents
  for all using (public.fn_is_company_member(company_id, array['owner','admin']))
  with check (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "alertas: leer via documento" on public.compliance_alerts
  for select using (
    exists (select 1 from public.compliance_documents d
            where d.id = document_id and public.fn_is_company_member(d.company_id, null))
  );

-- Al insertar un documento, se programan sus 3 recordatorios automáticamente (transacción única)
-- p_actor_user_id: id del usuario ya autenticado por el backend (auth.uid()
-- NO está disponible aquí porque la llamada llega vía service role key).
drop function if exists public.fn_create_compliance_document(uuid, uuid, uuid, text, text, text, date, date);
create or replace function public.fn_create_compliance_document(
  p_actor_user_id uuid,
  p_company_id uuid, p_vehicle_id uuid, p_driver_id uuid, p_doc_type text,
  p_doc_number text, p_file_url text, p_issued_at date, p_expires_at date
) returns public.compliance_documents
language plpgsql security definer set search_path = public as $$
declare
  v_doc public.compliance_documents;
begin
  if not public.fn_actor_has_role(p_actor_user_id, p_company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- El actor tiene rol en p_company_id, pero eso no garantiza que
  -- p_vehicle_id/p_driver_id (IDs que manda el cliente) sean realmente
  -- de esa empresa: sin esto, la Empresa A podría adjuntar documentos
  -- falsos a una unidad de la Empresa B (visible en su QR público).
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

-- ============================================================
-- MÓDULO 2 — Viáticos y gastos de viaje
-- ============================================================
create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  origin text not null,
  destination text not null,
  budget_amount numeric(12,2) not null check (budget_amount >= 0),
  currency text not null default 'MXN' check (currency = 'MXN'),
  status text not null default 'abierto' check (status in ('abierto','cerrado')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  check (status = 'abierto' or closed_at is not null)
);

create index if not exists idx_trips_company_status on public.trips (company_id, status);
create index if not exists idx_trips_driver on public.trips (driver_id);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  category text not null check (category in ('diesel','caseta','comida','taller','otro')),
  amount numeric(12,2) not null check (amount > 0),
  merchant_rfc text,
  receipt_url text not null,
  ocr_raw jsonb,
  ocr_confidence numeric(4,3) check (ocr_confidence is null or ocr_confidence between 0 and 1),
  review_status text not null default 'pendiente' check (review_status in ('pendiente','revision_manual','conciliado')),
  expense_date date not null default current_date,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_expenses_trip on public.expenses (trip_id, category);

-- Vista de conciliación: gasto acumulado vs. presupuesto por viaje
create or replace view public.trip_reconciliation_v as
select
  t.*,
  coalesce(sum(e.amount), 0) as spent_amount,
  t.budget_amount - coalesce(sum(e.amount), 0) as remaining_amount
from public.trips t
left join public.expenses e on e.trip_id = t.id
group by t.id;

alter table public.trips enable row level security;
alter table public.expenses enable row level security;

create policy "viajes: leer miembros" on public.trips
  for select using (public.fn_is_company_member(company_id, null));
create policy "viajes: escribir owner/admin" on public.trips
  for all using (public.fn_is_company_member(company_id, array['owner','admin']))
  with check (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "gastos: leer via viaje" on public.expenses
  for select using (
    exists (select 1 from public.trips t where t.id = trip_id and public.fn_is_company_member(t.company_id, null))
  );
create policy "gastos: insertar via viaje (choferes incluidos)" on public.expenses
  for insert with check (
    exists (select 1 from public.trips t where t.id = trip_id and public.fn_is_company_member(t.company_id, null))
  );

-- Cerrar viaje: transacción única (evita cierre parcial)
-- p_actor_user_id: ver nota en fn_create_compliance_document.
drop function if exists public.fn_close_trip_and_reconcile(uuid);
create or replace function public.fn_close_trip_and_reconcile(p_actor_user_id uuid, p_trip_id uuid)
returns public.trip_reconciliation_v
language plpgsql security definer set search_path = public as $$
declare
  v_trip public.trips;
  v_result public.trip_reconciliation_v;
begin
  select * into v_trip from public.trips where id = p_trip_id for update;
  if v_trip.id is null then raise exception 'trip not found'; end if;
  if not public.fn_actor_has_role(p_actor_user_id, v_trip.company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.trips set status = 'cerrado', closed_at = now() where id = p_trip_id;
  select * into v_result from public.trip_reconciliation_v where id = p_trip_id;
  return v_result;
end;
$$;

-- ============================================================
-- MÓDULO 3 — Inspección pre-viaje (NOM-068)
-- ============================================================
create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  trip_id uuid references public.trips(id) on delete set null,
  odometer_km int not null check (odometer_km >= 0),
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  status text not null default 'pendiente' check (status in ('pendiente','aprobada','rechazada')),
  created_at timestamptz not null default now()
);

create index if not exists idx_inspections_vehicle on public.inspections (vehicle_id, created_at desc);
create index if not exists idx_inspections_company_status on public.inspections (company_id, status);

create table if not exists public.inspection_photos (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  photo_type text not null check (photo_type in ('frente','llantas','motor','caja_trasera','odometro')),
  url text not null,
  taken_at timestamptz not null default now(),
  gps_lat numeric(9,6),
  gps_lng numeric(9,6),
  unique (inspection_id, photo_type)
);

create table if not exists public.inspection_checklist_items (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections(id) on delete cascade,
  item_key text not null check (item_key in (
    'frenos','luces','llantas_desgaste','niveles_fluidos','fugas',
    'espejos','claxon','extintor','triangulos','cinturon'
  )),
  ok boolean not null,
  notes text,
  unique (inspection_id, item_key)
);

create index if not exists idx_checklist_failed on public.inspection_checklist_items (inspection_id) where ok = false;

alter table public.inspections enable row level security;
alter table public.inspection_photos enable row level security;
alter table public.inspection_checklist_items enable row level security;

create policy "inspecciones: leer miembros" on public.inspections
  for select using (public.fn_is_company_member(company_id, null));
create policy "inspecciones: insertar miembros" on public.inspections
  for insert with check (public.fn_is_company_member(company_id, null));
create policy "inspecciones: actualizar owner/admin" on public.inspections
  for update using (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "fotos inspeccion: via inspeccion" on public.inspection_photos
  for all using (
    exists (select 1 from public.inspections i where i.id = inspection_id and public.fn_is_company_member(i.company_id, null))
  ) with check (
    exists (select 1 from public.inspections i where i.id = inspection_id and public.fn_is_company_member(i.company_id, null))
  );

create policy "checklist: via inspeccion" on public.inspection_checklist_items
  for all using (
    exists (select 1 from public.inspections i where i.id = inspection_id and public.fn_is_company_member(i.company_id, null))
  ) with check (
    exists (select 1 from public.inspections i where i.id = inspection_id and public.fn_is_company_member(i.company_id, null))
  );

-- ============================================================
-- MÓDULO 4 — Facturación y cobranza de fletes
-- ============================================================
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  rfc text,
  contact_phone text,
  contact_email text check (contact_email is null or contact_email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  payment_terms_days int not null default 30 check (payment_terms_days > 0),
  created_at timestamptz not null default now(),
  unique (company_id, name)
);

create table if not exists public.freight_invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete restrict,
  trip_id uuid references public.trips(id) on delete set null,
  folio text not null,
  amount numeric(12,2) not null check (amount > 0),
  pod_url text, -- remisión/POD firmada
  issued_at date not null default current_date,
  due_date date not null,
  status text not null default 'pendiente' check (status in ('pendiente','pagada','vencida','cancelada')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (company_id, folio),
  check (due_date >= issued_at)
);

create index if not exists idx_invoices_company_status on public.freight_invoices (company_id, status, due_date);
create index if not exists idx_invoices_client on public.freight_invoices (client_id);

create table if not exists public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.freight_invoices(id) on delete cascade,
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email')),
  scheduled_for date not null,
  sent_at timestamptz,
  status text not null default 'pendiente' check (status in ('pendiente','enviado','fallido','cancelado'))
);

create index if not exists idx_reminders_pending on public.payment_reminders (scheduled_for) where status = 'pendiente';

create or replace view public.invoice_status_v as
select
  i.*,
  (current_date - i.due_date) as days_overdue,
  case
    when i.status in ('pagada','cancelada') then i.status
    when i.due_date < current_date then 'vencida'
    else 'pendiente'
  end as computed_status
from public.freight_invoices i;

alter table public.clients enable row level security;
alter table public.freight_invoices enable row level security;
alter table public.payment_reminders enable row level security;

create policy "clientes: leer miembros" on public.clients
  for select using (public.fn_is_company_member(company_id, null));
create policy "clientes: escribir owner/admin" on public.clients
  for all using (public.fn_is_company_member(company_id, array['owner','admin']))
  with check (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "facturas: leer miembros" on public.freight_invoices
  for select using (public.fn_is_company_member(company_id, null));
create policy "facturas: escribir owner/admin" on public.freight_invoices
  for all using (public.fn_is_company_member(company_id, array['owner','admin']))
  with check (public.fn_is_company_member(company_id, array['owner','admin']));

create policy "recordatorios: leer via factura" on public.payment_reminders
  for select using (
    exists (select 1 from public.freight_invoices i where i.id = invoice_id and public.fn_is_company_member(i.company_id, null))
  );

-- Registrar pago: transacción única (marca pagada + cancela recordatorios pendientes)
-- p_actor_user_id: ver nota en fn_create_compliance_document.
drop function if exists public.fn_register_payment(uuid);
create or replace function public.fn_register_payment(p_actor_user_id uuid, p_invoice_id uuid)
returns public.freight_invoices
language plpgsql security definer set search_path = public as $$
declare
  v_invoice public.freight_invoices;
begin
  select * into v_invoice from public.freight_invoices where id = p_invoice_id for update;
  if v_invoice.id is null then raise exception 'invoice not found'; end if;
  if not public.fn_actor_has_role(p_actor_user_id, v_invoice.company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  update public.freight_invoices set status = 'pagada', paid_at = now() where id = p_invoice_id;
  update public.payment_reminders set status = 'cancelado' where invoice_id = p_invoice_id and status = 'pendiente';

  select * into v_invoice from public.freight_invoices where id = p_invoice_id;
  return v_invoice;
end;
$$;

-- ============================================================
-- STORAGE — buckets privados para documentos y evidencia fotográfica
-- Ejecutar una vez; los buckets se crean vía Dashboard > Storage si
-- este bloque falla por permisos del editor SQL (crear manualmente
-- "compliance-docs" y "trip-evidence" como privados).
-- ============================================================
insert into storage.buckets (id, name, public)
values ('compliance-docs', 'compliance-docs', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('trip-evidence', 'trip-evidence', false)
on conflict (id) do nothing;

-- Convención de ruta: {company_id}/{archivo}. La política valida que
-- el usuario sea miembro activo de esa empresa antes de leer/escribir.
create policy "compliance-docs: acceso por membresia"
  on storage.objects for all
  using (
    bucket_id = 'compliance-docs'
    and public.fn_is_company_member((storage.foldername(name))[1]::uuid, null)
  )
  with check (
    bucket_id = 'compliance-docs'
    and public.fn_is_company_member((storage.foldername(name))[1]::uuid, null)
  );

create policy "trip-evidence: acceso por membresia"
  on storage.objects for all
  using (
    bucket_id = 'trip-evidence'
    and public.fn_is_company_member((storage.foldername(name))[1]::uuid, null)
  )
  with check (
    bucket_id = 'trip-evidence'
    and public.fn_is_company_member((storage.foldername(name))[1]::uuid, null)
  );

-- Al crear una factura, programa recordatorios semanales desde el vencimiento
-- p_actor_user_id: ver nota en fn_create_compliance_document.
drop function if exists public.fn_create_invoice_with_reminders(uuid, uuid, uuid, text, numeric, text, date, date);
create or replace function public.fn_create_invoice_with_reminders(
  p_actor_user_id uuid,
  p_company_id uuid, p_client_id uuid, p_trip_id uuid, p_folio text,
  p_amount numeric, p_pod_url text, p_issued_at date, p_due_date date
) returns public.freight_invoices
language plpgsql security definer set search_path = public as $$
declare
  v_invoice public.freight_invoices;
begin
  if not public.fn_actor_has_role(p_actor_user_id, p_company_id, array['owner','admin']) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  -- p_client_id/p_trip_id son IDs que manda el cliente: verificar que
  -- pertenezcan a p_company_id evita facturar/asociar datos de otra empresa.
  if not exists (
    select 1 from public.clients c where c.id = p_client_id and c.company_id = p_company_id
  ) then
    raise exception 'client does not belong to company' using errcode = '42501';
  end if;

  if p_trip_id is not null and not exists (
    select 1 from public.trips t where t.id = p_trip_id and t.company_id = p_company_id
  ) then
    raise exception 'trip does not belong to company' using errcode = '42501';
  end if;

  insert into public.freight_invoices
    (company_id, client_id, trip_id, folio, amount, pod_url, issued_at, due_date)
  values
    (p_company_id, p_client_id, p_trip_id, p_folio, p_amount, p_pod_url, p_issued_at, p_due_date)
  returning * into v_invoice;

  insert into public.payment_reminders (invoice_id, scheduled_for)
  values
    (v_invoice.id, v_invoice.due_date - interval '3 days'),
    (v_invoice.id, v_invoice.due_date + interval '1 day'),
    (v_invoice.id, v_invoice.due_date + interval '7 days');

  return v_invoice;
end;
$$;
