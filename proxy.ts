import { NextRequest, NextResponse } from "next/server";

export const config = {
  matcher: ["/admin/:path*"],
};

function authenticated(req: NextRequest, password: string) {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const [scheme, encoded] = auth.split(" ", 2);
  if (scheme !== "Basic" || !encoded) return false;
  try {
    const decoded = atob(encoded);
    const separator = decoded.indexOf(":");
    const suppliedPassword = separator >= 0 ? decoded.slice(separator + 1) : decoded;
    return suppliedPassword === password;
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("ADMIN_PASSWORD is not set — /admin is locked until it's configured.", { status: 503 });
  }
  if (authenticated(req, password)) {
    const response = NextResponse.next();
    response.headers.set("Cache-Control", "private, no-store, max-age=0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet");
    return response;
  }
  return new NextResponse("Authentification requise", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Boo Shop admin", charset="UTF-8"',
      "X-Robots-Tag": "noindex, nofollow, noarchive, nosnippet",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
