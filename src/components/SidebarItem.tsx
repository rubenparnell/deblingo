import type { ReactNode } from "react";

export function SidebarItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-left text-[11px] font-semibold transition sm:px-3.5 sm:text-[12px] ${active ? "bg-[#eef2ff] text-[#2144d3]" : "text-[#7b879a] hover:bg-[#f7f8fb] hover:text-[#26344b]"}`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
