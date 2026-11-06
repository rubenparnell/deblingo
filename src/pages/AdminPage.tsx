import { useState, type KeyboardEvent } from "react";
import { ChevronDown, ClipboardList, Plus, Trash2 } from "lucide-react";
import { DifficultySettings } from "../components/DifficultySettings";
import { SuggestionList } from "../components/SuggestionList";
import type { BoardComposition, BoardOption, Difficulty, Suggestion } from "../types/app";

export function AdminView({
  options,
  newOption,
  setNewOption,
  addOption,
  deleteOption,
  uploadLectures,
  suggestions,
  reviewSuggestion,
  composition,
  updateComposition,
  updateDifficulty,
}: {
  options: BoardOption[];
  newOption: string;
  setNewOption: (value: string) => void;
  addOption: () => void;
  deleteOption: (id: number) => void;
  uploadLectures: (file: File) => void;
  suggestions: Suggestion[];
  reviewSuggestion: (
    suggestion: Suggestion,
    status: "accepted" | "rejected",
  ) => void;
  composition: BoardComposition;
  updateComposition: (composition: BoardComposition) => void;
  updateDifficulty: (id: number, difficulty: Difficulty) => void;
}) {
  const [boardOptionsExpanded, setBoardOptionsExpanded] = useState(false);
  const submitOnEnter = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      addOption();
    }
  };
  return (
    <section className="mx-auto max-w-[1050px] px-4 py-6 sm:px-10 sm:py-8 lg:px-14">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[32px] font-extrabold tracking-[-0.055em] text-[#15202e]">
            Admin options
          </h2>
        </div>
        <div className="hidden rounded-xl bg-[#eef2ff] px-4 py-3 text-right sm:block">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#8998d1]">
            Available options
          </p>
          <p className="text-xl font-extrabold text-[#2144d3]">
            {options.length}
          </p>
        </div>
      </div>
      <SuggestionList
        suggestions={suggestions.filter(
          (suggestion) => suggestion.status === "pending",
        )}
        reviewSuggestion={reviewSuggestion}
      />
      <div className="mt-6 grid gap-6 lg:grid-cols-[350px_1fr]">
        <div className="h-fit rounded-2xl border border-[#e4e8ef] bg-white p-4 shadow-[0_10px_30px_rgba(38,51,77,0.04)] sm:p-5">
          <div className="mb-5 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#eef2ff] text-[#2144d3]">
              <Plus size={16} />
            </div>
            <div>
              <h3 className="text-[13px] font-bold">Add an option</h3>
              <p className="text-[11px] text-[#9aa4b4]">
                It will appear on future boards.
              </p>
            </div>
          </div>
          <label htmlFor="new-board-option" className="mb-2 block text-[11px] font-bold text-[#59667c]">
            Prompt
          </label>
          <textarea
            id="new-board-option"
            value={newOption}
            onChange={(event) => setNewOption(event.target.value)}
            onKeyDown={submitOnEnter}
            placeholder="e.g. 'Alphabets'"
            rows={4}
            className="w-full resize-none rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px] outline-none transition placeholder:text-[#b2bac7] focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]"
          />
          <button
            onClick={addOption}
            disabled={!newOption.trim()}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2144d3] py-3 text-[12px] font-bold text-white transition hover:bg-[#1738bd] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Plus size={15} /> Add to board
          </button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-[#e4e8ef] bg-white shadow-[0_10px_30px_rgba(38,51,77,0.04)]">
          <button
            type="button"
            aria-expanded={boardOptionsExpanded}
            onClick={() => setBoardOptionsExpanded((expanded) => !expanded)}
            className="flex w-full items-center justify-between px-5 py-4 text-left"
          >
            <div>
              <h3 className="text-[13px] font-bold">Board options</h3>
              <p className="mt-0.5 text-[11px] text-[#9aa4b4]">
                Rank each option and choose the mix used for new boards.
              </p>
            </div>
            <span className="rounded-lg bg-[#f6f7fa] px-2.5 py-1 text-[10px] font-bold text-[#8d98a9]">
              {options.length} total
            </span>
            <ChevronDown
              size={16}
              className={`ml-3 shrink-0 text-[#8994a6] transition-transform ${boardOptionsExpanded ? "rotate-180" : ""}`}
            />
          </button>
          <div
            className={`relative overflow-hidden transition-[max-height] duration-300 ease-in-out motion-reduce:transition-none ${
              boardOptionsExpanded ? "max-h-[10000px]" : "max-h-[12.5rem]"
            }`}
          >
            <div className="board-options-list divide-y divide-[#f0f2f5] border-t border-[#edf0f4]">
              {options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center gap-2 px-3 py-3.5 sm:gap-3 sm:px-5"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#f3f5ff] text-[#2144d3]">
                    <ClipboardList size={14} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-semibold text-[#354154]">
                      {option.label}
                    </p>
                  </div>
                  <select
                    value={option.difficulty}
                    onChange={(event) =>
                      updateDifficulty(
                        option.id,
                        event.target.value as Difficulty,
                      )
                    }
                    className="max-w-[92px] rounded-lg border border-[#e1e6ee] bg-[#fbfcfd] px-1.5 py-1.5 text-[11px] font-semibold text-[#59667c] sm:max-w-none sm:px-2"
                    aria-label={`Difficulty for ${option.label}`}
                  >
                    <option value="free">Free</option>
                    <option value="common">Common</option>
                    <option value="rare">Rare</option>
                  </select>
                  <button
                    aria-label={`Delete ${option.label}`}
                    onClick={() => deleteOption(option.id)}
                    className="shrink-0 rounded-lg p-2 text-[#b0b8c5] transition hover:bg-[#fff1f1] hover:text-[#d55252]"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            {!boardOptionsExpanded && (
              <div
                aria-hidden="true"
                className="board-options-fade pointer-events-none absolute inset-x-0 bottom-0 h-24"
              />
            )}
          </div>
        </div>
      </div>
      <DifficultySettings
        composition={composition}
        updateComposition={updateComposition}
      />
      <div className="mt-6 rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]">
        <h3 className="text-[13px] font-bold">Lecture calendar</h3>
        <p className="mt-1 text-[11px] text-[#9aa4b4]">
          Upload an ICS file. Events containing both “discrete” and “lecture” in
          the title will be saved.
        </p>
        <input
          type="file"
          accept=".ics,text/calendar"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) uploadLectures(file);
            event.currentTarget.value = "";
          }}
          className="mt-4 block w-full rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px]"
        />
      </div>
    </section>
  );
}
