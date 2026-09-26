import { NextRequest, NextResponse } from "next/server";

export function isAdminRequest(req: NextRequest) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return false;

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

export function requireAdmin(req: NextRequest) {
  if (isAdminRequest(req)) return null;
  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD is not configured" }, { status: 503 });
  }
  return NextResponse.json({ error: "Authentification requise" }, { status: 401 });
}
