import { supabase } from "./supabase.js";
import type {
  ContentItem,
  ContentInsert,
  ContentStatus,
  ContentType,
  FeedOptions,
  FeedPage,
  CardWithRelations,
  FeedStats,
  FeedChangeEvent,
  GenerationJob,
} from "../types/database.js";


const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

// ── Feed fetching ───────────────────────────────────────────────

/**
 * Paginated feed of cards ready for swiping.
 * Uses cursor-based pagination (cursor = created_at of last card).
 */
export async function fetchFeed(options: FeedOptions = {}): Promise<FeedPage> {
  const limit = Math.min(options.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  let countQuery = supabase
    .from("content_queue")
    .select("*", { count: "exact", head: true })
    .eq("status", "pending");

  let query = supabase
    .from("content_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (options.businessId) {
    query = query.eq("business_id", options.businessId);
    countQuery = countQuery.eq("business_id", options.businessId);
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

/**
 * Simple fetch of all pending cards (no pagination).
 */
export async function fetchPendingCards(
  businessId?: string
): Promise<ContentItem[]> {
  let query = supabase
    .from("content_queue")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch cards: ${error.message}`);
  return data ?? [];
}

/**
 * Fetch a single card by ID with all its relationships loaded.
 */
export async function fetchCardById(id: string): Promise<CardWithRelations> {
  const { data: card, error } = await supabase
    .from("content_queue")
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
    .from("content_queue")
    .select("*")
    .eq("id", id)
    .single();
  return data;
}

export async function fetchCardVariants(id: string): Promise<ContentItem[]> {
  const { data, error } = await supabase
    .from("content_queue")
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
  contentQueueId: string
): Promise<GenerationJob | null> {
  const { data } = await supabase
    .from("generation_jobs")
    .select("*")
    .eq("content_queue_id", contentQueueId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  return data;
}

// ── Swipe actions ───────────────────────────────────────────────

export async function approveCard(id: string): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "approved" as ContentStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to approve: ${error?.message}`);
  return data;
}

export async function rejectCard(
  id: string,
  feedback?: string
): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "rejected" as ContentStatus,
      feedback: feedback ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to reject: ${error?.message}`);
  return data;
}

export async function requestVariant(
  id: string,
  feedback: string
): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "needs_variant" as ContentStatus,
      feedback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to request variant: ${error?.message}`);
  }
  return data;
}

export async function requestMoreIdeas(
  id: string,
  feedback: string
): Promise<ContentItem> {
  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "needs_ideas" as ContentStatus,
      feedback,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to request ideas: ${error?.message}`);
  }
  return data;
}

/**
 * Revert a card back to pending (undo a swipe).
 */
export async function undoAction(id: string): Promise<ContentItem> {
  const { data: card, error: fetchErr } = await supabase
    .from("content_queue")
    .select("status")
    .eq("id", id)
    .single();

  if (fetchErr || !card) {
    throw new Error(`Card not found for undo: ${fetchErr?.message}`);
  }
  if (card.status === "pending") {
    throw new Error("Card is already pending — nothing to undo");
  }

  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "pending" as ContentStatus,
      feedback: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) throw new Error(`Undo failed: ${error?.message}`);
  return data;
}

// ── Batch operations ────────────────────────────────────────────

export async function batchApprove(ids: string[]): Promise<number> {
  if (!ids.length) return 0;

  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "approved" as ContentStatus,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");

  if (error) throw new Error(`Batch approve failed: ${error.message}`);
  return data?.length ?? 0;
}

export async function batchReject(
  ids: string[],
  feedback?: string
): Promise<number> {
  if (!ids.length) return 0;

  const { data, error } = await supabase
    .from("content_queue")
    .update({
      status: "rejected" as ContentStatus,
      feedback: feedback ?? null,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids)
    .eq("status", "pending")
    .select("id");

  if (error) throw new Error(`Batch reject failed: ${error.message}`);
  return data?.length ?? 0;
}

// ── Content generation trigger ──────────────────────────────────

export async function triggerGeneration(params: {
  businessId?: string;
  prompt: string;
  contentType?: ContentType;
  title?: string;
}): Promise<{ card: ContentItem; jobId: string }> {
  const { data: card, error: cardErr } = await supabase
    .from("content_queue")
    .insert({
      title: params.title ?? "Generating...",
      description: params.prompt,
      content_type: params.contentType ?? "video_script",
      business_id: params.businessId ?? null,
      status: "pending" as ContentStatus,
    } satisfies ContentInsert)
    .select()
    .single();

  if (cardErr || !card) {
    throw new Error(`Failed to create card: ${cardErr?.message}`);
  }

  const { data: job, error: jobErr } = await supabase
    .from("generation_jobs")
    .insert({
      content_queue_id: card.id,
      job_type: "initial",
      prompt: params.prompt,
    })
    .select()
    .single();

  if (jobErr || !job) {
    await supabase.from("content_queue").delete().eq("id", card.id);
    throw new Error(`Failed to create job: ${jobErr?.message}`);
  }

  return { card, jobId: job.id };
}

export async function triggerBulkGeneration(params: {
  businessId?: string;
  prompts: string[];
  contentType?: ContentType;
}): Promise<{ card: ContentItem; jobId: string }[]> {
  const results = await Promise.allSettled(
    params.prompts.map((prompt) =>
      triggerGeneration({
        businessId: params.businessId,
        prompt,
        contentType: params.contentType,
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

// ── History & search ────────────────────────────────────────────

export async function fetchSwipeHistory(options: {
  businessId?: string;
  status?: ContentStatus;
  limit?: number;
  offset?: number;
}): Promise<{ cards: ContentItem[]; total: number }> {
  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  let query = supabase
    .from("content_queue")
    .select("*", { count: "exact" })
    .not("status", "eq", "pending")
    .order("updated_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (options.businessId) query = query.eq("business_id", options.businessId);
  if (options.status) query = query.eq("status", options.status);

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
    .from("content_queue")
    .select("*")
    .or(`title.ilike.%${queryText}%,description.ilike.%${queryText}%`)
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
  description?: string;
  script?: string;
  businessId?: string;
  contentType?: ContentType;
  videoFile?: { buffer: Buffer; filename: string };
}): Promise<ContentItem> {
  let video_url: string | null = null;

  if (params.videoFile) {
    const path = `uploads/${Date.now()}-${params.videoFile.filename}`;
    const { error: uploadErr } = await supabase.storage
      .from("content-videos")
      .upload(path, params.videoFile.buffer, { contentType: "video/mp4" });
    if (uploadErr) throw new Error(`Upload failed: ${uploadErr.message}`);

    const { data } = supabase.storage
      .from("content-videos")
      .getPublicUrl(path);
    video_url = data.publicUrl;
  }

  const { data, error } = await supabase
    .from("content_queue")
    .insert({
      title: params.title,
      description: params.description ?? null,
      script: params.script ?? null,
      video_url,
      content_type: params.contentType ?? "video_script",
      business_id: params.businessId ?? null,
    } satisfies ContentInsert)
    .select()
    .single();

  if (error || !data) throw new Error(`Insert failed: ${error?.message}`);
  return data;
}

// ── Analytics ───────────────────────────────────────────────────

export async function fetchFeedStats(businessId?: string): Promise<FeedStats> {
  const statuses: ContentStatus[] = [
    "pending",
    "approved",
    "rejected",
    "needs_variant",
    "needs_ideas",
  ];

  const counts = await Promise.all(
    statuses.map(async (status) => {
      let q = supabase
        .from("content_queue")
        .select("*", { count: "exact", head: true })
        .eq("status", status);
      if (businessId) q = q.eq("business_id", businessId);
      const { count } = await q;
      return { status, count: count ?? 0 };
    })
  );

  const map = Object.fromEntries(counts.map((c) => [c.status, c.count]));
  const total = Object.values(map).reduce((a, b) => a + b, 0);
  const decided = (map.approved ?? 0) + (map.rejected ?? 0);

  let oldestQuery = supabase
    .from("content_queue")
    .select("created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);
  if (businessId) oldestQuery = oldestQuery.eq("business_id", businessId);
  const { data: oldest } = await oldestQuery;

  const thirtyDaysAgo = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000
  ).toISOString();
  let recentQuery = supabase
    .from("content_queue")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);
  if (businessId) recentQuery = recentQuery.eq("business_id", businessId);
  const { count: recentCount } = await recentQuery;

  return {
    pending: map.pending ?? 0,
    approved: map.approved ?? 0,
    rejected: map.rejected ?? 0,
    needsVariant: map.needs_variant ?? 0,
    needsIdeas: map.needs_ideas ?? 0,
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
    .select("*, content_queue!generation_jobs_content_queue_id_fkey(business_id)")
    .in("status", ["queued", "processing"])
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to fetch jobs: ${error.message}`);
  if (!businessId) return data ?? [];

  return (data ?? []).filter((job: any) => {
    const card = job.content_queue;
    return card?.business_id === businessId;
  });
}

// ── Realtime ────────────────────────────────────────────────────

/**
 * Subscribe to all feed changes (inserts, updates, deletes).
 */
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
        table: "content_queue",
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

        const oldStatus: ContentItem["status"] | undefined =
          eventType === "update" ? raw.old?.status : undefined;

        callback({ type: eventType, card, oldStatus });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Subscribe only to new pending cards.
 */
export function subscribeToNewCards(
  callback: (card: ContentItem) => void
): () => void {
  return subscribeToFeedChanges((event) => {
    if (event.card.status === "pending") {
      if (
        event.type === "insert" ||
        (event.type === "update" && event.oldStatus !== "pending")
      ) {
        callback(event.card);
      }
    }
  });
}

/**
 * Subscribe to a specific generation job's progress.
 */
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
