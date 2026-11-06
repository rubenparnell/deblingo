create or replace function public.admin_remove_lecture_leaderboard_entry(
  p_source_uid text,
  p_username text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can remove leaderboard entries'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.lecture_history as history
  using public.profiles as profile
  where history.user_id = profile.id
    and history.source_uid = p_source_uid
    and profile.username = p_username;
end;
$$;

revoke all on function public.admin_remove_lecture_leaderboard_entry(text, text) from public;
grant execute on function public.admin_remove_lecture_leaderboard_entry(text, text) to authenticated;
