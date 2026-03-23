/**
 * StatusCircle — A circular status indicator inspired by Linear's issue icons.
 *
 * Renders a single inline SVG that represents one of five states:
 *
 * | Status        | Visual                         |
 * |---------------|--------------------------------|
 * | `backlog`     | Dotted circle outline          |
 * | `todo`        | Solid circle outline           |
 * | `in-progress` | Pie wedge fill (0–100%)        |
 * | `done`        | Filled circle with checkmark   |
 * | `cancelled`   | Filled circle with X           |
 *
 * @example
 * ```tsx
 * <StatusCircle status="backlog" className="h-4 w-4" color="#888" />
 * <StatusCircle status="in-progress" progress={75} className="h-4 w-4" color="#f59e0b" />
 * <StatusCircle status="done" className="h-5 w-5" color="#22c55e" />
 * ```
 *
 * **Portable:** Zero dependencies beyond React. Pure inline SVG.
 *
 * **Sizing:** Uses the `className` prop for width/height (e.g. Tailwind's `h-4 w-4`),
 * matching the pattern used by lucide-react icons.
 *
 * **Colour:** Pass any CSS colour string via the `color` prop.
 * Defaults to `"currentColor"` so it inherits from surrounding text.
 */

import * as React from "react";

export type StatusCircleStatus =
  | "backlog"
  | "todo"
  | "in-progress"
  | "done"
  | "cancelled";

export interface StatusCircleProps {
  /** Which state to render. */
  status: StatusCircleStatus;
  /** Fill percentage (0–100). Only used when `status="in-progress"`. */
  progress?: number;
  /** Stroke/fill colour. Defaults to `"currentColor"`. */
  color?: string;
  /** Applied to the root `<svg>`. Use for sizing, e.g. `"h-4 w-4"`. */
  className?: string;
  /** Stroke weight (1–5). Controls outline thickness and inner icon weight. Defaults to `2`. */
  weight?: number;
}

// SVG geometry constants (viewBox 0 0 24 24)
const CX = 12;
const CY = 12;
const R = 10; // main circle radius

/**
 * Convert a percentage (0–100) to an SVG arc path describing a pie wedge
 * from 12-o'clock clockwise.
 */
function piePath(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  if (clamped === 0) return "";
  if (clamped >= 100) {
    // Full circle — use two arcs to avoid SVG degenerate-arc issue
    return [
      `M ${CX} ${CY - R}`,
      `A ${R} ${R} 0 1 1 ${CX} ${CY + R}`,
      `A ${R} ${R} 0 1 1 ${CX} ${CY - R}`,
      "Z",
    ].join(" ");
  }
  const angle = (clamped / 100) * 360;
  const rad = ((angle - 90) * Math.PI) / 180;
  const x = CX + R * Math.cos(rad);
  const y = CY + R * Math.sin(rad);
  const largeArc = angle > 180 ? 1 : 0;
  return [
    `M ${CX} ${CY}`,
    `L ${CX} ${CY - R}`,
    `A ${R} ${R} 0 ${largeArc} 1 ${x} ${y}`,
    "Z",
  ].join(" ");
}

export function StatusCircle({
  status,
  progress = 0,
  color = "currentColor",
  className,
  weight = 2,
}: StatusCircleProps) {
  const innerWeight = weight * 1.1;

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {status === "backlog" && (
        <circle
          cx={CX}
          cy={CY}
          r={R}
          stroke={color}
          strokeWidth={weight}
          strokeDasharray="3 3"
          fill="none"
        />
      )}

      {status === "todo" && (
        <circle
          cx={CX}
          cy={CY}
          r={R}
          stroke={color}
          strokeWidth={weight}
          fill="none"
        />
      )}

      {status === "in-progress" && (
        <>
          {/* Track circle */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            stroke={color}
            strokeWidth={weight}
            fill="none"
            opacity={0.2}
          />
          {/* Pie wedge */}
          <path d={piePath(progress)} fill={color} />
        </>
      )}

      {status === "done" && (
        <>
          <circle cx={CX} cy={CY} r={R} fill={color} />
          {/* Checkmark */}
          <polyline
            points="8,12.5 11,15.5 16.5,9"
            stroke="white"
            strokeWidth={innerWeight}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </>
      )}

      {status === "cancelled" && (
        <>
          <circle cx={CX} cy={CY} r={R} fill={color} />
          {/* X mark */}
          <line
            x1={9}
            y1={9}
            x2={15}
            y2={15}
            stroke="white"
            strokeWidth={innerWeight}
            strokeLinecap="round"
          />
          <line
            x1={15}
            y1={9}
            x2={9}
            y2={15}
            stroke="white"
            strokeWidth={innerWeight}
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
