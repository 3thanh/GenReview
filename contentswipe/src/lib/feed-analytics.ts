import { supabase } from "./supabase.js";
import type {
  ContentItem,
  ReviewStatus,
  ContentType,
  Business,
} from "../types/database.js";

// ── Types ───────────────────────────────────────────────────────

export interface ContentPerformance {
  totalCards: number;
  byStatus: Record<ReviewStatus, number>;
  byContentType: Record<ContentType, number>;
  approvalRate: number;
  variantRequestRate: number;
  avgTimeToDecision: number | null;
}

export interface BusinessLeaderboard {
  business: Business;
  totalCards: number;
  approved: number;
  rejected: number;
  approvalRate: number;
  pending: number;
}

export interface TimeSeriesPoint {
  date: string;
  created: number;
  approved: number;
  rejected: number;
}

export interface VariantAnalysis {
  originalId: string;
  originalTitle: string;
  variantCount: number;
  approvedVariants: number;
  latestVariantStatus: ReviewStatus;
  feedbackChain: string[];
}

// ── Performance overview ────────────────────────────────────────

export async function getContentPerformance(
  businessId?: string
): Promise<ContentPerformance> {
  let query = supabase.from("content_items").select("*");
  if (businessId) query = query.eq("business_id", businessId);

  const { data: cards, error } = await query;
  if (error) throw new Error(`Analytics query failed: ${error.message}`);

  const all = cards ?? [];

  const byStatus = {} as Record<ReviewStatus, number>;
  const byContentType = {} as Record<ContentType, number>;

  for (const card of all) {
    byStatus[card.review_status] = (byStatus[card.review_status] ?? 0) + 1;
    byContentType[card.content_type] =
      (byContentType[card.content_type] ?? 0) + 1;
  }

  const decided = (byStatus.approved ?? 0) + (byStatus.rejected ?? 0);
  const approvalRate =
    decided > 0 ? (byStatus.approved ?? 0) / decided : 0;

  const variantRequested =
    (byStatus.needs_edit ?? 0) +
    all.filter((c) => c.variant_of !== null).length;
  const variantRequestRate =
    all.length > 0 ? variantRequested / all.length : 0;

  const decisioned = all.filter(
    (c) =>
      c.review_status !== "pending" &&
      c.created_at &&
      c.updated_at &&
      c.updated_at !== c.created_at
  );
  const avgTimeToDecision =
    decisioned.length > 0
      ? decisioned.reduce((sum, c) => {
          const created = new Date(c.created_at!).getTime();
          const updated = new Date(c.updated_at!).getTime();
          return sum + (updated - created);
        }, 0) / decisioned.length
      : null;

  return {
    totalCards: all.length,
    byStatus,
    byContentType,
    approvalRate,
    variantRequestRate,
    avgTimeToDecision,
  };
}

// ── Business leaderboard ────────────────────────────────────────

export async function getBusinessLeaderboard(): Promise<
  BusinessLeaderboard[]
> {
  const [{ data: businesses }, { data: cards }] = await Promise.all([
    supabase.from("businesses").select("*"),
    supabase.from("content_items").select("business_id, review_status"),
  ]);

  if (!businesses || !cards) return [];

  const boardMap = new Map<string, BusinessLeaderboard>();

  for (const biz of businesses) {
    boardMap.set(biz.id, {
      business: biz,
      totalCards: 0,
      approved: 0,
      rejected: 0,
      approvalRate: 0,
      pending: 0,
    });
  }

  for (const card of cards) {
    if (!card.business_id) continue;
    const entry = boardMap.get(card.business_id);
    if (!entry) continue;

    entry.totalCards++;
    if (card.review_status === "approved") entry.approved++;
    if (card.review_status === "rejected") entry.rejected++;
    if (card.review_status === "pending") entry.pending++;
  }

  for (const entry of boardMap.values()) {
    const decided = entry.approved + entry.rejected;
    entry.approvalRate = decided > 0 ? entry.approved / decided : 0;
  }

  return [...boardMap.values()].sort(
    (a, b) => b.totalCards - a.totalCards
  );
}

// ── Time-series activity ────────────────────────────────────────

export async function getDailyActivity(
  days = 30,
  businessId?: string
): Promise<TimeSeriesPoint[]> {
  const since = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  let query = supabase
    .from("content_items")
    .select("created_at, updated_at, review_status")
    .gte("created_at", since);
  if (businessId) query = query.eq("business_id", businessId);

  const { data: cards, error } = await query;
  if (error) throw new Error(`Activity query failed: ${error.message}`);

  const dayMap = new Map<string, TimeSeriesPoint>();

  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    dayMap.set(key, { date: key, created: 0, approved: 0, rejected: 0 });
  }

  for (const card of cards ?? []) {
    if (card.created_at) {
      const day = card.created_at.slice(0, 10);
      const point = dayMap.get(day);
      if (point) point.created++;
    }

    if (
      card.updated_at &&
      (card.review_status === "approved" || card.review_status === "rejected")
    ) {
      const day = card.updated_at.slice(0, 10);
      const point = dayMap.get(day);
      if (point) {
        if (card.review_status === "approved") point.approved++;
        else point.rejected++;
      }
    }
  }

  return [...dayMap.values()];
}

// ── Variant analysis ────────────────────────────────────────────

export async function getVariantAnalysis(
  businessId?: string
): Promise<VariantAnalysis[]> {
  let query = supabase
    .from("content_items")
    .select("*")
    .not("variant_of", "is", null);
  if (businessId) query = query.eq("business_id", businessId);

  const { data: variants, error } = await query;
  if (error) throw new Error(`Variant analysis failed: ${error.message}`);

  const groupedByOriginal = new Map<string, ContentItem[]>();
  for (const v of variants ?? []) {
    const key = v.variant_of!;
    const list = groupedByOriginal.get(key) ?? [];
    list.push(v);
    groupedByOriginal.set(key, list);
  }

  const originalIds = [...groupedByOriginal.keys()];
  if (originalIds.length === 0) return [];

  const { data: originals } = await supabase
    .from("content_items")
    .select("*")
    .in("id", originalIds);

  const results: VariantAnalysis[] = [];
  for (const original of originals ?? []) {
    const variantList = groupedByOriginal.get(original.id) ?? [];
    const sorted = variantList.sort(
      (a, b) =>
        new Date(a.created_at ?? 0).getTime() -
        new Date(b.created_at ?? 0).getTime()
    );

    results.push({
      originalId: original.id,
      originalTitle: original.title,
      variantCount: sorted.length,
      approvedVariants: sorted.filter((v) => v.review_status === "approved").length,
      latestVariantStatus: sorted[sorted.length - 1]?.review_status ?? original.review_status,
      feedbackChain: [original, ...sorted]
        .map((c) => c.review_note)
        .filter((f): f is string => f !== null),
    });
  }

  return results.sort((a, b) => b.variantCount - a.variantCount);
}

// ── Content type breakdown ──────────────────────────────────────

export interface ContentTypeStats {
  contentType: ContentType;
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
}

export async function getContentTypeBreakdown(
  businessId?: string
): Promise<ContentTypeStats[]> {
  let query = supabase
    .from("content_items")
    .select("content_type, review_status");
  if (businessId) query = query.eq("business_id", businessId);

  const { data, error } = await query;
  if (error) throw new Error(`Type breakdown failed: ${error.message}`);

  const map = new Map<ContentType, ContentTypeStats>();

  for (const card of data ?? []) {
    const existing = map.get(card.content_type) ?? {
      contentType: card.content_type,
      total: 0,
      approved: 0,
      rejected: 0,
      pending: 0,
      approvalRate: 0,
    };

    existing.total++;
    if (card.review_status === "approved") existing.approved++;
    if (card.review_status === "rejected") existing.rejected++;
    if (card.review_status === "pending") existing.pending++;

    map.set(card.content_type, existing);
  }

  for (const stats of map.values()) {
    const decided = stats.approved + stats.rejected;
    stats.approvalRate = decided > 0 ? stats.approved / decided : 0;
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}
