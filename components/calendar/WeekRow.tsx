import { DayCell } from "./DayCell";
import { toDateString } from "@/lib/dates";
import type { Chip, ChipColour } from "@/lib/types";

interface WeekRowProps {
  weekNumber: number;
  days: Date[];
  month: number;
  chips: Chip[];
  colours: ChipColour[];
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
}

export function WeekRow({
  weekNumber,
  days,
  month,
  chips,
  colours,
  onChipClick,
  onAddChip,
  onChipCreated,
}: WeekRowProps) {
  return (
    <div className="grid min-h-24 flex-1 grid-cols-[3rem_repeat(7,1fr)] border-b last:border-b-0">
      <div className="flex items-start justify-center border-r pt-1 text-xs font-medium text-muted-foreground">
        {weekNumber}
      </div>
      {days.map((date) => {
        const dateStr = toDateString(date);
        const dayChips = chips
          .filter((c) => c.date === dateStr)
          .sort((a, b) => a.sortOrder - b.sortOrder);
        const isOutsideMonth = date.getMonth() !== month;

        return (
          <DayCell
            key={dateStr}
            date={date}
            dateStr={dateStr}
            chips={dayChips}
            colours={colours}
            isOutsideMonth={isOutsideMonth}
            onChipClick={onChipClick}
            onAddChip={onAddChip}
            onChipCreated={onChipCreated}
          />
        );
      })}
    </div>
  );
}
