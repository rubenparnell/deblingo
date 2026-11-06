import { Fragment, useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { LeaderboardEntry } from "../types/app";

export function LeaderboardPage({ onError }: { onError: (message: string) => void }) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSourceUid, setSelectedSourceUid] = useState("");
  const [expandedPlayers, setExpandedPlayers] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    let active = true;
    setLoading(true);
    supabase.rpc("get_lecture_leaderboard").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setEntries([]);
        onError(error.message);
        setLoading(false);
        return;
      }
      const nextEntries = (data ?? []) as LeaderboardEntry[];
      setEntries(nextEntries);
      setSelectedSourceUid((current) =>
        nextEntries.some((entry) => entry.source_uid === current)
          ? current
          : nextEntries[0]?.source_uid ?? "",
      );
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [onError]);

  const lectures = Array.from(
    new Map(
      entries.map((entry) => [
        entry.source_uid,
        {
          source_uid: entry.source_uid,
          title: entry.title,
          starts_at: entry.starts_at,
        },
      ]),
    ).values(),
  ).sort(
    (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
  );
  const selectedEntries = entries
    .filter((entry) => entry.source_uid === selectedSourceUid)
    .sort(
      (a, b) =>
        b.completed_lines - a.completed_lines ||
        b.marked_squares - a.marked_squares ||
        a.username.localeCompare(b.username),
    );

  return (
    <section className="mx-auto max-w-[1050px] px-5 py-8 sm:px-10 lg:px-14">
      <div className="mb-8">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">
          Top players
        </p>
        <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
          Lecture leaderboard
        </h2>
        <p className="mt-2 text-sm text-[#748096]">
          Signed-in players are ranked by completed lines, then marked squares.
        </p>
      </div>
      <div className="mb-5 max-w-xl">
        <label
          htmlFor="leaderboard-lecture"
          className="mb-2 block text-xs font-bold text-[#59667c]"
        >
          Choose a lecture
        </label>
        <select
          id="leaderboard-lecture"
          value={selectedSourceUid}
          onChange={(event) => setSelectedSourceUid(event.target.value)}
          disabled={loading || lectures.length === 0}
          className="w-full rounded-xl border border-[#e1e6ee] bg-white p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff] disabled:opacity-60"
        >
          {lectures.map((lecture) => (
            <option key={lecture.source_uid} value={lecture.source_uid}>
              {lecture.title}: {new Date(lecture.starts_at).toLocaleDateString()}
            </option>
          ))}
          {!lectures.length && <option value="">No lectures available</option>}
        </select>
      </div>
      {loading ? (
        <div className="rounded-2xl border border-[#e4e8ef] bg-white p-10 text-center text-sm text-[#748096]">
          Loading leaderboard…
        </div>
      ) : !selectedEntries.length ? (
        <div className="rounded-2xl border border-[#e4e8ef] bg-white p-10 text-center text-sm text-[#748096]">
          No scores have been recorded for this lecture yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#e6e9ef] bg-white shadow-[0_15px_40px_rgba(38,51,77,0.06)]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-[#f7f8fb] text-[10px] uppercase tracking-wider text-[#8994a6]">
                <tr>
                  <th scope="col" className="px-5 py-4 font-bold">
                    Rank
                  </th>
                  <th scope="col" className="px-5 py-4 font-bold">
                    Player
                  </th>
                  <th scope="col" className="px-5 py-4 text-right font-bold">
                    Lines
                  </th>
                  <th scope="col" className="px-5 py-4 text-right font-bold">
                    Squares
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7eaf0]">
                {selectedEntries.map((entry, index) => {
                  const playerKey = `${entry.source_uid}-${entry.username}`;
                  const isExpanded = expandedPlayers.has(playerKey);
                  return (
                    <Fragment key={playerKey}>
                      <tr className="text-[#354154]">
                        <td className="px-5 py-4 font-bold text-[#8994a6]">
                          {index + 1}
                        </td>
                        <th
                          scope="row"
                          className="px-5 py-4 font-bold text-[#182230]"
                        >
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? "Hide" : "Show"} ${entry.username}'s board`}
                            onClick={() =>
                              setExpandedPlayers((current) => {
                                const next = new Set(current);
                                if (next.has(playerKey)) next.delete(playerKey);
                                else next.add(playerKey);
                                return next;
                              })
                            }
                            className="flex items-center gap-2 text-left hover:text-[#2144d3]"
                          >
                            {entry.username}
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </th>
                        <td className="px-5 py-4 text-right font-extrabold text-[#2144d3]">
                          {entry.completed_lines}
                        </td>
                        <td className="px-5 py-4 text-right font-semibold">
                          {entry.marked_squares}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={4} className="bg-[#f7f8fb] px-5 py-5">
                            <p className="mb-3 text-xs font-bold text-[#59667c]">
                              {entry.username}&apos;s board
                            </p>
                            <div className="grid max-w-2xl grid-cols-5 gap-2">
                              {entry.board.map((option, boardIndex) => {
                                const isMarked = entry.marked_ids.includes(
                                  option.id,
                                );
                                return (
                                  <div
                                    key={`${playerKey}-${option.id}-${boardIndex}`}
                                    className={`flex min-h-[58px] items-center justify-center rounded-xl border p-2 text-center text-[10px] font-bold leading-[1.35] sm:min-h-[72px] sm:text-[11px] ${
                                      isMarked
                                        ? "border-[#2144d3] bg-[#2144d3] text-white"
                                        : "border-[#e5e9ef] bg-white text-[#354154]"
                                    }`}
                                  >
                                    {option.label}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

