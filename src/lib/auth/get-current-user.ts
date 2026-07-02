import type { SupabaseClient, User } from "@supabase/supabase-js";

/**
 * Safe wrapper around supabase.auth.getUser().
 *
 * Returns the authenticated User, or null if:
 * - No active session exists
 * - The refresh token is invalid / already used / not found
 * - Any other auth error occurs
 *
 * Never throws — safe to call in server components and middleware.
 */
export async function getCurrentUserSafe(
  supabase: SupabaseClient
): Promise<User | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) return null;
    return user;
  } catch {
    return null;
  }
}
