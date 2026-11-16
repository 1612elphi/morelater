import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chips } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { badLink, chipPatch, handle, notFound } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const chip = db.select().from(chips).where(eq(chips.id, id)).get();
  return chip ? NextResponse.json(chip) : notFound();
}

export const PATCH = handle(async (request: NextRequest, { params }: Ctx) => {
  const { id } = await params;
  const body = chipPatch.parse(await request.json());
  if (body.linkedChipId === id)
    return NextResponse.json({ error: "Cannot link a chip to itself" }, { status: 400 });
  if (body.linkedChipId && !db.select({ id: chips.id }).from(chips).where(eq(chips.id, body.linkedChipId)).get())
    return badLink();

  const result = db
    .update(chips)
    .set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(chips.id, id))
    .run();
  if (result.changes === 0) return notFound();

  return NextResponse.json(db.select().from(chips).where(eq(chips.id, id)).get());
});

export async function DELETE(_request: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const changes = db.transaction((tx) => {
    // nothing else clears follow-ups pointing here (no foreign key on linked_chip_id)
    tx.update(chips).set({ linkedChipId: null }).where(eq(chips.linkedChipId, id)).run();
    return tx.delete(chips).where(eq(chips.id, id)).run().changes;
  });
  return changes ? NextResponse.json({ ok: true }) : notFound();
}
