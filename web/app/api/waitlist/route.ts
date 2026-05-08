import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const email = body?.email as string | undefined;

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // TODO: persist to DB or send to mailing list provider
  // TODO(faza-2): replace console.log with Resend integration
  console.log("[waitlist]", email);

  return NextResponse.json({ ok: true });
}
