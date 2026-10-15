import { NextResponse } from "next/server";
import { getNegotiationBundle, getRequest } from "@/lib/database";
import { demoBusinesses } from "@/lib/demo-data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const bundle = await getNegotiationBundle(id);
  if (bundle.result) return NextResponse.json(bundle.result);
  const requestLookup = await getRequest(id);
  if (!requestLookup.request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  return NextResponse.json({ request: requestLookup.request, businesses: demoBusinesses, databaseMode: requestLookup.mode });
}
