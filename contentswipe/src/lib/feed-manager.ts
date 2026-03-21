import {
  fetchFeed,
  approveCard,
  rejectCard,
  requestVariant,
  requestMoreIdeas,
  undoAction,
  subscribeToFeedChanges,
} from "./content-api.js";
import type {
  ContentItem,
  SwipeAction,
  SwipeDirection,
  SessionStats,
  FeedChangeEvent,
} from "../types/database.js";
import {
  getPersona,
  listPersonas,
  CONTENT_CREATOR,
  type Persona,
  type PersonaId,
} from "./personas.js";

const DEFAULT_PREFETCH_THRESHOLD = 3;
const DEFAULT_PAGE_SIZE = 10;

export interface FeedManagerOptions {
  businessId?: string;
  persona?: PersonaId | Persona;
  pageSize?: number;
  prefetchThreshold?: number;
  enableRealtime?: boolean;
}

/**
 * Stateful feed orchestrator for the swipe UI.
 *
 * Manages a card queue, handles prefetching, tracks undo history,
 * and provides session stats. Supports persona switching to change
 * what content types appear and what each swipe direction means.
 *
 * Usage:
 *   const feed = new FeedManager({ persona: "content-creator" });
 *   await feed.start();
 *   const card = feed.currentCard();
 *   console.log(feed.swipeLabels); // { right: "Approve", left: "Reject", ... }
 *   await feed.swipeRight();
 *   await feed.switchPersona("support-agent"); // flushes queue, reloads
 *   feed.stop();
 */
export class FeedManager {
  private queue: ContentItem[] = [];
  private seenIds = new Set<string>();
  private undoStack: SwipeAction[] = [];
  private unsubscribe: (() => void) | null = null;
  private prefetching = false;
  private started = false;
  private activePersona: Persona;

  private readonly businessId?: string;
  private readonly pageSize: number;
  private readonly prefetchThreshold: number;
  private readonly enableRealtime: boolean;

  private sessionStart = 0;
  private lastCardShownAt = 0;
  private cardTimes: number[] = [];
  private counts = { approved: 0, rejected: 0, variants: 0, ideas: 0, undos: 0 };
  private personaSwitchCount = 0;

  private listeners = new Set<(event: FeedEvent) => void>();

  constructor(options: FeedManagerOptions = {}) {
    this.businessId = options.businessId;
    this.activePersona = resolvePersona(options.persona);
    this.pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
    this.prefetchThreshold = options.prefetchThreshold ?? DEFAULT_PREFETCH_THRESHOLD;
    this.enableRealtime = options.enableRealtime ?? true;
  }

  // ── Lifecycle ───────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;
    this.sessionStart = Date.now();
    this.lastCardShownAt = Date.now();

    await this.loadMore();
    this.setupRealtime();

    this.emit({ type: "session_started", persona: this.activePersona });
  }

  stop(): SessionStats {
    const stats = this.getSessionStats();
    this.teardownRealtime();
    this.started = false;
    this.emit({ type: "session_ended", stats });
    return stats;
  }

  // ── Persona switching ─────────────────────────────────────

  get persona(): Persona {
    return this.activePersona;
  }

  get personaId(): PersonaId {
    return this.activePersona.id;
  }

  get swipeLabels(): Persona["swipeLabels"] {
    return this.activePersona.swipeLabels;
  }

  get availablePersonas(): Persona[] {
    return listPersonas();
  }

  /**
   * Switch to a different persona mid-session.
   * Flushes the current queue, resets seen tracking for the new
   * context, and reloads cards matching the new persona's content types.
   * Undo stack is preserved so you can undo across persona switches.
   */
  async switchPersona(personaOrId: PersonaId | Persona): Promise<void> {
    const next = resolvePersona(personaOrId);
    if (next.id === this.activePersona.id) return;

    const previous = this.activePersona;
    this.activePersona = next;
    this.personaSwitchCount++;

    this.queue = [];
    this.seenIds.clear();

    this.teardownRealtime();

    if (this.started) {
      await this.loadMore();
      this.setupRealtime();
    }

    this.lastCardShownAt = Date.now();
    this.emit({ type: "persona_switched", from: previous, to: next });
  }

  // ── Core swipe methods ────────────────────────────────────

  currentCard(): ContentItem | null {
    return this.queue[0] ?? null;
  }

  peekCards(n = 3): ContentItem[] {
    return this.queue.slice(0, n);
  }

  get queueLength(): number {
    return this.queue.length;
  }

  get isEmpty(): boolean {
    return this.queue.length === 0;
  }

  /**
   * Approve the current card and advance.
   * Returns the next card (or null if queue is empty).
   */
  async swipeRight(): Promise<ContentItem | null> {
    return this.performSwipe("right");
  }

  /**
   * Reject the current card and advance.
   */
  async swipeLeft(feedback?: string): Promise<ContentItem | null> {
    return this.performSwipe("left", feedback);
  }

  /**
   * Request a variant of the current card and advance.
   * Feedback is required to guide the variant.
   */
  async swipeUp(feedback: string): Promise<ContentItem | null> {
    return this.performSwipe("up", feedback);
  }

  /**
   * Request more ideas based on the current card and advance.
   * Feedback is required to guide brainstorming.
   */
  async swipeDown(feedback: string): Promise<ContentItem | null> {
    return this.performSwipe("down", feedback);
  }

  /**
   * Undo the last swipe. The card is restored to pending and
   * placed back at the front of the queue.
   */
  async undo(): Promise<ContentItem | null> {
    const lastAction = this.undoStack.pop();
    if (!lastAction) return null;

    const restored = await undoAction(lastAction.cardId);
    this.seenIds.delete(lastAction.cardId);
    this.queue.unshift(restored);
    this.counts.undos++;
    this.lastCardShownAt = Date.now();

    this.emit({ type: "undo", card: restored });
    return restored;
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get lastUndoableAction(): SwipeAction | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }

  // ── Internal ──────────────────────────────────────────────

  private async performSwipe(
    direction: SwipeDirection,
    feedback?: string
  ): Promise<ContentItem | null> {
    const card = this.queue.shift();
    if (!card) return null;

    const timeSinceShown = Date.now() - this.lastCardShownAt;
    this.cardTimes.push(timeSinceShown);

    const action: SwipeAction = {
      cardId: card.id,
      direction,
      feedback,
      previousStatus: card.status,
      timestamp: Date.now(),
    };

    let updatedCard: ContentItem;

    switch (direction) {
      case "right":
        updatedCard = await approveCard(card.id);
        this.counts.approved++;
        break;
      case "left":
        updatedCard = await rejectCard(card.id, feedback);
        this.counts.rejected++;
        break;
      case "up":
        updatedCard = await requestVariant(card.id, feedback!);
        this.counts.variants++;
        break;
      case "down":
        updatedCard = await requestMoreIdeas(card.id, feedback!);
        this.counts.ideas++;
        break;
    }

    this.undoStack.push(action);
    this.seenIds.add(card.id);

    if (this.undoStack.length > 50) {
      this.undoStack.shift();
    }

    this.lastCardShownAt = Date.now();

    this.emit({ type: "swiped", card: updatedCard, direction, feedback });

    if (this.queue.length <= this.prefetchThreshold) {
      this.prefetch();
    }

    return this.currentCard();
  }

  private async loadMore(): Promise<void> {
    const types = this.activePersona.contentTypes;

    // Fetch for each content type the persona covers, then merge & sort
    const pages = await Promise.all(
      types.map((ct) =>
        fetchFeed({
          businessId: this.businessId,
          contentType: ct,
          limit: this.pageSize,
          excludeIds: [...this.seenIds],
        })
      )
    );

    const allCards = pages
      .flatMap((p) => p.cards)
      .filter((c) => !this.seenIds.has(c.id))
      .sort(
        (a, b) =>
          new Date(a.created_at ?? 0).getTime() -
          new Date(b.created_at ?? 0).getTime()
      );

    // Deduplicate in case of overlap
    const seen = new Set(this.queue.map((c) => c.id));
    const newCards = allCards.filter((c) => !seen.has(c.id));

    this.queue.push(...newCards);

    if (newCards.length > 0) {
      this.emit({ type: "cards_loaded", count: newCards.length });
    }

    if (newCards.length === 0 && this.queue.length === 0) {
      this.emit({ type: "queue_empty" });
    }
  }

  private async prefetch(): Promise<void> {
    if (this.prefetching) return;
    this.prefetching = true;

    try {
      await this.loadMore();
    } finally {
      this.prefetching = false;
    }
  }

  private setupRealtime(): void {
    if (!this.enableRealtime || this.unsubscribe) return;
    this.unsubscribe = subscribeToFeedChanges(
      (event) => this.handleRealtimeEvent(event),
      this.businessId
    );
  }

  private teardownRealtime(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  private cardMatchesPersona(card: ContentItem): boolean {
    return this.activePersona.contentTypes.includes(card.content_type);
  }

  private handleRealtimeEvent(event: FeedChangeEvent): void {
    if (!this.cardMatchesPersona(event.card)) return;

    if (event.type === "insert" && event.card.status === "pending") {
      if (!this.seenIds.has(event.card.id)) {
        this.queue.push(event.card);
        this.emit({ type: "card_added_realtime", card: event.card });
      }
      return;
    }

    if (
      event.type === "update" &&
      event.oldStatus !== "pending" &&
      event.card.status === "pending"
    ) {
      if (!this.seenIds.has(event.card.id)) {
        this.queue.push(event.card);
        this.emit({ type: "card_added_realtime", card: event.card });
      }
      return;
    }

    if (event.type === "update" && event.card.status !== "pending") {
      const idx = this.queue.findIndex((c) => c.id === event.card.id);
      if (idx !== -1) {
        this.queue.splice(idx, 1);
        this.emit({ type: "card_removed_realtime", card: event.card });
      }
    }
  }

  // ── Events ────────────────────────────────────────────────

  on(listener: (event: FeedEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: FeedEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch {
        // Don't let listener errors crash the feed
      }
    }
  }

  // ── Session stats ─────────────────────────────────────────

  getSessionStats(): SessionStats {
    const totalSwiped =
      this.counts.approved +
      this.counts.rejected +
      this.counts.variants +
      this.counts.ideas;

    const totalTime = this.cardTimes.reduce((a, b) => a + b, 0);

    return {
      startedAt: this.sessionStart,
      endedAt: this.started ? undefined : Date.now(),
      totalSwiped,
      approved: this.counts.approved,
      rejected: this.counts.rejected,
      variantsRequested: this.counts.variants,
      ideasRequested: this.counts.ideas,
      undoCount: this.counts.undos,
      avgTimePerCardMs: totalSwiped > 0 ? totalTime / totalSwiped : 0,
      cardTimes: [...this.cardTimes],
      personaId: this.activePersona.id,
      personaSwitchCount: this.personaSwitchCount,
    };
  }
}

// ── Helpers ───────────────────────────────────────────────────

function resolvePersona(input?: PersonaId | Persona): Persona {
  if (!input) return CONTENT_CREATOR;
  if (typeof input === "object" && "id" in input) return input;
  const found = getPersona(input);
  if (!found) throw new Error(`Unknown persona: ${input}`);
  return found;
}

// ── Feed event types ──────────────────────────────────────────

export type FeedEvent =
  | { type: "session_started"; persona: Persona }
  | { type: "session_ended"; stats: SessionStats }
  | { type: "persona_switched"; from: Persona; to: Persona }
  | { type: "swiped"; card: ContentItem; direction: SwipeDirection; feedback?: string }
  | { type: "undo"; card: ContentItem }
  | { type: "cards_loaded"; count: number }
  | { type: "queue_empty" }
  | { type: "card_added_realtime"; card: ContentItem }
  | { type: "card_removed_realtime"; card: ContentItem };
