import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { loginAccount, loginSchema, SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const input = loginSchema.parse(await request.json());
    const account = await loginAccount(input);
    if (!account) return NextResponse.json({ error: "Email or password is incorrect." }, { status: 401 });
    const response = NextResponse.json({ user: account.user });
    response.cookies.set(SESSION_COOKIE, account.token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE_SECONDS,
    });
    return response;
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid login." }, { status: 400 });
    console.error(error);
    return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 500 });
  }
}
