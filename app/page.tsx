import { db } from "@/lib/db";
import { chipColours, dayTagTypes } from "@/lib/db/schema";
import { CalendarShell } from "@/components/calendar/CalendarShell";

export const dynamic = "force-dynamic";

export default function Home() {
  const colours = db
    .select()
    .from(chipColours)
    .orderBy(chipColours.sortOrder)
    .all();

  const tagTypes = db
    .select()
    .from(dayTagTypes)
    .orderBy(dayTagTypes.sortOrder)
    .all();

  return <CalendarShell colours={colours} tagTypes={tagTypes} />;
}
