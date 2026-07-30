import type { ConversationDatasetSnapshot } from "@latticework/contracts";

import { canonicalNativeStructuredCloneValue } from "./native-value.ts";

function hex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

/**
 * This stays only in the local migration journal. The digest is not returned
 * to callers or copied into any transfer/export receipt.
 */
export async function syntheticSourceVerificationIdentity(snapshot: ConversationDatasetSnapshot): Promise<string> {
  const canonical = await canonicalNativeStructuredCloneValue(snapshot);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(canonical));
  return `synthetic-v3:${hex(new Uint8Array(digest))}`;
}
