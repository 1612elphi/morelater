import ical, { ICalCalendarMethod } from "ical-generator";
import { db } from "@/lib/db";
import { chips, chipColours } from "@/lib/db/schema";
import { and, isNotNull, eq } from "drizzle-orm";

export function generateCalendar() {
  const calendar = ical({
    name: "MoreLater",
    method: ICalCalendarMethod.PUBLISH,
    prodId: { company: "morelater", product: "calendar" },
  });

  const rows = db
    .select({
      id: chips.id,
      title: chips.title,
      date: chips.date,
      time: chips.time,
      durationMinutes: chips.durationMinutes,
      status: chips.status,
      isShoot: chips.isShoot,
      body: chips.body,
      calendarUid: chips.calendarUid,
      colourName: chipColours.name,
    })
    .from(chips)
    .leftJoin(chipColours, eq(chips.colourId, chipColours.id))
    .where(and(isNotNull(chips.date), isNotNull(chips.time)))
    .all();

  for (const row of rows) {
    const start = new Date(`${row.date}T${row.time}:00`);
    const duration = row.durationMinutes ?? 60;
    const summary = row.isShoot ? `📷 ${row.title}` : row.title;
    const categories: string[] = [];
    if (row.colourName) categories.push(row.colourName);
    categories.push(row.status.toUpperCase());

    calendar.createEvent({
      id: row.calendarUid ?? `${row.id}@morelater`,
      start,
      end: new Date(start.getTime() + duration * 60_000),
      summary,
      description: row.body ? row.body.slice(0, 500) : undefined,
      categories: categories.map((c) => ({ name: c })),
    });
  }

  return calendar;
}
