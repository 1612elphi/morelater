import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chipColours } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET() {
  const colours = db
    .select()
    .from(chipColours)
    .where(eq(chipColours.isActive, true))
    .orderBy(chipColours.sortOrder)
    .all();
  return NextResponse.json(colours);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const id = uuid();

  db.insert(chipColours)
    .values({
      id,
      name: body.name,
      hex: body.hex,
      icon: body.icon ?? null,
      sortOrder: body.sortOrder ?? 0,
      isActive: true,
    })
    .run();

  const created = db
    .select()
    .from(chipColours)
    .where(eq(chipColours.id, id))
    .get();
  return NextResponse.json(created, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  if (!body.id)
    return NextResponse.json({ error: "id required" }, { status: 400 });

  db.update(chipColours)
    .set({
      ...(body.name !== undefined && { name: body.name }),
      ...(body.hex !== undefined && { hex: body.hex }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    })
    .where(eq(chipColours.id, body.id))
    .run();

  const updated = db
    .select()
    .from(chipColours)
    .where(eq(chipColours.id, body.id))
    .get();
  return NextResponse.json(updated);
}
