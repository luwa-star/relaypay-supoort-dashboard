import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!body?.email || !body?.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 }
    );
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: body.email,
    password: body.password,
  });

  if (error) {
    // Surface a consistent message regardless of Supabase's specific error
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 }
    );
  }

  // Supabase sets the auth cookies via the server client's cookie callbacks.
  return NextResponse.json({ ok: true });
}
