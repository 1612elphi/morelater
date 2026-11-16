import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chipRelations } from "@/lib/db/schema";
import { and, eq, or } from "drizzle-orm";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; relationId: string }> }
) {
  const { id, relationId } = await params;

  const existing = db
    .select()
    .from(chipRelations)
    .where(
      and(
        eq(chipRelations.id, relationId),
        or(eq(chipRelations.sourceChipId, id), eq(chipRelations.targetChipId, id))
      )
    )
    .get();

  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  db.delete(chipRelations).where(eq(chipRelations.id, relationId)).run();
  return NextResponse.json({ ok: true });
}
