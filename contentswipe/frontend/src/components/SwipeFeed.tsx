import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import { useFeed } from "../hooks/useFeed";
import { useBackgroundGeneration } from "../hooks/useBackgroundGeneration";
import { useKeyboard } from "../hooks/useKeyboard";
import { ContentCard } from "./ContentCard";
import { ActionBar } from "./ActionBar";
import { FeedbackDrawer } from "./FeedbackDrawer";
import { EmptyState } from "./EmptyState";
import type { VideoCardHandle } from "./VideoCard";
import type { FeedSourceMode } from "../lib/feed-source";
import type { SwipeDirection } from "../types/database";
import type { Persona } from "../lib/personas";

export interface FeedStats {
  remaining: number;
  approved: number;
  rejected: number;
}

interface SwipeFeedProps {
  personas: Persona[];
  activePersonaId: string;
  feedSourceMode: FeedSourceMode;
  onChangeFeedSourceMode: (mode: FeedSourceMode) => void;
  onSelectPersona: (personaId: string) => void;
  onNavigateToStudio: () => void;
  onStatsChange?: (stats: FeedStats) => void;
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

export function SwipeFeed({
  personas,
  activePersonaId,
  feedSourceMode,
  onChangeFeedSourceMode,
  onSelectPersona,
  onNavigateToStudio,
  onStatsChange,
}: SwipeFeedProps) {
  const persona =
    personas.find((item) => item.id === activePersonaId) ?? personas[0];
  const {
    cards,
    currentCard,
    loading,
    error,
    stats,
    canUndo,
    queueLength,
    swipe,
    undo,
    approvedPersonaIds,
    addBackgroundCard,
  } = useFeed(persona, feedSourceMode);

  useBackgroundGeneration(
    feedSourceMode === "demo",
    personas,
    approvedPersonaIds,
    addBackgroundCard
  );

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingDirection, setPendingDirection] =
    useState<SwipeDirection | null>(null);
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(
    null
  );
  const [isPlaying, setIsPlaying] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState<number | null>(null);
  const [drawerInitialText, setDrawerInitialText] = useState("");

  const videoCardRef = useRef<VideoCardHandle>(null);

  useEffect(() => {
    setExitDirection(null);
    setPendingDirection(null);
    setDrawerOpen(false);
    setDrawerInitialText("");
    setVideoTimestamp(null);
    setIsPlaying(true);
  }, [currentCard?.id]);

  useEffect(() => {
    onStatsChange?.({
      remaining: queueLength,
      approved: stats.approved,
      rejected: stats.rejected,
    });
  }, [queueLength, stats.approved, stats.rejected, onStatsChange]);

  const captureVideoTimestamp = useCallback(() => {
    const time = videoCardRef.current?.getCurrentTime() ?? null;
    setVideoTimestamp(time);
    videoCardRef.current?.pause();
    if (isPlaying) setIsPlaying(false);
  }, [isPlaying]);

  const performSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!currentCard || swiping) return;
      setSwiping(true);
      setExitDirection(direction);
      window.setTimeout(() => {
        void swipe(direction);
        setSwiping(false);
        setExitDirection(null);
      }, 250);
    },
    [currentCard, swiping, swipe]
  );

  const handleSwipe = useCallback(
    (direction: SwipeDirection) => {
      if (!currentCard || swiping) return;
      if (persona.swipeLabels[direction].requiresFeedback) {
        captureVideoTimestamp();
        setPendingDirection(direction);
        setDrawerOpen(true);
        return;
      }
      performSwipe(direction);
    },
    [captureVideoTimestamp, currentCard, persona, swiping, performSwipe]
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

  const handleStartTyping = useCallback(
    (key: string) => {
      if (!currentCard || drawerOpen) return;
      captureVideoTimestamp();
      setDrawerInitialText(key);
      setPendingDirection("up");
      setDrawerOpen(true);
    },
    [currentCard, drawerOpen, captureVideoTimestamp]
  );

  const handleTogglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const handleRequestRegen = useCallback(
    (editedScript: string) => {
      if (!currentCard) return;
      console.log(
        "[regen] Script edited for card %s — will queue regeneration",
        currentCard.id,
        editedScript.slice(0, 120)
      );
      void swipe("up", `[script-edit] ${editedScript}`);
    },
    [currentCard, swipe]
  );

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
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {error && (
        <div className="px-4 pb-2 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex flex-1 items-center justify-center overflow-hidden px-3 pb-3 sm:px-6 lg:px-8">
        {!currentCard && !loading ? (
          <EmptyState
            persona={persona}
            onNavigateToStudio={onNavigateToStudio}
          />
        ) : (
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
                className="flex h-full items-center justify-center"
              >
                <ContentCard
                  videoRef={videoCardRef}
                  card={currentCard}
                  isPlaying={isPlaying}
                  onTogglePlay={handleTogglePlay}
                  onRequestRegen={handleRequestRegen}
                  personas={personas}
                />
              </motion.div>
            )}
          </AnimatePresence>
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
          <span>
            ← {persona.swipeLabels.left.action.toLowerCase()}
          </span>
          <span>
            → {persona.swipeLabels.right.action.toLowerCase()}
          </span>
          <span>
            ↑ {persona.swipeLabels.up.action.toLowerCase()}
          </span>
          <span>
            ↓ {persona.swipeLabels.down.action.toLowerCase()}
          </span>
          <span>Space play/pause</span>
          <span>⌘Z undo</span>
        </div>
      )}
    </div>
  );
}
