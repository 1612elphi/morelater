import { getMonthWeeks, getISOWeekNumber } from "@/lib/dates";
import { WeekRow } from "./WeekRow";
import type { Chip, ChipColour } from "@/lib/types";

interface CalendarGridProps {
  year: number;
  month: number;
  chips: Chip[];
  colours: ChipColour[];
  onChipClick: (chip: Chip) => void;
  onAddChip: (date: string) => void;
  onChipCreated: () => void;
}

export function CalendarGrid({
  year,
  month,
  chips,
  colours,
  onChipClick,
  onAddChip,
  onChipCreated,
}: CalendarGridProps) {
  const weeks = getMonthWeeks(year, month);

  return (
    <div className="flex h-full flex-col">
      {/* Day headers */}
      <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b">
        <div className="border-r p-1 text-center text-xs font-medium text-muted-foreground">
          Wk
        </div>
        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
          <div
            key={day}
            className="border-r p-1 text-center text-xs font-medium text-muted-foreground last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      {/* Week rows */}
      <div className="flex flex-1 flex-col">
        {weeks.map((week) => {
          const weekNum = getISOWeekNumber(week[3]); // Thursday determines week number
          return (
            <WeekRow
              key={weekNum + "-" + week[0].toISOString()}
              weekNumber={weekNum}
              days={week}
              month={month}
              chips={chips}
              colours={colours}
              onChipClick={onChipClick}
              onAddChip={onAddChip}
              onChipCreated={onChipCreated}
            />
          );
        })}
      </div>
    </div>
  );
}
