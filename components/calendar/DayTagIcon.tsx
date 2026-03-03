import type { LucideIcon } from "lucide-react";
import {
  CircleSlash,
  Square,
  Store,
  House,
  Clapperboard,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  "circle-slash": CircleSlash,
  square: Square,
  store: Store,
  house: House,
  clapperboard: Clapperboard,
};

interface DayTagIconProps {
  icon: string;
  className?: string;
  colour?: string;
}

export function DayTagIcon({ icon, className = "h-3 w-3", colour }: DayTagIconProps) {
  const isRainbow = colour === "rainbow";
  const style = isRainbow ? undefined : colour ? { color: colour } : undefined;
  const cls = isRainbow ? `${className} rainbow-icon` : className;

  const Icon = ICON_MAP[icon];
  if (Icon) return <Icon className={cls} style={style} />;
  return <span className={cls} style={style}>{icon}</span>;
}
