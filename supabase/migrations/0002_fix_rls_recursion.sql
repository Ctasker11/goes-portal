-- Fix RLS infinite-recursion: helpers must bypass RLS when querying profiles

drop function if exists is_internal() cascade;
drop function if exists family_of_user() cascade;

create or replace function is_internal()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('advisor', 'admin')
  );
$$;

create or replace function family_of_user()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from profiles where id = auth.uid();
$$;

-- Recreate policies that were dropped by cascade

-- families
create policy "internal sees all families" on families
  for all using (is_internal()) with check (is_internal());
create policy "student sees own family" on families
  for select using (id = family_of_user());

-- checklist_items
create policy "internal manages checklist" on checklist_items
  for all using (is_internal()) with check (is_internal());
create policy "student reads own checklist" on checklist_items
  for select using (family_id = family_of_user());

-- documents
create policy "internal sees all docs" on documents
  for all using (is_internal()) with check (is_internal());
create policy "student reads own docs" on documents
  for select using (family_id = family_of_user());
create policy "student uploads to own family" on documents
  for insert with check (family_id = family_of_user() and uploaded_by = auth.uid());

-- comments
create policy "internal manages comments" on comments
  for all using (is_internal()) with check (is_internal());
create policy "student reads non-internal comments" on comments
  for select using (
    not internal_only
    and exists (
      select 1 from checklist_items ci
      where ci.id = checklist_item_id and ci.family_id = family_of_user()
    )
  );
create policy "student writes comments on own checklist" on comments
  for insert with check (
    author_id = auth.uid()
    and not internal_only
    and exists (
      select 1 from checklist_items ci
      where ci.id = checklist_item_id and ci.family_id = family_of_user()
    )
  );

-- activity_log
create policy "internal reads all activity" on activity_log
  for select using (is_internal());
create policy "student reads own activity" on activity_log
  for select using (family_id = family_of_user());
