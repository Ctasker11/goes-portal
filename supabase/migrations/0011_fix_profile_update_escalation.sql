-- SECURITY FIX: prevent privilege escalation via profiles UPDATE
--
-- Previous policy "user updates own profile" had no WITH CHECK, so any
-- authenticated user could set their own role to 'admin' or reassign
-- family_id. We enforce the restriction with a BEFORE UPDATE trigger
-- (cleaner than a self-referencing RLS subquery, which risks recursion).
--
-- Note: complete_onboarding() updates family_id for the student (null -> uuid).
-- We allow that first-time transition so onboarding keeps working; any later
-- family_id change requires the internal-team branch.

-- Restore a simple self-row update policy (USING-only); the trigger below
-- does the column-level enforcement.
drop policy if exists "user updates own profile" on profiles;
drop policy if exists "user updates own profile fields" on profiles;
drop policy if exists "internal updates any profile" on profiles;

create policy "user updates own profile" on profiles
  for update
  to authenticated
  using (id = auth.uid() or is_internal())
  with check (id = auth.uid() or is_internal());

-- Trigger: block role/family_id changes unless caller is internal team
create or replace function guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Non-authenticated contexts (service_role, postgres superuser, cascading
  -- FK actions from SQL editor, SECURITY DEFINER RPCs called internally)
  -- have no JWT claims, so auth.uid() is null. Allow those through.
  if auth.uid() is null then
    return new;
  end if;

  -- Internal team (advisor/admin) can change anything
  if is_internal() then
    return new;
  end if;

  -- Students cannot change role (stays 'student' unless promoted by internal team)
  if new.role is distinct from old.role then
    raise exception 'not authorized to change role';
  end if;

  -- Students can set family_id exactly once (null -> uuid, via complete_onboarding)
  -- Any other transition is blocked
  if new.family_id is distinct from old.family_id and old.family_id is not null then
    raise exception 'not authorized to change family_id';
  end if;

  return new;
end;
$$;

drop trigger if exists on_profile_update_guard on profiles;
create trigger on_profile_update_guard
  before update on profiles
  for each row execute function guard_profile_update();
