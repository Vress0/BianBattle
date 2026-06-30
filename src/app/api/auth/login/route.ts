import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GENERIC_ERROR = "用戶名或密碼錯誤，請再試一次。";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { identifier, password } = body as { identifier?: string; password?: string };

  if (!identifier || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  // Resolve email: if identifier has @, treat as email; otherwise look up nickname
  let email: string;

  if (identifier.includes("@")) {
    email = identifier.trim().toLowerCase();
  } else {
    try {
      const admin = createAdminClient();

      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("nickname", identifier.trim())
        .single();

      if (!profile?.id) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
      }

      const { data: userData } = await admin.auth.admin.getUserById(profile.id);

      if (!userData.user?.email) {
        return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
      }

      email = userData.user.email;
    } catch {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 500 });
    }
  }

  // Pre-create the success response so the cookie handler can write to it
  const successResponse = NextResponse.json({ ok: true });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            successResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return successResponse;
}
