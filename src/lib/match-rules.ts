export const GRACE_PERIOD_SECONDS = 15;
export const AFK_FORFEIT_SECONDS = 90;

/** Server-side check — uses server time, never trust client */
export function isInGracePeriod(startedAt: string | null): boolean {
  if (!startedAt) return true;
  const elapsedMs = Date.now() - new Date(startedAt).getTime();
  return elapsedMs < GRACE_PERIOD_SECONDS * 1000;
}

export function opposedSide(side: "pro" | "con"): "pro" | "con" {
  return side === "pro" ? "con" : "pro";
}
