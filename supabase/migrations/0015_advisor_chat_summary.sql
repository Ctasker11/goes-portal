-- Aggregated chat summary per family for the advisor inbox view.
-- Returns one row per family with last message preview + unread count
-- (relative to the calling user's chat_seen.last_seen_at).
--
-- Authorization: function is callable by any authenticated user, but the
-- inner query is gated by is_internal() — non-internal callers get 0 rows.

create or replace function advisor_chat_summary()
returns table(
  family_id uuid,
  student_name text,
  last_message text,
  last_message_at timestamptz,
  last_sender_id uuid,
  unread_count int
)
language sql
security definer
set search_path = public
as $$
  with last_msg as (
    select distinct on (cm.family_id)
      cm.family_id,
      cm.body,
      cm.created_at,
      cm.sender_id
    from chat_messages cm
    order by cm.family_id, cm.created_at desc
  ),
  seen as (
    select cs.family_id, cs.last_seen_at
    from chat_seen cs
    where cs.user_id = auth.uid()
  )
  select
    f.id,
    f.student_name,
    lm.body,
    lm.created_at,
    lm.sender_id,
    coalesce((
      select count(*)::int
      from chat_messages c2
      where c2.family_id = f.id
        and c2.sender_id <> auth.uid()
        and c2.created_at > coalesce(s.last_seen_at, 'epoch'::timestamptz)
    ), 0)
  from families f
  left join last_msg lm on lm.family_id = f.id
  left join seen s on s.family_id = f.id
  where is_internal()
  order by lm.created_at desc nulls last;
$$;

grant execute on function advisor_chat_summary() to authenticated;
