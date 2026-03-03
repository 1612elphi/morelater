"use client";

import { useState } from "react";
import { Tag, Check } from "lucide-react";
import { DayTagIcon } from "./DayTagIcon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DayTagType, DayTagWithType } from "@/lib/types";

interface DayTagPopoverProps {
  date: string;
  tagTypes: DayTagType[];
  dayTags: DayTagWithType[];
  onAdd: (date: string, tagTypeId: string) => void;
  onRemove: (tagId: string) => void;
}

export function DayTagPopover({
  date,
  tagTypes,
  dayTags,
  onAdd,
  onRemove,
}: DayTagPopoverProps) {
  const [open, setOpen] = useState(false);

  const activeTypes = tagTypes.filter((t) => t.isActive);
  const appliedIds = new Set(dayTags.map((dt) => dt.tagTypeId));
  const hasAnyTags = dayTags.length > 0;

  function handleToggle(tagType: DayTagType) {
    if (appliedIds.has(tagType.id)) {
      const tag = dayTags.find((dt) => dt.tagTypeId === tagType.id);
      if (tag) onRemove(tag.id);
    } else {
      onAdd(date, tagType.id);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={`inline-flex items-center justify-center rounded transition-colors ${
            hasAnyTags
              ? "h-5 gap-0.5 px-1 text-[10px] font-medium text-muted-foreground hover:bg-muted"
              : `h-4 w-4 text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground ${
                  open ? "flex" : "hidden group-hover/day:flex"
                }`
          }`}
        >
          <Tag className="h-2.5 w-2.5" />
          {hasAnyTags && <span>{dayTags.length}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end" side="bottom">
        <div className="flex flex-col">
          {activeTypes.map((t) => {
            const isApplied = appliedIds.has(t.id);
            return (
              <button
                key={t.id}
                className={`flex items-center gap-2 rounded px-2 py-1.5 text-left text-xs transition-colors ${
                  isApplied
                    ? "bg-accent font-medium"
                    : "hover:bg-muted"
                }`}
                onClick={() => handleToggle(t)}
              >
                <span
                  className="flex h-4 w-4 shrink-0 items-center justify-center rounded"
                  style={
                    t.colour && t.colour.startsWith("#")
                      ? { backgroundColor: t.colour + "22" }
                      : undefined
                  }
                >
                  <DayTagIcon icon={t.icon} className="h-3 w-3" colour={t.colour ?? undefined} />
                </span>
                <span className="flex-1">{t.name}</span>
                {isApplied && (
                  <Check className="h-3 w-3 text-primary" />
                )}
              </button>
            );
          })}
          {activeTypes.length === 0 && (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
              No tag types configured
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
