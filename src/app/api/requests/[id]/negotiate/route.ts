import { NextResponse } from "next/server";
import { getRequest, saveNegotiation } from "@/lib/database";
import { runNegotiations } from "@/lib/service";

export const runtime = "nodejs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const lookup = await getRequest(id);
  if (!lookup.request) return NextResponse.json({ error: "Request not found" }, { status: 404 });
  try {
    const result = runNegotiations(lookup.request);
    result.databaseMode = await saveNegotiation(result);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Negotiation run failed" }, { status: 500 });
  }
}
