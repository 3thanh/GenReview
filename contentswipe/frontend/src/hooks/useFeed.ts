import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import { getSeededDemoCards } from "../lib/demo-feed";
import type { FeedSourceMode } from "../lib/feed-source";
import type {
  ContentItem,
  ContentItemUpdate,
  ReviewStatus,
  SwipeDirection,
  GenerationJob,
} from "../types/database";
import type { Persona } from "../lib/personas";

interface SwipeAction {
  cardId: string;
  direction: SwipeDirection;
  feedback?: string;
  previousStatus: ReviewStatus;
  timestamp: number;
  cardSnapshot: ContentItem;
}

interface SessionStats {
  totalSwiped: number;
  approved: number;
  rejected: number;
  variants: number;
  ideas: number;
  undos: number;
}

interface UseFeedReturn {
  cards: ContentItem[];
  currentCard: ContentItem | null;
  loading: boolean;
  error: string | null;
  stats: SessionStats;
  canUndo: boolean;
  queueLength: number;
  swipe: (direction: SwipeDirection, feedback?: string) => Promise<void>;
  undo: () => Promise<void>;
  reload: () => Promise<void>;
}

interface FeedCachePayload {
  version: 1;
  contentTypes: Persona["contentTypes"];
  cards: ContentItem[];
  updatedAt: string;
}

const FEED_CACHE_KEY_PREFIX = "contentswipe.feed.v1";
const DEMO_FEED_CACHE_KEY_PREFIX = "contentswipe.demoFeed.v2";

function insertSorted(cards: ContentItem[], nextCard: ContentItem): ContentItem[] {
  const next = [...cards.filter((card) => card.id !== nextCard.id), nextCard];
  next.sort(
    (a, b) =>
      new Date(a.created_at ?? 0).getTime() -
      new Date(b.created_at ?? 0).getTime()
  );
  return next;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isContentItemLike(value: unknown): value is ContentItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.content_type === "string" &&
    typeof value.review_status === "string"
  );
}

function getFeedCacheKey(persona: Persona): string {
  return `${FEED_CACHE_KEY_PREFIX}.${persona.id}`;
}

function getDemoFeedCacheKey(persona: Persona): string {
  return `${DEMO_FEED_CACHE_KEY_PREFIX}.${persona.id}`;
}

function getContentTypesSignature(contentTypes: Persona["contentTypes"]): string {
  return [...contentTypes].sort().join("|");
}

function getPersonaCacheIdentity(persona: Persona): string {
  return `${persona.id}:${getContentTypesSignature(persona.contentTypes)}`;
}

function readFeedCache(persona: Persona): ContentItem[] {
  if (typeof window === "undefined") {
    return [];
  }

  const storedValue = window.localStorage.getItem(getFeedCacheKey(persona));
  if (!storedValue) {
    return [];
  }

  try {
    const parsed = JSON.parse(storedValue) as FeedCachePayload;
    if (!parsed || !Array.isArray(parsed.cards) || !Array.isArray(parsed.contentTypes)) {
      return [];
    }

    const cachedSignature = getContentTypesSignature(parsed.contentTypes);
    const liveSignature = getContentTypesSignature(persona.contentTypes);
    if (cachedSignature !== liveSignature) {
      return [];
    }

    return parsed.cards
      .filter(isContentItemLike)
      .sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime()
      );
  } catch {
    return [];
  }
}

function readDemoFeedCache(persona: Persona): ContentItem[] {
  if (typeof window === "undefined") {
    return getSeededDemoCards(persona);
  }

  const storedValue = window.localStorage.getItem(getDemoFeedCacheKey(persona));
  if (!storedValue) {
    return getSeededDemoCards(persona);
  }

  try {
    const parsed = JSON.parse(storedValue) as FeedCachePayload;
    if (!parsed || !Array.isArray(parsed.cards) || !Array.isArray(parsed.contentTypes)) {
      return getSeededDemoCards(persona);
    }

    const cachedSignature = getContentTypesSignature(parsed.contentTypes);
    const liveSignature = getContentTypesSignature(persona.contentTypes);
    if (cachedSignature !== liveSignature) {
      return getSeededDemoCards(persona);
    }

    const cached = parsed.cards
      .filter(isContentItemLike)
      .sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime()
      );

    // If the cached deck is depleted, reset to full seeded deck
    if (cached.length === 0) {
      return getSeededDemoCards(persona);
    }

    return cached;
  } catch {
    return getSeededDemoCards(persona);
  }
}

function writeFeedCache(persona: Persona, cards: ContentItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: FeedCachePayload = {
    version: 1,
    contentTypes: [...persona.contentTypes],
    cards,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getFeedCacheKey(persona), JSON.stringify(payload));
}

function writeDemoFeedCache(persona: Persona, cards: ContentItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: FeedCachePayload = {
    version: 1,
    contentTypes: [...persona.contentTypes],
    cards,
    updatedAt: new Date().toISOString(),
  };

  window.localStorage.setItem(getDemoFeedCacheKey(persona), JSON.stringify(payload));
}

function getInitialCards(persona: Persona, sourceMode: FeedSourceMode): ContentItem[] {
  return sourceMode === "demo" ? readDemoFeedCache(persona) : readFeedCache(persona);
}

export function useFeed(persona: Persona, sourceMode: FeedSourceMode): UseFeedReturn {
  const [cards, setCards] = useState<ContentItem[]>(() => getInitialCards(persona, sourceMode));
  const [loading, setLoading] = useState(
    () => sourceMode === "real" && getInitialCards(persona, sourceMode).length === 0
  );
  const [error, setError] = useState<string | null>(null);
  const undoStack = useRef<SwipeAction[]>([]);
  const seenIds = useRef(new Set<string>());
  const hydratedCacheIdentity = useRef(`${sourceMode}:${getPersonaCacheIdentity(persona)}`);
  const [stats, setStats] = useState<SessionStats>({
    totalSwiped: 0,
    approved: 0,
    rejected: 0,
    variants: 0,
    ideas: 0,
    undos: 0,
  });

  const fetchCards = useCallback(async (options?: { background?: boolean }) => {
    if (sourceMode === "demo") {
      const demoCards = readDemoFeedCache(persona);
      setCards(demoCards);
      setLoading(false);
      setError(null);
      return;
    }

    if (!options?.background) {
      setLoading(true);
    }

    setError(null);
    try {
      const { data, error: queryError } = await supabase
        .from("content_items")
        .select("*")
        .eq("review_status", "pending")
        .in("content_type", persona.contentTypes)
        .order("created_at", { ascending: true })
        .limit(40);

      if (queryError) throw queryError;

      const allCards = (data ?? [])
        .filter((c) => !seenIds.current.has(c.id))
        .sort(
          (a, b) =>
            new Date(a.created_at ?? 0).getTime() -
            new Date(b.created_at ?? 0).getTime()
        );

      const uniqueMap = new Map<string, ContentItem>();
      for (const c of allCards) uniqueMap.set(c.id, c);

      setCards(Array.from(uniqueMap.values()));
    } catch (e: any) {
      setError(e.message ?? "Failed to load feed");
    } finally {
      setLoading(false);
    }
  }, [persona, sourceMode]);

  useEffect(() => {
    const cachedCards =
      sourceMode === "demo" ? readDemoFeedCache(persona) : readFeedCache(persona);

    hydratedCacheIdentity.current = `${sourceMode}:${getPersonaCacheIdentity(persona)}`;
    seenIds.current.clear();
    undoStack.current = [];
    setCards(cachedCards);
    setStats({ totalSwiped: 0, approved: 0, rejected: 0, variants: 0, ideas: 0, undos: 0 });
    setLoading(sourceMode === "real" && cachedCards.length === 0);
    setError(null);
    if (sourceMode === "demo") {
      return;
    }
    void fetchCards({ background: cachedCards.length > 0 });
  }, [fetchCards, persona, sourceMode]);

  useEffect(() => {
    if (hydratedCacheIdentity.current !== `${sourceMode}:${getPersonaCacheIdentity(persona)}`) {
      return;
    }

    if (sourceMode === "demo") {
      writeDemoFeedCache(persona, cards);
      return;
    }

    writeFeedCache(persona, cards);
  }, [cards, persona, sourceMode]);

  useEffect(() => {
    if (sourceMode === "demo") {
      return;
    }

    const channel = supabase
      .channel("feed_realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "content_items" },
        (payload: any) => {
          const eventType = payload.eventType as string;
          const newRow = payload.new as ContentItem | undefined;
          const oldRow = payload.old as ContentItem | undefined;
          const rowId = newRow?.id ?? oldRow?.id;
          const matchesPersona = newRow
            ? persona.contentTypes.includes(newRow.content_type)
            : oldRow
              ? persona.contentTypes.includes(oldRow.content_type)
              : false;

          if (!rowId) return;

          if (
            eventType === "INSERT" &&
            newRow &&
            newRow.review_status === "pending" &&
            matchesPersona &&
            !seenIds.current.has(rowId)
          ) {
            setCards((prev) => insertSorted(prev, newRow));
          }

          if (
            eventType === "UPDATE" &&
            newRow &&
            newRow.review_status === "pending" &&
            matchesPersona
          ) {
            if (seenIds.current.has(rowId)) return;
            setCards((prev) => insertSorted(prev, newRow));
          }

          if (
            (eventType === "UPDATE" && newRow?.review_status !== "pending") ||
            eventType === "DELETE"
          ) {
            setCards((prev) => prev.filter((card) => card.id !== rowId));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [persona.contentTypes, sourceMode]);

  const swipe = useCallback(
    async (direction: SwipeDirection, feedback?: string) => {
      const card = cards[0];
      if (!card) return;

      setError(null);

      if (sourceMode === "demo") {
        setCards((prev) => [...prev.slice(1), prev[0]]);

        undoStack.current.push({
          cardId: card.id,
          direction,
          feedback,
          previousStatus: card.review_status,
          timestamp: Date.now(),
          cardSnapshot: card,
        });
        if (undoStack.current.length > 50) undoStack.current.shift();

        setStats((s) => ({
          ...s,
          totalSwiped: s.totalSwiped + 1,
          approved: s.approved + (direction === "right" ? 1 : 0),
          rejected: s.rejected + (direction === "left" ? 1 : 0),
          variants: s.variants + (direction === "up" ? 1 : 0),
          ideas: s.ideas + (direction === "down" ? 1 : 0),
        }));
        return;
      }

      seenIds.current.add(card.id);
      setCards((prev) => prev.slice(1));

      const action: SwipeAction = {
        cardId: card.id,
        direction,
        feedback,
        previousStatus: card.review_status,
        timestamp: Date.now(),
        cardSnapshot: card,
      };

      undoStack.current.push(action);
      if (undoStack.current.length > 50) undoStack.current.shift();

      const update: ContentItemUpdate = {
        updated_at: new Date().toISOString(),
        reviewed_at: new Date().toISOString(),
      };

      switch (direction) {
        case "right":
          update.review_status = "approved";
          update.review_note = null;
          break;
        case "left":
          update.review_status = "rejected";
          update.review_note = feedback ?? null;
          break;
        case "up":
        case "down":
          update.review_status = "needs_edit";
          update.review_note = feedback ?? "";
          break;
      }

      const { error: updateError } = await supabase
        .from("content_items")
        .update(update)
        .eq("id", card.id);

      if (updateError) {
        seenIds.current.delete(card.id);
        undoStack.current = undoStack.current.filter(
          (entry) => entry.timestamp !== action.timestamp
        );
        setCards((prev) => [card, ...prev]);
        setError(updateError.message ?? "Failed to save review action");
        return;
      }

      setStats((s) => ({
        ...s,
        totalSwiped: s.totalSwiped + 1,
        approved: s.approved + (direction === "right" ? 1 : 0),
        rejected: s.rejected + (direction === "left" ? 1 : 0),
        variants: s.variants + (direction === "up" ? 1 : 0),
        ideas: s.ideas + (direction === "down" ? 1 : 0),
      }));
    },
    [cards, sourceMode]
  );

  const undo = useCallback(async () => {
    const lastAction = undoStack.current.pop();
    if (!lastAction) return;

    if (sourceMode === "demo") {
      setCards((prev) => {
        const withoutLast = prev.filter((c) => c.id !== lastAction.cardId);
        return [lastAction.cardSnapshot, ...withoutLast];
      });
      setStats((s) => ({
        ...s,
        totalSwiped: Math.max(0, s.totalSwiped - 1),
        undos: s.undos + 1,
        approved: s.approved - (lastAction.direction === "right" ? 1 : 0),
        rejected: s.rejected - (lastAction.direction === "left" ? 1 : 0),
        variants: s.variants - (lastAction.direction === "up" ? 1 : 0),
        ideas: s.ideas - (lastAction.direction === "down" ? 1 : 0),
      }));
      return;
    }

    try {
      const { data } = await supabase
        .from("content_items")
        .update({
          review_status: "pending" as ReviewStatus,
          review_note: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lastAction.cardId)
        .select()
        .single();

      if (data) {
        const restored = data as ContentItem;
        seenIds.current.delete(lastAction.cardId);
        setCards((prev) => insertSorted(prev, restored));
        setStats((s) => ({
          ...s,
          totalSwiped: Math.max(0, s.totalSwiped - 1),
          undos: s.undos + 1,
          approved:
            s.approved -
            (lastAction.direction === "right" ? 1 : 0),
          rejected:
            s.rejected -
            (lastAction.direction === "left" ? 1 : 0),
          variants:
            s.variants -
            (lastAction.direction === "up" ? 1 : 0),
          ideas:
            s.ideas -
            (lastAction.direction === "down" ? 1 : 0),
        }));
      }
    } catch {
      setError("Failed to undo");
    }
  }, [sourceMode]);

  return {
    cards,
    currentCard: cards[0] ?? null,
    loading,
    error,
    stats,
    canUndo: undoStack.current.length > 0,
    queueLength: cards.length,
    swipe,
    undo,
    reload: fetchCards,
  };
}

export function useGenerationJobs() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("generation_jobs")
        .select("*")
        .in("status", ["queued", "processing"])
        .order("created_at", { ascending: true });
      setJobs((data as GenerationJob[]) ?? []);
    };
    load();

    const channel = supabase
      .channel("job_updates")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "generation_jobs" },
        (payload: any) => {
          const job = payload.new as GenerationJob;
          if (!job) return;
          setJobs((prev) => {
            if (job.status === "completed" || job.status === "failed") {
              return prev.filter((j) => j.id !== job.id);
            }
            const idx = prev.findIndex((j) => j.id === job.id);
            if (idx >= 0) {
              const next = [...prev];
              next[idx] = job;
              return next;
            }
            return [...prev, job];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return jobs;
}
