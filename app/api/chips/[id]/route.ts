import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const chip = db.select().from(chips).where(eq(chips.id, id)).get();
  if (!chip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(chip);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const now = new Date().toISOString();

  const existing = db.select().from(chips).where(eq(chips.id, id)).get();
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.update(chips)
    .set({ ...body, updatedAt: now })
    .where(eq(chips.id, id))
    .run();

  const updated = db.select().from(chips).where(eq(chips.id, id)).get();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const existing = db.select().from(chips).where(eq(chips.id, id)).get();
  if (!existing)
    return NextResponse.json({ error: "Not found" }, { status: 404 });

  db.delete(chips).where(eq(chips.id, id)).run();
  return NextResponse.json({ ok: true });
}
