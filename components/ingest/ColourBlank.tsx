"use client";

import { useDraggable } from "@dnd-kit/react";
import type { ChipColour } from "@/lib/types";

interface ColourBlankProps {
  colour: ChipColour;
}

export function ColourBlank({ colour }: ColourBlankProps) {
  const { ref, isDragging } = useDraggable({
    id: `blank-${colour.id}`,
    type: "colour-blank",
    data: { colourId: colour.id, colourHex: colour.hex },
  });

  return (
    <div
      ref={ref}
      className={`flex h-7 cursor-grab items-center gap-1 rounded-md border px-2 text-[10px] font-medium shadow-sm active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      }`}
      style={{
        backgroundColor: colour.hex + "22",
        borderColor: colour.hex + "66",
      }}
      title={colour.name}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: colour.hex }}
      />
      <span className="truncate">{colour.name}</span>
    </div>
  );
}
