import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chipRelations, chips } from "@/lib/db/schema";
import { eq, getTableColumns } from "drizzle-orm";

// sourceStatus lets the calendar tell whether a blocker outside the visible month is done
export async function GET() {
  const relations = db
    .select({ ...getTableColumns(chipRelations), sourceStatus: chips.status })
    .from(chipRelations)
    .innerJoin(chips, eq(chips.id, chipRelations.sourceChipId))
    .all();
  return NextResponse.json(relations);
}
