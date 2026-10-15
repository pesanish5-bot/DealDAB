import { NextResponse } from "next/server";
import { getDatabaseHealth } from "@/lib/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const database = await getDatabaseHealth();
  return NextResponse.json({ ok: true, database });
}
