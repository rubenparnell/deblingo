import type { Lecture } from "../types/app";
import {
  formatLectureDate,
  getLectureTiming,
  getPlayableWindow,
} from "../lib/lectures";

export function CountdownCard({
  event,
  now,
  compact = false,
  emptyState = false,
}: {
  event: Lecture;
  now: Date;
  compact?: boolean;
  emptyState?: boolean;
}) {
  const timing = getLectureTiming(event);
  const playableWindow = getPlayableWindow(event);

  const isLive = timing.end ? timing.start <= now && timing.end > now : false;
  const isClosing =
    !isLive &&
    playableWindow.end !== null &&
    timing.end !== null &&
    timing.end <= now &&
    playableWindow.end > now;
  const target =
    isLive && timing.end
      ? timing.end
      : isClosing && playableWindow.end
        ? playableWindow.end
        : timing.start;
  const countdownLabel = isClosing
    ? "Board closes in"
    : isLive
      ? "Lecture ends in"
      : "Next lecture";
  const remaining = Math.max(0, target.getTime() - now.getTime());
  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (compact)
    return (
      <div className="hidden items-center gap-2 rounded-xl bg-[#2144d3] px-3 py-2 text-white sm:flex">
        <span className="text-[10px] font-bold uppercase tracking-wider text-white/75">
          {countdownLabel}
        </span>
        <span className="font-mono text-xs font-extrabold tabular-nums text-white">
          {days}d {String(hours).padStart(2, "0")}h{" "}
          {String(minutes).padStart(2, "0")}m {String(seconds).padStart(2, "0")}
          s
        </span>
      </div>
    );
  if (emptyState)
    return (
      <div className="flex min-h-[calc(100dvh-88px)] items-center justify-center py-10">
        <div className="w-full max-w-[760px] rounded-[30px] bg-[#2144d3] px-6 py-14 text-center shadow-[0_20px_60px_rgba(33,68,211,0.24)] sm:px-10 sm:py-20">
          <h2 className="text-3xl font-extrabold text-white sm:text-3xl">
            {isClosing
              ? "Board closing soon"
              : isLive
                ? "Lecture in progress"
                : "Next Discrete Lecture"}
          </h2>
          <p className="mt-3 text-sm text-white/80">
            {formatLectureDate(target)}
          </p>
          <div className="mt-10 flex justify-center gap-2 text-white sm:gap-4">
            <CountdownUnit value={days} label="Days" />
            <CountdownUnit value={hours} label="Hours" />
            <CountdownUnit value={minutes} label="Minutes" />
            <CountdownUnit value={seconds} label="Seconds" />
          </div>
          <p className="mt-8 text-s font-medium text-white/70">
            {isClosing
              ? "The board will close when this countdown reaches zero."
              : "The board will be available between 5 minutes before and 5 minutes after the lecture."}
          </p>
        </div>
      </div>
    );
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#dce4ff] bg-[#eef2ff] px-5 py-4 sm:flex-row sm:items-center">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">
          {isClosing
            ? "Board closing soon"
            : isLive
              ? "Lecture in progress"
              : "Next discrete lecture"}
        </p>
        <p className="mt-1 text-sm font-bold text-[#253354]">{event.title}</p>
        <p className="mt-1 text-[11px] text-[#7180a2]">
          {formatLectureDate(target)}
        </p>
      </div>
      <div className="flex items-baseline gap-1 font-mono tabular-nums text-[#2144d3]">
        <span className="text-2xl font-extrabold">{days}d</span>
        <span className="text-2xl font-extrabold">
          {String(hours).padStart(2, "0")}h
        </span>
        <span className="text-2xl font-extrabold">
          {String(minutes).padStart(2, "0")}m
        </span>
        <span className="text-lg font-bold">
          {String(seconds).padStart(2, "0")}s
        </span>
      </div>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-[62px] rounded-2xl bg-white/15 px-3 py-3 sm:min-w-[100px] sm:px-5 sm:py-4">
      <p className="font-mono text-3xl font-extrabold tabular-nums text-white sm:text-5xl">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/70 sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}
