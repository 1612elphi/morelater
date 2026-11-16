import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chips } from "@/lib/db/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { badLink, chipCreate, handle } from "@/lib/api";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const status = searchParams.get("status");
  const unscheduled = searchParams.get("unscheduled");

  const conditions = [];

  if (unscheduled === "true") {
    conditions.push(isNull(chips.date));
  } else {
    if (startDate) conditions.push(gte(chips.date, startDate));
    if (endDate) conditions.push(lte(chips.date, endDate));
  }
  if (status) conditions.push(eq(chips.status, status));

  const result = db
    .select()
    .from(chips)
    .where(and(...conditions))
    .orderBy(chips.date, chips.sortOrder)
    .all();

  return NextResponse.json(result);
}

export const POST = handle(async (request: NextRequest) => {
  const body = chipCreate.parse(await request.json());
  if (body.linkedChipId && !db.select({ id: chips.id }).from(chips).where(eq(chips.id, body.linkedChipId)).get())
    return badLink();
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.insert(chips)
    .values({ ...body, id, calendarUid: null, createdAt: now, updatedAt: now })
    .run();
  const created = db.select().from(chips).where(eq(chips.id, id)).get();
  return NextResponse.json(created, { status: 201 });
});
