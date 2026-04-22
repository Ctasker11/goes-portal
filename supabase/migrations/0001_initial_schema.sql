-- GOES Portal — initial schema
-- Run in Supabase SQL editor after creating project

-- =========================
-- ENUMS
-- =========================
create type user_role as enum ('student', 'advisor', 'admin');

create type program_type as enum ('academic', 'sports', 'both');

create type document_category as enum (
  'academic_records',
  'standardized_tests',
  'essays',
  'sports_profile',
  'personal_visa',
  'other'
);

create type document_status as enum (
  'not_started',
  'submitted',
  'in_review',
  'approved',
  'needs_revision',
  'rejected'
);

-- =========================
-- TABLES
-- =========================

-- families = one row per student/family unit (parents + student share login)
create table families (
  id uuid primary key default gen_random_uuid(),
  student_name text not null,
  program program_type not null default 'academic',
  created_at timestamptz not null default now()
);

-- profiles extends auth.users with role + family link
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'student',
  family_id uuid references families(id) on delete set null,
  full_name text,
  created_at timestamptz not null default now()
);

-- checklist_items = template of required docs per family
-- (advisor seeds these per student based on program)
create table checklist_items (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  category document_category not null,
  title text not null,
  description text,
  required boolean not null default true,
  status document_status not null default 'not_started',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- documents = uploaded files, versioned per checklist item
create table documents (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  storage_path text not null,
  filename text not null,
  mime_type text not null,
  size_bytes bigint not null,
  version int not null default 1,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

-- comments per checklist item (student <-> team thread)
create table comments (
  id uuid primary key default gen_random_uuid(),
  checklist_item_id uuid not null references checklist_items(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  internal_only boolean not null default false,
  created_at timestamptz not null default now()
);

-- activity log = audit trail
create table activity_log (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- =========================
-- INDEXES
-- =========================
create index idx_profiles_family on profiles(family_id);
create index idx_checklist_family on checklist_items(family_id);
create index idx_documents_checklist on documents(checklist_item_id);
create index idx_documents_current on documents(checklist_item_id) where is_current;
create index idx_comments_checklist on comments(checklist_item_id);
create index idx_activity_family on activity_log(family_id, created_at desc);

-- =========================
-- TRIGGERS
-- =========================

-- Auto-create profile row when auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Auto-flip checklist status to 'submitted' when a doc is uploaded
create or replace function handle_doc_upload()
returns trigger
language plpgsql
as $$
begin
  -- mark prior versions not-current
  update documents
  set is_current = false
  where checklist_item_id = new.checklist_item_id
    and id <> new.id;

  -- bump checklist status to submitted (only if currently not_started or needs_revision)
  update checklist_items
  set status = 'submitted', updated_at = now()
  where id = new.checklist_item_id
    and status in ('not_started', 'needs_revision');

  -- log activity
  insert into activity_log (family_id, actor_id, event, payload)
  values (new.family_id, new.uploaded_by, 'document_uploaded',
          jsonb_build_object('document_id', new.id, 'filename', new.filename));

  return new;
end;
$$;

create trigger on_document_upload
  after insert on documents
  for each row execute function handle_doc_upload();

-- =========================
-- ROW LEVEL SECURITY
-- =========================
alter table families enable row level security;
alter table profiles enable row level security;
alter table checklist_items enable row level security;
alter table documents enable row level security;
alter table comments enable row level security;
alter table activity_log enable row level security;

-- helper: is internal team
create or replace function is_internal()
returns boolean
language sql stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('advisor', 'admin')
  );
$$;

-- helper: family member
create or replace function family_of_user()
returns uuid
language sql stable
as $$
  select family_id from profiles where id = auth.uid();
$$;

-- families
create policy "internal sees all families" on families
  for all using (is_internal()) with check (is_internal());
create policy "student sees own family" on families
  for select using (id = family_of_user());

-- profiles
create policy "user sees own profile" on profiles
  for select using (id = auth.uid() or is_internal());
create policy "user updates own profile" on profiles
  for update using (id = auth.uid());

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

-- =========================
-- STORAGE BUCKET
-- =========================
-- Create bucket via Supabase dashboard or:
-- insert into storage.buckets (id, name, public) values ('documents', 'documents', false);

-- Storage RLS: only family members + internal can read/write under family_id/* prefix
-- Run after bucket creation:
--
-- create policy "students upload to own family folder" on storage.objects
--   for insert with check (
--     bucket_id = 'documents'
--     and (storage.foldername(name))[1] = family_of_user()::text
--   );
--
-- create policy "students read own family files" on storage.objects
--   for select using (
--     bucket_id = 'documents'
--     and ((storage.foldername(name))[1] = family_of_user()::text or is_internal())
--   );
