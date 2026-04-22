-- Restore profiles policies dropped by CASCADE in 0002

drop policy if exists "user sees own profile" on profiles;
drop policy if exists "user updates own profile" on profiles;

create policy "user sees own profile" on profiles
  for select using (id = auth.uid() or is_internal());

create policy "user updates own profile" on profiles
  for update using (id = auth.uid());
