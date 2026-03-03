"use client";

import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { ColourBlank } from "./ColourBlank";
import { IngestChipRow } from "./IngestChipRow";
import type { Chip, ChipColour } from "@/lib/types";

interface IngestSidebarProps {
  colours: ChipColour[];
  onChipClick: (chip: Chip) => void;
  refreshKey: number;
}

export function IngestSidebar({
  colours,
  onChipClick,
  refreshKey,
}: IngestSidebarProps) {
  const [ingestChips, setIngestChips] = useState<Chip[]>([]);
  const [starredOnly, setStarredOnly] = useState(false);
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchIngest = useCallback(async () => {
    const res = await fetch("/api/chips?unscheduled=true&status=obskur");
    if (res.ok) setIngestChips(await res.json());
  }, []);

  useEffect(() => {
    fetchIngest();
  }, [fetchIngest, refreshKey]);

  async function handleQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!quickTitle.trim()) return;
    setAdding(true);
    await fetch("/api/chips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: quickTitle.trim(),
        status: "obskur",
      }),
    });
    setQuickTitle("");
    setAdding(false);
    fetchIngest();
  }

  const activeColours = colours.filter((c) => c.isActive);
  const filteredChips = starredOnly
    ? ingestChips.filter((c) => c.starred)
    : ingestChips;

  return (
    <div className="flex h-full w-[280px] flex-col border-r bg-muted/20">
      {/* Colour chip pile */}
      <div className="border-b p-2">
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Chip Pile
        </div>
        <div className="flex flex-wrap gap-1">
          {activeColours.map((c) => (
            <ColourBlank key={c.id} colour={c} />
          ))}
        </div>
      </div>

      {/* Quick-add + star filter */}
      <div className="border-b p-2">
        <form onSubmit={handleQuickAdd} className="flex gap-1">
          <Input
            placeholder="New idea..."
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            className="h-7 flex-1 text-xs"
            disabled={adding}
          />
          <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={!quickTitle.trim() || adding}>
            +
          </Button>
        </form>
        <div className="mt-1 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {filteredChips.length} idea{filteredChips.length !== 1 ? "s" : ""}
          </span>
          <Toggle
            pressed={starredOnly}
            onPressedChange={setStarredOnly}
            size="sm"
            className="h-6 px-1.5 text-[10px]"
          >
            ⭐ only
          </Toggle>
        </div>
      </div>

      {/* Ingest list */}
      <div className="flex-1 overflow-y-auto p-2">
        <div className="flex flex-col gap-1">
          {filteredChips.map((chip) => {
            const colour = colours.find((c) => c.id === chip.colourId);
            return (
              <IngestChipRow
                key={chip.id}
                chip={chip}
                colour={colour}
                onClick={() => onChipClick(chip)}
              />
            );
          })}
          {filteredChips.length === 0 && (
            <p className="py-4 text-center text-xs text-muted-foreground">
              {starredOnly ? "No starred ideas" : "No ideas yet"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
