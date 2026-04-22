-- Track when each user last viewed each checklist item
-- Used to compute unread comment count per item

create table if not exists item_views (
  user_id uuid not null references auth.users(id) on delete cascade,
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, checklist_item_id)
);

alter table item_views enable row level security;

drop policy if exists "user manages own views" on item_views;
create policy "user manages own views" on item_views
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on item_views to authenticated;
