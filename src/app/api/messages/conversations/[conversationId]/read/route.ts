import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  const { conversationId } = await params;

  if (!UUID_RE.test(conversationId)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = createAdminClient();

  const { data: conv } = await admin
    .from("direct_conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) return NextResponse.json({ ok: false }, { status: 404 });
  if ((conv.user_one_id as string) !== user.id && (conv.user_two_id as string) !== user.id) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  await admin
    .from("direct_conversation_reads")
    .upsert(
      { conversation_id: conversationId, user_id: user.id, last_read_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" }
    );

  return NextResponse.json({ ok: true });
}
