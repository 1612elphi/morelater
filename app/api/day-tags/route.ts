import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTags, dayTagTypes } from "@/lib/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { dayTagCreate, handle } from "@/lib/api";

const withType = {
  id: dayTags.id,
  date: dayTags.date,
  tagTypeId: dayTags.tagTypeId,
  tagType: {
    id: dayTagTypes.id,
    name: dayTagTypes.name,
    icon: dayTagTypes.icon,
    colour: dayTagTypes.colour,
    sortOrder: dayTagTypes.sortOrder,
    isActive: dayTagTypes.isActive,
  },
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions = [];
  if (startDate) conditions.push(gte(dayTags.date, startDate));
  if (endDate) conditions.push(lte(dayTags.date, endDate));

  const rows = db
    .select(withType)
    .from(dayTags)
    .innerJoin(dayTagTypes, eq(dayTags.tagTypeId, dayTagTypes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(dayTags.date, dayTagTypes.sortOrder)
    .all();

  return NextResponse.json(rows);
}

export const POST = handle(async (request: NextRequest) => {
  const { date, tagTypeId } = dayTagCreate.parse(await request.json());
  const tagged = () =>
    db
      .select(withType)
      .from(dayTags)
      .innerJoin(dayTagTypes, eq(dayTags.tagTypeId, dayTagTypes.id))
      .where(and(eq(dayTags.date, date), eq(dayTags.tagTypeId, tagTypeId)))
      .get();

  // a day carries each tag type once
  const existing = tagged();
  if (existing) return NextResponse.json(existing);

  db.insert(dayTags).values({ id: crypto.randomUUID(), date, tagTypeId }).run();
  return NextResponse.json(tagged(), { status: 201 });
});
