alter table public.board_options
  add column if not exists difficulty text not null default 'common';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'board_options_difficulty_check'
      and conrelid = 'public.board_options'::regclass
  ) then
    alter table public.board_options
      add constraint board_options_difficulty_check
      check (difficulty in ('free', 'common', 'rare'));
  end if;
end
$$;

drop policy if exists "Admins can update board options" on public.board_options;
create policy "Admins can update board options"
  on public.board_options for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create table if not exists public.board_settings (
  id integer primary key check (id = 1),
  free_count integer not null default 1 check (free_count >= 0),
  common_count integer not null default 15 check (common_count >= 0),
  rare_count integer not null default 9 check (rare_count >= 0),
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  check (free_count + common_count + rare_count = 25)
);

insert into public.board_settings (id)
values (1)
on conflict (id) do nothing;

alter table public.board_settings enable row level security;

drop policy if exists "Anyone can read board settings" on public.board_settings;
create policy "Anyone can read board settings"
  on public.board_settings for select
  using (true);

drop policy if exists "Admins can update board settings" on public.board_settings;
create policy "Admins can update board settings"
  on public.board_settings for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin() and updated_by = (select auth.uid()));
