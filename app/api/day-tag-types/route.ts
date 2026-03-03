import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dayTagTypes } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET() {
  const result = db
    .select()
    .from(dayTagTypes)
    .orderBy(dayTagTypes.sortOrder)
    .all();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = uuid();

  db.insert(dayTagTypes)
    .values({
      id,
      name: body.name,
      icon: body.icon,
      colour: body.colour ?? null,
      sortOrder: body.sortOrder ?? 0,
    })
    .run();

  const created = db
    .select()
    .from(dayTagTypes)
    .where(eq(dayTagTypes.id, id))
    .get();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { id, ...updates } = body;

  const existing = db
    .select()
    .from(dayTagTypes)
    .where(eq(dayTagTypes.id, id))
    .get();
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(dayTagTypes).set(updates).where(eq(dayTagTypes.id, id)).run();

  const updated = db
    .select()
    .from(dayTagTypes)
    .where(eq(dayTagTypes.id, id))
    .get();
  return NextResponse.json(updated);
}
