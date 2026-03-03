"use client";

import type { DayTagWithType } from "@/lib/types";

interface DayTagBadgeProps {
  dayTag: DayTagWithType;
  onRemove: (id: string) => void;
}

export function DayTagBadge({ dayTag, onRemove }: DayTagBadgeProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onRemove(dayTag.id);
      }}
      className="inline-flex h-4 items-center rounded px-0.5 text-[10px] leading-none hover:opacity-70"
      style={{
        backgroundColor: dayTag.tagType.colour
          ? dayTag.tagType.colour + "33"
          : undefined,
      }}
      title={`${dayTag.tagType.name} (click to remove)`}
    >
      {dayTag.tagType.icon}
    </button>
  );
}
