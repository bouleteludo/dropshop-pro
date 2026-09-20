import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!email || !message) return NextResponse.json({ error: "Email et message requis." }, { status: 400 });
  // No email provider is assumed here: keep the form deployable without another integration.
  return NextResponse.json({ ok: true });
}