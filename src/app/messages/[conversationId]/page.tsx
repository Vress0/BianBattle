import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUserSafe } from "@/lib/auth/get-current-user";
import MessageThread from "@/components/messages/MessageThread";

interface PageProps {
  params: Promise<{ conversationId: string }>;
}

export default async function ConversationPage({ params }: PageProps) {
  const { conversationId } = await params;

  const supabase = await createClient();
  const user = await getCurrentUserSafe(supabase);
  if (!user) redirect(`/auth/login?redirectTo=/messages/${conversationId}`);

  const admin = createAdminClient();

  const { data: conv } = await admin
    .from("direct_conversations")
    .select("id, user_one_id, user_two_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (
    !conv ||
    ((conv.user_one_id as string) !== user.id && (conv.user_two_id as string) !== user.id)
  ) {
    redirect("/messages");
  }

  const otherId =
    (conv.user_one_id as string) === user.id
      ? (conv.user_two_id as string)
      : (conv.user_one_id as string);

  const { data: otherProfile } = await admin
    .from("profiles")
    .select("id, nickname, avatar_url")
    .eq("id", otherId)
    .single();

  return (
    <MessageThread
      conversationId={conversationId}
      currentUserId={user.id}
      otherUser={{
        id: otherId,
        nickname: (otherProfile?.nickname as string | null) ?? null,
        avatar_url: (otherProfile?.avatar_url as string | null) ?? null,
      }}
    />
  );
}
