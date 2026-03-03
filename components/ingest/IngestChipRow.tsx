"use client";

import { useDraggable } from "@dnd-kit/react";
import { Star } from "lucide-react";
import type { Chip, ChipColour } from "@/lib/types";

interface IngestChipRowProps {
  chip: Chip;
  colour: ChipColour | undefined;
  onClick: () => void;
}

export function IngestChipRow({ chip, colour, onClick }: IngestChipRowProps) {
  const { ref, isDragging } = useDraggable({
    id: chip.id,
    type: "chip",
    data: { chip },
  });

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={`flex w-full items-center gap-1.5 rounded-md border px-2 py-1.5 text-left text-xs transition-all hover:bg-muted ${
        isDragging ? "opacity-50" : ""
      }`}
    >
      {colour && (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: colour.hex }}
        />
      )}
      <span className="min-w-0 flex-1 truncate">{chip.title}</span>
      {chip.starred && <Star className="h-3 w-3 shrink-0 fill-current text-amber-500" />}
    </button>
  );
}
