"use client";

import { useState, useEffect, useCallback } from "react";
import { useChipRefs } from "./ChipRefContext";
import type { Chip, ChipColour } from "@/lib/types";

interface ChipConnectorsProps {
  chips: Chip[];
  colours: ChipColour[];
  gridRef: React.RefObject<HTMLDivElement | null>;
}

interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  key: string;
}

export function ChipConnectors({ chips, colours, gridRef }: ChipConnectorsProps) {
  const { mapRef } = useChipRefs();
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const gridRect = grid.getBoundingClientRect();
    const scrollLeft = grid.scrollLeft;
    const scrollTop = grid.scrollTop;
    setSize({ width: grid.scrollWidth, height: grid.scrollHeight });

    const result: ConnectorLine[] = [];
    const refMap = mapRef.current;

    for (const chip of chips) {
      if (!chip.linkedChipId) continue;
      const childEl = refMap.get(chip.id);
      const parentEl = refMap.get(chip.linkedChipId);
      if (!childEl || !parentEl) continue;

      const childRect = childEl.getBoundingClientRect();
      const parentRect = parentEl.getBoundingClientRect();

      const colour = colours.find((c) => c.id === chip.colourId);
      const hex = colour?.hex ?? "#94a3b8";

      result.push({
        x1: parentRect.right - gridRect.left + scrollLeft,
        y1: parentRect.top + parentRect.height / 2 - gridRect.top + scrollTop,
        x2: childRect.left - gridRect.left + scrollLeft,
        y2: childRect.top + childRect.height / 2 - gridRect.top + scrollTop,
        color: hex,
        key: `${chip.linkedChipId}-${chip.id}`,
      });
    }

    setLines(result);
  }, [chips, colours, gridRef, mapRef]);

  useEffect(() => {
    measure();

    const grid = gridRef.current;
    if (!grid) return;

    const ro = new ResizeObserver(() => measure());
    ro.observe(grid);
    grid.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      grid.removeEventListener("scroll", measure);
    };
  }, [measure, gridRef]);

  useEffect(() => {
    const id = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(id);
  }, [chips, measure]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size.width}
      height={size.height}
      style={{ zIndex: 10 }}
    >
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={1}
          strokeOpacity={0.3}
        />
      ))}
    </svg>
  );
}
