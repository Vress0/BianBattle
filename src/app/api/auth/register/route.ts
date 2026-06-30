import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateRecoveryCode, hashRecoveryCode } from "@/lib/recovery-code";

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "請求格式錯誤。" }, { status: 400 });
  }

  const { username, password } = body as { username?: string; password?: string };

  if (!username || !password) {
    return NextResponse.json({ error: "請填寫用戶名與密碼。" }, { status: 400 });
  }

  const trimmedUsername = username.trim();
  if (!USERNAME_RE.test(trimmedUsername)) {
    return NextResponse.json(
      { error: "用戶名只能使用英文、數字、底線，長度 3～20 字元。" },
      { status: 400 }
    );
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密碼至少需要 6 個字元。" }, { status: 400 });
  }

  const normalizedUsername = trimmedUsername.toLowerCase();
  const internalEmail = `${normalizedUsername}@users.bianbattle.internal`;

  try {
    const admin = createAdminClient();

    // Case-insensitive duplicate check
    const { data: existing } = await admin
      .from("profiles")
      .select("id")
      .ilike("nickname", trimmedUsername)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: "此用戶名已被使用，請選擇其他名稱。" }, { status: 409 });
    }

    // Create auth user via admin (skips email confirmation)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: internalEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nickname: trimmedUsername,
        normalized_username: normalizedUsername,
        auth_type: "username_password",
      },
    });

    if (createErr || !created.user) {
      // Handle duplicate email edge case (race condition)
      if (createErr?.message?.includes("already been registered") || createErr?.status === 422) {
        return NextResponse.json({ error: "此用戶名已被使用，請選擇其他名稱。" }, { status: 409 });
      }
      return NextResponse.json({ error: "帳號建立失敗，請稍後再試。" }, { status: 500 });
    }

    const userId = created.user.id;

    // Ensure profile exists (trigger should have run, but upsert as safety net)
    await admin
      .from("profiles")
      .upsert({ id: userId, nickname: trimmedUsername }, { onConflict: "id", ignoreDuplicates: true });

    // Generate recovery code
    const recoveryCode = generateRecoveryCode();
    const codeHash = hashRecoveryCode(recoveryCode);

    const { error: rcErr } = await admin
      .from("account_recovery_codes")
      .insert({ user_id: userId, code_hash: codeHash });

    if (rcErr) {
      // Don't fail registration; user can generate later
    }

    // Sign in with the new account to set session cookies
    const successResponse = NextResponse.json({ ok: true, recoveryCode });

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
      email: internalEmail,
      password,
    });

    if (signInError) {
      // Account created but auto-login failed; return ok without session
      return NextResponse.json({ ok: true, recoveryCode, autoLoginFailed: true });
    }

    return successResponse;
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試。" }, { status: 500 });
  }
}
