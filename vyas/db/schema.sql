-- Supabase schema for Campus ERP (run in the SQL editor, in this order)
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role text not null default 'student' check (role in ('student','teacher','admin'))
);

-- Older Supabase projects may define role as a user_role enum. Convert it
-- before adding the specialist roles so the schema works with either version.
do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select polname
    from pg_policy
    where polrelid = 'public.profiles'::regclass
  loop
    execute format('drop policy if exists %I on public.profiles', existing_policy.polname);
  end loop;
end;
$$;
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles alter column role drop default;
alter table profiles alter column role type text using role::text;
alter table profiles alter column role set default 'student';
alter table profiles add constraint profiles_role_check check (role in ('student','teacher','admin','library_operator','sports_coordinator'));

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_date date
);
create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events on delete cascade,
  student_id uuid references profiles on delete cascade,
  file_path text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected'))
);
create table if not exists marks (
  student_id uuid references profiles on delete cascade,
  subject text not null,
  score int not null check (score between 0 and 100),
  primary key (student_id, subject)
);
create table if not exists attendance (
  student_id uuid references profiles on delete cascade,
  subject text not null,
  attended int not null default 0,
  total int not null default 0,
  primary key (student_id, subject)
);
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  due date,
  description text
);
create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid references assignments on delete cascade,
  student_id uuid references profiles on delete cascade,
  file_path text not null,
  grade int check (grade between 0 and 10),
  feedback text
);

-- Participant count view
create or replace view event_counts as
  select e.id, e.title, count(c.id) filter (where c.status = 'verified') as verified_participants
  from events e left join certificates c on c.event_id = e.id group by e.id;

-- Row level security
alter table profiles enable row level security;
alter table certificates enable row level security;
alter table marks enable row level security;
alter table attendance enable row level security;
alter table submissions enable row level security;

create or replace function is_staff() returns boolean language sql stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('teacher','admin'));
$$;

create policy "own or staff" on profiles for select using (id = auth.uid() or is_staff());
create policy "own or staff" on certificates for select using (student_id = auth.uid() or is_staff());
create policy "student uploads" on certificates for insert with check (student_id = auth.uid());
create policy "staff verifies" on certificates for update using (is_staff());
create policy "own or staff" on marks for select using (student_id = auth.uid() or is_staff());
create policy "staff writes" on marks for all using (is_staff());
create policy "own or staff" on attendance for select using (student_id = auth.uid() or is_staff());
create policy "staff writes" on attendance for all using (is_staff());
create policy "own or staff" on submissions for select using (student_id = auth.uid() or is_staff());
create policy "student submits" on submissions for insert with check (student_id = auth.uid());
create policy "staff grades" on submissions for update using (is_staff());

-- Extend profiles for role-based login and complete student records.
alter table profiles add column if not exists login_id text;
alter table profiles add column if not exists email text;
alter table profiles add column if not exists phone text;
alter table profiles add column if not exists designation text;
alter table profiles add column if not exists subjects text[] not null default '{}';
alter table profiles add column if not exists college text;
alter table profiles add column if not exists department text;
alter table profiles add column if not exists branch text;
alter table profiles add column if not exists year text;
alter table profiles add column if not exists class_name text;
alter table profiles add column if not exists section text;
alter table profiles alter column college type text using college::text;
alter table profiles alter column department type text using department::text;
alter table profiles alter column branch type text using branch::text;
alter table profiles alter column year type text using year::text;
alter table profiles alter column class_name type text using class_name::text;
alter table profiles alter column section type text using section::text;
create unique index if not exists profiles_login_id_unique on profiles (lower(login_id)) where login_id is not null;

create or replace function app_current_role() returns text language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;
create or replace function has_role(allowed text[]) returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(app_current_role() = any(allowed), false);
$$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select has_role(array['teacher','admin','library_operator','sports_coordinator']);
$$;

create table if not exists teacher_classes (
  teacher_id uuid not null references profiles(id) on delete cascade,
  college text not null,
  branch text not null,
  year text not null,
  section text not null,
  primary key (teacher_id, college, branch, year, section)
);

create or replace function can_view_student(target_id uuid) returns boolean language sql stable security definer set search_path = public as $$
  select target_id = auth.uid()
    or has_role(array['admin','library_operator','sports_coordinator'])
    or exists (
      select 1 from profiles student
      join teacher_classes tc on tc.college = student.college and tc.branch = student.branch and tc.year = student.year and tc.section = student.section
      where student.id = target_id and tc.teacher_id = auth.uid()
    );
$$;

create or replace function create_student_profile_for_auth_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role, login_id, email, phone, college, department, branch, year, class_name, section)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'student',
    coalesce(nullif(lower(trim(new.raw_user_meta_data->>'login_id')), ''), 'user-' || left(new.id::text, 8)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'college',
    new.raw_user_meta_data->>'department',
    new.raw_user_meta_data->>'branch',
    new.raw_user_meta_data->>'year',
    new.raw_user_meta_data->>'class_name',
    new.raw_user_meta_data->>'section'
  );
  return new;
end;
$$;
drop trigger if exists campus_profile_after_signup on auth.users;
create trigger campus_profile_after_signup after insert on auth.users
for each row execute function create_student_profile_for_auth_user();

create table if not exists library_books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null,
  total_copies integer not null check (total_copies >= 0),
  created_at timestamptz not null default now()
);
create table if not exists library_layout (
  id boolean primary key default true check (id),
  rows integer not null check (rows between 1 and 12),
  columns integer not null check (columns between 1 and 12),
  updated_at timestamptz not null default now()
);
create table if not exists library_seats (
  id uuid primary key default gen_random_uuid(),
  row_number integer not null,
  column_number integer not null,
  label text not null,
  active boolean not null default true,
  occupied boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (row_number, column_number)
);
create table if not exists library_loans (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references library_books(id),
  student_id uuid not null references profiles(id),
  status text not null default 'requested' check (status in ('requested','issued','returned','rejected')),
  requested_at timestamptz not null default now(),
  issued_at date,
  due_date date,
  returned_at date,
  issued_by uuid references profiles(id)
);
create table if not exists library_reservations (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references library_books(id),
  student_id uuid not null references profiles(id),
  status text not null default 'waiting' check (status in ('waiting','available','fulfilled','cancelled')),
  created_at timestamptz not null default now(),
  unique (book_id, student_id, status)
);

create table if not exists sports_equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  total_quantity integer not null check (total_quantity >= 0),
  created_at timestamptz not null default now()
);
create table if not exists sports_issues (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references sports_equipment(id),
  student_id uuid not null references profiles(id),
  status text not null default 'requested' check (status in ('requested','issued','returned','rejected')),
  requested_at timestamptz not null default now(),
  issued_at timestamptz,
  returned_at timestamptz,
  issued_by uuid references profiles(id)
);
create table if not exists sports_facilities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  facility_type text not null,
  active boolean not null default true
);
create table if not exists sports_bookings (
  id uuid primary key default gen_random_uuid(),
  facility_id uuid not null references sports_facilities(id),
  student_id uuid not null references profiles(id),
  booking_date date not null,
  starts_at time not null,
  ends_at time not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create table if not exists sports_performance (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  sport text not null,
  event text not null,
  achievement text not null,
  score text,
  performance_date date not null,
  recorded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create table if not exists od_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references profiles(id),
  subject text not null,
  event_name text not null,
  attendance_date date not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references profiles(id),
  decided_at timestamptz,
  unique (student_id, subject, attendance_date)
);
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references profiles(id),
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Enable access control for new tables.
alter table teacher_classes enable row level security;
alter table library_books enable row level security;
alter table library_layout enable row level security;
alter table library_seats enable row level security;
alter table library_loans enable row level security;
alter table library_reservations enable row level security;
alter table sports_equipment enable row level security;
alter table sports_issues enable row level security;
alter table sports_facilities enable row level security;
alter table sports_bookings enable row level security;
alter table sports_performance enable row level security;
alter table od_requests enable row level security;
alter table notifications enable row level security;
alter table audit_events enable row level security;

-- Replace the initial broad staff policies with class-scoped access.
drop policy if exists "own or staff" on profiles;
drop policy if exists "own or staff" on certificates;
drop policy if exists "staff verifies" on certificates;
drop policy if exists "own or staff" on marks;
drop policy if exists "staff writes" on marks;
drop policy if exists "own or staff" on attendance;
drop policy if exists "staff writes" on attendance;
drop policy if exists "own or staff" on submissions;
drop policy if exists "staff grades" on submissions;

create policy "teacher classes are readable by owner or admin" on teacher_classes for select using (teacher_id = auth.uid() or has_role(array['admin']));
create policy "class assignments are admin managed" on teacher_classes for all using (has_role(array['admin'])) with check (has_role(array['admin']));
create policy "profiles visible to owner and authorized staff" on profiles for select using (can_view_student(id));
create policy "profiles managed by admin" on profiles for all using (has_role(array['admin'])) with check (has_role(array['admin']));
create policy "students update own profile" on profiles for update using (id = auth.uid()) with check (id = auth.uid());
revoke update on profiles from authenticated;
grant update (full_name, phone, college, department, branch, year, class_name, section) on profiles to authenticated;
create policy "certificates visible to owner and assigned staff" on certificates for select using (can_view_student(student_id) or has_role(array['admin']));
create policy "assigned staff verify certificates" on certificates for update using (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id))) with check (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id)));
create policy "marks visible to owner and assigned staff" on marks for select using (can_view_student(student_id) or has_role(array['admin']));
create policy "assigned staff write marks" on marks for all using (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id))) with check (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id)));
create policy "attendance visible to owner and assigned staff" on attendance for select using (can_view_student(student_id) or has_role(array['admin']));
create policy "assigned staff write attendance" on attendance for all using (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id))) with check (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id)));
create policy "submissions visible to owner and assigned staff" on submissions for select using (can_view_student(student_id) or has_role(array['admin']));
create policy "assigned staff grade submissions" on submissions for update using (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id))) with check (has_role(array['admin']) or (has_role(array['teacher']) and can_view_student(student_id)));

create policy "books readable by signed-in users" on library_books for select using (auth.uid() is not null);
create policy "library staff manage books" on library_books for all using (has_role(array['admin','library_operator'])) with check (has_role(array['admin','library_operator']));
create policy "seat layout readable by signed-in users" on library_layout for select using (auth.uid() is not null);
create policy "operator manages seat layout" on library_layout for all using (has_role(array['library_operator'])) with check (has_role(array['library_operator']));
create policy "seats readable by signed-in users" on library_seats for select using (auth.uid() is not null);
create policy "operator manages seats" on library_seats for all using (has_role(array['library_operator'])) with check (has_role(array['library_operator']));
create policy "loans visible to student and library staff" on library_loans for select using (student_id = auth.uid() or has_role(array['admin','library_operator']));
create policy "students request own loans" on library_loans for insert with check (student_id = auth.uid() and has_role(array['student']) and status = 'requested');
create policy "library staff manage loans" on library_loans for update using (has_role(array['admin','library_operator'])) with check (has_role(array['admin','library_operator']));
create policy "reservations visible to student and library staff" on library_reservations for select using (student_id = auth.uid() or has_role(array['admin','library_operator']));
create policy "students reserve books" on library_reservations for insert with check (student_id = auth.uid() and has_role(array['student']));
create policy "library staff manage reservations" on library_reservations for update using (has_role(array['admin','library_operator'])) with check (has_role(array['admin','library_operator']));

create policy "equipment readable by signed-in users" on sports_equipment for select using (auth.uid() is not null);
create policy "sports staff manage equipment" on sports_equipment for all using (has_role(array['admin','sports_coordinator'])) with check (has_role(array['admin','sports_coordinator']));
create policy "issues visible to student and sports staff" on sports_issues for select using (student_id = auth.uid() or has_role(array['admin','sports_coordinator']));
create policy "students request own equipment" on sports_issues for insert with check (student_id = auth.uid() and has_role(array['student']) and status = 'requested');
create policy "sports staff manage issues" on sports_issues for update using (has_role(array['admin','sports_coordinator'])) with check (has_role(array['admin','sports_coordinator']));
create policy "facilities readable by signed-in users" on sports_facilities for select using (auth.uid() is not null);
create policy "sports staff manage facilities" on sports_facilities for all using (has_role(array['admin','sports_coordinator'])) with check (has_role(array['admin','sports_coordinator']));
create policy "bookings visible to owner and sports staff" on sports_bookings for select using (student_id = auth.uid() or has_role(array['admin','sports_coordinator']));
create policy "students create bookings" on sports_bookings for insert with check (student_id = auth.uid() and has_role(array['student']) and status = 'pending');
create policy "sports staff decide bookings" on sports_bookings for update using (has_role(array['admin','sports_coordinator'])) with check (has_role(array['admin','sports_coordinator']));
create policy "performance visible to student and sports staff" on sports_performance for select using (student_id = auth.uid() or has_role(array['admin','sports_coordinator']));
create policy "sports staff record performance" on sports_performance for insert with check (has_role(array['admin','sports_coordinator']));
create policy "OD visible to student and assigned approvers" on od_requests for select using (student_id = auth.uid() or has_role(array['admin','sports_coordinator']) or (has_role(array['teacher']) and can_view_student(student_id)));
create policy "students submit OD requests" on od_requests for insert with check (student_id = auth.uid() and has_role(array['student']) and status = 'pending');
create policy "assigned staff decide OD requests" on od_requests for update using (has_role(array['admin','sports_coordinator']) or (has_role(array['teacher']) and can_view_student(student_id))) with check (has_role(array['admin','sports_coordinator']) or (has_role(array['teacher']) and can_view_student(student_id)));
create policy "notifications visible to recipient" on notifications for select using (user_id = auth.uid());
create policy "recipients mark notifications read" on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read audit events" on audit_events for select using (has_role(array['admin']));
create policy "users append own audit events" on audit_events for insert with check (actor_id = auth.uid());

-- Enforce non-overlapping approved bookings even if requests race.
create extension if not exists btree_gist;
do $$ begin
  alter table sports_bookings add constraint approved_sports_bookings_do_not_overlap
    exclude using gist (
      facility_id with =,
      booking_date with =,
      tsrange(booking_date + starts_at, booking_date + ends_at, '[)') with &&
    ) where (status = 'approved');
exception when duplicate_object then null;
end $$;

-- Approved on-duty requests count as present exactly once.
create or replace function apply_approved_od_attendance() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status is distinct from 'approved' and new.status = 'approved' then
    insert into attendance (student_id, subject, attended, total)
    values (new.student_id, new.subject, 1, 1)
    on conflict (student_id, subject) do update
      set attended = attendance.attended + 1,
          total = attendance.total + 1;
  end if;
  return new;
end;
$$;
drop trigger if exists od_approval_marks_attendance on od_requests;
create trigger od_approval_marks_attendance after update of status on od_requests
for each row execute function apply_approved_od_attendance();
