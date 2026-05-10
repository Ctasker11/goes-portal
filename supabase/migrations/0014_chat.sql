-- Family chat: one continuous thread per family.
-- Participants = family members + internal team (advisor/admin).
-- Realtime broadcast respects RLS, so per-family channel filtering on the
-- client only narrows payload — security still enforced server-side.

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  sender_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now(),
  constraint chat_messages_body_len_ck check (char_length(body) between 1 and 2000)
);

create index if not exists idx_chat_family_created
  on chat_messages(family_id, created_at desc);

-- Per-user read receipt. Last time the user opened the family chat.
-- Unread = count(messages where created_at > last_seen_at and sender_id != user).
create table if not exists chat_seen (
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  last_seen_at timestamptz not null default now(),
  primary key (user_id, family_id)
);

-- PostgREST needs SQL-level privilege before RLS even runs.
grant select, insert, update, delete on chat_messages to authenticated;
grant select, insert, update, delete on chat_seen to authenticated;

alter table chat_messages enable row level security;
alter table chat_seen enable row level security;

-- chat_messages RLS
drop policy if exists "internal reads chat" on chat_messages;
create policy "internal reads chat" on chat_messages
  for select using (is_internal());

drop policy if exists "family reads own chat" on chat_messages;
create policy "family reads own chat" on chat_messages
  for select using (family_id = family_of_user());

drop policy if exists "internal writes chat" on chat_messages;
create policy "internal writes chat" on chat_messages
  for insert with check (is_internal() and sender_id = auth.uid());

drop policy if exists "family writes own chat" on chat_messages;
create policy "family writes own chat" on chat_messages
  for insert with check (
    family_id = family_of_user() and sender_id = auth.uid()
  );

-- chat_seen RLS — user manages own row only
drop policy if exists "user reads own seen" on chat_seen;
create policy "user reads own seen" on chat_seen
  for select using (user_id = auth.uid());

drop policy if exists "user upserts own seen" on chat_seen;
create policy "user upserts own seen" on chat_seen
  for insert with check (user_id = auth.uid());

drop policy if exists "user updates own seen" on chat_seen;
create policy "user updates own seen" on chat_seen
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Rate limit chat sends: 30 per minute per user.
create or replace function rl_chat_messages_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform enforce_rate_limit('chat_message', 30);
  return new;
end;
$$;

drop trigger if exists rate_limit_chat_messages on chat_messages;
create trigger rate_limit_chat_messages
  before insert on chat_messages
  for each row execute function rl_chat_messages_insert();

-- Enable Realtime broadcast on chat_messages. RLS still gates per row.
-- Idempotent: handles missing publication and already-added table.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table chat_messages;
  end if;
end $$;
