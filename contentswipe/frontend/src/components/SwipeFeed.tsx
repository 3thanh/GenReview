import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFeed } from "../hooks/useFeed";
import { useKeyboard } from "../hooks/useKeyboard";
import { ContentCard } from "./ContentCard";
import { ActionBar } from "./ActionBar";
import { FeedbackDrawer } from "./FeedbackDrawer";
import { EmptyState } from "./EmptyState";
import { FeedSourceToggle } from "./FeedSourceToggle";
import { PersonaSwitcher } from "./PersonaSwitcher";
import type { SupportCardHandle } from "./SupportCard";
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
  const alignClass = side === "left" ? "items-end pr-2" : "items-start pl-2";
  const textAlignClass = side === "left" ? "text-right" : "text-left";
  const cropClass = side === "left" ? "bg-[82%_center]" : "bg-[18%_center]";
  const overlayClass =
    side === "left"
      ? "bg-gradient-to-r from-black/80 via-black/55 to-transparent"
      : "bg-gradient-to-l from-black/80 via-black/55 to-transparent";

  const palette = {
    video: "from-fuchsia-500/30 via-zinc-900/70 to-zinc-950",
    social: "from-sky-500/25 via-zinc-900/70 to-zinc-950",
    support: "from-amber-400/20 via-zinc-900/70 to-zinc-950",
  }[card.content_type];

  return (
    <div
      aria-hidden="true"
      className={`hidden h-full w-[72px] shrink-0 overflow-hidden rounded-[32px] border border-zinc-800/70 bg-zinc-900/90 shadow-[0_24px_60px_rgba(0,0,0,0.35)] lg:flex xl:w-[88px] ${alignClass}`}
    >
      <div className="relative h-full w-full overflow-hidden rounded-[28px]">
        {previewImage ? (
          <div
            className={`absolute inset-0 bg-cover bg-center ${cropClass}`}
            style={{ backgroundImage: `url(${previewImage})` }}
          />
        ) : (
          <div className={`absolute inset-0 bg-gradient-to-b ${palette}`} />
        )}
        <div className={`absolute inset-0 ${overlayClass}`} />
        <div className={`absolute inset-x-0 bottom-0 p-4 ${textAlignClass}`}>
          <p className="text-[10px] uppercase tracking-[0.24em] text-zinc-400">
            {card.content_type}
          </p>
          <p className="mt-2 line-clamp-4 text-sm font-medium leading-tight text-white/88 [writing-mode:vertical-rl] [text-orientation:mixed]">
            {card.title}
          </p>
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

  const supportCardRef = useRef<SupportCardHandle>(null);
  const videoCardRef = useRef<VideoCardHandle>(null);

  const isSupport = currentCard?.content_type === "support";
  const isVideo = currentCard?.content_type === "video";
  const leftPreviewCard = cards[1] ?? cards[2] ?? null;
  const rightPreviewCard = cards[2] ?? cards[1] ?? null;

  useEffect(() => {
    setExitDirection(null);
    setPendingDirection(null);
    setDrawerOpen(false);
    setDrawerInitialText("");
    setVideoTimestamp(null);
    setIsPlaying(currentCard?.content_type === "video");
  }, [currentCard?.id, currentCard?.content_type]);

  const statCards = [
    {
      label: "Remaining",
      value: queueLength,
      valueClassName: "text-zinc-100",
      surfaceClassName: "border-zinc-800 bg-zinc-950/80",
    },
    {
      label: "Approved",
      value: stats.approved,
      valueClassName: "text-approve",
      surfaceClassName: "border-emerald-500/30 bg-emerald-500/10",
    },
    {
      label: "Rejected",
      value: stats.rejected,
      valueClassName: "text-reject",
      surfaceClassName: "border-rose-500/30 bg-rose-500/10",
    },
  ];

  const captureVideoTimestamp = useCallback(() => {
    if (!isVideo) {
      setVideoTimestamp(null);
      return;
    }
    const time = videoCardRef.current?.getCurrentTime() ?? null;
    setVideoTimestamp(time);
    videoCardRef.current?.pause();
    if (isPlaying) setIsPlaying(false);
  }, [isVideo, isPlaying]);

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

  const handleScrollChat = useCallback(
    (direction: "up" | "down") => {
      supportCardRef.current?.scrollChat(direction);
    },
    []
  );

  const handleFeedbackSubmit = useCallback(
    (feedback: string) => {
      if (!pendingDirection) return;
      setDrawerOpen(false);

      let finalFeedback = feedback;
      if (videoTimestamp !== null && isVideo) {
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
    [pendingDirection, swipe, videoTimestamp, isVideo]
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
    setPendingDirection("left");
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
    onScrollChat: handleScrollChat,
    chatScrollActive: isSupport,
    enabled: !drawerOpen,
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="w-8 h-8 text-zinc-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Header stats + persona */}
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-3 sm:px-5 lg:px-8">
        <div className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
              Persona Feed
            </p>
            <h1 className="mt-1 text-xl font-semibold text-white">
              Review cards using {persona.name}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-zinc-400">
              {feedSourceMode === "demo"
                ? "Demo mode uses your seeded cached cards so the feed stays full while you present."
                : "Real mode uses the live Supabase queue and follows the persona configuration from the studio sidebar."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <FeedSourceToggle value={feedSourceMode} onChange={onChangeFeedSourceMode} />
            <PersonaSwitcher
              personas={personas}
              current={persona}
              onSelect={(nextPersona) => onSelectPersona(nextPersona.id)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 sm:gap-4">
          {statCards.map((card) => (
            <div
              key={card.label}
              className={`flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full border text-center shadow-[0_12px_40px_rgba(0,0,0,0.28)] backdrop-blur-sm sm:h-24 sm:w-24 ${card.surfaceClassName}`}
            >
              <span className={`text-2xl font-semibold leading-none sm:text-3xl ${card.valueClassName}`}>
                {card.value}
              </span>
              <span className="mt-1 max-w-[4.5rem] text-[10px] uppercase tracking-[0.18em] text-zinc-400 sm:text-[11px]">
                {card.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="px-4 pb-2 sm:px-5 lg:px-8">
          <div className="flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-300" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Card area */}
      <div className="flex flex-1 items-stretch justify-center overflow-hidden px-3 pb-2 sm:px-5 lg:px-8">
        {!currentCard && !loading ? (
          <EmptyState persona={persona} onNavigateToStudio={onNavigateToStudio} />
        ) : (
          <div className="flex h-full w-full max-w-[min(98vw,1680px)] items-center justify-center gap-3 xl:gap-5">
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
                  className="flex h-full min-w-0 flex-1 items-stretch justify-center"
                >
                  <ContentCard
                    ref={supportCardRef}
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

      {/* Action bar */}
      {currentCard && (
        <ActionBar
          persona={persona}
          onSwipe={handleSwipe}
          onUndo={undo}
          canUndo={canUndo}
          disabled={swiping}
        />
      )}

      {/* Feedback drawer */}
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

      {/* Keyboard hints */}
      {currentCard && !drawerOpen && (
        <div className="flex items-center justify-center gap-4 pb-3 text-[11px] text-zinc-600">
          {isSupport ? (
            <>
              <span>← {persona.swipeLabels.left.action.toLowerCase()}</span>
              <span>→ {persona.swipeLabels.right.action.toLowerCase()}</span>
              <span>↑ scroll chat</span>
              <span>Buttons use persona actions</span>
              <span>⌘Z undo</span>
            </>
          ) : (
            <>
              <span>← {persona.swipeLabels.left.action.toLowerCase()}</span>
              <span>→ {persona.swipeLabels.right.action.toLowerCase()}</span>
              <span>↑ {persona.swipeLabels.up.action.toLowerCase()}</span>
              <span>↓ {persona.swipeLabels.down.action.toLowerCase()}</span>
              <span>Space play/pause</span>
              <span>⌘Z undo</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
