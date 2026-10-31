-- Public bucket for PDF links sent over WhatsApp. Files sit under an unguessable
-- path (business id / random id / file name); anyone with the link can open the PDF.
insert into storage.buckets (id, name, public)
values ('shared-documents', 'shared-documents', true)
on conflict (id) do nothing;

drop policy if exists "Signed-in users can upload shared documents" on storage.objects;
create policy "Signed-in users can upload shared documents"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'shared-documents');
