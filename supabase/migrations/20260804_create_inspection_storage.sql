-- Crear bucket para fotos de inspección
insert into storage.buckets (id, name, public)
values ('inspection-photos', 'inspection-photos', true)
on conflict do nothing;

-- Política de RLS: usuarios solo ven sus propias fotos
create policy "Users can upload their own inspection photos"
  on storage.objects for insert
  with check (
    bucket_id = 'inspection-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can view their own inspection photos"
  on storage.objects for select
  using (
    bucket_id = 'inspection-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );

create policy "Users can delete their own inspection photos"
  on storage.objects for delete
  using (
    bucket_id = 'inspection-photos'
    and auth.uid()::text = (string_to_array(name, '/'))[1]
  );
