import { generateCalendar } from "@/lib/ical";

export async function GET() {
  const calendar = generateCalendar();
  return new Response(calendar.toString(), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
