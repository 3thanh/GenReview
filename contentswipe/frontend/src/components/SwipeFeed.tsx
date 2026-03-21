import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2, Film } from "lucide-react";
import { useFeed } from "../hooks/useFeed";
import { useKeyboard } from "../hooks/useKeyboard";
import { ContentCard } from "./ContentCard";
import { ActionBar } from "./ActionBar";
import { FeedbackDrawer } from "./FeedbackDrawer";
import { EmptyState } from "./EmptyState";
import { FeedSourceToggle } from "./FeedSourceToggle";
import { PersonaSwitcher } from "./PersonaSwitcher";
import type { VideoCardHandle } from "./VideoCard";
import type { FeedSourceMode } from "../lib/feed-source";
import type { ContentItem, SwipeDirection } from "../types/database";
import type { Persona } from "../lib/personas";

interface SwipeFeedProps {
  personas: Persona[];
  activePersonaId: string;
  feedSourceMode: FeedSourceMode;
  onChangeFeedSourceMode: (mode: FeedSourceMode) => void;
  onSelectPersona: (personaId: string) => void;
  onNavigateToStudio: () => void;
}

const SWIPE_VARIANTS = {
  enter: { opacity: 0, scale: 0.95, y: 20 },
  center: { opacity: 1, scale: 1, y: 0 },
  exit: (direction: SwipeDirection | null) => {
    switch (direction) {
      case "right":
        return { x: 300, opacity: 0, rotate: 8 };
      case "left":
        return { x: -300, opacity: 0, rotate: -8 };
      case "up":
        return { y: -200, opacity: 0, scale: 0.9 };
      case "down":
        return { y: 200, opacity: 0, scale: 0.9 };
      default:
        return { opacity: 0 };
    }
  },
};

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function FeedPreviewSlice({
  card,
  side,
}: {
  card: ContentItem;
  side: "left" | "right";
}) {
  const previewImage = card.image_url ?? card.thumbnail_url ?? null;
  const roundClass =
    side === "left" ? "rounded-l-[28px] rounded-r-2xl" : "rounded-r-[28px] rounded-l-2xl";

  return (
    <div
      aria-hidden="true"
      className={`surface-panel flex h-full w-[100px] shrink-0 lg:w-[120px] xl:w-[148px] ${roundClass} overflow-hidden`}
    >
      <div className="relative flex h-full w-full flex-col">
        {previewImage ? (
          <div className="relative h-[45%] w-full shrink-0 overflow-hidden">
            <img
              src={previewImage}
              alt=""
              className="h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-white" />
          </div>
        ) : (
          <div className="relative flex h-[45%] w-full shrink-0 items-center justify-center bg-gradient-to-br from-sky-100 via-white to-indigo-50">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 ring-1 ring-white/80">
              <Film className="h-5 w-5 text-slate-500" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-white" />
          </div>
        )}

        <div className="flex flex-1 flex-col justify-between p-3">
          <div>
            <div className="mb-2 flex items-center gap-1.5">
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full border border-sky-200 bg-sky-50 text-sky-700">
                Video
              </span>
            </div>
            <p className="line-clamp-3 text-xs font-semibold leading-snug text-slate-700">
              {card.title}
            </p>
            {card.body_text && (
              <p className="mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                {card.body_text}
              </p>
            )}
          </div>

          <div className="mt-auto space-y-1.5 pt-3">
            <div className="h-1 w-full rounded-full bg-slate-200" />
            <div className="h-1 w-3/4 rounded-full bg-slate-200" />
            <div className="h-1 w-1/2 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SwipeFeed({
  personas,
  activePersonaId,
  feedSourceMode,
  onChangeFeedSourceMode,
  onSelectPersona,
  onNavigateToStudio,
}: SwipeFeedProps) {
  const persona = personas.find((item) => item.id === activePersonaId) ?? personas[0];
  const { cards, currentCard, loading, error, stats, canUndo, queueLength, swipe, undo } =
    useFeed(persona, feedSourceMode);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingDirection, setPendingDirection] = useState<SwipeDirection | null>(null);
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState<number | null>(null);
  const [drawerInitialText, setDrawerInitialText] = useState("");

  const videoCardRef = useRef<VideoCardHandle>(null);

  const leftPreviewCard = cards[1] ?? cards[2] ?? null;
  const rightPreviewCard = cards[2] ?? cards[1] ?? null;

  useEffect(() => {
    setExitDirection(null);
    setPendingDirection(null);
    setDrawerOpen(false);
    setDrawerInitialText("");
    setVideoTimestamp(null);
    setIsPlaying(true);
  }, [currentCard?.id]);

  const statCards = [
    {
      label: "Remaining",
      value: queueLength,
      valueClassName: "text-slate-900",
      surfaceClassName: "surface-card",
    },
    {
      label: "Approved",
      value: stats.approved,
      valueClassName: "text-approve",
      surfaceClassName:
        "border border-emerald-200 bg-emerald-50/90 shadow-[0_16px_40px_rgba(16,185,129,0.08)]",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      valueClassName: "text-reject",
      surfaceClassName:
        "border border-rose-200 bg-rose-50/90 shadow-[0_16px_40px_rgba(244,63,94,0.08)]",
    },
  ];

  const captureVideoTimestamp = useCallback(() => {
    const time = videoCardRef.current?.getCurrentTime() ?? null;
    setVideoTimestamp(time);
    videoCardRef.current?.pause();
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!currentCard || swiping) return;
      if (persona.swipeLabels[direction].requiresFeedback) {
        captureVideoTimestamp();
        setPendingDirection(direction);
        setDrawerOpen(true);
        return;
      }

      setSwiping(true);
      setExitDirection(direction);
      window.setTimeout(() => {
        void swipe(direction);
        setSwiping(false);
        setExitDirection(null);
      }, 250);
    },
    [captureVideoTimestamp, currentCard, persona, swiping, swipe]
  );

  const handleFeedbackSubmit = useCallback(
    (feedback: string) => {
      if (!pendingDirection) return;
      setDrawerOpen(false);

      let finalFeedback = feedback;
      if (videoTimestamp !== null) {
        finalFeedback = `[@${formatTimestamp(videoTimestamp)}] ${feedback}`;
      }

      setSwiping(true);
      setExitDirection(pendingDirection);
      window.setTimeout(() => {
        void swipe(pendingDirection, finalFeedback);
        setSwiping(false);
        setExitDirection(null);
        setPendingDirection(null);
        setVideoTimestamp(null);
      }, 250);
    },
    [pendingDirection, swipe, videoTimestamp]
  );

  const handleFeedbackCancel = useCallback(() => {
    setDrawerOpen(false);
    setPendingDirection(null);
    setVideoTimestamp(null);
    setDrawerInitialText("");
  }, []);

  const handleStartTyping = useCallback((key: string) => {
    if (!currentCard || drawerOpen) return;
    captureVideoTimestamp();
    setDrawerInitialText(key);
    setPendingDirection("up");
    setDrawerOpen(true);
  }, [currentCard, drawerOpen, captureVideoTimestamp]);

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  useKeyboard({
    onSwipe: handleSwipe,
    onUndo: undo,
    onStartTyping: handleStartTyping,
    onTogglePlay: handleTogglePlay,
    onScrollChat: () => {},
    chatScrollActive: false,
    enabled: !drawerOpen,
  });

  if (loading) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-5rem)] flex-col">
      <div className="flex items-center justify-between gap-4 px-4 py-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <FeedSourceToggle value={feedSourceMode} onChange={onChangeFeedSourceMode} />
          <PersonaSwitcher
            personas={personas}
            current={persona}
            onSelect={(nextPersona) => onSelectPersona(nextPersona.id)}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`flex items-center gap-2 rounded-2xl px-3 py-2 ${card.surfaceClassName}`}
            >
              <span className={`text-lg font-extrabold leading-none ${card.valueClassName}`}>
                {card.value}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {card.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 pb-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-stretch justify-center overflow-hidden px-3 pb-3 sm:px-6 lg:px-8">
        {!currentCard && !loading ? (
          <EmptyState persona={persona} onNavigateToStudio={onNavigateToStudio} />
        ) : (
          <div className="surface-panel flex h-full w-full max-w-[min(98vw,1680px)] items-center justify-center gap-0 overflow-hidden rounded-[36px] p-3 sm:p-4 xl:p-5">
            {leftPreviewCard && <FeedPreviewSlice card={leftPreviewCard} side="left" />}

            <AnimatePresence mode="popLayout" custom={exitDirection}>
              {currentCard && (
                <motion.div
                  key={currentCard.id}
                  custom={exitDirection}
                  variants={SWIPE_VARIANTS}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ type: "spring", damping: 25, stiffness: 300 }}
                  className="flex h-full min-w-0 flex-1 items-stretch justify-center px-1.5"
                >
                  <ContentCard
                    videoRef={videoCardRef}
                    card={currentCard}
                    isPlaying={isPlaying}
                    onTogglePlay={handleTogglePlay}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {rightPreviewCard && <FeedPreviewSlice card={rightPreviewCard} side="right" />}
          </div>
        )}
      </div>

      {currentCard && (
        <ActionBar
          persona={persona}
          onSwipe={handleSwipe}
          onUndo={undo}
          canUndo={canUndo}
          disabled={swiping}
        />
      )}

      <FeedbackDrawer
        open={drawerOpen}
        direction={pendingDirection}
        persona={persona}
        videoTimestamp={videoTimestamp}
        initialText={drawerInitialText}
        onSubmit={(feedback) => {
          setDrawerInitialText("");
          handleFeedbackSubmit(feedback);
        }}
        onCancel={handleFeedbackCancel}
      />

      {currentCard && !drawerOpen && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 px-4 pb-4 text-[11px] text-slate-400">
          <span>← {persona.swipeLabels.left.action.toLowerCase()}</span>
          <span>→ {persona.swipeLabels.right.action.toLowerCase()}</span>
          <span>↑ {persona.swipeLabels.up.action.toLowerCase()}</span>
          <span>↓ {persona.swipeLabels.down.action.toLowerCase()}</span>
          <span>Space play/pause</span>
          <span>⌘Z undo</span>
        </div>
      )}
    </div>
  );
}
