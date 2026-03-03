"use client";

import { useDroppable } from "@dnd-kit/react";
import { CollisionPriority } from "@dnd-kit/abstract";
import { isToday } from "@/lib/dates";
import { ChipPill } from "@/components/chips/ChipPill";
import { ChipCreatePopover } from "@/components/chips/ChipCreatePopover";
import { DayTagPopover } from "@/components/calendar/DayTagPopover";
import { DayTagIcon } from "@/components/calendar/DayTagIcon";
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
  linkingChipId?: string | null;
  onCreatedForLinking?: (chipId: string) => void;
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
  linkingChipId,
  onCreatedForLinking,
}: DayCellProps) {
  const today = isToday(date);
  const { ref: dropRef, isDropTarget } = useDroppable({
    id: dateStr,
    type: "day",
    accept: ["chip", "colour-blank"],
    collisionPriority: CollisionPriority.Low,
  });

  // Check if any day tag has a colour tint (skip special values like "rainbow")
  const tintTag = dayTags.find((dt) => dt.tagType.colour && dt.tagType.colour.startsWith("#"));
  const tintColour = tintTag?.tagType.colour;

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
      {/* Tag stamp overlay */}
      {dayTags.length > 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-1 opacity-[0.07]">
          {dayTags.map((dt) => (
            <DayTagIcon
              key={dt.id}
              icon={dt.tagType.icon}
              className="h-10 w-10"
              colour={dt.tagType.colour ?? undefined}
            />
          ))}
        </div>
      )}

      {/* Chip stack */}
      <div className="relative flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {chips.map((chip) => {
          const colour = colours.find((c) => c.id === chip.colourId);
          return (
            <ChipPill
              key={chip.id}
              chip={chip}
              colour={colour}
              onClick={() => onChipClick(chip)}
              isLinkTarget={!!linkingChipId}
            />
          );
        })}
      </div>

      {/* Bottom row: + button, tag popover, date number */}
      <div className="relative mt-0.5 flex items-center justify-end gap-0.5">
        <ChipCreatePopover
          date={dateStr}
          colours={colours}
          onCreated={onChipCreated}
          onCreatedForLinking={onCreatedForLinking}
        />
        <DayTagPopover
          date={dateStr}
          tagTypes={tagTypes}
          dayTags={dayTags}
          onAdd={onAddTag}
          onRemove={onRemoveTag}
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
