alter table public.profiles
  drop constraint if exists profiles_username_key;

create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username))
  where username is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (new.id, trim(new.raw_user_meta_data ->> 'username'));
  return new;
end;
$$;

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
  values (auth.uid(), trim(new_username))
  on conflict (id) do update
    set username = excluded.username;
end;
$$;

grant execute on function public.set_my_username(text) to authenticated;
