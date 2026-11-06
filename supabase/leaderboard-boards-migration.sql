drop function if exists public.get_lecture_leaderboard();

create function public.get_lecture_leaderboard()
returns table (
  source_uid text,
  title text,
  starts_at timestamptz,
  username text,
  completed_lines integer,
  marked_squares integer,
  board jsonb,
  marked_ids bigint[]
)
language sql
security definer
set search_path = ''
stable
as $$
  select
    history.source_uid,
    history.title,
    history.starts_at,
    profile.username,
    history.completed_lines,
    history.score,
    history.board,
    history.marked_ids
  from public.lecture_history as history
  join public.profiles as profile on profile.id = history.user_id
  where profile.username is not null;
$$;

revoke all on function public.get_lecture_leaderboard() from public;
grant execute on function public.get_lecture_leaderboard() to anon, authenticated;
