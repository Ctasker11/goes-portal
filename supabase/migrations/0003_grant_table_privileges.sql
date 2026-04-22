-- Grant table privileges to anon + authenticated roles
-- (RLS still applies on top — this just lets PostgREST hit the tables at all)

grant usage on schema public to anon, authenticated;

grant select, insert, update, delete on
  families,
  profiles,
  checklist_items,
  documents,
  comments,
  activity_log
to authenticated;

grant select on
  families,
  profiles,
  checklist_items,
  documents,
  comments,
  activity_log
to anon;

grant execute on function is_internal() to authenticated, anon;
grant execute on function family_of_user() to authenticated, anon;
