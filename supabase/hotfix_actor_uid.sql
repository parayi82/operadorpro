-- ============================================================
-- HOTFIX: auth.uid() era NULL cuando estas funciones se llamaban
-- desde el backend (service role key). Reemplaza las 4 funciones
-- para recibir el usuario explícito. Seguro de ejecutar una o
-- varias veces (drop + create or replace).
-- Ya integrado en supabase/schema_fleet.sql para instalaciones
-- nuevas; este archivo es solo para aplicar el fix a un proyecto
-- que ya corrió la versión anterior del esquema.
-- ============================================================

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
