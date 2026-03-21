import { useState, useRef, useEffect } from "react";
import { X, Send, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { SwipeDirection } from "../types/database";
import type { Persona } from "../lib/personas";

interface FeedbackDrawerProps {
  open: boolean;
  direction: SwipeDirection | null;
  persona: Persona;
  videoTimestamp?: number | null;
  initialText?: string;
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
  initialText = "",
  onSubmit,
  onCancel,
}: FeedbackDrawerProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) {
      setText(initialText);
      setTimeout(() => {
        const el = inputRef.current;
        if (el) {
          el.focus();
          el.selectionStart = el.selectionEnd = el.value.length;
        }
      }, 100);
    }
  }, [open, initialText]);

  const label = direction ? persona.swipeLabels[direction] : null;
  const hasTimestamp = videoTimestamp !== null && videoTimestamp !== undefined;

  const handleSubmit = () => {
    if (!text.trim()) return;
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
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-slate-900/18 backdrop-blur-[2px]"
            onClick={onCancel}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 400 }}
            className="surface-panel fixed bottom-0 left-0 right-0 z-50 mx-auto max-w-lg rounded-t-[28px] px-5 pb-6 pt-4"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                {label && (
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: label.color }}
                  />
                )}
                <h3 className="text-sm font-semibold text-slate-900">
                  {label?.action ?? "Add feedback"}
                </h3>
              </div>
              <button
                onClick={onCancel}
                className="surface-muted flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {hasTimestamp && (
              <div className="mb-3 flex items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-3 py-2">
                <Clock className="h-3.5 w-3.5 text-sky-600" />
                <span className="text-xs font-medium text-sky-700">
                  Commenting at{" "}
                  <span className="font-mono">{formatTime(videoTimestamp)}</span>
                </span>
              </div>
            )}

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
              className="surface-input w-full resize-none rounded-[22px] px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-sky-300 focus:outline-none"
            />

            <div className="flex items-center justify-between mt-3">
              <p className="text-[11px] text-slate-400">
                Enter to submit · Shift+Enter for new line
              </p>
              <button
                onClick={handleSubmit}
                disabled={!text.trim()}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all disabled:opacity-30"
                style={{
                  backgroundColor: (label?.color ?? "#3b82f6") + "14",
                  color: label?.color ?? "#3b82f6",
                  boxShadow: `0 12px 28px ${(label?.color ?? "#3b82f6")}16`,
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
