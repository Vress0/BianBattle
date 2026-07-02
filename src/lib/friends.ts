export type FriendRequestStatus = "pending" | "accepted" | "rejected" | "cancelled";
export type FriendshipState = "self" | "none" | "pending_sent" | "pending_received" | "friends";

export interface FriendRequestRow {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: FriendRequestStatus;
}

/**
 * Compute the friendship state between currentUser and target given the DB row.
 * Safe to call with null/undefined row (returns "none").
 */
export function getFriendshipState(
  currentUserId: string,
  targetUserId: string,
  row: FriendRequestRow | null | undefined
): FriendshipState {
  if (currentUserId === targetUserId) return "self";
  if (!row) return "none";
  if (row.status === "accepted") return "friends";
  if (row.status === "pending") {
    return row.requester_id === currentUserId ? "pending_sent" : "pending_received";
  }
  // rejected or cancelled → effectively no relationship
  return "none";
}

export function getFriendshipLabel(state: FriendshipState): string {
  switch (state) {
    case "self":
      return "這是你";
    case "none":
      return "非好友";
    case "pending_sent":
      return "邀請已送出";
    case "pending_received":
      return "收到好友邀請";
    case "friends":
      return "好友";
  }
}

export function getFriendshipButtonText(state: FriendshipState): string {
  switch (state) {
    case "self":
      return "";
    case "none":
      return "加好友";
    case "pending_sent":
      return "已送出邀請";
    case "pending_received":
      return "接受好友";
    case "friends":
      return "好友";
  }
}
