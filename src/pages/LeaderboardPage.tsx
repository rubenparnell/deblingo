import { Fragment, useEffect, useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabase";
import type { LeaderboardEntry } from "../types/app";

export function LeaderboardPage({
  isAdmin,
  onError,
}: {
  isAdmin: boolean;
  onError: (message: string) => void;
}) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSourceUid, setSelectedSourceUid] = useState("");
  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(
    null,
  );
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

  const removePlayer = async (entry: LeaderboardEntry) => {
    const playerKey = `${entry.source_uid}-${entry.username}`;
    setRemovingPlayer(playerKey);
    const { error } = await supabase.rpc(
      "admin_remove_lecture_leaderboard_entry",
      {
        p_source_uid: entry.source_uid,
        p_username: entry.username,
      },
    );
    setRemovingPlayer(null);
    setConfirmingRemoval(null);
    if (error) {
      onError(error.message);
      return;
    }

    setEntries((current) =>
      current.filter(
        (currentEntry) =>
          currentEntry.source_uid !== entry.source_uid ||
          currentEntry.username !== entry.username,
      ),
    );
    setExpandedPlayers((current) => {
      const next = new Set(current);
      next.delete(playerKey);
      return next;
    });
  };

  return (
    <section className="mx-auto max-w-[1050px] px-4 py-6 sm:px-10 sm:py-8 lg:px-14">
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
            <table
              className={`w-full table-fixed text-left text-sm ${isAdmin ? "sm:min-w-[560px]" : "sm:min-w-[480px]"}`}
            >
              <thead className="bg-[#f7f8fb] text-[10px] uppercase tracking-wider text-[#8994a6]">
                <tr>
                  <th scope="col" className="w-[12%] px-2 py-3 font-bold sm:w-auto sm:px-5 sm:py-4">
                    Rank
                  </th>
                  <th scope="col" className="w-[40%] px-2 py-3 font-bold sm:w-auto sm:px-5 sm:py-4">
                    Player
                  </th>
                  <th scope="col" className="w-[16%] px-2 py-3 text-right font-bold sm:w-auto sm:px-5 sm:py-4">
                    Lines
                  </th>
                  <th scope="col" className="w-[18%] px-2 py-3 text-right font-bold sm:w-auto sm:px-5 sm:py-4">
                    Squares
                  </th>
                  {isAdmin && (
                    <th scope="col" className="w-[14%] px-2 py-3 sm:w-auto sm:px-5 sm:py-4">
                      <span className="sr-only">Admin actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="leaderboard-list divide-y divide-[#e7eaf0]">
                {selectedEntries.map((entry, index) => {
                  const playerKey = `${entry.source_uid}-${entry.username}`;
                  const isExpanded = expandedPlayers.has(playerKey);
                  return (
                    <Fragment key={playerKey}>
                      <tr className="text-[#354154]">
                        <td className="whitespace-nowrap px-2 py-3 font-bold text-[#8994a6] sm:px-5 sm:py-4">
                          {index + 1}
                        </td>
                        <th
                          scope="row"
                          className="min-w-0 px-2 py-3 font-bold text-[#182230] sm:px-5 sm:py-4"
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
                            className="flex min-h-11 min-w-0 items-center gap-1 text-left hover:text-[#2144d3] sm:gap-2"
                          >
                            <span className="truncate">{entry.username}</span>
                            <ChevronDown
                              size={14}
                              className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                            />
                          </button>
                        </th>
                        <td className="whitespace-nowrap px-2 py-3 text-right font-extrabold text-[#2144d3] sm:px-5 sm:py-4">
                          {entry.completed_lines}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-right font-semibold sm:px-5 sm:py-4">
                          {entry.marked_squares}
                        </td>
                        {isAdmin && (
                          <td className="px-1 py-2 text-right sm:px-5 sm:py-3">
                            <button
                              type="button"
                              aria-label={`Remove ${entry.username} from this lecture's leaderboard`}
                              title="Remove player from this lecture"
                              disabled={removingPlayer === playerKey}
                              onClick={() => setConfirmingRemoval(playerKey)}
                              className="rounded-lg p-2 text-[#b0b8c5] transition hover:bg-[#fff1f1] hover:text-[#d55252] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        )}
                      </tr>
                      {confirmingRemoval === playerKey && (
                        <tr>
                          <td
                            colSpan={isAdmin ? 5 : 4}
                            className="bg-[#fff8f8] px-5 py-4"
                          >
                            <div
                              role="group"
                              aria-label={`Confirm removal of ${entry.username}`}
                              className="flex flex-wrap items-center justify-between gap-3"
                            >
                              <p className="text-xs font-medium text-[#8f3535]">
                                Remove {entry.username} from this lecture? Their
                                history for this lecture will be deleted.
                              </p>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  disabled={removingPlayer === playerKey}
                                  onClick={() => void removePlayer(entry)}
                                  className="rounded-lg bg-[#c43d3d] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#a92f2f] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  {removingPlayer === playerKey
                                    ? "Removing…"
                                    : "Confirm removal"}
                                </button>
                                <button
                                  type="button"
                                  disabled={removingPlayer === playerKey}
                                  onClick={() => setConfirmingRemoval(null)}
                                  className="rounded-lg border border-[#e1e6ee] bg-white px-3 py-2 text-xs font-bold text-[#59667c] transition hover:bg-[#f7f8fb] disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                      {isExpanded && (
                        <tr>
                          <td
                            colSpan={isAdmin ? 5 : 4}
                            className="bg-[#f7f8fb] px-5 py-5"
                          >
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
