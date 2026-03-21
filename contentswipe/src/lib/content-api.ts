import { supabase } from "./supabase.js";
import type {
  Json,
  ContentItem,
  ContentItemInsert,
  ReviewStatus,
  ContentType,
  FeedOptions,
  FeedPage,
  CardWithRelations,
  FeedStats,
  FeedChangeEvent,
  GenerationJob,
  Session,
  SessionInsert,
  ReviewEventInsert,
} from "../types/database.js";


const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// ── Session management ──────────────────────────────────────────

export async function createSession(params: {
  businessId: string;
  name: string;
}): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      business_id: params.businessId,
      name: params.name,
    } satisfies SessionInsert)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to create session: ${error?.message}`);
  return data;
}

export async function listSessions(businessId?: string): Promise<Session[]> {
  let query = supabase
    .from("sessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  return data ?? [];
}

export async function getSession(id: string): Promise<Session | null> {
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

// ── Feed fetching ───────────────────────────────────────────────

export async function fetchFeed(options: FeedOptions = {}): Promise<FeedPage> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  let countQuery = supabase
    .from("content_items")
    .select("*", { count: "exact", head: true })
    .eq("review_status", "pending");

  let query = supabase
    .from("content_items")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (options.businessId) {
    query = query.eq("business_id", options.businessId);
    countQuery = countQuery.eq("business_id", options.businessId);
  }

  if (options.sessionId) {
    query = query.eq("session_id", options.sessionId);
    countQuery = countQuery.eq("session_id", options.sessionId);
  }

  if (options.contentType) {
    query = query.eq("content_type", options.contentType);
    countQuery = countQuery.eq("content_type", options.contentType);
  }

  if (options.cursor) {
    query = query.gt("created_at", options.cursor);
  }

  if (options.excludeIds?.length) {
    query = query.not("id", "in", `(${options.excludeIds.join(",")})`);
  }

  const [{ data, error }, { count }] = await Promise.all([query, countQuery]);

  if (error) throw new Error(`Failed to fetch feed: ${error.message}`);

  const cards = data ?? [];
  const lastCard = cards[cards.length - 1];
  const hasMore = cards.length === limit;

  return {
    cards,
    nextCursor: hasMore && lastCard ? lastCard.created_at : null,
    hasMore,
    total: count ?? 0,
  };
}

export async function fetchPendingCards(
  businessId?: string
): Promise<ContentItem[]> {
  let query = supabase
    .from("content_items")
    .select("*")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch cards: ${error.message}`);
  return data ?? [];
}

export async function fetchCardById(id: string): Promise<CardWithRelations> {
  const { data: card, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !card) {
    throw new Error(`Card not found: ${error?.message ?? id}`);
  }

  const [variants, parent, variantOf, job] = await Promise.all([
    fetchCardVariants(id),
    card.parent_id ? fetchCardRaw(card.parent_id) : null,
    card.variant_of ? fetchCardRaw(card.variant_of) : null,
    fetchLatestJob(id),
  ]);

  return { ...card, variants, parent, variantOf, generationJob: job };
}

async function fetchCardRaw(id: string): Promise<ContentItem | null> {
  const { data } = await supabase
    .from("content_items")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function fetchCardVariants(id: string): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("variant_of", id)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch variants: ${error.message}`);
  return data ?? [];
}

export async function fetchCardAncestors(
  id: string,
  maxDepth = 10
): Promise<ContentItem[]> {
  const ancestors: ContentItem[] = [];
  let currentId: string | null = id;
  let depth = 0;

  while (currentId && depth < maxDepth) {
    const row = await fetchCardRaw(currentId);
    if (!row) break;
    if (row.id !== id) ancestors.push(row);
    currentId = row.parent_id;
    depth++;
  }

  return ancestors;
}

async function fetchLatestJob(
  contentItemId: string
): Promise<GenerationJob | null> {
  const { data } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("content_item_id", contentItemId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

// ── Swipe actions ───────────────────────────────────────────────

export async function approveCard(id: string): Promise<ContentItem> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      review_status: "approved" as ReviewStatus,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to approve: ${error?.message}`);
  return data;
}

export async function rejectCard(
  id: string,
  reviewNote?: string
): Promise<ContentItem> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      review_status: "rejected" as ReviewStatus,
      review_note: reviewNote ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to reject: ${error?.message}`);
  return data;
}

export async function requestVariant(
  id: string,
  reviewNote: string
): Promise<ContentItem> {
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      review_status: "needs_edit" as ReviewStatus,
      review_note: reviewNote,
      reviewed_at: now,
      updated_at: now,
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to request variant: ${error?.message}`);
  }
  return data;
}

export async function starCard(id: string): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_items")
    .update({
      starred: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to star: ${error?.message}`);
  return data;
}

export async function unstarCard(id: string): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_items")
    .update({
      starred: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to unstar: ${error?.message}`);
  return data;
}

export async function undoAction(id: string): Promise<ContentItem> {
  const { data: card, error: fetchErr } = await supabase
    .from("content_items")
    .select("review_status")
    .eq("id", id)
    .single();

  if (fetchErr || !card) {
    throw new Error(`Card not found for undo: ${fetchErr?.message}`);
  }
  if (card.review_status === "pending") {
    throw new Error("Card is already pending — nothing to undo");
  }

  const { data, error } = await supabase
    .from("content_items")
    .update({
      review_status: "pending" as ReviewStatus,
      review_note: null,
      reviewed_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Undo failed: ${error?.message}`);
  return data;
}

// ── Review events ───────────────────────────────────────────────

export async function logReviewEvent(params: {
  contentItemId: string;
  action: string;
  note?: string;
  actorId?: string;
}): Promise<void> {
  await supabase.from("review_events").insert({
    content_item_id: params.contentItemId,
    action: params.action,
    note: params.note ?? null,
    actor_id: params.actorId ?? null,
  } satisfies ReviewEventInsert);
}

// ── Batch operations ────────────────────────────────────────────

export async function batchApprove(ids: string[]): Promise<number> {
  if (!ids.length) return 0;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      review_status: "approved" as ReviewStatus,
      reviewed_at: now,
      updated_at: now,
    })
    .in("id", ids)
    .eq("review_status", "pending")
    .select("id");

  if (error) throw new Error(`Batch approve failed: ${error.message}`);
  return data?.length ?? 0;
}

export async function batchReject(
  ids: string[],
  reviewNote?: string
): Promise<number> {
  if (!ids.length) return 0;

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("content_items")
    .update({
      review_status: "rejected" as ReviewStatus,
      review_note: reviewNote ?? null,
      reviewed_at: now,
      updated_at: now,
    })
    .in("id", ids)
    .eq("review_status", "pending")
    .select("id");

  if (error) throw new Error(`Batch reject failed: ${error.message}`);
  return data?.length ?? 0;
}

// ── Content generation trigger ──────────────────────────────────

export async function triggerGeneration(params: {
  businessId?: string;
  sessionId?: string;
  prompt: string;
  contentType?: ContentType;
  channel?: string;
  sourceType?: string;
  sourceRef?: string;
  sourceBundle?: Json;
  title?: string;
}): Promise<{ card: ContentItem; jobId: string }> {
  const { data: card, error: cardErr } = await supabase
    .from("content_items")
    .insert({
      title: params.title ?? "Generating...",
      body_text: params.prompt,
      content_type: params.contentType ?? "video",
      business_id: params.businessId ?? null,
      session_id: params.sessionId ?? null,
      channel: params.channel ?? null,
      source_type: params.sourceType ?? "generated",
      source_ref: params.sourceRef ?? null,
      source_bundle: params.sourceBundle ?? null,
      prompt_input_summary: params.prompt,
      review_status: "pending" as ReviewStatus,
    } satisfies ContentItemInsert)
    .select()
    .single();

  if (cardErr || !card) {
    throw new Error(`Failed to create card: ${cardErr?.message}`);
  }

  const { data: job, error: jobErr } = await supabase
    .from("generation_jobs")
    .insert({
      content_item_id: card.id,
      job_type: "initial",
      prompt: params.prompt,
    })
    .select()
    .single();

  if (jobErr || !job) {
    await supabase.from("content_items").delete().eq("id", card.id);
    throw new Error(`Failed to create job: ${jobErr?.message}`);
  }

  return { card, jobId: job.id };
}

export async function triggerBulkGeneration(params: {
  businessId?: string;
  sessionId?: string;
  prompts: string[];
  contentType?: ContentType;
  channel?: string;
}): Promise<{ card: ContentItem; jobId: string }[]> {
  const results = await Promise.allSettled(
    params.prompts.map((prompt) =>
      triggerGeneration({
        businessId: params.businessId,
        sessionId: params.sessionId,
        prompt,
        contentType: params.contentType,
        channel: params.channel,
      })
    )
  );

  return results
    .filter(
      (r): r is PromiseFulfilledResult<{ card: ContentItem; jobId: string }> =>
        r.status === "fulfilled"
    )
    .map((r) => r.value);
}

// ── Content editing (triggers regeneration) ─────────────────────

export async function editContentItem(
  id: string,
  updates: {
    title?: string;
    body_text?: string;
    script?: string;
    channel?: string;
  }
): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_items")
    .update({
      ...updates,
      review_status: "needs_edit" as ReviewStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to edit: ${error?.message}`);
  return data;
}

// ── History & search ────────────────────────────────────────────

export async function fetchSwipeHistory(options: {
  businessId?: string;
  reviewStatus?: ReviewStatus;
  limit?: number;
  offset?: number;
}): Promise<{ cards: ContentItem[]; total: number }> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  let query = supabase
    .from("content_items")
    .select("*", { count: "exact" })
    .not("review_status", "eq", "pending")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.businessId) query = query.eq("business_id", options.businessId);
  if (options.reviewStatus) query = query.eq("review_status", options.reviewStatus);

  const { data, error, count } = await query;
  if (error) throw new Error(`Failed to fetch history: ${error.message}`);
  return { cards: data ?? [], total: count ?? 0 };
}

export async function searchCards(
  queryText: string,
  options: { businessId?: string; limit?: number } = {}
): Promise<ContentItem[]> {
  const limit = options.limit ?? 20;

  let q = supabase
    .from("content_items")
    .select("*")
    .or(`title.ilike.%${queryText}%,body_text.ilike.%${queryText}%`)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (options.businessId) q = q.eq("business_id", options.businessId);

  const { data, error } = await q;
  if (error) throw new Error(`Search failed: ${error.message}`);
  return data ?? [];
}

// ── Upload ──────────────────────────────────────────────────────

export async function uploadContent(params: {
  title: string;
  bodyText?: string;
  script?: string;
  businessId?: string;
  sessionId?: string;
  contentType?: ContentType;
  channel?: string;
  sourceType?: string;
  imageFile?: { buffer: Buffer; filename: string };
  videoFile?: { buffer: Buffer; filename: string };
}): Promise<ContentItem> {
  let video_url: string | null = null;
  let image_url: string | null = null;

  if (params.videoFile) {
    const path = `uploads/${Date.now()}-${params.videoFile.filename}`;
    const { error: uploadErr } = await supabase.storage
      .from("content-videos")
      .upload(path, params.videoFile.buffer, { contentType: "video/mp4" });
    if (uploadErr) throw new Error(`Video upload failed: ${uploadErr.message}`);
    const { data } = supabase.storage.from("content-videos").getPublicUrl(path);
    video_url = data.publicUrl;
  }

  if (params.imageFile) {
    const ext = params.imageFile.filename.split(".").pop() ?? "png";
    const contentType = ext === "jpg" || ext === "jpeg" ? "image/jpeg" : `image/${ext}`;
    const path = `uploads/${Date.now()}-${params.imageFile.filename}`;
    const { error: uploadErr } = await supabase.storage
      .from("content-videos")
      .upload(path, params.imageFile.buffer, { contentType });
    if (uploadErr) throw new Error(`Image upload failed: ${uploadErr.message}`);
    const { data } = supabase.storage.from("content-videos").getPublicUrl(path);
    image_url = data.publicUrl;
  }

  const { data, error } = await supabase
    .from("content_items")
    .insert({
      title: params.title,
      body_text: params.bodyText ?? null,
      script: params.script ?? null,
      video_url,
      image_url,
      content_type: params.contentType ?? "video",
      channel: params.channel ?? null,
      source_type: params.sourceType ?? "upload",
      business_id: params.businessId ?? null,
      session_id: params.sessionId ?? null,
    } satisfies ContentItemInsert)
    .select()
    .single();

  if (error || !data) throw new Error(`Insert failed: ${error?.message}`);
  return data;
}

// ── Intercom support actions ────────────────────────────────────

export async function approveAndSendIntercom(
  id: string,
  options: {
    messageType?: "comment" | "note";
    forceEvenIfStale?: boolean;
  } = {}
): Promise<{
  success: boolean;
  error?: string;
  preflightIssues?: Array<{ type: string; [key: string]: unknown }>;
}> {
  // Dynamic import to avoid loading intercom deps when not needed
  const { sendApprovedReply } = await import(
    "../pipeline/intercom-sender.js"
  );
  return sendApprovedReply(id, options);
}

export async function fetchPendingIntercomDrafts(): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_items")
    .select("*")
    .eq("content_type", "support")
    .eq("channel", "intercom")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch intercom drafts: ${error.message}`);
  return data ?? [];
}

// ── Analytics ───────────────────────────────────────────────────

export async function fetchFeedStats(businessId?: string): Promise<FeedStats> {
  const statuses: ReviewStatus[] = [
    "pending",
    "approved",
    "rejected",
    "needs_edit",
  ];

  const counts = await Promise.all(
    statuses.map(async (status) => {
      let q = supabase
        .from("content_items")
        .select("*", { count: "exact", head: true })
        .eq("review_status", status);
      if (businessId) q = q.eq("business_id", businessId);
      const { count } = await q;
      return { status, count: count ?? 0 };
    })
  );

  const map = Object.fromEntries(counts.map((c) => [c.status, c.count]));
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  const decided = (map.approved ?? 0) + (map.rejected ?? 0);

  let oldestQuery = supabase
    .from("content_items")
    .select("created_at")
    .eq("review_status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);
  if (businessId) oldestQuery = oldestQuery.eq("business_id", businessId);
  const { data: oldest } = await oldestQuery;

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  let recentQuery = supabase
    .from("content_items")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);
  if (businessId) recentQuery = recentQuery.eq("business_id", businessId);
  const { count: recentCount } = await recentQuery;

  return {
    pending: map.pending ?? 0,
    approved: map.approved ?? 0,
    rejected: map.rejected ?? 0,
    needsEdit: map.needs_edit ?? 0,
    total,
    approvalRate: decided > 0 ? (map.approved ?? 0) / decided : 0,
    avgCardsPerDay: (recentCount ?? 0) / 30,
    oldestPendingAt: oldest?.[0]?.created_at ?? null,
  };
}

// ── Job tracking ────────────────────────────────────────────────

export async function fetchJobStatus(
  jobId: string
): Promise<GenerationJob | null> {
  const { data } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("id", jobId)
    .single();
  return data;
}

export async function fetchActiveJobs(
  businessId?: string
): Promise<GenerationJob[]> {
  const { data, error } = await supabase
    .from("generation_jobs")
    .select("*, content_items!generation_jobs_content_item_id_fkey(business_id)")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
  if (!businessId) return data ?? [];

  return (data ?? []).filter((job: any) => {
    const item = job.content_items;
    return item?.business_id === businessId;
  });
}

// ── Realtime ────────────────────────────────────────────────────

export function subscribeToFeedChanges(
  callback: (event: FeedChangeEvent) => void,
  businessId?: string
): () => void {
  const channel = supabase
    .channel(`feed_changes_${businessId ?? "all"}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "content_items",
        ...(businessId ? { filter: `business_id=eq.${businessId}` } : {}),
      },
      (payload) => {
        const raw = payload as any;
        const eventType: FeedChangeEvent["type"] =
          raw.eventType === "INSERT"
            ? "insert"
            : raw.eventType === "UPDATE"
              ? "update"
              : "delete";

        const card: ContentItem =
          eventType === "delete" ? raw.old : raw.new;

        const oldReviewStatus: ContentItem["review_status"] | undefined =
          eventType === "update" ? raw.old?.review_status : undefined;

        callback({ type: eventType, card, oldReviewStatus });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToNewCards(
  callback: (card: ContentItem) => void
): () => void {
  return subscribeToFeedChanges((event) => {
    if (event.card.review_status === "pending") {
      if (
        event.type === "insert" ||
        (event.type === "update" && event.oldReviewStatus !== "pending")
      ) {
        callback(event.card);
      }
    }
  });
}

export function subscribeToJobUpdates(
  jobId: string,
  callback: (job: GenerationJob) => void
): () => void {
  const channel = supabase
    .channel(`job_${jobId}`)
    .on(
      "postgres_changes" as any,
      {
        event: "UPDATE",
        schema: "public",
        table: "generation_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload: any) => {
        callback(payload.new as GenerationJob);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
