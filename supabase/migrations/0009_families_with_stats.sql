-- View: families with aggregated checklist stats
-- security_invoker = true → respects underlying RLS

create or replace view families_with_stats
with (security_invoker = true) as
select
  f.id,
  f.student_name,
  f.program,
  f.created_at,
  coalesce(count(ci.id), 0)::int as total,
  coalesce(count(ci.id) filter (where ci.status = 'submitted'), 0)::int as pending_review,
  coalesce(count(ci.id) filter (where ci.status = 'in_review'), 0)::int as in_review,
  coalesce(count(ci.id) filter (where ci.status = 'approved'), 0)::int as approved,
  coalesce(count(ci.id) filter (where ci.status = 'needs_revision'), 0)::int as needs_revision,
  max(ci.updated_at) as last_activity_at
from families f
left join checklist_items ci on ci.family_id = f.id
group by f.id, f.student_name, f.program, f.created_at;

grant select on families_with_stats to authenticated;
