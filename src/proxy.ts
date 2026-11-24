import { NextResponse, type NextRequest } from "next/server";

import { nextAuth } from "@/lib/serverAuth";

const refresh = nextAuth?.convexAuthNextjsProxy();

export function proxy(request: NextRequest) {
  if (!refresh) return NextResponse.next();
  return refresh(request);
}

export const config = {
  matcher: ["/((?!auth|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
