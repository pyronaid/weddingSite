-- RSVP table for the wedding site.
-- Security model: anonymous visitors may only INSERT; nobody can read rows
-- with the public anon key. Read answers from the Supabase dashboard (or,
-- later, from the private area with an authenticated role).

create table if not exists public.rsvps (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  full_name     text not null check (char_length(full_name) between 1 and 120),
  email         text not null check (char_length(email) between 3 and 254 and email like '%_@_%._%'),
  attending     boolean not null,
  guests        smallint not null default 0 check (guests between 0 and 10),
  dietary_notes text check (char_length(dietary_notes) <= 500),
  message       text check (char_length(message) <= 1000),
  -- A declining guest cannot bring people.
  constraint rsvps_guests_consistent check (attending or guests = 0)
);

create index if not exists rsvps_created_at_idx on public.rsvps (created_at desc);
create index if not exists rsvps_email_idx on public.rsvps (lower(email));

alter table public.rsvps enable row level security;

-- Least privilege: the anon role can insert and nothing else.
revoke all on table public.rsvps from anon, authenticated;
grant insert on table public.rsvps to anon, authenticated;

drop policy if exists "Anyone can submit an RSVP" on public.rsvps;
create policy "Anyone can submit an RSVP"
  on public.rsvps
  for insert
  to anon, authenticated
  with check (true);
