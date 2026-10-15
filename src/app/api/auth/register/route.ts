import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { registerAccount, registerSchema, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";
import { DatabaseConflictError } from "@/lib/database";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = registerSchema.parse(await request.json());
    const account = await registerAccount(input);
    const response = NextResponse.json({ user: account.user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, account.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid registration." }, { status: 400 });
    if (error instanceof DatabaseConflictError) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error(error);
    return NextResponse.json({ error: "Registration is temporarily unavailable." }, { status: 500 });
  }
}
