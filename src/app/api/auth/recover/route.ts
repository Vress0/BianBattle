import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  generateRecoveryCode,
  hashRecoveryCode,
  verifyRecoveryCode,
} from "@/lib/recovery-code";

const GENERIC_ERROR = "用戶名或恢復代碼錯誤，請再試一次。";
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
const RECOVERY_CODE_RE = /^BB(-[A-Z0-9]{4}){4}$/i;

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const { username, recoveryCode, newPassword } = body as {
    username?: string;
    recoveryCode?: string;
    newPassword?: string;
  };

  if (!username || !recoveryCode || !newPassword) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 });
  }

  const trimmedUsername = username.trim();
  if (!USERNAME_RE.test(trimmedUsername)) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (!RECOVERY_CODE_RE.test(recoveryCode.trim())) {
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
  }

  if (newPassword.length < 6) {
    return NextResponse.json({ error: "新密碼至少需要 6 個字元。" }, { status: 400 });
  }

  const normalizedUsername = trimmedUsername.toLowerCase();

  try {
    const admin = createAdminClient();

    // Lookup user by nickname (case-insensitive)
    const { data: profile } = await admin
      .from("profiles")
      .select("id")
      .ilike("nickname", normalizedUsername)
      .maybeSingle();

    if (!profile?.id) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    const userId = profile.id;

    // Fetch active recovery code for this user
    const { data: rcRow } = await admin
      .from("account_recovery_codes")
      .select("id, code_hash")
      .eq("user_id", userId)
      .is("used_at", null)
      .is("replaced_at", null)
      .maybeSingle();

    if (!rcRow) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // Verify recovery code in constant time
    const valid = verifyRecoveryCode(recoveryCode.trim(), rcRow.code_hash);
    if (!valid) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 401 });
    }

    // Update password
    const { error: updateErr } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword,
    });

    if (updateErr) {
      return NextResponse.json({ error: "密碼重設失敗，請稍後再試。" }, { status: 500 });
    }

    // Invalidate old recovery code
    await admin
      .from("account_recovery_codes")
      .update({ replaced_at: new Date().toISOString() })
      .eq("id", rcRow.id);

    // Generate new recovery code
    const newCode = generateRecoveryCode();
    const newHash = hashRecoveryCode(newCode);

    await admin.from("account_recovery_codes").insert({ user_id: userId, code_hash: newHash });

    return NextResponse.json({ ok: true, recoveryCode: newCode });
  } catch {
    return NextResponse.json({ error: "伺服器錯誤，請稍後再試。" }, { status: 500 });
  }
}
