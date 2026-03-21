import "dotenv/config";
import { supabase } from "../lib/supabase.js";
import {
  listUnassignedConversations,
  getConversation,
  formatConversationAsText,
  conversationPartCount,
  type IntercomConversation,
} from "../lib/intercom-client.js";
import { generateDustReply } from "../lib/dust-client.js";
import type { ContentItemInsert } from "../types/database.js";

const POLL_INTERVAL_MS = 45_000; // 45 seconds
const MAX_CACHED_DRAFTS = 10;
const CONVERSATIONS_PER_PAGE = 20;

interface IntercomState {
  conversation_id: string;
  last_fetched_at: string;
  message_count_at_cache: number;
  conversation_updated_at: number;
  assignee_at_cache: string | null;
  dust_conversation_id: string | null;
}

async function getPendingIntercomDraftCount(): Promise<number> {
  const { count, error } = await supabase
    .from("content_items")
    .select("*", { count: "exact", head: true })
    .eq("content_type", "support")
    .eq("channel", "intercom")
    .eq("review_status", "pending");

  if (error) {
    console.error("Failed to count pending drafts:", error.message);
    return MAX_CACHED_DRAFTS; // assume full to be safe
  }
  return count ?? 0;
}

async function getExistingDraftsByConversationId(): Promise<
  Map<string, { id: string; intercomState: IntercomState }>
> {
  const { data, error } = await supabase
    .from("content_items")
    .select("id, metadata")
    .eq("content_type", "support")
    .eq("channel", "intercom")
    .eq("review_status", "pending");

  if (error) {
    console.error("Failed to fetch existing drafts:", error.message);
    return new Map();
  }

  const map = new Map<string, { id: string; intercomState: IntercomState }>();
  for (const row of data ?? []) {
    const meta = row.metadata as Record<string, unknown> | null;
    const state = meta?.intercom_state as IntercomState | undefined;
    if (state?.conversation_id) {
      map.set(state.conversation_id, { id: row.id, intercomState: state });
    }
  }
  return map;
}

function buildConversationMetadata(
  convo: IntercomConversation,
  dustConversationId: string | null
): { conversation: Record<string, unknown>; intercom_state: IntercomState } {
  const contact = convo.contacts?.contacts?.[0] ?? convo.source?.author;
  const parts = convo.conversation_parts?.conversation_parts ?? [];

  const messages = [];

  if (convo.source?.body) {
    messages.push({
      role: "customer",
      text: stripHtml(convo.source.body),
      timestamp: new Date(convo.created_at * 1000).toISOString(),
      sender_name: contact?.name ?? "Customer",
    });
  }

  for (const part of parts) {
    if (!part.body) continue;
    const isCustomer = part.author.type === "user" || part.author.type === "lead";
    const isBot = part.author.type === "bot";
    messages.push({
      role: isCustomer ? "customer" : isBot ? "bot" : "agent",
      text: stripHtml(part.body),
      timestamp: new Date(part.created_at * 1000).toISOString(),
      sender_name: part.author.name ?? (isCustomer ? "Customer" : isBot ? "Fin AI" : "Agent"),
      status: part.part_type === "comment" ? "sent" : part.part_type,
    });
  }

  return {
    conversation: {
      id: convo.id,
      channel: "intercom",
      ticket_ref: convo.id,
      customer: {
        name: contact?.name ?? "Unknown",
        email: contact?.email ?? undefined,
      },
      messages,
    },
    intercom_state: {
      conversation_id: convo.id,
      last_fetched_at: new Date().toISOString(),
      message_count_at_cache: conversationPartCount(convo) + 1, // +1 for source
      conversation_updated_at: convo.updated_at,
      assignee_at_cache: convo.assignee?.id ?? null,
      dust_conversation_id: dustConversationId,
    },
  };
}

async function processConversation(
  convo: IntercomConversation,
  existingDraftId?: string
): Promise<void> {
  const fullConvo = await getConversation(convo.id);
  const ticketText = formatConversationAsText(fullConvo);

  if (ticketText.length < 20) {
    console.log(`  Skipping ${convo.id}: ticket text too short`);
    return;
  }

  console.log(`  Generating Dust draft for conversation ${convo.id}...`);
  let dustReply;
  try {
    dustReply = await generateDustReply(ticketText);
  } catch (err) {
    console.error(`  Dust failed for ${convo.id}:`, err);

    if (existingDraftId) {
      await supabase
        .from("content_items")
        .update({
          generation_status: "failed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingDraftId);
    }
    return;
  }

  const contact =
    fullConvo.contacts?.contacts?.[0] ?? fullConvo.source?.author;
  const customerName = contact?.name ?? "Customer";
  const title =
    fullConvo.title ?? `Conversation with ${customerName}`;

  const metadata = buildConversationMetadata(
    fullConvo,
    dustReply.dustConversationId
  );

  if (existingDraftId) {
    console.log(`  Updating existing draft ${existingDraftId} (conversation changed)`);
    const { error } = await supabase
      .from("content_items")
      .update({
        title,
        body_text: dustReply.reply,
        source_ref: convo.id,
        metadata: metadata as unknown as Record<string, unknown>,
        generation_status: "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingDraftId);

    if (error) console.error(`  Failed to update draft:`, error.message);
    else console.log(`  Draft updated for ${convo.id}`);
  } else {
    const item: ContentItemInsert = {
      title,
      body_text: dustReply.reply,
      content_type: "support",
      channel: "intercom",
      review_mode: "support",
      source_type: "api",
      source_ref: convo.id,
      review_status: "pending",
      generation_status: "completed",
      metadata: metadata as unknown as Record<string, unknown>,
    };

    const { error } = await supabase.from("content_items").insert(item);
    if (error) console.error(`  Failed to insert draft:`, error.message);
    else console.log(`  New draft cached for ${convo.id}`);
  }
}

async function pollOnce(): Promise<void> {
  const pendingCount = await getPendingIntercomDraftCount();
  const slotsAvailable = MAX_CACHED_DRAFTS - pendingCount;

  if (slotsAvailable <= 0) {
    console.log(
      `Cache full (${pendingCount}/${MAX_CACHED_DRAFTS} pending drafts). Checking for stale drafts only.`
    );
  } else {
    console.log(
      `${pendingCount}/${MAX_CACHED_DRAFTS} cached. ${slotsAvailable} slots available.`
    );
  }

  const existingDrafts = await getExistingDraftsByConversationId();

  // Check for stale drafts that need refreshing
  for (const [convoId, draft] of existingDrafts) {
    try {
      const freshConvo = await getConversation(convoId);
      const freshPartCount = conversationPartCount(freshConvo) + 1;

      if (
        freshConvo.updated_at !== draft.intercomState.conversation_updated_at ||
        freshPartCount !== draft.intercomState.message_count_at_cache
      ) {
        console.log(`  Conversation ${convoId} changed since cache — refreshing`);
        await processConversation(freshConvo, draft.id);
      }

      if (!freshConvo.open || freshConvo.assignee?.id) {
        console.log(
          `  Conversation ${convoId} is now ${freshConvo.open ? "assigned" : "closed"} — removing draft`
        );
        await supabase
          .from("content_items")
          .update({
            review_status: "rejected",
            review_note: freshConvo.open
              ? "Conversation was assigned to another agent"
              : "Conversation was closed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", draft.id);
      }
    } catch (err) {
      console.error(`  Failed to check staleness for ${convoId}:`, err);
    }
  }

  if (slotsAvailable <= 0) return;

  // Fetch new unassigned conversations
  let page;
  try {
    page = await listUnassignedConversations(CONVERSATIONS_PER_PAGE);
  } catch (err) {
    console.error("Failed to list conversations:", err);
    return;
  }

  let processed = 0;
  for (const convo of page.conversations) {
    if (processed >= slotsAvailable) break;
    if (existingDrafts.has(convo.id)) continue; // already have a draft

    try {
      await processConversation(convo);
      processed++;
    } catch (err) {
      console.error(`  Failed to process conversation ${convo.id}:`, err);
    }
  }

  console.log(`Poll complete: ${processed} new drafts created\n`);
}

async function main(): Promise<void> {
  console.log("Intercom ticket worker starting...");
  console.log(
    `Polling every ${POLL_INTERVAL_MS / 1000}s for unassigned conversations`
  );
  console.log(`Max cached drafts: ${MAX_CACHED_DRAFTS}\n`);

  // Run immediately, then on interval
  await pollOnce();
  setInterval(pollOnce, POLL_INTERVAL_MS);
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

main().catch((err) => {
  console.error("Intercom worker fatal error:", err);
  process.exit(1);
});
