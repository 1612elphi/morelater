import { isToday } from "@/lib/dates";
import { ChipPill } from "@/components/chips/ChipPill";
import type { Chip, ChipColour } from "@/lib/types";

interface DayCellProps {
  date: Date;
  dateStr: string;
  chips: Chip[];
  colours: ChipColour[];
  isOutsideMonth: boolean;
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
}

export function DayCell({
  date,
  dateStr,
  chips,
  colours,
  isOutsideMonth,
  onChipClick,
  onAddChip,
  onChipCreated,
}: DayCellProps) {
  const today = isToday(date);

  return (
    <div
      className={`group relative flex flex-col border-r p-1 last:border-r-0 ${
        isOutsideMonth ? "bg-muted/30" : ""
      } ${today ? "bg-primary/5" : ""}`}
    >
      {/* Date number */}
      <div className="mb-0.5 flex items-center justify-between">
        <span
          className={`text-xs ${
            today
              ? "font-bold text-primary"
              : isOutsideMonth
                ? "text-muted-foreground/50"
                : "text-muted-foreground"
          }`}
        >
          {date.getDate()}
        </span>
        <button
          onClick={() => onAddChip(dateStr)}
          className="hidden h-4 w-4 items-center justify-center rounded text-xs text-muted-foreground hover:bg-muted group-hover:flex"
        >
          +
        </button>
      </div>

      {/* Chip stack */}
      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {chips.map((chip) => {
          const colour = colours.find((c) => c.id === chip.colourId);
          return (
            <ChipPill
              key={chip.id}
              chip={chip}
              colour={colour}
              onClick={() => onChipClick(chip)}
            />
          );
        })}
      </div>
    </div>
  );
}
