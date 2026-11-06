import { useEffect, useState } from "react";
import type { BoardComposition, Difficulty } from "../types/app";

export function DifficultySettings({
  composition,
  updateComposition,
}: {
  composition: BoardComposition;
  updateComposition: (composition: BoardComposition) => void;
}) {
  const [draft, setDraft] = useState(composition);

  useEffect(() => {
    setDraft(composition);
  }, [composition]);

  return (
    <div className="mt-6 rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]">
      <div className="mb-4">
        <h3 className="text-[13px] font-bold">Board difficulty mix</h3>
        <p className="mt-1 text-[11px] text-[#9aa4b4]">
          New boards use exactly 25 options with this difficulty split.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {(["free", "common", "rare"] as Difficulty[]).map((difficulty) => (
          <label
            key={difficulty}
            className="text-[11px] font-bold capitalize text-[#59667c]"
          >
            {difficulty}
            <input
              type="number"
              min="0"
              max="25"
              value={draft[difficulty]}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  [difficulty]: Number(event.target.value),
                }))
              }
              className="mt-2 w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-sm outline-none focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]"
            />
          </label>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between gap-4">
        <p className="text-[11px] text-[#748096]">
          Total:{" "}
          <span className="font-bold">
            {draft.free + draft.common + draft.rare} / 25
          </span>
        </p>
        <button
          onClick={() => updateComposition(draft)}
          disabled={
            draft.free + draft.common + draft.rare !== 25 ||
            Object.values(draft).some((value) => value < 0)
          }
          className="rounded-xl bg-[#2144d3] px-4 py-3 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save difficulty mix
        </button>
      </div>
    </div>
  );
}

