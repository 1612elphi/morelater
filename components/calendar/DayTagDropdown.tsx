"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DayTagType } from "@/lib/types";

interface DayTagDropdownProps {
  date: string;
  tagTypes: DayTagType[];
  existingTagTypeIds: string[];
  onAdd: (date: string, tagTypeId: string) => void;
}

export function DayTagDropdown({
  date,
  tagTypes,
  existingTagTypeIds,
  onAdd,
}: DayTagDropdownProps) {
  const [open, setOpen] = useState(false);
  const available = tagTypes.filter(
    (t) => t.isActive && !existingTagTypeIds.includes(t.id)
  );

  if (available.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex h-4 w-4 items-center justify-center rounded text-[10px] text-muted-foreground hover:bg-muted ${
            open ? "flex" : "hidden group-hover/day:flex"
          }`}
        >
          #
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-36 p-1" align="end">
        <div className="flex flex-col">
          {available.map((t) => (
            <button
              key={t.id}
              className="flex items-center gap-2 rounded px-2 py-1 text-left text-xs hover:bg-muted"
              onClick={() => {
                onAdd(date, t.id);
                setOpen(false);
              }}
            >
              <span>{t.icon}</span>
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
