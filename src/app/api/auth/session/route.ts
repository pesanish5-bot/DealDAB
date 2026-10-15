import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, userFromSessionToken } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const user = await userFromSessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  return NextResponse.json({ user });
}
