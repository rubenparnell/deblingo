alter table public.lecture_history
  add column if not exists completed_lines integer not null default 0;

create or replace function public.set_lecture_history_completed_lines()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  line_number integer;
  line_position integer;
  board_index integer;
  option_id bigint;
  line_complete boolean;
  completed_count integer := 0;
begin
  for line_number in 0..11 loop
    line_complete := true;
    for line_position in 0..4 loop
      if line_number < 5 then
        board_index := line_number * 5 + line_position;
      elsif line_number < 10 then
        board_index := line_position * 5 + line_number - 5;
      elsif line_number = 10 then
        board_index := line_position * 6;
      else
        board_index := (line_position + 1) * 4;
      end if;

      option_id := (new.board -> board_index ->> 'id')::bigint;
      if option_id is null or not (option_id = any(new.marked_ids)) then
        line_complete := false;
        exit;
      end if;
    end loop;
    if line_complete then
      completed_count := completed_count + 1;
    end if;
  end loop;

  new.completed_lines := completed_count;
  return new;
end;
$$;

drop trigger if exists set_lecture_history_completed_lines
  on public.lecture_history;

create trigger set_lecture_history_completed_lines
  before insert or update of board, marked_ids
  on public.lecture_history
  for each row
  execute function public.set_lecture_history_completed_lines();

alter table public.lecture_history
  drop constraint if exists lecture_history_completed_lines_check;

update public.lecture_history
set board = board;

alter table public.lecture_history
  alter column completed_lines set not null,
  add constraint lecture_history_completed_lines_check
    check (completed_lines between 0 and 12);
