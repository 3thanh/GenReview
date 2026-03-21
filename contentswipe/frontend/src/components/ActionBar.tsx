import {
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  Undo2,
  ChevronsUpDown,
} from "lucide-react";
import type { Persona, SwipeDirection } from "../types/database";

interface ActionBarProps {
  persona: Persona;
  onSwipe: (direction: SwipeDirection) => void;
  onUndo: () => void;
  canUndo: boolean;
  disabled: boolean;
  isSupportCard?: boolean;
}

const DIRECTION_ICONS: Record<SwipeDirection, typeof CheckCircle2> = {
  right: CheckCircle2,
  left: XCircle,
  up: ArrowUpCircle,
  down: ArrowDownCircle,
};

export function ActionBar({
  persona,
  onSwipe,
  onUndo,
  canUndo,
  disabled,
  isSupportCard = false,
}: ActionBarProps) {
  if (isSupportCard) {
    return (
      <div className="flex items-center justify-center gap-3 py-4 px-6">
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo || disabled}
          className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          title="Undo (⌘Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Reject */}
        <button
          onClick={() => onSwipe("left")}
          disabled={disabled}
          className="w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: persona.swipeLabels.left.color + "60",
            color: persona.swipeLabels.left.color,
            backgroundColor: persona.swipeLabels.left.color + "10",
          }}
          title={`${persona.swipeLabels.left.action} (←)`}
        >
          <XCircle className="w-6 h-6" />
        </button>

        {/* Scroll indicator */}
        <div className="w-11 h-11 rounded-full border border-zinc-700/40 flex items-center justify-center text-zinc-500" title="↑ ↓ scroll conversation">
          <ChevronsUpDown className="w-5 h-5" />
        </div>

        {/* Approve */}
        <button
          onClick={() => onSwipe("right")}
          disabled={disabled}
          className="w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            borderColor: persona.swipeLabels.right.color + "60",
            color: persona.swipeLabels.right.color,
            backgroundColor: persona.swipeLabels.right.color + "10",
          }}
          title={`${persona.swipeLabels.right.action} (→)`}
        >
          <CheckCircle2 className="w-6 h-6" />
        </button>
      </div>
    );
  }

  const directions: SwipeDirection[] = ["left", "down", "up", "right"];

  return (
    <div className="flex items-center justify-center gap-3 py-4 px-6">
      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo || disabled}
        className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        title="Undo (⌘Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>

      {/* Main action buttons */}
      {directions.map((dir) => {
        const label = persona.swipeLabels[dir];
        const Icon = DIRECTION_ICONS[dir];
        const isRight = dir === "right";
        const isLeft = dir === "left";
        const size = isRight || isLeft ? "w-14 h-14" : "w-11 h-11";
        const iconSize = isRight || isLeft ? "w-6 h-6" : "w-5 h-5";

        return (
          <button
            key={dir}
            onClick={() => onSwipe(dir)}
            disabled={disabled}
            className={`${size} rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed`}
            style={{
              borderColor: label.color + "60",
              color: label.color,
              backgroundColor: label.color + "10",
            }}
            title={`${label.action} (${label.shortcut})`}
          >
            <Icon className={iconSize} />
          </button>
        );
      })}
    </div>
  );
}
