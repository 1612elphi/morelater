import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTags, dayTagTypes } from "@/lib/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const conditions = [];
  if (startDate) conditions.push(gte(dayTags.date, startDate));
  if (endDate) conditions.push(lte(dayTags.date, endDate));

  const rows = db
    .select({
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
    })
    .from(dayTags)
    .innerJoin(dayTagTypes, eq(dayTags.tagTypeId, dayTagTypes.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(dayTags.date, dayTagTypes.sortOrder)
    .all();

  return NextResponse.json(rows);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = uuid();

  db.insert(dayTags)
    .values({
      id,
      date: body.date,
      tagTypeId: body.tagTypeId,
    })
    .run();

  const created = db
    .select({
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
    })
    .from(dayTags)
    .innerJoin(dayTagTypes, eq(dayTags.tagTypeId, dayTagTypes.id))
    .where(eq(dayTags.id, id))
    .get();

  return NextResponse.json(created, { status: 201 });
}
