import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chips } from "@/lib/db/schema";
import { eq, and, gte, lte, isNull } from "drizzle-orm";
import { v4 as uuid } from "uuid";

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

  const result =
    conditions.length > 0
      ? db
          .select()
          .from(chips)
          .where(and(...conditions))
          .orderBy(chips.date, chips.sortOrder)
          .all()
      : db.select().from(chips).orderBy(chips.date, chips.sortOrder).all();

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const now = new Date().toISOString();
  const id = uuid();

  const newChip = {
    id,
    title: body.title,
    date: body.date ?? null,
    time: body.time ?? null,
    durationMinutes: body.durationMinutes ?? null,
    colourId: body.colourId ?? null,
    status: body.status ?? "obskur",
    modifier: body.modifier ?? null,
    isShoot: body.isShoot ?? false,
    linkedChipId: body.linkedChipId ?? null,
    sortOrder: body.sortOrder ?? 0,
    body: body.body ?? null,
    starred: body.starred ?? false,
    series: body.series ?? null,
    seriesNumber: body.seriesNumber ?? null,
    calendarUid: null,
    createdAt: now,
    updatedAt: now,
  };

  db.insert(chips).values(newChip).run();
  const created = db.select().from(chips).where(eq(chips.id, id)).get();
  return NextResponse.json(created, { status: 201 });
}
