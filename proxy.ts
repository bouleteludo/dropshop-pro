import { NextRequest, NextResponse } from "next/server";

// /api/checkout and /api/webhooks/stripe are deliberately excluded — customers
// and Stripe itself must be able to reach them without admin credentials.
// Everything else here has no auth check of its own (delete/edit product,
// change order status, import from CJ, scrape a product URL), so gating
// /admin alone still leaves them directly callable by anyone who finds the
// endpoint (e.g. by reading the admin page's client bundle).
export const config = {
  matcher: ["/admin/:path*", "/api/products/:path*", "/api/orders/:path*", "/api/cj/:path*"],
};

export function proxy(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    return new NextResponse("ADMIN_PASSWORD is not set — /admin is locked until it's configured.", { status: 503 });
  }

  const auth = req.headers.get("authorization");
  if (auth) {
    const [scheme, encoded] = auth.split(" ");
    if (scheme === "Basic" && encoded) {
      const [, suppliedPassword] = atob(encoded).split(":");
      if (suppliedPassword === password) {
        return NextResponse.next();
      }
    }
  }

  return new NextResponse("Authentification requise", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Boo Shop admin"' },
  });
}
