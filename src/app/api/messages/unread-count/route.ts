import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) return NextResponse.json({ count: 0 });

  const admin = createAdminClient();
  const userId = user.id;

  const { data: convRows } = await admin
    .from("direct_conversations")
    .select("id")
    .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);

  if (!convRows || convRows.length === 0) {
    return NextResponse.json({ count: 0 });
  }

  const convIds = convRows.map((c) => c.id as string);

  const [{ data: readRecords }, { data: unreadMessages }] = await Promise.all([
    admin
      .from("direct_conversation_reads")
      .select("conversation_id, last_read_at")
      .eq("user_id", userId)
      .in("conversation_id", convIds),
    admin
      .from("direct_messages")
      .select("conversation_id, created_at")
      .in("conversation_id", convIds)
      .neq("sender_id", userId)
      .is("deleted_at", null),
  ]);

  const readMap: Record<string, string | null> = {};
  for (const r of readRecords ?? []) {
    readMap[r.conversation_id as string] = r.last_read_at as string | null;
  }

  let count = 0;
  for (const msg of unreadMessages ?? []) {
    const cid = msg.conversation_id as string;
    const lastRead = readMap[cid];
    const createdAt = msg.created_at as string;
    if (!lastRead || createdAt > lastRead) {
      count++;
    }
  }

  return NextResponse.json({ count });
}
