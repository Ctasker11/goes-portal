-- Per-user rate limiting via minute-bucket counters.
-- Enforced in BEFORE INSERT triggers so attackers hitting Supabase REST
-- direct (bypassing the Next.js app) are still limited.
--
-- Bucket granularity is 1 minute — bursty at boundaries but bounded.
-- Accepted trade-off: simpler than sliding window, no external deps.

create table if not exists rate_limit_buckets (
  user_id uuid not null,
  action text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (user_id, action, window_start)
);

create index if not exists idx_rate_limit_window on rate_limit_buckets(window_start);

alter table rate_limit_buckets enable row level security;
-- Writes happen only inside SECURITY DEFINER functions, so no write policy needed.
-- Read policy kept minimal so a user can self-inspect their own usage.
drop policy if exists "user reads own buckets" on rate_limit_buckets;
create policy "user reads own buckets" on rate_limit_buckets
  for select
  to authenticated
  using (user_id = auth.uid());

-- Core enforcement: increments minute bucket, raises if new count exceeds max.
create or replace function enforce_rate_limit(p_action text, p_max int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_window_start timestamptz := date_trunc('minute', now());
  v_count int;
begin
  -- Service-role/postgres/internal callers have no JWT: skip.
  if v_user is null then
    return;
  end if;

  insert into rate_limit_buckets (user_id, action, window_start, count)
  values (v_user, p_action, v_window_start, 1)
  on conflict (user_id, action, window_start)
  do update set count = rate_limit_buckets.count + 1
  returning count into v_count;

  if v_count > p_max then
    raise exception 'rate limit exceeded: max % per minute for action %', p_max, p_action
      using errcode = 'P0001';
  end if;
end;
$$;

-- Documents: 20 uploads per minute per user.
create or replace function rl_documents_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform enforce_rate_limit('document_upload', 20);
  return new;
end;
$$;

drop trigger if exists rate_limit_documents on documents;
create trigger rate_limit_documents
  before insert on documents
  for each row execute function rl_documents_insert();

-- Comments: 30 posts per minute per user.
create or replace function rl_comments_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform enforce_rate_limit('comment_post', 30);
  return new;
end;
$$;

drop trigger if exists rate_limit_comments on comments;
create trigger rate_limit_comments
  before insert on comments
  for each row execute function rl_comments_insert();

-- Housekeeping: delete buckets older than 1 hour.
-- Call manually or from a pg_cron schedule (optional).
create or replace function prune_rate_limit_buckets()
returns void
language sql
as $$
  delete from rate_limit_buckets where window_start < now() - interval '1 hour';
$$;
