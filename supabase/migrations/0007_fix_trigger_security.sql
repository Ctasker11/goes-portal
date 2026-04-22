-- Trigger functions need SECURITY DEFINER to bypass RLS when writing to
-- checklist_items / activity_log on behalf of a student

create or replace function handle_doc_upload()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update documents
  set is_current = false
  where checklist_item_id = new.checklist_item_id
    and id <> new.id;

  update checklist_items
  set status = 'submitted', updated_at = now()
  where id = new.checklist_item_id
    and status in ('not_started', 'needs_revision');

  insert into activity_log (family_id, actor_id, event, payload)
  values (new.family_id, new.uploaded_by, 'document_uploaded',
          jsonb_build_object('document_id', new.id, 'filename', new.filename));

  return new;
end;
$$;
