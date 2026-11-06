import { History as HistoryIcon } from "lucide-react";
import { getCompletedLines } from "../lib/board";
import { formatLectureDate } from "../lib/lectures";
import type { HistoryEntry } from "../types/app";

export function HistoryView({ history }: { history: HistoryEntry[] }) {
  if (!history.length) {
    return (
      <section className="mx-auto max-w-[1050px] px-4 py-8 sm:px-10 sm:py-12 lg:px-14">
        <div className="rounded-2xl border border-[#e4e8ef] bg-white p-10 text-center">
          <HistoryIcon className="mx-auto text-[#2144d3]" size={28} />
          <h2 className="mt-4 text-xl font-extrabold">
            No lecture history yet.
          </h2>
          <p className="mt-2 text-sm text-[#748096]">
            Your board and score will appear here after you play a lecture.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1050px] px-4 py-6 sm:px-10 sm:py-8 lg:px-14">
      <div className="mb-8">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">
          Your games
        </p>
        <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
          Lecture history
        </h2>
        <p className="mt-2 text-sm text-[#748096]">
          Review past boards and see how many squares you marked.
        </p>
      </div>
      <div className="space-y-5">
        {history.map((entry) => (
          <article
            key={entry.source_uid}
            className="rounded-[22px] border border-[#e6e9ef] bg-white p-3.5 shadow-[0_15px_40px_rgba(38,51,77,0.06)] sm:p-6"
          >
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h3 className="text-lg font-extrabold">{entry.title}</h3>
                <p className="mt-1 text-xs text-[#748096]">
                  {formatLectureDate(entry.starts_at)}
                </p>
              </div>
              <div className="rounded-xl bg-[#eef2ff] px-4 py-2 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#7b87ac]">
                  Score
                </p>
                <p className="text-xl font-extrabold text-[#2144d3]">
                  {entry.score}
                  <span className="text-sm font-semibold text-[#8994a6]">
                    {" "}
                    / {entry.board.length}
                  </span>
                </p>
                <p className="mt-1 text-[11px] font-semibold text-[#748096]">
                  {entry.completed_lines ??
                    getCompletedLines(entry.board, entry.marked_ids)}{" "}
                  completed lines
                </p>
              </div>
            </div>
            <div className="grid grid-cols-5 gap-1.5 sm:gap-3">
              {entry.board.map((option, index) => {
                const isMarked = entry.marked_ids.includes(option.id);
                return (
                  <div
                    key={`${entry.source_uid}-${option.id}-${index}`}
                    className={`flex min-h-[48px] items-center justify-center rounded-xl border p-1.5 text-center text-[10px] font-bold leading-[1.25] sm:min-h-[72px] sm:p-2 sm:text-[11px] sm:leading-[1.35] ${
                      isMarked
                        ? "border-[#2144d3] bg-[#2144d3] text-white"
                        : "border-[#e5e9ef] bg-[#fbfcfd] text-[#354154]"
                    }`}
                  >
                    {option.label}
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
