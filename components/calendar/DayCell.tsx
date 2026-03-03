"use client";

import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { isToday } from "@/lib/dates";
import { ChipPill } from "@/components/chips/ChipPill";
import { ChipCreatePopover } from "@/components/chips/ChipCreatePopover";
import { DayTagBadge } from "@/components/calendar/DayTagBadge";
import { DayTagDropdown } from "@/components/calendar/DayTagDropdown";
import type { Chip, ChipColour, DayTagWithType, DayTagType } from "@/lib/types";

interface DayCellProps {
  date: Date;
  dateStr: string;
  chips: Chip[];
  colours: ChipColour[];
  dayTags: DayTagWithType[];
  tagTypes: DayTagType[];
  isOutsideMonth: boolean;
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
  onAddTag: (date: string, tagTypeId: string) => void;
  onRemoveTag: (tagId: string) => void;
}

export function DayCell({
  date,
  dateStr,
  chips,
  colours,
  dayTags,
  tagTypes,
  isOutsideMonth,
  onChipClick,
  onAddChip,
  onChipCreated,
  onAddTag,
  onRemoveTag,
}: DayCellProps) {
  const today = isToday(date);
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: dateStr,
    type: "day",
    accept: ["chip", "colour-blank"],
    collisionPriority: CollisionPriority.Low,
  });

  // Check if any day tag has a colour tint
  const tintColour = dayTags.find((dt) => dt.tagType.colour)?.tagType.colour;

  return (
    <div
      ref={dropRef}
      className={`group/day relative flex flex-col border-r p-1 last:border-r-0 ${
        isOutsideMonth ? "bg-muted/30" : ""
      } ${today ? "bg-primary/5" : ""} ${
        isDropTarget ? "ring-2 ring-primary/30 ring-inset" : ""
      }`}
      style={
        tintColour ? { backgroundColor: tintColour + "15" } : undefined
      }
    >
      {/* Top row: + button */}
      <div className="mb-0.5 flex items-center justify-end">
        <ChipCreatePopover
          date={dateStr}
          colours={colours}
          onCreated={onChipCreated}
        />
      </div>

      {/* Chip stack */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {chips.map((chip, index) => {
          const colour = colours.find((c) => c.id === chip.colourId);
          return (
            <ChipPill
              key={chip.id}
              chip={chip}
              colour={colour}
              onClick={() => onChipClick(chip)}
              index={index}
              group={dateStr}
            />
          );
        })}
      </div>

      {/* Bottom row: day tags + date number */}
      <div className="mt-0.5 flex items-center justify-end gap-0.5">
        {dayTags.map((dt) => (
          <DayTagBadge key={dt.id} dayTag={dt} onRemove={onRemoveTag} />
        ))}
        <DayTagDropdown
          date={dateStr}
          tagTypes={tagTypes}
          existingTagTypeIds={dayTags.map((dt) => dt.tagTypeId)}
          onAdd={onAddTag}
        />
        <span
          className={`ml-auto text-xs ${
            today
              ? "font-bold text-primary"
              : isOutsideMonth
                ? "text-muted-foreground/50"
                : "text-muted-foreground"
          }`}
        >
          {date.getDate()}
        </span>
      </div>
    </div>
  );
}
