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
      onClick={onClick}
      className={`mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[12px] font-semibold transition ${active ? "bg-[#eef2ff] text-[#2144d3]" : "text-[#7b879a] hover:bg-[#f7f8fb] hover:text-[#26344b]"}`}
    >
      {icon}
      <span>{label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#2144d3]" />
      )}
    </button>
  );
}

