import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { demoBusinesses } from "@/lib/demo-data";
import { saveRequest } from "@/lib/database";
import { createRequestDocument } from "@/lib/service";
import { demoRequest, requestInputSchema } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const incoming = await request.json().catch(() => demoRequest);
    const input = requestInputSchema.parse(incoming);
    const created = createRequestDocument(input);
    const databaseMode = await saveRequest(created);
    return NextResponse.json({ request: created, businesses: demoBusinesses, databaseMode }, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid request", issues: error.issues }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not create negotiation request" }, { status: 500 });
  }
}
