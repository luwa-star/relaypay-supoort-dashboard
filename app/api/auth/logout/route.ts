import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  // Supabase clears the auth cookies via the cookie callbacks.
  return NextResponse.json({ ok: true });
}
