import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabase";
import type {
  ContentItem,
  ReviewStatus,
  ContentType,
  Persona,
  SwipeDirection,
  GenerationJob,
} from "../types/database";

interface SwipeAction {
  cardId: string;
  direction: SwipeDirection;
  feedback?: string;
  previousStatus: ReviewStatus;
  timestamp: number;
}

interface SessionStats {
  totalSwiped: number;
  approved: number;
  rejected: number;
  variants: number;
  sentForReview: number;
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

export function useFeed(persona: Persona): UseFeedReturn {
  const [cards, setCards] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const undoStack = useRef<SwipeAction[]>([]);
  const seenIds = useRef(new Set<string>());
  const [stats, setStats] = useState<SessionStats>({
    totalSwiped: 0,
    approved: 0,
    rejected: 0,
    variants: 0,
    sentForReview: 0,
    undos: 0,
  });

  const fetchCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const types = persona.contentTypes;
      const results = await Promise.all(
        types.map(async (ct) => {
          const { data } = await supabase
            .from("content_items")
            .select("*")
            .eq("review_status", "pending")
            .eq("content_type", ct)
            .order("created_at", { ascending: true })
            .limit(20);
          return (data ?? []) as ContentItem[];
        })
      );

      const allCards = results
        .flat()
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
  }, [persona.contentTypes]);

  useEffect(() => {
    seenIds.current.clear();
    undoStack.current = [];
    setStats({ totalSwiped: 0, approved: 0, rejected: 0, variants: 0, sentForReview: 0, undos: 0 });
    fetchCards();
  }, [fetchCards]);

  useEffect(() => {
    const channel = supabase
      .channel("feed_realtime")
      .on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "content_items" },
        (payload: any) => {
          const eventType = payload.eventType as string;
          const newRow = payload.new as ContentItem;
          const oldRow = payload.old as ContentItem | undefined;

          if (
            eventType === "INSERT" &&
            newRow.review_status === "pending" &&
            persona.contentTypes.includes(newRow.content_type) &&
            !seenIds.current.has(newRow.id)
          ) {
            setCards((prev) => {
              if (prev.some((c) => c.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
          }

          if (eventType === "UPDATE" && newRow.review_status !== "pending") {
            setCards((prev) => prev.filter((c) => c.id !== newRow.id));
          }

          if (
            eventType === "UPDATE" &&
            oldRow?.review_status !== "pending" &&
            newRow.review_status === "pending" &&
            persona.contentTypes.includes(newRow.content_type) &&
            !seenIds.current.has(newRow.id)
          ) {
            setCards((prev) => {
              if (prev.some((c) => c.id === newRow.id)) return prev;
              return [...prev, newRow];
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [persona.contentTypes]);

  const swipe = useCallback(
    async (direction: SwipeDirection, feedback?: string) => {
      setCards((prev) => {
        const card = prev[0];
        if (!card) return prev;

        const update: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        switch (direction) {
          case "right":
            update.review_status = "approved";
            seenIds.current.add(card.id);
            undoStack.current.push({
              cardId: card.id,
              direction,
              feedback,
              previousStatus: card.review_status,
              timestamp: Date.now(),
            });
            if (undoStack.current.length > 50) undoStack.current.shift();

            supabase
              .from("content_items")
              .update(update)
              .eq("id", card.id)
              .then();

            setStats((s) => ({
              ...s,
              totalSwiped: s.totalSwiped + 1,
              approved: s.approved + 1,
            }));
            return prev.slice(1);

          case "left":
            update.review_status = "rejected";
            if (feedback) update.review_note = feedback;
            seenIds.current.add(card.id);
            undoStack.current.push({
              cardId: card.id,
              direction,
              feedback,
              previousStatus: card.review_status,
              timestamp: Date.now(),
            });
            if (undoStack.current.length > 50) undoStack.current.shift();

            supabase
              .from("content_items")
              .update(update)
              .eq("id", card.id)
              .then();

            setStats((s) => ({
              ...s,
              totalSwiped: s.totalSwiped + 1,
              rejected: s.rejected + 1,
            }));
            return prev.slice(1);

          case "up":
            update.review_status = "needs_edit";
            update.review_note = feedback ?? "";
            seenIds.current.add(card.id);
            undoStack.current.push({
              cardId: card.id,
              direction,
              feedback,
              previousStatus: card.review_status,
              timestamp: Date.now(),
            });
            if (undoStack.current.length > 50) undoStack.current.shift();

            supabase
              .from("content_items")
              .update(update)
              .eq("id", card.id)
              .then();

            setStats((s) => ({
              ...s,
              totalSwiped: s.totalSwiped + 1,
              variants: s.variants + 1,
            }));
            return prev.slice(1);

          case "down":
            update.review_status = "needs_edit";
            update.review_note = feedback ?? "";
            update.down_arrow_designation = "further_review";
            seenIds.current.add(card.id);
            undoStack.current.push({
              cardId: card.id,
              direction,
              feedback,
              previousStatus: card.review_status,
              timestamp: Date.now(),
            });
            if (undoStack.current.length > 50) undoStack.current.shift();

            supabase
              .from("content_items")
              .update(update)
              .eq("id", card.id)
              .then();

            setStats((s) => ({
              ...s,
              totalSwiped: s.totalSwiped + 1,
              sentForReview: s.sentForReview + 1,
            }));
            return prev.slice(1);
        }
      });
    },
    []
  );

  const undo = useCallback(async () => {
    const lastAction = undoStack.current.pop();
    if (!lastAction) return;

    try {
      const { data } = await supabase
        .from("content_items")
        .update({
          review_status: "pending" as ReviewStatus,
          review_note: null,
          down_arrow_designation: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", lastAction.cardId)
        .select()
        .single();

      if (data) {
        const restored = data as ContentItem;
        seenIds.current.delete(lastAction.cardId);
        setCards((prev) => [restored, ...prev]);
        setStats((s) => ({
          ...s,
          totalSwiped: Math.max(0, s.totalSwiped - 1),
          undos: s.undos + 1,
          approved:
            s.approved - (lastAction.direction === "right" ? 1 : 0),
          rejected:
            s.rejected - (lastAction.direction === "left" ? 1 : 0),
          variants:
            s.variants - (lastAction.direction === "up" ? 1 : 0),
          sentForReview:
            s.sentForReview - (lastAction.direction === "down" ? 1 : 0),
        }));
      }
    } catch {
      setError("Failed to undo");
    }
  }, []);

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
