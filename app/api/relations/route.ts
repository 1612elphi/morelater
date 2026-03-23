import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chipRelations } from "@/lib/db/schema";

export async function GET() {
  const relations = db.select().from(chipRelations).all();
  return NextResponse.json(relations);
}
