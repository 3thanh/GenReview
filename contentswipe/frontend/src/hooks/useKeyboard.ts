import { useEffect, useCallback } from "react";
import type { SwipeDirection } from "../types/database";

interface UseKeyboardOptions {
  onSwipe: (direction: SwipeDirection) => void;
  onUndo: () => void;
  onStartTyping: () => void;
  onTogglePlay: () => void;
  enabled?: boolean;
}

export function useKeyboard({
  onSwipe,
  onUndo,
  onStartTyping,
  onTogglePlay,
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
          onSwipe("up");
          break;
        case "ArrowDown":
          e.preventDefault();
          onSwipe("down");
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
            onStartTyping();
          }
          break;
      }
    },
    [enabled, onSwipe, onUndo, onStartTyping, onTogglePlay]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}
