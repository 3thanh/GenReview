import "dotenv/config";
import { supabase } from "../lib/supabase.js";
import {
  getConversation,
  replyToConversation,
  conversationPartCount,
  hasAdminReplyAfter,
  type IntercomConversation,
} from "../lib/intercom-client.js";

// ── Types ────────────────────────────────────────────────────────

export interface IntercomState {
  conversation_id: string;
  last_fetched_at: string;
  message_count_at_cache: number;
  conversation_updated_at: number;
  assignee_at_cache: string | null;
  dust_conversation_id: string | null;
}

export type PreflightIssue =
  | { type: "stale"; newMessageCount: number; cachedMessageCount: number }
  | { type: "claimed"; assigneeId: string }
  | { type: "replied"; }
  | { type: "closed"; state: string }
  | { type: "missing_state" };

export interface PreflightResult {
  ok: boolean;
  issues: PreflightIssue[];
  freshConversation: IntercomConversation | null;
}

export interface SendResult {
  success: boolean;
  error?: string;
  preflightIssues?: PreflightIssue[];
}

// ── Preflight ────────────────────────────────────────────────────

export async function preflightCheck(
  contentItemId: string
): Promise<PreflightResult> {
  const { data: item, error } = await supabase
    .from("content_items")
    .select("metadata")
    .eq("id", contentItemId)
    .single();

  if (error || !item) {
    return {
      ok: false,
      issues: [{ type: "missing_state" }],
      freshConversation: null,
    };
  }

  const meta = item.metadata as Record<string, unknown> | null;
  const state = meta?.intercom_state as IntercomState | undefined;

  if (!state?.conversation_id) {
    return {
      ok: false,
      issues: [{ type: "missing_state" }],
      freshConversation: null,
    };
  }

  let freshConvo: IntercomConversation;
  try {
    freshConvo = await getConversation(state.conversation_id);
  } catch (err) {
    return {
      ok: false,
      issues: [{ type: "missing_state" }],
      freshConversation: null,
    };
  }

  const issues: PreflightIssue[] = [];

  if (!freshConvo.open) {
    issues.push({ type: "closed", state: freshConvo.state });
  }

  if (freshConvo.assignee?.id && freshConvo.assignee.id !== "0") {
    const adminId = process.env.INTERCOM_ADMIN_ID?.trim();
    if (freshConvo.assignee.id !== adminId) {
      issues.push({ type: "claimed", assigneeId: freshConvo.assignee.id });
    }
  }

  const freshPartCount = conversationPartCount(freshConvo) + 1;
  if (freshPartCount !== state.message_count_at_cache) {
    issues.push({
      type: "stale",
      newMessageCount: freshPartCount,
      cachedMessageCount: state.message_count_at_cache,
    });
  }

  const cacheTimestamp = Math.floor(
    new Date(state.last_fetched_at).getTime() / 1000
  );
  if (hasAdminReplyAfter(freshConvo, cacheTimestamp)) {
    issues.push({ type: "replied" });
  }

  return {
    ok: issues.length === 0,
    issues,
    freshConversation: freshConvo,
  };
}

// ── Send ─────────────────────────────────────────────────────────

export async function sendApprovedReply(
  contentItemId: string,
  options: {
    messageType?: "comment" | "note";
    forceEvenIfStale?: boolean;
  } = {}
): Promise<SendResult> {
  const messageType = options.messageType ?? "comment";
  const force = options.forceEvenIfStale ?? false;

  // Get the content item
  const { data: item, error: fetchErr } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", contentItemId)
    .single();

  if (fetchErr || !item) {
    return { success: false, error: `Content item not found: ${fetchErr?.message}` };
  }

  if (!item.body_text) {
    return { success: false, error: "No draft reply body to send" };
  }

  const meta = item.metadata as Record<string, unknown> | null;
  const state = meta?.intercom_state as IntercomState | undefined;

  if (!state?.conversation_id) {
    return { success: false, error: "No intercom_state on content item" };
  }

  // Preflight
  const preflight = await preflightCheck(contentItemId);

  if (!preflight.ok && !force) {
    const issueTypes = preflight.issues.map((i) => i.type).join(", ");
    return {
      success: false,
      error: `Preflight failed: ${issueTypes}`,
      preflightIssues: preflight.issues,
    };
  }

  // Send via Intercom API
  try {
    await replyToConversation(
      state.conversation_id,
      item.body_text,
      messageType
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Intercom send failed: ${msg}` };
  }

  // Mark as approved + sent in Supabase
  const now = new Date().toISOString();
  const updatedMeta = {
    ...meta,
    intercom_state: {
      ...state,
      sent_at: now,
      sent_as: messageType,
    },
  };

  await supabase
    .from("content_items")
    .update({
      review_status: "approved" as const,
      reviewed_at: now,
      updated_at: now,
      metadata: updatedMeta as Record<string, unknown>,
    })
    .eq("id", contentItemId);

  return { success: true };
}
