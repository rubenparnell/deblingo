import { Plus } from "lucide-react";
import { SuggestionList } from "../components/SuggestionList";
import type { Suggestion } from "../types/app";

export function SuggestionsView({
  suggestions,
  newSuggestion,
  setNewSuggestion,
  addSuggestion,
}: {
  suggestions: Suggestion[];
  newSuggestion: string;
  setNewSuggestion: (value: string) => void;
  addSuggestion: () => void;
}) {
  return (
    <section className="mx-auto max-w-[700px] px-5 py-12 sm:px-10 lg:px-14">
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#2144d3]">
          Community ideas
        </p>
        <h2 className="text-[32px] font-extrabold tracking-[-0.055em]">
          Suggest a board option.
        </h2>
        <p className="mt-2 text-[13px] text-[#748096]">
          Suggest a prompt for an admin to review and add to future boards.
        </p>
      </div>
      <div className="rounded-2xl border border-[#e4e8ef] bg-white p-5 shadow-[0_10px_30px_rgba(38,51,77,0.04)]">
        <textarea
          value={newSuggestion}
          onChange={(event) => setNewSuggestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              addSuggestion();
            }
          }}
          placeholder="e.g. 'Alphabets'"
          rows={4}
          maxLength={120}
          className="w-full resize-none rounded-xl border border-[#e1e6ee] bg-[#fbfcfd] p-3 text-[12px] outline-none transition placeholder:text-[#b2bac7] focus:border-[#8193e8] focus:ring-2 focus:ring-[#e7ebff]"
        />
        <button
          onClick={addSuggestion}
          disabled={!newSuggestion.trim()}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#2144d3] py-3 text-[12px] font-bold text-white transition hover:bg-[#1738bd] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={15} /> Submit suggestion
        </button>
      </div>
      <SuggestionList suggestions={suggestions} />
    </section>
  );
}

