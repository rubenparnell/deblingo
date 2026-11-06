import type { Lecture } from "../types/app";

export function getLectureTiming(lecture: Lecture) {
  const start = new Date(new Date(lecture.starts_at).getTime() + 5 * 60 * 1000);
  const end = lecture.ends_at
    ? new Date(new Date(lecture.ends_at).getTime() - 5 * 60 * 1000)
    : null;
  return { start, end };
}

export function getPlayableWindow(lecture: Lecture) {
  const start = new Date(new Date(lecture.starts_at).getTime() - 5 * 60 * 1000);
  const end = lecture.ends_at
    ? new Date(new Date(lecture.ends_at).getTime() + 5 * 60 * 1000)
    : null;
  return { start, end };
}
