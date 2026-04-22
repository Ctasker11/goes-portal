-- Add explicit FK from activity_log.actor_id to profiles(id) so PostgREST can
-- resolve the `profiles!actor_id` embedding used by ActivityLogDrawer.
-- Both activity_log.actor_id and profiles.id reference auth.users(id); any
-- existing actor_id already has a matching profile row (handle_new_user trigger).

alter table activity_log
  add constraint activity_log_actor_profile_fk
  foreign key (actor_id) references profiles(id) on delete set null;
