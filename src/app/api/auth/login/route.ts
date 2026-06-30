import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const GENERIC_ERROR = "用戶名或密碼錯誤，請再試一次。";
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const trimmedUsername = username.trim();
  if (!USERNAME_RE.test(trimmedUsername)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  const normalizedUsername = trimmedUsername.toLowerCase();

  let email: string;
  try {
    const admin = createAdminClient();

    // Case-insensitive lookup by nickname
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("nickname", normalizedUsername)
      .maybeSingle();

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

  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  return successResponse;
}
