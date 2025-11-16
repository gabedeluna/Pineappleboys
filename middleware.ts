import { NextResponse } from "next/server";

// Middleware disabled; allow everything through to stop 500s.
export async function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
