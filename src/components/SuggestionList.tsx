import { Check, X } from "lucide-react";
import type { Suggestion } from "../types/app";

export function SuggestionList({
  suggestions,
  reviewSuggestion,
}: {
  suggestions: Suggestion[];
  reviewSuggestion?: (
    suggestion: Suggestion,
    status: "accepted" | "rejected",
  ) => void;
}) {
  return (
    <div className="mt-6 rounded-2xl border border-[#e4e8ef] bg-white shadow-[0_10px_30px_rgba(38,51,77,0.04)]">
      <div className="border-b border-[#edf0f4] px-5 py-4">
        <h3 className="text-[13px] font-bold">
          {reviewSuggestion ? "Pending suggestions" : "Your suggestions"}
        </h3>
      </div>
      {suggestions.length ? (
        <div className="divide-y divide-[#f0f2f5]">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-center gap-3 px-5 py-4"
            >
              <p className="min-w-0 flex-1 text-[12px] font-semibold text-[#354154]">
                {suggestion.label}
              </p>
              {reviewSuggestion && suggestion.status === "pending" ? (
                <div className="flex shrink-0 gap-2">
                  <button
                    aria-label={`Accept ${suggestion.label}`}
                    onClick={() => reviewSuggestion(suggestion, "accepted")}
                    className="rounded-lg bg-[#effaf5] p-2 text-[#237a56] hover:bg-[#d9f5e8]"
                  >
                    <Check size={15} />
                  </button>
                  <button
                    aria-label={`Reject ${suggestion.label}`}
                    onClick={() => reviewSuggestion(suggestion, "rejected")}
                    className="rounded-lg bg-[#fff5f5] p-2 text-[#b34e4e] hover:bg-[#ffe4e4]"
                  >
                    <X size={15} />
                  </button>
                </div>
              ) : (
                <span
                  className={`rounded-lg px-2.5 py-1 text-[10px] font-bold capitalize ${
                    suggestion.status === "accepted"
                      ? "bg-[#effaf5] text-[#237a56]"
                      : suggestion.status === "rejected"
                        ? "bg-[#fff5f5] text-[#b34e4e]"
                        : "bg-[#fff8e8] text-[#9a6b13]"
                  }`}
                >
                  {suggestion.status}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="px-5 py-6 text-sm text-[#748096]">
          {reviewSuggestion
            ? "There are no suggestions to review."
            : "You have not submitted any suggestions yet."}
        </p>
      )}
    </div>
  );
}

