alter table public.lecture_history
  add column completed_lines integer
  check (completed_lines >= 0);
