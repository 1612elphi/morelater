# StatusCircle Component

## Summary

A portable, zero-dependency React component that renders a circular status indicator like Linear's issue icons. Pure inline SVG, single file, copy-paste portable.

## States

| State | Visual | SVG technique |
|---|---|---|
| `backlog` | Dotted circle outline | `<circle>` with `stroke-dasharray` |
| `todo` | Solid circle outline | `<circle>` with solid stroke |
| `in-progress` | Pie fill (0-100%) | Arc `<path>` computed from `progress` prop |
| `done` | Filled circle + checkmark | Filled `<circle>` + `<polyline>` checkmark |
| `cancelled` | Filled circle + X | Filled `<circle>` + two `<line>` elements |

## API

```tsx
interface StatusCircleProps {
  status: "backlog" | "todo" | "in-progress" | "done" | "cancelled";
  progress?: number;   // 0-100, only used when status="in-progress"
  color?: string;      // any CSS colour, default "currentColor"
  className?: string;  // applied to root <svg>, use for sizing (e.g. "h-4 w-4")
}
```

## Constraints

- Single file, zero deps beyond React
- Pure SVG (no CSS, no external assets)
- `className` passthrough on root `<svg>` for sizing (lucide-react pattern)
- `color` prop controls stroke/fill directly
- In-file JSDoc documentation
- SVG viewBox is fixed (e.g. `0 0 24 24`), scales via CSS width/height

## File location

`components/ui/StatusCircle.tsx`
