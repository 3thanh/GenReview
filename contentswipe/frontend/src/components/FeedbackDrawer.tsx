import { useState, useRef, useEffect } from "react";
import { X, Send, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SwipeDirection, Persona } from "../types/database";

interface FeedbackDrawerProps {
  open: boolean;
  direction: SwipeDirection | null;
  persona: Persona;
  videoTimestamp?: number | null;
  onSubmit: (feedback: string) => void;
  onCancel: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function FeedbackDrawer({
  open,
  direction,
  persona,
  videoTimestamp,
  onSubmit,
  onCancel,
}: FeedbackDrawerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const label = direction ? persona.swipeLabels[direction] : null;
  const hasTimestamp = videoTimestamp !== null && videoTimestamp !== undefined;

  const handleSubmit = () => {
    if (!text.trim() && label?.requiresFeedback) return;
    onSubmit(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      onCancel();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40"
            onClick={onCancel}
          />

          {/* Drawer */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 border-t border-zinc-700/50 rounded-t-2xl px-5 pt-4 pb-6 max-w-lg mx-auto"
          >
            {/* Handle + header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {label && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                )}
                <h3 className="text-sm font-semibold text-white">
                  {label?.action ?? "Add feedback"}
                </h3>
              </div>
              <button
                onClick={onCancel}
                className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Video timestamp badge */}
            {hasTimestamp && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <Clock className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs text-purple-300 font-medium">
                  Commenting at{" "}
                  <span className="font-mono">{formatTime(videoTimestamp)}</span>
                </span>
              </div>
            )}

            {/* Input */}
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                direction === "left"
                  ? "Why are you rejecting this?"
                  : direction === "up"
                    ? "What should be different in the variant?"
                    : direction === "down"
                      ? "What should the next version address?"
                      : "Add your notes..."
              }
              rows={3}
              className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-zinc-500 resize-none focus:outline-none focus:border-zinc-600 transition-colors"
            />

            {/* Submit */}
            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px] text-zinc-500">
                Enter to submit · Shift+Enter for new line
              </p>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() && label?.requiresFeedback}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30"
                style={{
                  backgroundColor: (label?.color ?? "#3b82f6") + "20",
                  color: label?.color ?? "#3b82f6",
                }}
              >
                <Send className="w-3.5 h-3.5" />
                {label?.action ?? "Submit"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
