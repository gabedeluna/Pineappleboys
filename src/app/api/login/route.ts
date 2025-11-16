import { NextResponse } from "next/server";
import { createSessionToken } from "@/lib/auth";

const SESSION_COOKIE = "pb_session";
const DAY = 60 * 60 * 24;

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  const sessionSecret = process.env.SESSION_SECRET;

  if (!adminUser || !adminPass || !sessionSecret) {
    return NextResponse.json(
      { error: "Server auth is not configured." },
      { status: 500 },
    );
  }

  if (username !== adminUser || password !== adminPass) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }

  const token = await createSessionToken(username, sessionSecret, DAY * 7);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DAY * 7,
  });
  return res;
}
