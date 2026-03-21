import { useEffect, useCallback } from "react";
import type { SwipeDirection } from "../types/database";

interface UseKeyboardOptions {
  onSwipe: (direction: SwipeDirection) => void;
  onUndo: () => void;
  onStartTyping: (key: string) => void;
  onTogglePlay: () => void;
  onScrollChat?: (direction: "up" | "down") => void;
  chatScrollActive?: boolean;
  enabled?: boolean;
}

export function useKeyboard({
  onSwipe,
  onUndo,
  onStartTyping,
  onTogglePlay,
  onScrollChat,
  chatScrollActive = false,
  enabled = true,
}: UseKeyboardOptions) {
  const handler = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (isInput) return;

      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          onSwipe("right");
          break;
        case "ArrowLeft":
          e.preventDefault();
          onSwipe("left");
          break;
        case "ArrowUp":
          e.preventDefault();
          if (chatScrollActive && onScrollChat) {
            onScrollChat("up");
          } else {
            onSwipe("up");
          }
          break;
        case "ArrowDown":
          e.preventDefault();
          if (chatScrollActive && onScrollChat) {
            onScrollChat("down");
          } else {
            onSwipe("down");
          }
          break;
        case " ":
          e.preventDefault();
          onTogglePlay();
          break;
        case "z":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            onUndo();
          }
          break;
        default:
          if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            e.preventDefault();
            onStartTyping(e.key);
          }
          break;
      }
    },
    [enabled, onSwipe, onUndo, onStartTyping, onTogglePlay, onScrollChat, chatScrollActive]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
