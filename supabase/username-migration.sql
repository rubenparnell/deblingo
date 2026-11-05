alter table public.profiles
  add column if not exists username text;

alter table public.profiles
  drop constraint if exists profiles_username_check;

alter table public.profiles
  add constraint profiles_username_check
  check (username is null or username ~ '^[A-Za-z0-9_]{3,30}$');

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.get_email_for_username(login_username text)
returns text
language sql
security definer
set search_path = public, auth
stable
as $$
  select u.email
  from auth.users as u
  join public.profiles as p on p.id = u.id
  where lower(p.username) = lower(trim(login_username))
  limit 1;
$$;

grant execute on function public.get_email_for_username(text) to anon, authenticated;

create or replace function public.set_my_username(new_username text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'You must be signed in';
  end if;

  if lower(trim(new_username)) !~ '^[a-z0-9_]{3,30}$' then
    raise exception 'Username must be 3-30 characters using letters, numbers, or underscores';
  end if;

  insert into public.profiles (id, username)
  values (auth.uid(), lower(trim(new_username)))
  on conflict (id) do update
    set username = excluded.username;
end;
$$;

grant execute on function public.set_my_username(text) to authenticated;
