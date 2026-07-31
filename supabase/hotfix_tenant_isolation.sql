-- ============================================================
-- HOTFIX DE SEGURIDAD: aislamiento entre empresas (multi-tenant).
--
-- fn_create_compliance_document y fn_create_invoice_with_reminders
-- verificaban el rol del actor sobre p_company_id, pero NUNCA
-- validaban que los demás IDs del payload (p_vehicle_id, p_driver_id,
-- p_client_id, p_trip_id) pertenecieran realmente a esa empresa.
--
-- Impacto real: la Empresa A podía adjuntar un documento de
-- cumplimiento falso (ej. una póliza de seguro "vigente" inventada)
-- a una unidad de la Empresa B, con solo conocer su vehicle_id — el
-- cual es público, porque va embebido en la URL del QR que el chofer
-- de la Empresa B trae pegado en el parabrisas para mostrar en
-- retenes. Ese documento falso aparecería en la verificación pública
-- de esa unidad. Mismo problema (menor impacto) con facturas
-- asociadas a cliente/viaje de otra empresa.
--
-- Misma firma que la versión anterior — "create or replace" basta,
-- no requiere DROP FUNCTION. Seguro de ejecutar más de una vez.
-- ============================================================

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
