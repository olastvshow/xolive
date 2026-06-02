
-- Profiles
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  username text unique not null,
  avatar_url text,
  wins int not null default 0,
  losses int not null default 0,
  draws int not null default 0,
  coins int not null default 1250,
  created_at timestamptz not null default now()
);
grant select on public.profiles to authenticated, anon;
grant update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles_read_all" on public.profiles for select to authenticated, anon using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare base text; uname text; n int := 0;
begin
  base := coalesce(new.raw_user_meta_data->>'username', split_part(new.email,'@',1));
  base := regexp_replace(coalesce(base,'player'),'[^a-zA-Z0-9_]','','g');
  if length(base) < 3 then base := base || 'xo'; end if;
  uname := base;
  while exists (select 1 from public.profiles where username = uname) loop
    n := n+1; uname := base || n::text;
  end loop;
  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null references auth.users on delete cascade,
  guest_id uuid references auth.users on delete set null,
  status text not null default 'waiting' check (status in ('waiting','playing','finished')),
  board jsonb not null default '[null,null,null,null,null,null,null,null,null]'::jsonb,
  turn text not null default 'X' check (turn in ('X','O')),
  winner_id uuid references auth.users on delete set null,
  winning_line jsonb,
  is_draw boolean not null default false,
  mode text not null default 'classic',
  bet int not null default 0,
  is_quick boolean not null default false,
  round int not null default 1,
  host_score int not null default 0,
  guest_score int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index rooms_code_idx on public.rooms (code);
create index rooms_status_idx on public.rooms (status);
grant select on public.rooms to authenticated;
grant all on public.rooms to service_role;
alter table public.rooms enable row level security;
create policy "rooms_select_auth" on public.rooms for select to authenticated using (true);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null default 'chat' check (kind in ('chat','reaction','system')),
  text text not null,
  created_at timestamptz not null default now()
);
create index messages_room_idx on public.messages (room_id, created_at);
grant select, insert on public.messages to authenticated;
grant all on public.messages to service_role;
alter table public.messages enable row level security;
create policy "messages_select_participant" on public.messages for select to authenticated using (
  exists (select 1 from public.rooms r where r.id = room_id and (r.host_id = auth.uid() or r.guest_id = auth.uid()))
);
create policy "messages_insert_participant" on public.messages for insert to authenticated with check (
  user_id = auth.uid() and exists (
    select 1 from public.rooms r where r.id = room_id and (r.host_id = auth.uid() or r.guest_id = auth.uid())
  )
);

-- Realtime
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.messages;
alter table public.rooms replica identity full;
alter table public.messages replica identity full;
