import { X } from "lucide-react";

export function Alert({
  message,
  kind = "error",
  onDismiss,
  className = "",
}: {
  message: string;
  kind?: "error" | "success";
  onDismiss?: () => void;
  className?: string;
}) {
  const isError = kind === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live="polite"
      className={`mx-auto flex max-w-[1120px] items-start gap-3 rounded-xl border px-4 py-3 text-xs shadow-sm ${
        isError
          ? "border-[#f1caca] bg-[#fff5f5] text-[#9f3f46]"
          : "border-[#ccebdc] bg-[#effaf5] text-[#237a56]"
      } ${className}`}
    >
      <span
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold ${
          isError
            ? "bg-[#f8d9dc] text-[#9f3f46]"
            : "bg-[#ccebdc] text-[#237a56]"
        }`}
      >
        {isError ? "!" : "✓"}
      </span>
      <p className="min-w-0 flex-1 whitespace-pre-wrap leading-5">{message}</p>
      {onDismiss && (
        <button
          type="button"
          aria-label="Dismiss message"
          onClick={onDismiss}
          className="rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

