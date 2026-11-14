-- RunX initial schema (issue #2). The only way the database changes is a new
-- migration in this folder; never edit tables from the Supabase dashboard.

-- Profiles: one per auth user, holds the role checked on the server.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'runner' check (role in ('runner', 'editor')),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create policy "profiles: read own" on public.profiles
  for select to authenticated using (auth.uid() = id);
-- No insert or update policy: profiles are created by the trigger below and
-- roles are granted by an administrator with SQL, never by the client.

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- security definer so policies can ask "is the caller an editor" without the
-- profiles policy recursing into itself.
create function public.is_editor() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'editor'
  );
$$;

-- Episodes: published_manifest is the validated snapshot runners receive;
-- drafts live in scenes until an editor publishes.
create table public.episodes (
  id text primary key,
  title text not null,
  manifest_version integer not null default 1 check (manifest_version > 0),
  published_manifest jsonb,
  published_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.episodes enable row level security;

create policy "episodes: anyone reads published" on public.episodes
  for select to anon, authenticated using (published_manifest is not null);
create policy "episodes: editors read all" on public.episodes
  for select to authenticated using (public.is_editor());
create policy "episodes: editors write" on public.episodes
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- Scenes: the editable draft of each episode.
create table public.scenes (
  episode_id text not null references public.episodes (id) on delete cascade,
  id text not null,
  position integer not null,
  type text not null check (type in ('opening', 'core', 'optional', 'climax', 'ending', 'signoff', 'recap', 'compressed_ending')),
  title text not null default '',
  part text not null check (part in ('warmup', 'rising', 'climax', 'epilogue')),
  duration_sec numeric not null,
  required boolean not null default false,
  prerequisites text[] not null default '{}',
  checkpoint text check (checkpoint in ('CP1', 'CP2', 'CP3')),
  for_checkpoint text check (for_checkpoint in ('CP1', 'CP2', 'CP3')),
  beat text check (beat in ('encourage', 'charge')),
  source text not null default '',
  lines jsonb not null default '[]',
  bridge jsonb,
  updated_at timestamptz not null default now(),
  primary key (episode_id, id)
);
alter table public.scenes enable row level security;

create policy "scenes: editors read and write drafts" on public.scenes
  for all to authenticated using (public.is_editor()) with check (public.is_editor());

-- Progress: one row per runner and episode; always a valid checkpoint.
create table public.progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  episode_id text not null references public.episodes (id) on delete cascade,
  manifest_version integer not null check (manifest_version > 0),
  checkpoint text check (checkpoint in ('CP1', 'CP2', 'CP3')),
  status text not null check (status in ('in_progress', 'complete')),
  last_played_at timestamptz not null,
  last_duration_min integer check (last_duration_min between 15 and 60),
  updated_at timestamptz not null default now(),
  primary key (user_id, episode_id)
);
alter table public.progress enable row level security;

create policy "progress: owner reads" on public.progress
  for select to authenticated using (auth.uid() = user_id);
create policy "progress: owner inserts" on public.progress
  for insert to authenticated with check (auth.uid() = user_id);
create policy "progress: owner updates" on public.progress
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "progress: owner deletes" on public.progress
  for delete to authenticated using (auth.uid() = user_id);
