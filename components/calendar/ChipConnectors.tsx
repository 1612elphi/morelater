"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useChipRefs } from "./ChipRefContext";
import type { Chip, ChipColour, ChipRelation } from "@/lib/types";

interface ChipConnectorsProps {
  chips: Chip[];
  colours: ChipColour[];
  gridRef: React.RefObject<HTMLDivElement | null>;
  relations?: ChipRelation[];
}

interface ConnectorLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  key: string;
  dashed?: boolean;
}

export function ChipConnectors({ chips, colours, gridRef, relations = [] }: ChipConnectorsProps) {
  const { mapRef } = useChipRefs();
  const [lines, setLines] = useState<ConnectorLine[]>([]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [visible, setVisible] = useState(true);
  const generationRef = useRef(0);

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
        x1: parentRect.left + parentRect.width / 2 - gridRect.left + scrollLeft,
        y1: parentRect.top + parentRect.height / 2 - gridRect.top + scrollTop,
        x2: childRect.left + childRect.width / 2 - gridRect.left + scrollLeft,
        y2: childRect.top + childRect.height / 2 - gridRect.top + scrollTop,
        color: hex,
        key: `${chip.linkedChipId}-${chip.id}`,
      });
    }

    // Add blocking relation lines
    for (const rel of relations) {
      if (rel.type !== "blocks") continue;
      const sourceEl = refMap.get(rel.sourceChipId);
      const targetEl = refMap.get(rel.targetChipId);
      if (!sourceEl || !targetEl) continue;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      result.push({
        x1: sourceRect.left + sourceRect.width / 2 - gridRect.left + scrollLeft,
        y1: sourceRect.top + sourceRect.height / 2 - gridRect.top + scrollTop,
        x2: targetRect.left + targetRect.width / 2 - gridRect.left + scrollLeft,
        y2: targetRect.top + targetRect.height / 2 - gridRect.top + scrollTop,
        color: "#ef4444",
        key: `block-${rel.id}`,
        dashed: true,
      });
    }

    setLines(result);
  }, [chips, colours, gridRef, mapRef, relations]);

  // Resize & scroll — measure immediately (no animation needed)
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

  // When chips change: hide lines, wait for DOM to settle, re-measure, fade in
  useEffect(() => {
    const gen = ++generationRef.current;
    setVisible(false);

    const id = setTimeout(() => {
      if (gen !== generationRef.current) return;
      measure();
      setVisible(true);
    }, 500);
    return () => clearTimeout(id);
  }, [chips, measure]);

  if (lines.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0"
      width={size.width}
      height={size.height}
      style={{
        zIndex: 0,
        opacity: visible ? 1 : 0,
        transition: "opacity 300ms ease-in",
      }}
    >
      {lines.map((line) => (
        <line
          key={line.key}
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={line.color}
          strokeWidth={1.5}
          strokeOpacity={0.3}
          strokeDasharray={line.dashed ? "4 3" : undefined}
        />
      ))}
    </svg>
  );
}
