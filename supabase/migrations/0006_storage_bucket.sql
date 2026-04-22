-- Documents bucket + storage RLS
-- Path convention: {family_id}/{checklist_item_id}/{uuid}-{filename}

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'documents',
  'documents',
  false,
  52428800, -- 50 MB per file
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic'
  ]
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Drop existing policies if any (idempotent)
drop policy if exists "students upload own family folder" on storage.objects;
drop policy if exists "students read own family files" on storage.objects;
drop policy if exists "students delete own files" on storage.objects;
drop policy if exists "internal manages all files" on storage.objects;

create policy "students upload own family folder" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = family_of_user()::text
  );

create policy "students read own family files" on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = family_of_user()::text or is_internal())
  );

create policy "students delete own files" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = family_of_user()::text
  );

create policy "internal manages all files" on storage.objects
  for all
  to authenticated
  using (bucket_id = 'documents' and is_internal())
  with check (bucket_id = 'documents' and is_internal());
