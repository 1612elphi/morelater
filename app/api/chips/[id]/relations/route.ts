import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chips, chipRelations } from "@/lib/db/schema";
import { eq, or } from "drizzle-orm";
import { v4 as uuid } from "uuid";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const chip = db.select().from(chips).where(eq(chips.id, id)).get();
  if (!chip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const relations = db
    .select()
    .from(chipRelations)
    .where(
      or(
        eq(chipRelations.sourceChipId, id),
        eq(chipRelations.targetChipId, id)
      )
    )
    .all();

  // Collect related chip IDs
  const relatedIds = new Set<string>();
  for (const rel of relations) {
    relatedIds.add(rel.sourceChipId);
    relatedIds.add(rel.targetChipId);
  }
  relatedIds.delete(id);

  // Fetch related chip data
  const relatedChips = relatedIds.size > 0
    ? db
        .select({
          id: chips.id,
          title: chips.title,
          status: chips.status,
          colourId: chips.colourId,
        })
        .from(chips)
        .where(
          or(...[...relatedIds].map((rid) => eq(chips.id, rid)))
        )
        .all()
    : [];

  const chipMap = new Map(relatedChips.map((c) => [c.id, c]));

  // Split into "blocks" (this chip blocks others) and "blockedBy" (others block this chip)
  const blocks: Array<{ relationId: string; chip: typeof relatedChips[number] }> = [];
  const blockedBy: Array<{ relationId: string; chip: typeof relatedChips[number] }> = [];

  for (const rel of relations) {
    if (rel.type !== "blocks") continue;
    if (rel.sourceChipId === id) {
      const target = chipMap.get(rel.targetChipId);
      if (target) blocks.push({ relationId: rel.id, chip: target });
    } else {
      const source = chipMap.get(rel.sourceChipId);
      if (source) blockedBy.push({ relationId: rel.id, chip: source });
    }
  }

  return NextResponse.json({ blocks, blockedBy });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { targetChipId, direction } = body;
  // direction: 'blocks' means this chip blocks targetChipId
  //            'blockedBy' means targetChipId blocks this chip

  if (!targetChipId) {
    return NextResponse.json({ error: "targetChipId required" }, { status: 400 });
  }

  if (targetChipId === id) {
    return NextResponse.json({ error: "Cannot relate a chip to itself" }, { status: 400 });
  }

  // Verify both chips exist
  const chip = db.select().from(chips).where(eq(chips.id, id)).get();
  const target = db.select().from(chips).where(eq(chips.id, targetChipId)).get();
  if (!chip || !target) {
    return NextResponse.json({ error: "Chip not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const relationId = uuid();

  const sourceId = direction === "blockedBy" ? targetChipId : id;
  const destId = direction === "blockedBy" ? id : targetChipId;

  db.insert(chipRelations)
    .values({
      id: relationId,
      sourceChipId: sourceId,
      targetChipId: destId,
      type: "blocks",
      createdAt: now,
    })
    .run();

  const created = db
    .select()
    .from(chipRelations)
    .where(eq(chipRelations.id, relationId))
    .get();

  return NextResponse.json(created, { status: 201 });
}
