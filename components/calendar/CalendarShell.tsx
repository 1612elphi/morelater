"use client";

import { useState, useEffect, useCallback } from "react";
import { DragDropProvider } from "@dnd-kit/react";
import { CalendarGrid } from "./CalendarGrid";
import { ChipDetailPanel } from "@/components/chips/ChipDetailPanel";
import type { Chip, ChipColour } from "@/lib/types";
import { getMonthWeeks, toDateString } from "@/lib/dates";

interface CalendarShellProps {
  colours: ChipColour[];
}

export function CalendarShell({ colours }: CalendarShellProps) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [chips, setChips] = useState<Chip[]>([]);
  const [selectedChip, setSelectedChip] = useState<Chip | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchChips = useCallback(async () => {
    setLoading(true);
    const weeks = getMonthWeeks(year, month);
    const startDate = toDateString(weeks[0][0]);
    const endDate = toDateString(weeks[weeks.length - 1][6]);
    const res = await fetch(
      `/api/chips?startDate=${startDate}&endDate=${endDate}`
    );
    if (res.ok) setChips(await res.json());
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    fetchChips();
  }, [fetchChips]);

  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  function prevMonth() {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
  }

  function nextMonth() {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
  }

  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  async function handleDragEnd(event: any) {
    const { source, target } = event;
    if (!target?.id || event.canceled) return;

    const chipId = source.id as string;
    const newDate = target.id as string;

    // Don't do anything if dropped on the same day
    const chip = chips.find((c) => c.id === chipId);
    if (chip && chip.date === newDate) return;

    await fetch(`/api/chips/${chipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: newDate }),
    });
    fetchChips();
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <button
          onClick={prevMonth}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{monthName}</span>
          <button
            onClick={goToday}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            Today
          </button>
        </div>
        <button
          onClick={nextMonth}
          className="rounded px-2 py-1 text-sm hover:bg-muted"
        >
          →
        </button>
      </div>
      <div className="flex-1 overflow-auto">
        <DragDropProvider onDragEnd={handleDragEnd}>
          <CalendarGrid
            year={year}
            month={month}
            chips={chips}
            colours={colours}
            onChipClick={(chip) => setSelectedChip(chip)}
            onAddChip={() => {}}
            onChipCreated={fetchChips}
          />
        </DragDropProvider>
      </div>
      <ChipDetailPanel
        chip={selectedChip}
        colours={colours}
        open={selectedChip !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedChip(null);
        }}
        onUpdated={() => {
          fetchChips();
          setSelectedChip(null);
        }}
        onDeleted={fetchChips}
      />
    </div>
  );
}
