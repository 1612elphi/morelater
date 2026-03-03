import { db } from "@/lib/db";
import { chipColours } from "@/lib/db/schema";
import { CalendarShell } from "@/components/calendar/CalendarShell";

export const dynamic = "force-dynamic";

export default function Home() {
  const colours = db
    .select()
    .from(chipColours)
    .orderBy(chipColours.sortOrder)
    .all();

  return <CalendarShell colours={colours} />;
}
