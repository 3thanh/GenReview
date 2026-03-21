import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useFeed } from "../hooks/useFeed";
import { useKeyboard } from "../hooks/useKeyboard";
import { ContentCard } from "./ContentCard";
import { ActionBar } from "./ActionBar";
import { FeedbackDrawer } from "./FeedbackDrawer";
import { EmptyState } from "./EmptyState";
import { PersonaSwitcher } from "./PersonaSwitcher";
import type { SupportCardHandle } from "./SupportCard";
import type { VideoCardHandle } from "./VideoCard";
import type { Persona, SwipeDirection } from "../types/database";
import { PERSONAS } from "../types/database";

interface SwipeFeedProps {
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

export function SwipeFeed({ onNavigateToStudio }: SwipeFeedProps) {
  const [persona, setPersona] = useState<Persona>(PERSONAS[0]);
  const { cards, currentCard, loading, stats, canUndo, queueLength, swipe, undo } =
    useFeed(persona);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [pendingDirection, setPendingDirection] = useState<SwipeDirection | null>(null);
  const [exitDirection, setExitDirection] = useState<SwipeDirection | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [swiping, setSwiping] = useState(false);
  const [videoTimestamp, setVideoTimestamp] = useState<number | null>(null);

  const supportCardRef = useRef<SupportCardHandle>(null);
  const videoCardRef = useRef<VideoCardHandle>(null);

  const isSupport = currentCard?.content_type === "support";
  const isVideo = currentCard?.content_type === "video";

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

      if (isSupport && direction === "up") {
        supportCardRef.current?.scrollChat(direction);
        return;
      }

      const label = persona.swipeLabels[direction];

      if (label.requiresFeedback) {
        captureVideoTimestamp();
        setPendingDirection(direction);
        setDrawerOpen(true);
        return;
      }

      setSwiping(true);
      setExitDirection(direction);
      setTimeout(() => {
        swipe(direction);
        setSwiping(false);
        setExitDirection(null);
      }, 250);
    },
    [currentCard, swiping, persona, swipe, isSupport, captureVideoTimestamp]
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
      setTimeout(() => {
        swipe(pendingDirection, finalFeedback);
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
  }, []);

  const handleStartTyping = useCallback(() => {
    if (!currentCard || drawerOpen) return;
    captureVideoTimestamp();
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
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header stats + persona */}
      <div className="flex items-center justify-between px-5 py-3">
        <PersonaSwitcher current={persona} onSelect={setPersona} />
        <div className="flex items-center gap-4 text-xs text-zinc-500">
          <span>{queueLength} remaining</span>
          <span className="text-approve">{stats.approved} approved</span>
          <span className="text-reject">{stats.rejected} rejected</span>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        {!currentCard && !loading ? (
          <EmptyState persona={persona} onNavigateToStudio={onNavigateToStudio} />
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
                className="w-full max-w-2xl"
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
          isSupportCard={isSupport}
        />
      )}

      {/* Feedback drawer */}
      <FeedbackDrawer
        open={drawerOpen}
        direction={pendingDirection}
        persona={persona}
        videoTimestamp={videoTimestamp}
        onSubmit={handleFeedbackSubmit}
        onCancel={handleFeedbackCancel}
      />

      {/* Keyboard hints */}
      {currentCard && !drawerOpen && (
        <div className="flex items-center justify-center gap-4 pb-3 text-[11px] text-zinc-600">
          {isSupport ? (
            <>
              <span>← reject</span>
              <span>→ approve</span>
              <span>↑ scroll chat</span>
              <span>↓ send for review</span>
              <span>⌘Z undo</span>
            </>
          ) : (
            <>
              <span>← reject</span>
              <span>→ approve</span>
              <span>↑ variant</span>
              <span>↓ send for review</span>
              <span>Space play/pause</span>
              <span>⌘Z undo</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
