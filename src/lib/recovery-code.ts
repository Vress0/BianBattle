import { createHash, randomBytes, timingSafeEqual } from "crypto";

const PREFIX = "BB";
const SEGMENT_LENGTH = 4;
const SEGMENT_COUNT = 4;
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O, 0, I, 1 to avoid confusion

export function generateRecoveryCode(): string {
  const segments: string[] = [];
  for (let s = 0; s < SEGMENT_COUNT; s++) {
    const bytes = randomBytes(SEGMENT_LENGTH);
    let seg = "";
    for (let i = 0; i < SEGMENT_LENGTH; i++) {
      seg += CHARS[bytes[i] % CHARS.length];
    }
    segments.push(seg);
  }
  return `${PREFIX}-${segments.join("-")}`;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(normalizeCode(code)).digest("hex");
}

export function verifyRecoveryCode(inputCode: string, storedHash: string): boolean {
  const inputHash = hashRecoveryCode(inputCode);
  try {
    return timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(storedHash, "hex"));
  } catch {
    return false;
  }
}
